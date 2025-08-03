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
  const creatorContainer = document.getElementById("creatorContainer");

  // Get all the buttons
  const plannerButton = document.getElementById("plannerButton");
  const eaterButton = document.getElementById("eaterButton");
  const creatorButton = document.getElementById("creatorButton");
  const backToHome = document.getElementById("backToHome");
  const backToHomePlanner = document.getElementById("backToHomePlanner");
  const backToPlanner = document.getElementById("backToPlanner");
  const backToHomeFromOverride = document.getElementById(
    "backToHomeFromOverride",
  );
  const backToHomeFromCreator = document.getElementById(
    "backToHomeFromCreator",
  );

  // Get forms
  const eaterForm = document.getElementById("eaterForm");
  const plannerForm = document.getElementById("plannerForm");
  const creatorForm = document.getElementById("creatorForm");

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
      MEAT: [
        "anchovies",
        "bacon",
        "beef",
        "chicken",
        "ham",
        "pepperoni",
        "sausage",
      ],
      VEGETABLES: [
        "artichokes",
        "bell-peppers",
        "mushrooms",
        "olives",
        "onions",
        "pineapple",
        "spinach",
        "tomatoes",
      ],
      "HERBS AND CHEESES": ["basil", "extra-cheese", "garlic", "vegan-cheese"],
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
    Object.keys(ingredientCategories).forEach((categoryName) => {
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

    // Initialize the limit checking after table is populated
    setTimeout(() => {
      setupIngredientLimits();
      checkAndEnforceWantLimit();
    }, 100);
  }

  // Navigation functions
  function showScreen(screen) {
    // Hide all screens
    startScreen.style.display = "none";
    eaterContainer.style.display = "none";
    plannerContainer.style.display = "none";
    plannerResultsContainer.style.display = "none";
    overrideContainer.style.display = "none";
    creatorContainer.style.display = "none";

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
    populateAvailablePizzas();
    // Auto-focus the first input field for better UX
    setTimeout(() => {
      document.getElementById("partyNumber").focus();
    }, 100);
  });

  creatorButton.addEventListener("click", () => {
    showScreen(creatorContainer);
    populateIngredientCheckboxes();
    // Auto-focus the pizza name input field
    setTimeout(() => {
      document.getElementById("pizzaName").focus();
    }, 100);
  });

  // Add real-time case formatting for input fields
  function setupInputFormatting() {
    // Party ID fields - force uppercase
    const partyIdInputs = document.querySelectorAll(
      "#partyNumber, #plannerPartyNumber",
    );
    partyIdInputs.forEach((input) => {
      input.addEventListener("input", function () {
        this.value = this.value.toUpperCase();
      });
    });

    // Name field - force title case
    const nameInput = document.getElementById("eaterName");
    if (nameInput) {
      nameInput.addEventListener("input", function () {
        const value = this.value;
        if (value.length > 0) {
          this.value =
            value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
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
      const eaterPartyIdField = document.getElementById("partyNumber");
      const plannerPartyIdField = document.getElementById("plannerPartyNumber");

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
    const shareButton = document.getElementById("shareButton");
    const shareSection = document.getElementById("shareSection");

    if (shareButton) {
      shareButton.addEventListener("click", async () => {
        const path = window.location.pathname;
        const partyIdMatch = path.match(/^\/([A-Za-z0-9]{4})$/);

        if (partyIdMatch) {
          const partyId = partyIdMatch[1].toUpperCase();
          const shareUrl = `https://slicetomeetyou.com/${partyId}`;

          if (navigator.share) {
            // Use native sharing if available
            try {
              await navigator.share({
                title: "Join my Pizza Party!",
                text: `Join my pizza party! Use party ID: ${partyId}`,
                url: shareUrl,
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
          alert("Please enter a party ID first to share!");
        }
      });
    }
  }

  // Copy text to clipboard
  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          alert("Party link copied to clipboard!");
        })
        .catch(() => {
          fallbackCopyToClipboard(text);
        });
    } else {
      fallbackCopyToClipboard(text);
    }
  }

  // Fallback copy method for older browsers
  function fallbackCopyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      alert("Party link copied to clipboard!");
    } catch (err) {
      alert("Failed to copy link. Please copy manually: " + text);
    }

    document.body.removeChild(textArea);
  }

  // Show/hide share button based on party ID presence
  function updateShareButtonVisibility() {
    const path = window.location.pathname;
    const partyIdMatch = path.match(/^\/([A-Za-z0-9]{4})$/);
    const shareSection = document.getElementById("shareSection");

    if (shareSection) {
      if (partyIdMatch) {
        shareSection.style.display = "flex";
      } else {
        shareSection.style.display = "none";
      }
    }
  }

  // Setup pizza slice spinners functionality
  function setupPizzaSliceSpinners() {
    const spinnerButtons = document.querySelectorAll(".mini-spinner-btn");

    spinnerButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent triggering pizza option selection

        const pizzaType = button.getAttribute("data-pizza");
        const action = button.getAttribute("data-action");
        const input = document.querySelector(
          `input[data-pizza="${pizzaType}"]`,
        );

        if (input) {
          let currentValue = parseInt(input.value);

          if (action === "decrease" && currentValue > 0) {
            input.value = currentValue - 1;
          } else if (action === "increase" && currentValue < 10) {
            input.value = currentValue + 1;
          }
        }
      });
    });
  }

  // Setup custom pizza slice spinner functionality
  function setupCustomSliceSpinner() {
    const decreaseBtn = document.getElementById("decreaseCustomSlices");
    const increaseBtn = document.getElementById("increaseCustomSlices");
    const sliceInput = document.getElementById("customSliceCount");

    if (decreaseBtn && increaseBtn && sliceInput) {
      decreaseBtn.addEventListener("click", () => {
        const currentValue = parseInt(sliceInput.value);
        if (currentValue > 0) {
          sliceInput.value = currentValue - 1;
        }
      });

      increaseBtn.addEventListener("click", () => {
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
  setupPreferenceButtons();
  setupIngredientLimits();

  // Initialize share functionality
  setupShareButton();
  updateShareButtonVisibility();

  // Populate available pizzas (hardcoded + custom) in the eater form
  async function populateAvailablePizzas() {
    try {
      const response = await fetch("/pizza/available");
      const data = await response.json();

      if (response.ok) {
        const pizzaOptionsContainer = document.querySelector(".pizza-options");
        if (!pizzaOptionsContainer) return;

        // Clear existing options
        pizzaOptionsContainer.innerHTML = "";

        // Add hardcoded pizzas first
        data.hardcoded_pizzas.forEach((pizza) => {
          const pizzaOption = createPizzaOption(pizza);
          pizzaOptionsContainer.appendChild(pizzaOption);
        });

        // Add custom pizzas if any exist
        if (data.custom_pizzas.length > 0) {
          // Add a separator
          const separator = document.createElement("div");
          separator.className = "pizza-separator";
          separator.innerHTML = "<strong>🍕 Custom Pizzas</strong>";
          pizzaOptionsContainer.appendChild(separator);

          data.custom_pizzas.forEach((pizza) => {
            const pizzaOption = createPizzaOption(pizza);
            pizzaOptionsContainer.appendChild(pizzaOption);
          });
        }

        // Reinitialize pizza slice spinners for new elements
        setupPizzaSliceSpinners();
      }
    } catch (error) {
      console.error("Error fetching available pizzas:", error);
    }
  }

  // Create a pizza option element
  function createPizzaOption(pizza) {
    const pizzaOption = document.createElement("div");
    pizzaOption.className = "pizza-option";

    // Create ingredients display
    let ingredientsText = "";
    if (pizza.ingredients.length > 0) {
      ingredientsText = ` (${pizza.ingredients.join(", ")})`;
    }

    pizzaOption.innerHTML = `
      <div class="pizza-info">
        <label class="pizza-label">${pizza.name}${ingredientsText}</label>
      </div>
      <div class="pizza-slice-spinner">
        <button type="button" class="mini-spinner-btn" data-pizza="${pizza.id}" data-action="decrease">-</button>
        <input type="number" class="pizza-slice-input" data-pizza="${pizza.id}" value="0" min="0" max="10" readonly>
        <button type="button" class="mini-spinner-btn" data-pizza="${pizza.id}" data-action="increase">+</button>
      </div>
    `;

    return pizzaOption;
  }

  // Setup ingredient limits (max 3 "Must Have" selections)
  function setupIngredientLimits() {
    const allIngredients = [
      // MEAT
      "anchovies",
      "bacon",
      "beef",
      "chicken",
      "ham",
      "pepperoni",
      "sausage",
      // VEGETABLES
      "artichokes",
      "bell-peppers",
      "mushrooms",
      "olives",
      "onions",
      "pineapple",
      "spinach",
      "tomatoes",
      // HERBS AND CHEESES
      "basil",
      "extra-cheese",
      "garlic",
      "vegan-cheese",
    ];

    // Add event listeners to all "Must Have" radio buttons
    allIngredients.forEach((ingredient) => {
      const wantRadio = document.querySelector(
        `input[name="pref_${ingredient}"][value="2"]`,
      );
      if (wantRadio) {
        wantRadio.addEventListener("change", () => {
          if (wantRadio.checked) {
            checkAndEnforceWantLimit();
          }
        });
      }
    });
  }

  // Check and enforce the 3-ingredient "Must Have" limit
  function checkAndEnforceWantLimit() {
    const allIngredients = [
      "anchovies",
      "bacon",
      "beef",
      "chicken",
      "ham",
      "pepperoni",
      "sausage",
      "artichokes",
      "bell-peppers",
      "mushrooms",
      "olives",
      "onions",
      "pineapple",
      "spinach",
      "tomatoes",
      "basil",
      "extra-cheese",
      "garlic",
      "vegan-cheese",
    ];

    // Count currently selected "Must Have" items
    const wantSelections = [];
    allIngredients.forEach((ingredient) => {
      const wantRadio = document.querySelector(
        `input[name="pref_${ingredient}"][value="2"]`,
      );
      if (wantRadio && wantRadio.checked) {
        wantSelections.push(ingredient);
      }
    });

    // If more than 3, disable other "Must Have" options
    if (wantSelections.length >= 3) {
      allIngredients.forEach((ingredient) => {
        const wantRadio = document.querySelector(
          `input[name="pref_${ingredient}"][value="2"]`,
        );
        if (wantRadio && !wantRadio.checked) {
          wantRadio.disabled = true;
          // Add visual styling to show it's disabled
          const row = wantRadio.closest("tr");
          if (row) {
            row.classList.add("must-have-limit-reached");
          }
        }
      });
    } else {
      // Re-enable all "Must Have" options
      allIngredients.forEach((ingredient) => {
        const wantRadio = document.querySelector(
          `input[name="pref_${ingredient}"][value="2"]`,
        );
        if (wantRadio) {
          wantRadio.disabled = false;
          const row = wantRadio.closest("tr");
          if (row) {
            row.classList.remove("must-have-limit-reached");
          }
        }
      });
    }

    // Update counter display if it exists
    updateWantCounter(wantSelections.length);
  }

  // Update the "Must Have" counter display
  function updateWantCounter(count) {
    let counterElement = document.getElementById("wantCounter");
    if (!counterElement) {
      // Create counter element if it doesn't exist
      const tableContainer = document.querySelector(".ingredient-table");
      if (tableContainer) {
        counterElement = document.createElement("div");
        counterElement.id = "wantCounter";
        counterElement.className = "must-have-counter";
        tableContainer.appendChild(counterElement);
      }
    }

    if (counterElement) {
      counterElement.innerHTML = `<strong>${count} / 3 ingredients selected as "Must Have"</strong>`;
      if (count >= 3) {
        counterElement.classList.add("limit-reached");
      } else {
        counterElement.classList.remove("limit-reached");
      }
    }
  }

  // Setup preference buttons functionality
  function setupPreferenceButtons() {
    const pizzaRouletteBtn = document.getElementById("pizzaRouletteBtn");
    const markAllAvoidBtn = document.getElementById("markAllAvoidBtn");
    const resetPreferencesBtn = document.getElementById("resetPreferencesBtn");

    // Get all ingredients list
    const allIngredients = [
      // MEAT
      "anchovies",
      "bacon",
      "beef",
      "chicken",
      "ham",
      "pepperoni",
      "sausage",
      // VEGETABLES
      "artichokes",
      "bell-peppers",
      "mushrooms",
      "olives",
      "onions",
      "pineapple",
      "spinach",
      "tomatoes",
      // HERBS AND CHEESES
      "basil",
      "extra-cheese",
      "garlic",
      "vegan-cheese",
    ];

    // Pizza Roulette - randomize all preferences (with 3-ingredient "Must Have" limit)
    if (pizzaRouletteBtn) {
      pizzaRouletteBtn.addEventListener("click", () => {
        // First, reset all to indifferent
        allIngredients.forEach((ingredient) => {
          const radio = document.querySelector(
            `input[name="pref_${ingredient}"][value="1"]`,
          );
          if (radio) {
            radio.checked = true;
          }
        });

        // Randomly select up to 3 ingredients to "want"
        const shuffledIngredients = [...allIngredients].sort(
          () => Math.random() - 0.5,
        );
        const wantCount = Math.floor(Math.random() * 4); // 0-3 ingredients to want

        for (
          let i = 0;
          i < Math.min(wantCount, shuffledIngredients.length);
          i++
        ) {
          const ingredient = shuffledIngredients[i];
          const wantRadio = document.querySelector(
            `input[name="pref_${ingredient}"][value="2"]`,
          );
          if (wantRadio) {
            wantRadio.checked = true;
          }
        }

        // Randomly set some others to "will not eat"
        const remainingIngredients = shuffledIngredients.slice(wantCount);
        remainingIngredients.forEach((ingredient) => {
          if (Math.random() < 0.3) {
            // 30% chance to set as "will not eat"
            const avoidRadio = document.querySelector(
              `input[name="pref_${ingredient}"][value="0"]`,
            );
            if (avoidRadio) {
              avoidRadio.checked = true;
            }
          }
        });

        // Update the limit enforcement
        checkAndEnforceWantLimit();

        // Add a fun animation effect
        pizzaRouletteBtn.style.transform = "rotate(360deg)";
        setTimeout(() => {
          pizzaRouletteBtn.style.transform = "";
        }, 600);
      });
    }

    // Mark All Will Not Eat
    if (markAllAvoidBtn) {
      markAllAvoidBtn.addEventListener("click", () => {
        allIngredients.forEach((ingredient) => {
          const radio = document.querySelector(
            `input[name="pref_${ingredient}"][value="0"]`,
          );
          if (radio) {
            radio.checked = true;
          }
        });
      });
    }

    // Reset - set all to indifferent
    if (resetPreferencesBtn) {
      resetPreferencesBtn.addEventListener("click", () => {
        allIngredients.forEach((ingredient) => {
          const radio = document.querySelector(
            `input[name="pref_${ingredient}"][value="1"]`,
          );
          if (radio) {
            radio.checked = true;
          }
        });

        // Reset the limit enforcement
        checkAndEnforceWantLimit();
      });
    }
  }

  // Populate ingredient checkboxes for creator screen
  function populateIngredientCheckboxes() {
    const checkboxContainer = document.getElementById("ingredientCheckboxes");
    if (!checkboxContainer) return;

    // Clear existing content
    checkboxContainer.innerHTML = "";

    // Use the same categorized ingredients as the eater form
    const ingredientCategories = {
      MEAT: [
        "anchovies",
        "bacon",
        "beef",
        "chicken",
        "ham",
        "pepperoni",
        "sausage",
      ],
      VEGETABLES: [
        "artichokes",
        "bell-peppers",
        "mushrooms",
        "olives",
        "onions",
        "pineapple",
        "spinach",
        "tomatoes",
      ],
      "HERBS AND CHEESES": ["basil", "extra-cheese", "garlic", "vegan-cheese"],
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

    // Create categorized sections with checkboxes
    Object.keys(ingredientCategories).forEach((categoryName) => {
      // Create section header
      const headerDiv = document.createElement("div");
      headerDiv.className = "ingredient-category-header-checkbox";
      headerDiv.innerHTML = `<strong>${categoryName}</strong>`;
      checkboxContainer.appendChild(headerDiv);

      // Add ingredients for this category
      ingredientCategories[categoryName].forEach((ingredient) => {
        const icon = ingredientIcons[ingredient] || "🍕";
        const displayName =
          ingredient.charAt(0).toUpperCase() +
          ingredient.slice(1).replace("-", " ");

        const checkboxItem = document.createElement("div");
        checkboxItem.className = "ingredient-checkbox-item";
        checkboxItem.innerHTML = `
          <input type="checkbox" id="creator_${ingredient}" name="creatorIngredients" value="${ingredient}">
          <label for="creator_${ingredient}">${icon} ${displayName}</label>
        `;

        checkboxContainer.appendChild(checkboxItem);
      });
    });

    // Setup checkbox functionality
    setupIngredientCheckboxes();
  }

  // Setup ingredient checkbox functionality with 3-ingredient limit
  function setupIngredientCheckboxes() {
    const checkboxes = document.querySelectorAll(
      'input[name="creatorIngredients"]',
    );
    const selectedCountSpan = document.getElementById("selectedCount");
    const counter = document.querySelector(".ingredient-counter");

    checkboxes.forEach((checkbox) => {
      const checkboxItem = checkbox.closest(".ingredient-checkbox-item");

      // Make the entire item clickable
      checkboxItem.addEventListener("click", (e) => {
        if (e.target !== checkbox) {
          e.preventDefault();
          if (!checkboxItem.classList.contains("disabled")) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event("change"));
          }
        }
      });

      checkbox.addEventListener("change", () => {
        const checkedBoxes = document.querySelectorAll(
          'input[name="creatorIngredients"]:checked',
        );
        const count = checkedBoxes.length;

        selectedCountSpan.textContent = count;

        if (count >= 3) {
          counter.classList.add("limit-reached");
          // Disable unchecked checkboxes
          checkboxes.forEach((cb) => {
            const item = cb.closest(".ingredient-checkbox-item");
            if (!cb.checked) {
              item.classList.add("disabled");
              cb.disabled = true;
            }
          });
        } else {
          counter.classList.remove("limit-reached");
          // Enable all checkboxes
          checkboxes.forEach((cb) => {
            const item = cb.closest(".ingredient-checkbox-item");
            item.classList.remove("disabled");
            cb.disabled = false;
          });
        }

        // Update visual state
        checkboxes.forEach((cb) => {
          const item = cb.closest(".ingredient-checkbox-item");
          if (cb.checked) {
            item.classList.add("selected");
          } else {
            item.classList.remove("selected");
          }
        });
      });
    });
  }

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

  backToHomeFromCreator.addEventListener("click", () => {
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
      "anchovies",
      "bacon",
      "beef",
      "chicken",
      "ham",
      "pepperoni",
      "sausage",
      // VEGETABLES
      "artichokes",
      "bell-peppers",
      "mushrooms",
      "olives",
      "onions",
      "pineapple",
      "spinach",
      "tomatoes",
      // HERBS AND CHEESES
      "basil",
      "extra-cheese",
      "garlic",
      "vegan-cheese",
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
    const pizzaSliceInputs = document.querySelectorAll(".pizza-slice-input");
    let totalSlices = 0;
    const existingPizza_slicesWanted = {};

    pizzaSliceInputs.forEach((input) => {
      const pizzaType = input.getAttribute("data-pizza");
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
      name:
        formData.get("eaterName").charAt(0).toUpperCase() +
        formData.get("eaterName").slice(1).toLowerCase(),
      custom_pizza: {
        sliceCount: customSlices,
        preferences: preferences,
      },
      existingPizza_slicesWanted: existingPizza_slicesWanted,
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

  // Creator form submission
  creatorForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(creatorForm);
    const pizzaName = formData.get("pizzaName").trim();

    // Get selected ingredients
    const selectedIngredients = [];
    const checkedBoxes = document.querySelectorAll(
      'input[name="creatorIngredients"]:checked',
    );
    checkedBoxes.forEach((checkbox) => {
      selectedIngredients.push(checkbox.value);
    });

    // Validation
    if (!pizzaName) {
      alert("Please enter a pizza name");
      return;
    }

    if (selectedIngredients.length === 0) {
      alert("Please select at least one ingredient");
      return;
    }

    if (selectedIngredients.length > 3) {
      alert("Please select no more than 3 ingredients");
      return;
    }

    const data = {
      pizzaName: pizzaName,
      ingredients: selectedIngredients,
    };

    try {
      const response = await fetch("/pizza/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Pizza "${pizzaName}" created successfully! 🍕`);
        creatorForm.reset();
        document.getElementById("selectedCount").textContent = "0";
        document
          .querySelector(".ingredient-counter")
          .classList.remove("limit-reached");

        // Reset all checkboxes and their visual state
        const checkboxes = document.querySelectorAll(
          'input[name="creatorIngredients"]',
        );
        checkboxes.forEach((cb) => {
          cb.checked = false;
          cb.disabled = false;
          const item = cb.closest(".ingredient-checkbox-item");
          item.classList.remove("selected", "disabled");
        });

        showScreen(startScreen);
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      alert("Error creating pizza: " + error.message);
    }
  });

  // Format pizza count based on 8 slices per pizza, rounded up to nearest 4
  function formatPizzaCount(slices) {
    const slicesPerPizza = 8;
    const wholePizzas = Math.floor(slices / slicesPerPizza);
    const remainingSlices = slices % slicesPerPizza;
    
    // Round up remaining slices to nearest 4
    const roundedUpSlices = remainingSlices > 0 ? Math.ceil(remainingSlices / 4) * 4 : 0;
    const excessSlices = roundedUpSlices - remainingSlices;
    
    let result = "";
    
    if (wholePizzas > 0) {
      result += `${wholePizzas}`;
      if (roundedUpSlices > 0) {
        if (roundedUpSlices === 4) {
          result += " 1/2";
        } else if (roundedUpSlices === 8) {
          result += " 1";
        }
        result += " pizzas";
      } else {
        result += wholePizzas === 1 ? " pizza" : " pizzas";
      }
    } else {
      // Less than a full pizza
      if (roundedUpSlices === 4) {
        result = "1/2 pizza";
      } else if (roundedUpSlices === 8) {
        result = "1 pizza";
      } else {
        result = "1 pizza"; // fallback
      }
    }
    
    if (excessSlices > 0) {
      result += ` (${excessSlices} slice${excessSlices === 1 ? '' : 's'} excess)`;
    }
    
    return result;
  }

  // Display party summary
  function displayPartySummary(data) {
    document.getElementById("partyNumberDisplay").textContent =
      data.party_number;

    // Update attendees header with count
    const attendeesHeader = document.querySelector(".summary-card h3");
    if (
      attendeesHeader &&
      attendeesHeader.textContent.includes("👥 Attendees")
    ) {
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

    // Display comprehensive pizza orders if available
    if (
      data.comprehensive_pizza_orders &&
      data.comprehensive_pizza_orders.length > 0
    ) {
      // Add pizza orders section if it doesn't exist
      let pizzaOrdersSection = document.getElementById("pizzaOrders");
      if (!pizzaOrdersSection) {
        const summaryContainer = document.querySelector(".party-summary");
        const pizzaOrdersDiv = document.createElement("div");
        pizzaOrdersDiv.className = "summary-card";
        pizzaOrdersDiv.innerHTML = `
                    <h3>🍕 Complete Pizza Orders</h3>
                    <div id="pizzaOrders"></div>
                `;
        summaryContainer.appendChild(pizzaOrdersDiv);
      }

      pizzaOrdersSection = document.getElementById("pizzaOrders");
      pizzaOrdersSection.innerHTML = data.comprehensive_pizza_orders
        .map(
          (pizza) =>
            `<div class="pizza-order pizza-${pizza.source}">
                    <h4>${pizza.type}</h4>
                    <p class="pizza-description">${pizza.description}</p>
                    ${
                      pizza.ingredients.length > 0
                        ? `<p><strong>Ingredients:</strong> ${pizza.ingredients.join(", ")}</p>`
                        : "<p><strong>Ingredients:</strong> Cheese only</p>"
                    }
                    <p><strong>Slices:</strong> ${pizza.slices} (${formatPizzaCount(pizza.slices)})</p>
                    <p class="calculation-method"><em>Target Eaters:</em> ${
                      pizza.target_eaters && pizza.target_eaters.length > 0
                        ? pizza.target_eaters.join(", ")
                        : "Everyone"
                    }</p>
                </div>`,
        )
        .join("");
    } else if (data.pizza_orders && data.pizza_orders.length > 0) {
      // Fallback to old pizza orders format for backward compatibility
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
                    ${
                      pizza.target_eaters && pizza.target_eaters.length > 0
                        ? `<p><strong>Target Eaters:</strong> ${pizza.target_eaters.join(", ")}</p>`
                        : ""
                    }
                </div>`,
        )
        .join("");
    }
  }
});
