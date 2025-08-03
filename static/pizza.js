// Pizza Party JavaScript

document.addEventListener("DOMContentLoaded", function () {
  // Get all the containers
  const startScreen = document.getElementById("startScreen");
  const eaterContainer = document.getElementById("eaterContainer");
  const plannerContainer = document.getElementById("plannerContainer");
  const plannerResultsContainer = document.getElementById(
    "plannerResultsContainer",
  );
  const overrideContainer = document.getElementById("overrideContainer");

  // Get all the buttons
  const plannerButton = document.getElementById("plannerButton");
  const eaterButton = document.getElementById("eaterButton");
  const backToHome = document.getElementById("backToHome");
  const backToHomePlanner = document.getElementById("backToHomePlanner");
  const backToPlanner = document.getElementById("backToPlanner");
  const backToHomeFromOverride = document.getElementById(
    "backToHomeFromOverride",
  );

  // Get forms
  const eaterForm = document.getElementById("eaterForm");
  const plannerForm = document.getElementById("plannerForm");

  // Initialize ingredient preferences table
  let ingredientPreferences = {};

  // Populate ingredient table when eater screen is shown
  function populateIngredientTable() {
    const tableBody = document.getElementById("ingredientTableBody");
    if (!tableBody) return;

    // Clear existing content
    tableBody.innerHTML = "";

    // Default ingredients (will be replaced by API call)
    const defaultIngredients = [
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
    ];

    // Ingredient icons mapping
    const ingredientIcons = {
      pepperoni: "🍕",
      mushrooms: "🍄",
      sausage: "🌭",
      bacon: "🥓",
      ham: "🥩",
      chicken: "🍗",
      beef: "🥩",
      anchovies: "🐟",
      olives: "🫒",
      "bell-peppers": "🫑",
      onions: "🧅",
      tomatoes: "🍅",
      pineapple: "🍍",
      spinach: "🥬",
      artichokes: "🥬",
      "extra-cheese": "🧀",
      "vegan-cheese": "🧀",
      basil: "🌿",
      garlic: "🧄",
    };

    defaultIngredients.forEach((ingredient) => {
      const icon = ingredientIcons[ingredient] || "🍕";
      const displayName =
        ingredient.charAt(0).toUpperCase() +
        ingredient.slice(1).replace("-", " ");
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${icon} ${displayName}</td>
                <td><input type="radio" name="pref_${ingredient}" value="0" id="pref_${ingredient}_0"><label for="pref_${ingredient}_0">❌</label></td>
                <td><input type="radio" name="pref_${ingredient}" value="1" id="pref_${ingredient}_1" checked><label for="pref_${ingredient}_1">😐</label></td>
                <td><input type="radio" name="pref_${ingredient}" value="2" id="pref_${ingredient}_2"><label for="pref_${ingredient}_2">❤️</label></td>
            `;
      tableBody.appendChild(row);
    });
  }

  // Navigation functions
  function showScreen(screen) {
    // Hide all screens
    startScreen.style.display = "none";
    eaterContainer.style.display = "none";
    plannerContainer.style.display = "none";
    plannerResultsContainer.style.display = "none";
    overrideContainer.style.display = "none";

    // Show the requested screen
    screen.style.display = "flex";
  }

  // Button event listeners
  plannerButton.addEventListener("click", () => {
    showScreen(plannerContainer);
    // Auto-focus the Pizza Party ID input field
    setTimeout(() => {
      document.getElementById("plannerPartyNumber").focus();
    }, 100);
  });

  eaterButton.addEventListener("click", () => {
    showScreen(eaterContainer);
    populateIngredientTable();
    // Auto-focus the first input field for better UX
    setTimeout(() => {
      document.getElementById("partyNumber").focus();
    }, 100);
  });

  backToHome.addEventListener("click", () => {
    showScreen(startScreen);
  });

  backToHomePlanner.addEventListener("click", () => {
    showScreen(startScreen);
  });

  backToPlanner.addEventListener("click", () => {
    showScreen(plannerContainer);
  });

  backToHomeFromOverride.addEventListener("click", () => {
    showScreen(startScreen);
  });

  // Eater form submission
  eaterForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(eaterForm);
    const partyId = formData.get("partyNumber");

    // Validate party ID format
    if (!partyId || partyId.length !== 4 || !/^[A-Za-z0-9]{4}$/.test(partyId)) {
      alert("Party ID must be exactly 4 characters (letters and numbers)");
      return;
    }

    // Collect ingredient preferences
    const preferences = {};
    const defaultIngredients = [
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
    ];

    defaultIngredients.forEach((ingredient) => {
      const selectedRadio = document.querySelector(
        `input[name="pref_${ingredient}"]:checked`,
      );
      if (selectedRadio) {
        preferences[ingredient] = parseInt(selectedRadio.value);
      } else {
        preferences[ingredient] = 1; // Default to indifferent
      }
    });

    const data = {
      partyNumber: partyId.toUpperCase(),
      name: formData.get("eaterName").toUpperCase(),
      sliceCount: parseInt(formData.get("sliceCount")),
      preferences: preferences,
    };

    try {
      const response = await fetch("/pizza/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

             if (result.success) {
         console.log("Join result:", result); // Debug log
         if (result.override) {
           console.log("Override triggered:", result.override); // Debug log
           // Show override screen
           document.getElementById("overrideMessage").textContent =
             result.override.message;
           document.getElementById("overrideImage").src = result.override.image;
           showScreen(overrideContainer);
         } else {
           alert("Successfully joined the pizza party! 🍕");
           eaterForm.reset();
           showScreen(startScreen);
         }
       } else {
         alert("Error: " + result.error);
       }
    } catch (error) {
      alert("Error joining party: " + error.message);
    }
  });

  // Planner form submission
  plannerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(plannerForm);
    const partyId = formData.get("plannerPartyNumber");

    // Validate party ID format
    if (!partyId || partyId.length !== 4 || !/^[A-Za-z0-9]{4}$/.test(partyId)) {
      alert("Party ID must be exactly 4 characters (letters and numbers)");
      return;
    }

    try {
      const response = await fetch(`/pizza/summary/${partyId.toUpperCase()}`);
      const result = await response.json();

      if (response.ok) {
        displayPartySummary(result);
        showScreen(plannerResultsContainer);
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      alert("Error fetching party summary: " + error.message);
    }
  });

  // Display party summary
  function displayPartySummary(data) {
    document.getElementById("partyNumberDisplay").textContent =
      data.party_number;

    // Display attendees
    const attendeesList = document.getElementById("attendeesList");
    attendeesList.innerHTML = data.attendees
      .map((name) => `<span class="attendee-tag">${name}</span>`)
      .join("");

    // Display total slices
    document.getElementById("totalSlices").textContent =
      `${data.total_slices} slices`;

    // Display top ingredients (new format)
    const topToppings = document.getElementById("topToppings");
    if (data.top_ingredients && data.top_ingredients.length > 0) {
      topToppings.innerHTML = data.top_ingredients
        .map(
          ([ingredient, count]) =>
            `<div class="topping-item">
                    <span>${ingredient}</span>
                    <span class="topping-count">${count}</span>
                </div>`,
        )
        .join("");
    } else {
      topToppings.innerHTML = "<p>No ingredient preferences recorded yet.</p>";
    }

    // Display pizza orders if available
    if (data.pizza_orders && data.pizza_orders.length > 0) {
      // Add pizza orders section if it doesn't exist
      let pizzaOrdersSection = document.getElementById("pizzaOrders");
      if (!pizzaOrdersSection) {
        const summaryContainer = document.querySelector(".party-summary");
        const pizzaOrdersDiv = document.createElement("div");
        pizzaOrdersDiv.className = "summary-card";
        pizzaOrdersDiv.innerHTML = `
                    <h3>🍕 Recommended Pizza Orders</h3>
                    <div id="pizzaOrders"></div>
                `;
        summaryContainer.appendChild(pizzaOrdersDiv);
      }

      pizzaOrdersSection = document.getElementById("pizzaOrders");
      pizzaOrdersSection.innerHTML = data.pizza_orders
        .map(
          (pizza) =>
            `<div class="pizza-order">
                    <h4>${pizza.type}</h4>
                    <p>${pizza.description}</p>
                    ${
                      pizza.ingredients.length > 0
                        ? `<p><strong>Ingredients:</strong> ${pizza.ingredients.join(", ")}</p>`
                        : "<p><strong>Ingredients:</strong> Cheese only</p>"
                    }
                </div>`,
        )
        .join("");
    }
  }
});
