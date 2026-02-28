// --- 1. INITIALIZATION & AUTH ---
let users = JSON.parse(localStorage.getItem('ecoUsers')) || [];
let currentUser = null;
let chartInstance = null;
let signupMode = false;

const ecoData = {
    "beef": "27.0 kg CO2 per kg. Switching to chicken saves 80%!",
    "chicken": "6.9 kg CO2 per kg.",
    "rice": "2.7 kg CO2 per kg.",
    "milk": "1.9 kg CO2 per liter.",
    "petrol car": "Approx 192g CO2 per km.",
    "diesel car": "Approx 171g CO2 per km."
};

function toggleAuthMode() {
    signupMode = !signupMode;
    document.getElementById('email').classList.toggle('hidden', !signupMode);
    document.getElementById('authBtn').innerText = signupMode ? 'Sign Up' : 'Login';
    document.getElementById('toggleBtn').innerText = signupMode ? 'Have account? Login' : 'New? Sign Up';
}

function handleAuth() {
    const userVal = document.getElementById('username').value.trim();
    const passVal = document.getElementById('password').value;
    const emailVal = document.getElementById('email').value;

    if (!userVal || !passVal) return alert("Please fill all fields");

    if (signupMode) {
        if (users.find(u => u.username === userVal)) return alert("User already exists");
        const newUser = { username: userVal, password: passVal, email: emailVal, greenScore: 0, history: [] };
        users.push(newUser);
        saveUsers();
        alert("Signup success! Please login.");
        toggleAuthMode();
    } else {
        const user = users.find(u => u.username === userVal && u.password === passVal);
        if (user) {
            currentUser = user;
            document.getElementById('displayUser').innerText = user.username;
            document.getElementById('greenScoreDisplay').classList.remove('hidden');
            updateScoreUI();
            renderPointSquares();
            navigateTo('page1');
        } else {
            alert("Invalid credentials");
        }
    }
}

function logout() {
    currentUser = null;
    location.reload();
}

function saveUsers() {
    localStorage.setItem('ecoUsers', JSON.stringify(users));
}

function updateScoreUI() {
    if (!currentUser) return;
    const pointsDisplay = document.getElementById('pointsCount');
    const tooltipScore = document.getElementById('scoreValue');
    if (pointsDisplay) pointsDisplay.innerText = currentUser.greenScore;
    if (tooltipScore) tooltipScore.innerText = currentUser.greenScore;
}

// --- 2. CALCULATIONS & ANIMATION ---
function calculateImpact() {
    const date = document.getElementById('entryDate').value;
    if (!date) return alert("Please select a date first");

    navigateTo('page3');
    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('resultContent').classList.add('hidden');
    
    const summary = document.getElementById('reportSummary');
    if (summary) summary.classList.add('hidden'); 

    setTimeout(() => {
        // --- 1. DATA COLLECTION ---
        const people = Number(document.getElementById('people').value) || 1;
        const km = Number(document.getElementById('km').value) || 0;
        const fuel = document.getElementById('fuel').value;
        const ac = Number(document.getElementById('ac').value) || 0;
        const fan = Number(document.getElementById('fan').value) || 0;
        const laptop = Number(document.getElementById('laptop').value) || 0;
        const light = Number(document.getElementById('light').value) || 0;
        const diet = document.getElementById('food').value;
        const plastic = Number(document.getElementById('plastic').value) || 0;

        // --- 2. CALCULATIONS ---
        const fuelFactor = fuel === 'diesel' ? 0.27 : (fuel === 'petrol' ? 0.23 : 0.15);
        const transportTotal = km * fuelFactor;
        const elecTotal = ((ac * 1.5) + (fan * 0.1) + (laptop * 0.05) + (light * 0.02)) / people;
        const dietFactor = diet === 'non-veg' ? 3.0 : (diet === 'mixed' ? 1.8 : 0.6);
        const lifestyleTotal = dietFactor + (plastic * 0.1);
        const total = transportTotal + elecTotal + lifestyleTotal;

        // --- 3. SCORE & HISTORY LOGIC ---
        let pointsEarned = 0;
        let colorClass = "";
        if (total < 5) { pointsEarned = 2; colorClass = "sq-plus2"; }
        else if (total < 15) { pointsEarned = 1; colorClass = "sq-plus1"; }
        else { pointsEarned = -1; colorClass = "sq-minus1"; }

        currentUser.greenScore += pointsEarned;
        
        currentUser.history.push({ 
            date, 
            total: parseFloat(total.toFixed(2)), 
            transport: transportTotal,
            electricity: elecTotal,
            lifestyle: lifestyleTotal,
            points: pointsEarned, 
            color: colorClass 
        });

        // --- 4. CLEARING THE UI (This fixes the "hanging") ---
        saveUsers();
        updateScoreUI();
        renderPointSquares();
        updateStatusLabel(total);
        renderChart(transportTotal, elecTotal, lifestyleTotal);
        renderHistory();
        generateSuggestions(total);

        // ALWAYS HIDE LOADER LAST
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('resultContent').classList.remove('hidden');
    }, 1500); // Slightly faster for better UX
}
// --- 3. REPORTING & CLEAR DATA ---

