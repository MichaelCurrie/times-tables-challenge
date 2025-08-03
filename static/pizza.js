// Pizza Party JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Get all the containers
    const startScreen = document.getElementById('startScreen');
    const eaterContainer = document.getElementById('eaterContainer');
    const plannerContainer = document.getElementById('plannerContainer');
    const plannerResultsContainer = document.getElementById('plannerResultsContainer');

    // Get all the buttons
    const plannerButton = document.getElementById('plannerButton');
    const eaterButton = document.getElementById('eaterButton');
    const backToHome = document.getElementById('backToHome');
    const backToHomePlanner = document.getElementById('backToHomePlanner');
    const backToPlanner = document.getElementById('backToPlanner');

    // Get forms
    const eaterForm = document.getElementById('eaterForm');
    const plannerForm = document.getElementById('plannerForm');

    // Navigation functions
    function showScreen(screen) {
        // Hide all screens
        startScreen.style.display = 'none';
        eaterContainer.style.display = 'none';
        plannerContainer.style.display = 'none';
        plannerResultsContainer.style.display = 'none';

        // Show the requested screen
        screen.style.display = 'flex';
    }

    // Button event listeners
    plannerButton.addEventListener('click', () => {
        showScreen(plannerContainer);
    });

    eaterButton.addEventListener('click', () => {
        showScreen(eaterContainer);
    });

    backToHome.addEventListener('click', () => {
        showScreen(startScreen);
    });

    backToHomePlanner.addEventListener('click', () => {
        showScreen(startScreen);
    });

    backToPlanner.addEventListener('click', () => {
        showScreen(plannerContainer);
    });

    // Eater form submission
    eaterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(eaterForm);
        const partyId = formData.get('partyNumber');
        
        // Validate party ID format
        if (!partyId || partyId.length !== 4 || !/^[A-Za-z0-9]{4}$/.test(partyId)) {
            alert('Party ID must be exactly 4 characters (letters and numbers)');
            return;
        }
        
        const data = {
            partyNumber: partyId,
            name: formData.get('eaterName'),
            sliceCount: parseInt(formData.get('sliceCount')),
            favoriteTopping: formData.get('favoriteTopping')
        };

        try {
            const response = await fetch('/pizza/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                alert('Successfully joined the pizza party! 🍕');
                eaterForm.reset();
                showScreen(startScreen);
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Error joining party: ' + error.message);
        }
    });

    // Planner form submission
    plannerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(plannerForm);
        const partyId = formData.get('plannerPartyNumber');
        
        // Validate party ID format
        if (!partyId || partyId.length !== 4 || !/^[A-Za-z0-9]{4}$/.test(partyId)) {
            alert('Party ID must be exactly 4 characters (letters and numbers)');
            return;
        }

        try {
            const response = await fetch(`/pizza/summary/${partyId}`);
            const result = await response.json();
            
            if (response.ok) {
                displayPartySummary(result);
                showScreen(plannerResultsContainer);
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Error fetching party summary: ' + error.message);
        }
    });

    // Display party summary
    function displayPartySummary(data) {
        document.getElementById('partyNumberDisplay').textContent = data.party_number;
        
        // Display attendees
        const attendeesList = document.getElementById('attendeesList');
        attendeesList.innerHTML = data.attendees.map(name => 
            `<span class="attendee-tag">${name}</span>`
        ).join('');
        
        // Display total slices
        document.getElementById('totalSlices').textContent = `${data.total_slices} slices`;
        
        // Display top toppings
        const topToppings = document.getElementById('topToppings');
        topToppings.innerHTML = data.top_toppings.map(([topping, count]) => 
            `<div class="topping-item">
                <span>${topping}</span>
                <span class="topping-count">${count}</span>
            </div>`
        ).join('');
    }
}); 