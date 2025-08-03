from flask import Flask, request, jsonify, render_template
import sqlite3
import os
from typing import List, Dict, Tuple, Optional, Any

app = Flask(__name__)
DATABASE = "data.db"

# Available pizza ingredients
PIZZA_INGREDIENTS: List[str] = [
    "pepperoni",
    "mushrooms",
    "sausage",
    "bacon",
    "ham",
    "chicken",
    "beef",
    "anchovies",
    "olives",
    "bell-peppers",
    "onions",
    "tomatoes",
    "pineapple",
    "spinach",
    "artichokes",
    "extra-cheese",
    "vegan-cheese",
    "basil",
    "garlic",
]

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
    slice_count = data.get("sliceCount")
    preferences = data.get("preferences", {})

    if not all([party_id, name, slice_count]):
        return jsonify({"error": "Party ID, name, and slice count are required"}), 400

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
                # Check if Evelyn is already in this party
                cur.execute(
                    """
                    SELECT id FROM pizza_attendees 
                    WHERE party_number = ? AND name = ?
                """,
                    (party_id.upper(), override["trigger_name"]),
                )

                evelyn_attendee = cur.fetchone()
                print(f"DEBUG: Evelyn attendee found: {evelyn_attendee}")  # Debug log
                if evelyn_attendee:
                    override_info = override
                    # Get Evelyn's preferences
                    cur.execute(
                        """
                        SELECT ingredient, preference FROM pizza_preferences 
                        WHERE attendee_id = ?
                    """,
                        (evelyn_attendee[0],),
                    )
                    evelyn_preferences = dict(cur.fetchall())
                    print(f"DEBUG: Evelyn preferences: {evelyn_preferences}")  # Debug log
                    # Override the current preferences with Evelyn's preferences
                    preferences = evelyn_preferences
                    print(f"DEBUG: Override triggered!")  # Debug log
                    break

        # Insert attendee
        cur.execute(
            """
            INSERT INTO pizza_attendees (party_number, name, slice_count)
            VALUES (?, ?, ?)
        """,
            (party_id.upper(), name, slice_count),
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
def get_pizza_ingredients() -> Dict[str, List[str]]:
    """
    Get list of available pizza ingredients.

    Returns:
        Dict[str, List[str]]: JSON response with list of ingredient names
    """
    return jsonify({"ingredients": PIZZA_INGREDIENTS})


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

        # Organize preferences by ingredient
        ingredient_scores = {}
        for attendee_id, ingredient, preference in preferences_data:
            if ingredient not in ingredient_scores:
                ingredient_scores[ingredient] = []
            ingredient_scores[ingredient].append(preference)

        # Calculate optimal pizza orders
        pizza_orders = calculate_pizza_orders(attendees, ingredient_scores)

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
                "pizza_orders": pizza_orders,
            }
        )
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500


def calculate_pizza_orders(
    attendees: List[Tuple[int, str, int]], ingredient_scores: Dict[str, List[int]]
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

    Returns:
        List[Dict[str, Any]]: List of pizza order dictionaries, each containing:
            - "type" (str): Name of the pizza (e.g., "Pepperoni Pizza", "Plain Cheese")
            - "ingredients" (List[str]): List of ingredient names on this pizza
            - "slices" (int): Number of slices (always 10)
            - "description" (str): Human-readable description of the pizza

    Algorithm:
        1. Calculate total slices needed and required pizzas (10 slices per pizza)
        2. Score each ingredient based on (want_count - avoid_count) / total_people
        3. Always include a plain cheese pizza for everyone
        4. Create specialty pizzas for highly preferred ingredients (score > 0.2)
        5. If space allows, create combination pizzas with top ingredients
    """
    total_slices = sum(attendee[2] for attendee in attendees)
    total_pizzas_needed = (total_slices + 9) // 10  # Round up

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
    pizza_orders.append(
        {
            "type": "Plain Cheese",
            "ingredients": [],
            "slices": 10,
            "description": "Classic cheese pizza for everyone",
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
            pizza_orders.append(
                {
                    "type": f"{ingredient.title()} Pizza",
                    "ingredients": [ingredient],
                    "slices": 10,
                    "description": f"Pizza with {ingredient} topping",
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
            pizza_orders.append(
                {
                    "type": "Supreme Pizza",
                    "ingredients": top_ingredients[:3],  # Max 3 ingredients per combo
                    "slices": 10,
                    "description": f"Combination pizza with {', '.join(top_ingredients[:3])}",
                }
            )

    return pizza_orders


if __name__ == "__main__":
    app.run(debug=True)