/*function viewReport(days) {
    if (!currentUser || !currentUser.history || currentUser.history.length === 0) {
        return alert("No data available to generate report.");
    }

    const today = new Date();
    // Set to end of day to include today's logs
    today.setHours(23, 59, 59, 999); 
    
    const cutoff = new Date();
    cutoff.setDate(today.getDate() - days);
    cutoff.setHours(0, 0, 0, 0); 

    // Filter history based on date range
    const filtered = currentUser.history.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= cutoff && itemDate <= today;
    });

    if (filtered.length === 0) {
        return alert(`No logs found for the last ${days} days.`);
    }

    // Summing up values
    const tSum = filtered.reduce((sum, item) => sum + (item.transport || 0), 0);
    const eSum = filtered.reduce((sum, item) => sum + (item.electricity || 0), 0);
    const lSum = filtered.reduce((sum, item) => sum + (item.lifestyle || 0), 0);
    const grandTotal = tSum + eSum + lSum;

    // Show and Update Summary Text
    const summary = document.getElementById('reportSummary');
    summary.classList.remove('hidden');
    summary.innerHTML = `
        <div style="background:#f1f8e9; padding:20px; border-radius:15px; margin: 20px 0; border: 1px solid #c5e1a5; text-align: left;">
            <h3 style="margin-top:0; color:#2e7d32; font-family: 'Abril Fatface';">${days === 7 ? 'Weekly' : 'Monthly'} Carbon Overview</h3>
            <p>Entries Found: <strong>${filtered.length}</strong></p>
            <p>Total Emissions: <strong>${grandTotal.toFixed(2)} kg CO2</strong></p>
            <p>Average/Entry: <strong>${(grandTotal / filtered.length).toFixed(2)} kg</strong></p>
        </div>
    `;

    // Update chart with aggregated data
    renderChart(tSum, eSum, lSum);
}*/
function viewReport(days) {
    if (!currentUser || !currentUser.history || currentUser.history.length === 0) {
        return alert("No data available to generate report. Please add a usage log first!");
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999); // Include everything from today
    
    const cutoff = new Date();
    cutoff.setDate(today.getDate() - days);
    cutoff.setHours(0, 0, 0, 0); // Start from the beginning of the cutoff day

    // Filter history with strict date parsing
    const filtered = currentUser.history.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= cutoff && itemDate <= today;
    });

    if (filtered.length === 0) {
        return alert(`No data logs found for the last ${days} days.`);
    }

    // Aggregate totals for the Chart
    const tSum = filtered.reduce((sum, item) => sum + (item.transport || 0), 0);
    const eSum = filtered.reduce((sum, item) => sum + (item.electricity || 0), 0);
    const lSum = filtered.reduce((sum, item) => sum + (item.lifestyle || 0), 0);
    const grandTotal = tSum + eSum + lSum;

    // UPDATE UI: Show Summary Box
    const summary = document.getElementById('reportSummary');
    summary.classList.remove('hidden');
    summary.innerHTML = `
        <div style="background:#f1f8e9; padding:20px; border-radius:18px; margin: 20px 0; border: 1px solid #c5e1a5; text-align: left; box-shadow: var(--shadow);">
            <h3 style="margin-top:0; color:var(--primary); font-family: var(--font-display);">${days === 7 ? 'Weekly' : 'Monthly'} Carbon Summary</h3>
            <p>📊 <b>Logs Analyzed:</b> ${filtered.length}</p>
            <p>🌱 <b>Total CO2:</b> ${grandTotal.toFixed(2)} kg</p>
            <p>📉 <b>Daily Average:</b> ${(grandTotal / filtered.length).toFixed(2)} kg</p>
        </div>
    `;

    // REFRESH CHART: This enlarges the chart view
    renderChart(tSum, eSum, lSum);
    
    // Auto-scroll to show the report
    summary.scrollIntoView({ behavior: 'smooth' });
}

