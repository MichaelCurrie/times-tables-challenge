from flask import Flask, request, jsonify, render_template
import sqlite3
import os
import json
from typing import List, Dict, Tuple, Optional, Any

app = Flask(__name__)
DATABASE = "data.db"

def load_ingredients() -> Dict[str, Any]:
    """Load ingredients data from JSON file."""
    try:
        with open("ingredients.json", "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback if file doesn't exist
        return {"all_ingredients": [], "categories": {}, "icons": {}}

# Load ingredients data
INGREDIENTS_DATA = load_ingredients()
PIZZA_INGREDIENTS: List[str] = INGREDIENTS_DATA.get("all_ingredients", [])

# Attendee overrides for special cases
ATTENDEE_OVERRIDES: List[Dict[str, Any]] = [
    {
        "names": [
            "Stephen",
            "Andrew",
            "Alex",
            "Vanessa",
            "Brynn",
            "Dominic",
            "Benjamin",
            "Bridget",
            "Holly",
        ],
        "trigger_name": "Evelyn",
        "override_image": "/static/auntielynn.jpg",
        "override_message": "Auntie Lynn says hi! 🍕",
    }
]


def init_db() -> None:
    """Initialize the database with all required tables and triggers."""
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()

    # Read and execute the SQL schema file
    with open("create_database.sql", "r") as sql_file:
        sql_script = sql_file.read()
        cur.executescript(sql_script)

    conn.commit()
    conn.close()


init_db()


@app.route("/")
def index() -> str:
    """
    Serve different templates based on the host header.

    Returns:
        str: Rendered HTML template for pizza party or times tables
    """
    # Check the host header to determine which template to serve
    host = request.headers.get("Host", "").lower()

    if "slicetomeetyou.com" in host:
        return render_template("pizza.html")
    else:
        return render_template("index.html")


@app.route("/<party_id>")
def pizza_party_with_id(party_id: str) -> str:
    """
    Serve pizza party template with pre-filled party ID.

    Args:
        party_id (str): 4-character alphanumeric party identifier

    Returns:
        str: Rendered HTML template for pizza party with party ID
    """
    # Validate party ID format
    if not party_id or len(party_id) != 4 or not party_id.isalnum():
        return render_template("pizza.html")

    # Check the host header to determine which template to serve
    host = request.headers.get("Host", "").lower()

    if "slicetomeetyou.com" in host:
        return render_template("pizza.html", party_id=party_id.upper())
    else:
        return render_template("index.html")


@app.route("/submit", methods=["POST"])
def submit() -> Dict[str, Any]:
    """
    Submit times table responses and return aggregated statistics.

    Returns:
        Dict[str, Any]: JSON response with heatmap data and statistics
    """
    data = request.get_json()
    responses = data.get("responses", [])
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "No user_id provided"}), 400

    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()

    # Insert each raw response and update aggregation tables.
    for resp in responses:
        # Insert into the raw responses table.
        cur.execute(
            """
          INSERT INTO responses (user_id, a, b, user_answer, correct, time_taken, effective_time)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                user_id,
                resp["a"],
                resp["b"],
                resp["user_answer"],
                int(resp["correct"]),
                resp["time_taken"],
                resp["effective_time"],
            ),
        )

    conn.commit()

    # Now retrieve aggregated stats for the heatmap.
    cur.execute(
        """
      SELECT a, b, total_effective_time, count, wrong_count
      FROM agg_pair
    """
    )
    aggregate_info = cur.fetchall()

    # Calculate heatmap data.
    heatmap = {}
    for row in aggregate_info:
        a, b, total_time, count, wrong_count = row
        avg_effective = total_time / count
        key = f"{a}_{b}"
        heatmap[key] = {
            "avg_effective": round(avg_effective, 1),
            "count": count,
            "wrong_count": wrong_count,
        }

    # Retrieve overall world stats by summing over the agg_pair table.
    cur.execute(
        """
      SELECT SUM(total_effective_time), SUM(count)
      FROM agg_pair
    """
    )
    world_row = cur.fetchone()
    if world_row and world_row[1]:
        world_avg = world_row[0] / world_row[1]
        world_count = world_row[1]
    else:
        world_avg, world_count = 0, 0

    # Retrieve per-user stats from agg_user.
    cur.execute(
        """
      SELECT total_effective_time, count
      FROM agg_user
      WHERE user_id = ?
    """,
        (user_id,),
    )
    user_row = cur.fetchone()
    if user_row and user_row[1]:
        user_avg = user_row[0] / user_row[1]
        user_count = user_row[1]
    else:
        user_avg, user_count = 0, 0

    conn.close()

    return jsonify(
        {
            "heatmap": heatmap,
            "user_avg": user_avg,
            "user_count": user_count,
            "world_avg": world_avg,
            "world_count": world_count,
        }
    )


@app.route("/pizza/join", methods=["POST"])
def join_pizza_party() -> Dict[str, Any]:
    """
    Join a pizza party with attendee preferences.

    Returns:
        Dict[str, Any]: JSON response with success status and optional override info
    """
    data = request.get_json()
    party_id = data.get("partyNumber")
    name = data.get("name")
    custom_pizza = data.get("custom_pizza", {})
    existing_pizza_slices = data.get("existingPizza_slicesWanted", {})

    # Calculate total slice count from custom pizza and existing pizza selections
    custom_slices = custom_pizza.get("sliceCount", 0)
    existing_slices = (
        sum(existing_pizza_slices.values()) if existing_pizza_slices else 0
    )
    total_slice_count = custom_slices + existing_slices

    # Get preferences from custom pizza
    preferences = custom_pizza.get("preferences", {})

    if not all([party_id, name]) or total_slice_count <= 0:
        return (
            jsonify(
                {
                    "error": "Party ID, name, and at least one slice selection are required"
                }
            ),
            400,
        )

    # Validate party ID format (4 characters, letters and numbers)
    if not party_id or len(party_id) != 4 or not party_id.isalnum():
        return (
            jsonify(
                {"error": "Party ID must be exactly 4 characters (letters and numbers)"}
            ),
            400,
        )

    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()

    try:
        # Check if someone with this name has already joined this party
        cur.execute(
            """
            SELECT id FROM pizza_attendees 
            WHERE party_number = ? AND name = ?
        """,
            (party_id.upper(), name),
        )

        if cur.fetchone():
            return (
                jsonify(
                    {
                        "error": f"Someone with the name '{name}' has already joined this party. Please use a different name or ask the party organizer for help."
                    }
                ),
                400,
            )

        # Check for attendee overrides
        override_info = None
        print(f"DEBUG: Checking overrides for name: {name}")  # Debug log
        for override in ATTENDEE_OVERRIDES:
            if name in override["names"]:
                print(f"DEBUG: Found override for {name}")  # Debug log
                # Check if the Boss of this attendee e.g. Evelyn is already in this party
                cur.execute(
                    """
                    SELECT id FROM pizza_attendees 
                    WHERE party_number = ? AND name = ?
                """,
                    (party_id.upper(), override["trigger_name"]),
                )

                boss = cur.fetchone()
                print(f"DEBUG: Evelyn attendee found: {boss}")  # Debug log
                if boss:
                    override_info = override
                    # Get the Boss's preferences
                    cur.execute(
                        """
                        SELECT ingredient, preference FROM pizza_preferences 
                        WHERE attendee_id = ?
                    """,
                        (boss[0],),
                    )
                    evelyn_preferences = dict(cur.fetchall())
                    print(
                        f"DEBUG: Evelyn preferences: {evelyn_preferences}"
                    )  # Debug log
                    # Override the current preferences with the Boss's preferences
                    preferences = evelyn_preferences
                    print(
                        f"DEBUG: Preference override triggered from {name} -> {override['trigger_name']}!"
                    )  # Debug log
                    break

        # Insert attendee
        cur.execute(
            """
            INSERT INTO pizza_attendees (party_number, name, slice_count)
            VALUES (?, ?, ?)
        """,
            (party_id.upper(), name, total_slice_count),
        )

        attendee_id = cur.lastrowid

        # Insert preferences for each ingredient
        for ingredient in PIZZA_INGREDIENTS:
            preference = preferences.get(ingredient, 1)  # Default to indifferent
            cur.execute(
                """
                INSERT INTO pizza_preferences (attendee_id, ingredient, preference)
                VALUES (?, ?, ?)
            """,
                (attendee_id, ingredient, preference),
            )

        # Insert existing pizza selections
        for pizza_type, slice_count in existing_pizza_slices.items():
            if slice_count > 0:
                cur.execute(
                    """
                    INSERT INTO pizza_selections (attendee_id, pizza_type, slice_count)
                    VALUES (?, ?, ?)
                """,
                    (attendee_id, pizza_type, slice_count),
                )

        conn.commit()
        conn.close()

        response_data = {
            "success": True,
            "message": "Successfully joined the pizza party!",
        }

        # Add override info if applicable
        if override_info:
            response_data["override"] = {
                "image": override_info["override_image"],
                "message": override_info["override_message"],
            }

        return jsonify(response_data)
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500


@app.route("/pizza/ingredients", methods=["GET"])
def get_pizza_ingredients() -> Dict[str, Any]:
    """
    Get all available pizza ingredients with categories and icons.

    Returns:
        Dict[str, Any]: JSON response with complete ingredients data
    """
    return jsonify(INGREDIENTS_DATA)


@app.route("/pizza/available", methods=["GET"])
def get_available_pizzas() -> Dict[str, Any]:
    """
    Get all available pizzas (hardcoded + custom created ones).

    Returns:
        Dict[str, Any]: JSON response with hardcoded and custom pizzas
    """
    # Hardcoded pizzas
    hardcoded_pizzas = [
        {
            "id": "pepperoni",
            "name": "Pepperoni",
            "ingredients": ["pepperoni"],
            "type": "hardcoded",
        },
        {"id": "cheese", "name": "Cheese", "ingredients": [], "type": "hardcoded"},
        {
            "id": "pineapple-ham",
            "name": "Pineapple and Ham",
            "ingredients": ["pineapple", "ham"],
            "type": "hardcoded",
        },
        {
            "id": "spinach-tomato-pineapple",
            "name": "Spinach, Tomatoes and Pineapple",
            "ingredients": ["spinach", "tomatoes", "pineapple"],
            "type": "hardcoded",
        },
    ]

    # Get custom pizzas from database
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()

    try:
        # Get all named pizzas with their ingredients
        cur.execute(
            """
            SELECT np.id, np.name, GROUP_CONCAT(npi.ingredient, ',') as ingredients
            FROM named_pizzas np
            LEFT JOIN named_pizzas_ingredients npi ON np.id = npi.pizza_id
            GROUP BY np.id, np.name
            ORDER BY np.timestamp DESC
        """
        )

        custom_pizzas_data = cur.fetchall()
        custom_pizzas = []

        for pizza_id, name, ingredients_str in custom_pizzas_data:
            ingredients = ingredients_str.split(",") if ingredients_str else []
            custom_pizzas.append(
                {
                    "id": f"custom_{pizza_id}",
                    "name": name,
                    "ingredients": ingredients,
                    "type": "custom",
                }
            )

        conn.close()

        return jsonify(
            {
                "hardcoded_pizzas": hardcoded_pizzas,
                "custom_pizzas": custom_pizzas,
                "all_pizzas": hardcoded_pizzas + custom_pizzas,
            }
        )

    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500


@app.route("/pizza/create", methods=["POST"])
def create_pizza() -> Dict[str, Any]:
    """
    Create a named pizza for all parties.

    Returns:
        Dict[str, Any]: JSON response with success status
    """
    data = request.get_json()
    pizza_name = data.get("pizzaName")
    ingredients = data.get("ingredients", [])

    if not pizza_name:
        return jsonify({"error": "Pizza name is required"}), 400

    if not ingredients:
        return jsonify({"error": "At least one ingredient is required"}), 400

    if len(ingredients) > 3:
        return jsonify({"error": "Maximum of 3 ingredients allowed"}), 400

    # Validate ingredients against available list
    valid_ingredients = set(PIZZA_INGREDIENTS)
    for ingredient in ingredients:
        if ingredient not in valid_ingredients:
            return jsonify({"error": f"Invalid ingredient: {ingredient}"}), 400

    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()

    try:
        # Check if pizza name already exists
        cur.execute("SELECT id FROM named_pizzas WHERE name = ?", (pizza_name,))
        if cur.fetchone():
            return (
                jsonify({"error": f"Pizza with name '{pizza_name}' already exists"}),
                400,
            )

        # Insert the named pizza
        cur.execute("INSERT INTO named_pizzas (name) VALUES (?)", (pizza_name,))
        pizza_id = cur.lastrowid

        # Insert the ingredients
        for ingredient in ingredients:
            cur.execute(
                "INSERT INTO named_pizzas_ingredients (pizza_id, ingredient) VALUES (?, ?)",
                (pizza_id, ingredient),
            )

        conn.commit()
        conn.close()

        return jsonify(
            {
                "success": True,
                "message": f"Pizza '{pizza_name}' created successfully!",
                "pizza_id": pizza_id,
            }
        )

    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500


@app.route("/pizza/summary/<party_id>", methods=["GET"])
def get_pizza_party_summary(party_id: str) -> Dict[str, Any]:
    """
    Get pizza party summary with attendee data and calculated pizza orders.

    Args:
        party_id (str): 4-character alphanumeric party identifier

    Returns:
        Dict[str, Any]: JSON response with party summary, attendee list,
                       total slices, top ingredients, and pizza orders
    """
    # Validate party ID format
    if not party_id or len(party_id) != 4 or not party_id.isalnum():
        return jsonify({"error": "Invalid party ID format"}), 400

    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()

    try:
        # Get all attendees for this party
        cur.execute(
            """
            SELECT id, name, slice_count
            FROM pizza_attendees
            WHERE party_number = ?
            ORDER BY timestamp
        """,
            (party_id.upper(),),
        )

        attendees = cur.fetchall()

        if not attendees:
            return jsonify({"error": "No party found with that ID"}), 404

        # Calculate totals
        total_slices = sum(attendee[2] for attendee in attendees)
        names = [attendee[1] for attendee in attendees]

        # Get all preferences for this party
        attendee_ids = [attendee[0] for attendee in attendees]
        placeholders = ",".join(["?" for _ in attendee_ids])

        cur.execute(
            f"""
            SELECT attendee_id, ingredient, preference
            FROM pizza_preferences
            WHERE attendee_id IN ({placeholders})
        """,
            attendee_ids,
        )

        preferences_data = cur.fetchall()

        # Organize preferences by attendee
        attendee_preferences = {}
        for attendee_id, ingredient, preference in preferences_data:
            if attendee_id not in attendee_preferences:
                attendee_preferences[attendee_id] = {}
            attendee_preferences[attendee_id][ingredient] = preference

        # Create preference collections (group attendees with same preferences)
        preference_collections = {}
        for attendee_id, name, slice_count in attendees:
            if attendee_id in attendee_preferences:
                # Create a tuple of preferences as the key
                pref_tuple = tuple(sorted(attendee_preferences[attendee_id].items()))

                if pref_tuple not in preference_collections:
                    preference_collections[pref_tuple] = {
                        "total_slices": 0,
                        "attendees": [],
                        "preferences": dict(pref_tuple),
                    }

                preference_collections[pref_tuple]["total_slices"] += slice_count
                preference_collections[pref_tuple]["attendees"].append(name)

        # Sort collections by total slices descending
        sorted_collections = sorted(
            preference_collections.items(),
            key=lambda x: x[1]["total_slices"],
            reverse=True,
        )

        # Format preference collections for display
        formatted_collections = []
        for pref_tuple, collection_data in sorted_collections:
            wants = []
            cant_haves = []

            for ingredient, preference in collection_data["preferences"].items():
                if preference == 2:  # Want
                    wants.append(ingredient)
                elif preference == 0:  # Can't have
                    cant_haves.append(ingredient)

            # Create description
            description_parts = []
            if wants:
                description_parts.append(f"WANT {', '.join(wants)}")
            if cant_haves:
                description_parts.append(f"CAN'T HAVE {', '.join(cant_haves)}")
            if not wants and not cant_haves:
                description_parts.append("indifferent to all")

            description = ", ".join(description_parts)

            formatted_collections.append(
                {
                    "slices": collection_data["total_slices"],
                    "description": description,
                    "attendees": collection_data["attendees"],
                }
            )

        # Organize preferences by ingredient (for pizza calculation)
        ingredient_scores = {}
        for attendee_id, ingredient, preference in preferences_data:
            if ingredient not in ingredient_scores:
                ingredient_scores[ingredient] = []
            ingredient_scores[ingredient].append(preference)

        # Calculate optimal pizza orders with attendee assignments
        ai_generated_orders = calculate_pizza_orders(
            attendees, ingredient_scores, preferences_data
        )

        # Calculate comprehensive pizza orders including existing selections
        comprehensive_pizza_orders = calculate_comprehensive_pizza_orders(
            party_id, attendees, preferences_data, cur
        )

        # Get top 3 most wanted ingredients
        top_ingredients = []
        for ingredient in PIZZA_INGREDIENTS:
            if ingredient in ingredient_scores:
                want_count = sum(
                    1 for pref in ingredient_scores[ingredient] if pref == 2
                )
                if want_count > 0:
                    top_ingredients.append((ingredient, want_count))

        top_ingredients.sort(key=lambda x: x[1], reverse=True)
        top_3_ingredients = top_ingredients[:3]

        conn.close()

        return jsonify(
            {
                "party_number": party_id.upper(),
                "attendees": names,
                "total_slices": total_slices,
                "top_ingredients": top_3_ingredients,
                "pizza_orders": ai_generated_orders,  # Keep the AI-generated orders for backward compatibility
                "comprehensive_pizza_orders": comprehensive_pizza_orders,  # New comprehensive orders
                "preference_collections": formatted_collections,
            }
        )
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500


def calculate_pizza_orders(
    attendees: List[Tuple[int, str, int]],
    ingredient_scores: Dict[str, List[int]],
    preferences_data: List[Tuple[int, str, int]],
) -> List[Dict[str, Any]]:
    """
    Calculate optimal pizza orders based on attendee preferences.

    This function analyzes the collective preferences of all attendees and creates
    a list of pizza orders that maximizes satisfaction while considering constraints
    like total slices needed and ingredient popularity.

    Args:
        attendees (List[Tuple[int, str, int]]): List of attendee data tuples
            Each tuple contains: (attendee_id: int, name: str, slice_count: int)
        ingredient_scores (Dict[str, List[int]]): Dictionary mapping ingredient names
            to lists of preference scores for each attendee.
            Preference values: 0 = will not eat, 1 = indifferent, 2 = want to eat
            Example: {"pepperoni": [2, 1, 0, 2], "mushrooms": [1, 2, 1, 1]}
        preferences_data (List[Tuple[int, str, int]]): Raw preference data
            Each tuple contains: (attendee_id: int, ingredient: str, preference: int)

    Returns:
        List[Dict[str, Any]]: List of pizza order dictionaries, each containing:
            - "type" (str): Name of the pizza (e.g., "Pepperoni Pizza", "Plain Cheese")
            - "ingredients" (List[str]): List of ingredient names on this pizza
            - "slices" (int): Number of slices (always 10)
            - "description" (str): Human-readable description of the pizza
            - "target_eaters" (List[str]): Names of attendees who will enjoy this pizza

    Algorithm:
        1. Calculate total slices needed and required pizzas (10 slices per pizza)
        2. Score each ingredient based on (want_count - avoid_count) / total_people
        3. Always include a plain cheese pizza for everyone
        4. Create specialty pizzas for highly preferred ingredients (score > 0.2)
        5. If space allows, create combination pizzas with top ingredients
        6. Determine who will eat each pizza based on preferences
    """
    total_slices = sum(attendee[2] for attendee in attendees)
    total_pizzas_needed = (total_slices + 9) // 10  # Round up

    # Create attendee preferences lookup
    attendee_preferences = {}
    attendee_names = {attendee[0]: attendee[1] for attendee in attendees}

    for attendee_id, ingredient, preference in preferences_data:
        if attendee_id not in attendee_preferences:
            attendee_preferences[attendee_id] = {}
        attendee_preferences[attendee_id][ingredient] = preference

    # Helper function to find who will enjoy a pizza
    def get_pizza_eaters(pizza_ingredients: List[str]) -> List[str]:
        eaters = []
        for attendee_id, prefs in attendee_preferences.items():
            can_eat = True
            wants_it = False

            for ingredient in pizza_ingredients:
                if prefs.get(ingredient, 1) == 0:  # Will not eat
                    can_eat = False
                    break
                elif prefs.get(ingredient, 1) == 2:  # Wants it
                    wants_it = True

            # Include if they can eat it and either want it or are indifferent to all ingredients
            if can_eat and (wants_it or len(pizza_ingredients) == 0):
                eaters.append(attendee_names[attendee_id])
            elif (
                can_eat and not pizza_ingredients
            ):  # Plain cheese - everyone who can eat it
                eaters.append(attendee_names[attendee_id])

        return eaters

    # Calculate ingredient popularity scores
    ingredient_popularity: Dict[str, float] = {}
    for ingredient, preferences in ingredient_scores.items():
        want_count = sum(1 for pref in preferences if pref == 2)
        avoid_count = sum(1 for pref in preferences if pref == 0)
        total_people = len(preferences)

        # Score: (want - avoid) / total_people
        score = (want_count - avoid_count) / total_people
        ingredient_popularity[ingredient] = score

    # Sort ingredients by popularity
    sorted_ingredients: List[Tuple[str, float]] = sorted(
        ingredient_popularity.items(), key=lambda x: x[1], reverse=True
    )

    # Create pizza orders
    pizza_orders: List[Dict[str, Any]] = []

    # Plain cheese pizza (always needed)
    cheese_eaters = get_pizza_eaters([])
    pizza_orders.append(
        {
            "type": "Plain Cheese",
            "ingredients": [],
            "slices": 10,
            "description": "Classic cheese pizza for everyone",
            "target_eaters": cheese_eaters,
        }
    )

    # Create specialty pizzas based on preferences
    specialty_pizzas_created: int = 0
    max_specialty_pizzas: int = max(
        0, total_pizzas_needed - 1
    )  # Leave room for plain pizza

    for ingredient, score in sorted_ingredients:
        if specialty_pizzas_created >= max_specialty_pizzas:
            break

        if score > 0.2:  # Only create if significantly wanted
            ingredient_eaters = get_pizza_eaters([ingredient])
            pizza_orders.append(
                {
                    "type": f"{ingredient.title()} Pizza",
                    "ingredients": [ingredient],
                    "slices": 10,
                    "description": f"Pizza with {ingredient} topping",
                    "target_eaters": ingredient_eaters,
                }
            )
            specialty_pizzas_created += 1

    # If we have room for more pizzas, create combination pizzas
    remaining_pizzas: int = max_specialty_pizzas - specialty_pizzas_created
    if remaining_pizzas > 0:
        # Create combination pizzas with top ingredients
        top_ingredients: List[str] = [
            ing for ing, score in sorted_ingredients[:4] if score > 0.1
        ]
        if len(top_ingredients) >= 2:
            supreme_ingredients = top_ingredients[:3]  # Max 3 ingredients per combo
            supreme_eaters = get_pizza_eaters(supreme_ingredients)
            pizza_orders.append(
                {
                    "type": "Supreme Pizza",
                    "ingredients": supreme_ingredients,
                    "slices": 10,
                    "description": f"Combination pizza with {', '.join(supreme_ingredients)}",
                    "target_eaters": supreme_eaters,
                }
            )

    return pizza_orders


def format_pizza_count(slices: int) -> str:
    """
    Format pizza count based on 8 slices per pizza, rounded up to nearest 4.
    
    Args:
        slices (int): Number of slices needed
        
    Returns:
        str: Formatted pizza count string (e.g., "1 1/2 pizzas, 2 slices excess")
    """
    slices_per_pizza = 8
    whole_pizzas = slices // slices_per_pizza
    remaining_slices = slices % slices_per_pizza
    
    # Round up remaining slices to nearest 4
    rounded_up_slices = ((remaining_slices + 3) // 4) * 4 if remaining_slices > 0 else 0
    excess_slices = rounded_up_slices - remaining_slices
    
    result = ""
    
    if whole_pizzas > 0:
        result += str(whole_pizzas)
        if rounded_up_slices > 0:
            if rounded_up_slices == 4:
                result += " 1/2"
            elif rounded_up_slices == 8:
                result += " 1"
            result += " pizzas"
        else:
            result += " pizza" if whole_pizzas == 1 else " pizzas"
    else:
        # Less than a full pizza
        if rounded_up_slices == 4:
            result = "1/2 pizza"
        elif rounded_up_slices == 8:
            result = "1 pizza"
        else:
            result = "1 pizza"  # fallback
    
    if excess_slices > 0:
        plural = "s" if excess_slices > 1 else ""
        result += f" ({excess_slices} slice{plural} excess)"
    
    return result


def calculate_comprehensive_pizza_orders(
    party_id: str,
    attendees: List[Tuple[int, str, int]],
    preferences_data: List[Tuple[int, str, int]],
    cur,
) -> List[Dict[str, Any]]:
    """
    Calculate comprehensive pizza orders including existing selections, custom pizzas, and AI recommendations.

    Args:
        party_id (str): The party ID
        attendees (List[Tuple[int, str, int]]): List of attendee data
        preferences_data (List[Tuple[int, str, int]]): Raw preference data
        cur: Database cursor

    Returns:
        List[Dict[str, Any]]: Comprehensive list of pizza orders with source information
    """
    comprehensive_orders = []

    # Create attendee preferences and names lookup
    attendee_preferences = {}
    attendee_names = {attendee[0]: attendee[1] for attendee in attendees}

    for attendee_id, ingredient, preference in preferences_data:
        if attendee_id not in attendee_preferences:
            attendee_preferences[attendee_id] = {}
        attendee_preferences[attendee_id][ingredient] = preference

    # Helper function to find who will enjoy a pizza
    def get_pizza_eaters(pizza_ingredients: List[str]) -> List[str]:
        eaters = []
        for attendee_id, prefs in attendee_preferences.items():
            can_eat = True
            wants_it = False

            for ingredient in pizza_ingredients:
                if prefs.get(ingredient, 1) == 0:  # Will not eat
                    can_eat = False
                    break
                elif prefs.get(ingredient, 1) == 2:  # Wants it
                    wants_it = True

            # Include if they can eat it and either want it or are indifferent to all ingredients
            if can_eat and (wants_it or len(pizza_ingredients) == 0):
                eaters.append(attendee_names[attendee_id])
            elif (
                can_eat and not pizza_ingredients
            ):  # Plain cheese - everyone who can eat it
                eaters.append(attendee_names[attendee_id])

        return eaters

    # 1. Get existing pizza selections (boring basic pizzas)
    attendee_ids = [attendee[0] for attendee in attendees]
    if attendee_ids:
        placeholders = ",".join(["?" for _ in attendee_ids])
        cur.execute(
            f"""
            SELECT ps.pizza_type, SUM(ps.slice_count) as total_slices,
                   GROUP_CONCAT(pa.name, ', ') as eater_names
            FROM pizza_selections ps
            JOIN pizza_attendees pa ON ps.attendee_id = pa.id
            WHERE ps.attendee_id IN ({placeholders})
            GROUP BY ps.pizza_type
            """,
            attendee_ids,
        )

        existing_selections = cur.fetchall()

        # Map pizza type IDs to their ingredients
        pizza_type_ingredients = {
            "pepperoni": ["pepperoni"],
            "cheese": [],
            "pineapple-ham": ["pineapple", "ham"],
            "spinach-tomato-pineapple": ["spinach", "tomatoes", "pineapple"],
        }

        # Add existing pizza orders
        for pizza_type, total_slices, eater_names in existing_selections:
            if total_slices > 0:
                ingredients = pizza_type_ingredients.get(pizza_type, [])
                pizza_name = pizza_type.replace("-", " ").title()

                comprehensive_orders.append(
                    {
                        "type": f"{pizza_name} (Boring Basic)",
                        "ingredients": ingredients,
                        "slices": total_slices,
                        "pizza_count": format_pizza_count(total_slices),
                        "description": f"Pre-selected {pizza_name.lower()} pizza",
                        "target_eaters": eater_names.split(", ") if eater_names else [],
                        "source": "boring_basic",
                        "calculation_method": "Selected by attendees from boring basic pizza options",
                    }
                )

    # 2. Get custom pizzas and their selections
    cur.execute(
        """
        SELECT np.name, GROUP_CONCAT(npi.ingredient, ',') as ingredients
        FROM named_pizzas np
        LEFT JOIN named_pizzas_ingredients npi ON np.id = npi.pizza_id
        GROUP BY np.id, np.name
        ORDER BY np.timestamp DESC
        """
    )

    custom_pizzas_data = cur.fetchall()

    # Check if any attendees selected custom pizzas
    for pizza_name, ingredients_str in custom_pizzas_data:
        ingredients = ingredients_str.split(",") if ingredients_str else []
        custom_pizza_id = f"custom_{pizza_name.lower().replace(' ', '_')}"

        # Check if anyone selected this custom pizza
        cur.execute(
            f"""
            SELECT SUM(ps.slice_count) as total_slices,
                   GROUP_CONCAT(pa.name, ', ') as eater_names
            FROM pizza_selections ps
            JOIN pizza_attendees pa ON ps.attendee_id = pa.id
            WHERE ps.pizza_type = ? AND ps.attendee_id IN ({placeholders})
            """,
            [custom_pizza_id] + attendee_ids,
        )

        custom_selection = cur.fetchone()
        if custom_selection and custom_selection[0] and custom_selection[0] > 0:
            comprehensive_orders.append(
                {
                    "type": f"{pizza_name} (Custom)",
                    "ingredients": ingredients,
                    "slices": custom_selection[0],
                    "pizza_count": format_pizza_count(custom_selection[0]),
                    "description": f"Custom created pizza: {pizza_name}",
                    "target_eaters": (
                        custom_selection[1].split(", ") if custom_selection[1] else []
                    ),
                    "source": "custom",
                    "calculation_method": "Created by community, selected by attendees",
                }
            )

    # 3. Add AI-generated recommendations
    # Organize preferences by ingredient for AI calculation
    ingredient_scores = {}
    for attendee_id, ingredient, preference in preferences_data:
        if ingredient not in ingredient_scores:
            ingredient_scores[ingredient] = []
        ingredient_scores[ingredient].append(preference)

    ai_orders = calculate_pizza_orders(attendees, ingredient_scores, preferences_data)

    for ai_order in ai_orders:
        ai_order["source"] = "ai_generated"
        ai_order["calculation_method"] = (
            "AI-optimized based on attendee preferences and slice requirements"
        )
        ai_order["pizza_count"] = format_pizza_count(ai_order["slices"])
        ai_order["type"] = f"{ai_order['type']} (AI Recommended)"
        comprehensive_orders.append(ai_order)

    return comprehensive_orders


if __name__ == "__main__":
    app.run(debug=True)
