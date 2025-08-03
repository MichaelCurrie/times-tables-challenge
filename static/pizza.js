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

    // Organized ingredients by category and alphabetically within each
    const ingredientCategories = {
      "MEAT": [
        "anchovies",
        "bacon", 
        "beef",
        "chicken",
        "ham",
        "pepperoni",
        "sausage"
      ],
      "VEGETABLES": [
        "artichokes",
        "bell-peppers",
        "mushrooms",
        "olives",
        "onions",
        "pineapple",
        "spinach",
        "tomatoes"
      ],
      "HERBS AND CHEESES": [
        "basil",
        "extra-cheese",
        "garlic",
        "vegan-cheese"
      ]
    };

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

    // Loop through each category and create sections
    Object.keys(ingredientCategories).forEach(categoryName => {
      // Create section header row
      const headerRow = document.createElement("tr");
      headerRow.innerHTML = `
        <td colspan="4" class="ingredient-category-header">
          <strong>${categoryName}</strong>
        </td>
      `;
      tableBody.appendChild(headerRow);

      // Add ingredients for this category
      ingredientCategories[categoryName].forEach((ingredient) => {
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

  // Add real-time case formatting for input fields
  function setupInputFormatting() {
    // Party ID fields - force uppercase
    const partyIdInputs = document.querySelectorAll('#partyNumber, #plannerPartyNumber');
    partyIdInputs.forEach(input => {
      input.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
      });
    });

    // Name field - force title case
    const nameInput = document.getElementById('eaterName');
    if (nameInput) {
      nameInput.addEventListener('input', function() {
        const value = this.value;
        if (value.length > 0) {
          this.value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }
      });
    }
  }

  // Initialize input formatting when DOM is loaded
  setupInputFormatting();
  
  // Check for party ID in URL and populate fields
  function populatePartyIdFromUrl() {
    const path = window.location.pathname;
    const partyIdMatch = path.match(/^\/([A-Za-z0-9]{4})$/);
    
    if (partyIdMatch) {
      const partyId = partyIdMatch[1].toUpperCase();
      
      // Populate both party ID fields
      const eaterPartyIdField = document.getElementById('partyNumber');
      const plannerPartyIdField = document.getElementById('plannerPartyNumber');
      
      if (eaterPartyIdField) {
        eaterPartyIdField.value = partyId;
      }
      if (plannerPartyIdField) {
        plannerPartyIdField.value = partyId;
      }
    }
  }
  
  // Initialize party ID population from URL
  populatePartyIdFromUrl();
  
  // Setup share button functionality
  function setupShareButton() {
    const shareButton = document.getElementById('shareButton');
    const shareSection = document.getElementById('shareSection');
    
    if (shareButton) {
      shareButton.addEventListener('click', async () => {
        const path = window.location.pathname;
        const partyIdMatch = path.match(/^\/([A-Za-z0-9]{4})$/);
        
        if (partyIdMatch) {
          const partyId = partyIdMatch[1].toUpperCase();
          const shareUrl = `https://slicetomeetyou.com/${partyId}`;
          
          if (navigator.share) {
            // Use native sharing if available
            try {
              await navigator.share({
                title: 'Join my Pizza Party!',
                text: `Join my pizza party! Use party ID: ${partyId}`,
                url: shareUrl
              });
            } catch (err) {
              // Fallback to clipboard if user cancels
              copyToClipboard(shareUrl);
            }
          } else {
            // Fallback to clipboard
            copyToClipboard(shareUrl);
          }
        } else {
          // No party ID in URL, show message
          alert('Please enter a party ID first to share!');
        }
      });
    }
  }
  
  // Copy text to clipboard
  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Party link copied to clipboard!');
      }).catch(() => {
        fallbackCopyToClipboard(text);
      });
    } else {
      fallbackCopyToClipboard(text);
    }
  }
  
  // Fallback copy method for older browsers
  function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      alert('Party link copied to clipboard!');
    } catch (err) {
      alert('Failed to copy link. Please copy manually: ' + text);
    }
    
    document.body.removeChild(textArea);
  }
  
  // Show/hide share button based on party ID presence
  function updateShareButtonVisibility() {
    const path = window.location.pathname;
    const partyIdMatch = path.match(/^\/([A-Za-z0-9]{4})$/);
    const shareSection = document.getElementById('shareSection');
    
    if (shareSection) {
      if (partyIdMatch) {
        shareSection.style.display = 'flex';
      } else {
        shareSection.style.display = 'none';
      }
    }
  }
  
  // Initialize share functionality
  setupShareButton();
  updateShareButtonVisibility();
  
  // Setup pizza slice spinners functionality
  function setupPizzaSliceSpinners() {
    const spinnerButtons = document.querySelectorAll('.mini-spinner-btn');
    
    spinnerButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering pizza option selection
        
        const pizzaType = button.getAttribute('data-pizza');
        const action = button.getAttribute('data-action');
        const input = document.querySelector(`input[data-pizza="${pizzaType}"]`);
        
        if (input) {
          let currentValue = parseInt(input.value);
          
          if (action === 'decrease' && currentValue > 0) {
            input.value = currentValue - 1;
          } else if (action === 'increase' && currentValue < 10) {
            input.value = currentValue + 1;
          }
        }
      });
    });
  }
  
  // Setup custom pizza slice spinner functionality
  function setupCustomSliceSpinner() {
    const decreaseBtn = document.getElementById('decreaseCustomSlices');
    const increaseBtn = document.getElementById('increaseCustomSlices');
    const sliceInput = document.getElementById('customSliceCount');
    
    if (decreaseBtn && increaseBtn && sliceInput) {
      decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(sliceInput.value);
        if (currentValue > 0) {
          sliceInput.value = currentValue - 1;
        }
      });
      
      increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(sliceInput.value);
        if (currentValue < 20) {
          sliceInput.value = currentValue + 1;
        }
      });
    }
  }
  
  // Setup pizza option selection (no longer needed with radio buttons removed)
  function setupPizzaOptions() {
    // No radio button functionality needed anymore
  }
  
  // Initialize pizza slice spinners and pizza options
  setupPizzaSliceSpinners();
  setupCustomSliceSpinner();
  setupPizzaOptions();

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

    // Collect ingredient preferences for custom pizza
    const preferences = {};
    
    // Get all ingredients from all categories (flattened)
    const allIngredients = [
      // MEAT
      "anchovies", "bacon", "beef", "chicken", "ham", "pepperoni", "sausage",
      // VEGETABLES  
      "artichokes", "bell-peppers", "mushrooms", "olives", "onions", "pineapple", "spinach", "tomatoes",
      // HERBS AND CHEESES
      "basil", "extra-cheese", "garlic", "vegan-cheese"
    ];

    // Set all preferences to indifferent by default
    allIngredients.forEach((ingredient) => {
      preferences[ingredient] = 1; // Default to indifferent
    });

    // Override with custom preferences if user made any changes
    allIngredients.forEach((ingredient) => {
      const selectedRadio = document.querySelector(
        `input[name="pref_${ingredient}"]:checked`,
      );
      if (selectedRadio) {
        preferences[ingredient] = parseInt(selectedRadio.value);
      }
    });

    // Calculate total slices from all pizza selections
    const pizzaSliceInputs = document.querySelectorAll('.pizza-slice-input');
    let totalSlices = 0;
    const existingPizza_slicesWanted = {};
    
    pizzaSliceInputs.forEach(input => {
      const pizzaType = input.getAttribute('data-pizza');
      const slices = parseInt(input.value) || 0;
      if (slices > 0) {
        existingPizza_slicesWanted[pizzaType] = slices;
      }
      totalSlices += slices;
    });
    
    // Add custom pizza slices
    const customSlices = parseInt(formData.get("customSliceCount")) || 0;
    totalSlices += customSlices;
    
    const data = {
      partyNumber: partyId.toUpperCase(),
      name: formData.get("eaterName").charAt(0).toUpperCase() + formData.get("eaterName").slice(1).toLowerCase(),
      custom_pizza: {
        sliceCount: customSlices,
        preferences: preferences
      },
      existingPizza_slicesWanted: existingPizza_slicesWanted
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

    // Update attendees header with count
    const attendeesHeader = document.querySelector('.summary-card h3');
    if (attendeesHeader && attendeesHeader.textContent.includes('👥 Attendees')) {
      attendeesHeader.textContent = `👥 Attendees (${data.attendees.length})`;
    }

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

    // Display preference collections if available
    const preferenceCollections = document.getElementById(
      "preferenceCollections",
    );
    if (data.preference_collections && data.preference_collections.length > 0) {
      preferenceCollections.innerHTML = data.preference_collections
        .map(
          (collection) =>
            `<div class="preference-collection">
                     <div class="collection-header">
                         <span class="collection-slices">${collection.slices} slices</span>
                         <span class="collection-description">${collection.description}</span>
                     </div>
                     <div class="collection-attendees">
                         <small>(${collection.attendees.join(", ")})</small>
                     </div>
                 </div>`,
        )
        .join("");
    } else {
      preferenceCollections.innerHTML =
        "<p>No preference collections available.</p>";
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