function renderChart(t, e, l) {
    const canvas = document.getElementById('resultChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Crucial: Destroy old chart to allow resizing and new data
    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Transport', 'Electricity', 'Lifestyle'],
            datasets: [{
                data: [t.toFixed(2), e.toFixed(2), l.toFixed(2)],
                backgroundColor: ['#2e7d32', '#8bc34a', '#c5e1a5'],
                borderWidth: 2
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, // Allows chart to follow CSS dimensions
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}


function clearHistory() {
    if (confirm("Are you sure you want to clear all your data? This will reset your score and history.")) {
        currentUser.history = [];
        currentUser.greenScore = 0;
        saveUsers();
        location.reload(); // Refresh to clear UI
    }
}

// --- 4. UI HELPERS ---
function navigateTo(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function renderPointSquares() {
    const grid = document.getElementById('pointsGrid');
    if (!grid || !currentUser) return;
    grid.innerHTML = ""; 
    currentUser.history.slice(-28).forEach(entry => {
        const sq = document.createElement('div');
        sq.className = `point-sq ${entry.color}`;
        const label = entry.points > 0 ? `+${entry.points}` : entry.points;
        sq.setAttribute('data-points', label);
        grid.appendChild(sq);
    });
}

function updateStatusLabel(total) {
    const label = document.getElementById('statusLabel');
    label.innerText = total < 6 ? "Eco-Friendly 🌿" : (total < 14 ? "Moderate Impact ⚖️" : "High Carbon Usage ⚠️");
    label.style.color = total < 6 ? "#2e7d32" : (total < 14 ? "#ffa000" : "#d32f2f");
}

function renderChart(t, e, l) {
    const ctx = document.getElementById('resultChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Transport', 'Electricity', 'Lifestyle'],
            datasets: [{
                data: [t.toFixed(2), e.toFixed(2), l.toFixed(2)],
                backgroundColor: ['#2e7d32', '#8bc34a', '#c5e1a5']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderHistory() {
    const body = document.getElementById('historyBody');
    if (!body) return;
    body.innerHTML = "";
    currentUser.history.slice().reverse().forEach(h => {
        body.innerHTML += `<tr><td>${h.date}</td><td>${h.total} kg</td><td>Verified</td></tr>`;
    });
}

function generateSuggestions(total) {
    const div = document.getElementById('suggestions');
    if (total > 10) {
        div.innerHTML = "<li>Reduce AC usage by 1 hour.</li><li>Try a meat-free day.</li>";
    } else {
        div.innerHTML = "<li>Doing great! Your footprint is low.</li>";
    }
}

// --- ENHANCED MULTI-ITEM CALCULATION BOT ---
// --- COMPLETE MEAL & MULTI-ITEM CALCULATION BOT ---
function askBot() {
    const input = document.getElementById('bot-input');
    const display = document.getElementById('chat-messages');
    const rawMsg = input.value.toLowerCase().trim();
    if (!rawMsg) return;

    display.innerHTML += `<div class="user-msg"><b>You:</b> ${input.value}</div>`;
    
    // 1. UPDATED CARBON DATA (KG of CO2 per unit/kg/km)
    const carbonData = {
        // New Additions
        "ghee": 12.5,        // Concentrated dairy fat
        "dal": 0.9,          // Pulses/Lentils (Eco-superstar)
        "grains": 1.4,       // Average for wheat, oats, etc.
        "pulses": 0.9,       
        "chapati": 0.15,     // Per piece
        "chicken": 6.0,      // Per kg
        
        // Dairy & Staple
        "milk": 1.9, "rice": 2.7, "egg": 0.48, "wheat": 1.4,
        
        // High Impact Meats
        "beef": 60.0, "lamb": 24.0, "mutton": 24.0, "pork": 7.0,
        
        // Fruits & Vegetables
        "apple": 0.4, "banana": 0.7, "potato": 0.4, "tomato": 1.1, "onion": 0.4,
        
        // Vehicles & Fuels (Logic remains integrated)
        "flight": 0.25, "plane": 0.25, "car": 0.18, "scooter": 0.07, "bus": 0.08, "train": 0.03,
        "waterways": 0.05, "ship": 0.05
    };

    // 2. MULTI-ITEM ENGINE
    let totalEmission = 0;
    let details = [];
    
    // We scan for every known item in the user's message
    Object.keys(carbonData).forEach(item => {
        if (rawMsg.includes(item)) {
            // This Regex finds numbers before or after the item name
            // (Handles "5kg dal" or "dal 5kg" or "5 chapatis")
            const regex = new RegExp(`(\\d+\\.?\\d*)\\s*${item}|${item}\\s*(\\d+\\.?\\d*)`);
            const match = rawMsg.match(regex);
            
            // Get the number from whichever side it was found on, default to 1
            const amount = match ? parseFloat(match[1] || match[2]) : 1;

            const itemTotal = amount * carbonData[item];
            totalEmission += itemTotal;
            
            details.push(`• ${amount} ${item}: **${itemTotal.toFixed(2)}kg CO2**`);
        }
    });

    // 3. GENERATE RESPONSE
    let botReply = "";
    if (details.length > 0) {
        botReply = `<b>Your Footprint Breakdown:</b><br>${details.join('<br>')}<br>`;
        botReply += `-------------------<br><b>Grand Total: ${totalEmission.toFixed(2)}kg CO2</b>`;
        
        // Add a helpful comparison
        if (rawMsg.includes("beef") || rawMsg.includes("ghee")) {
            botReply += "<br>💡 <i>Notice: Dairy and red meat have a much higher footprint than grains or dal!</i>";
        }
    } else {
        botReply = "I can calculate meal footprints! Try: '10 chapati, 1kg dal, and 100g ghee'.";
    }

    display.innerHTML += `<div class="bot-msg"><b>Bot:</b> ${botReply}</div>`;
    
    input.value = "";
    display.scrollTop = display.scrollHeight;
}