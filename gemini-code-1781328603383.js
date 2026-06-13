let currentBudget = 30;
let currentAppState = 'draft'; // States: 'draft' | 'review' | 'confirmed'
let activeSubstitutions = new Set();

window.addEventListener('DOMContentLoaded', () => {
    // Seed defaults for easy initialization
    addIngredientRow('breakfast', 'Eggs', 3.00, 'Tofu (+$1)');
    addIngredientRow('breakfast', 'Bread', 2.00, 'Lettuce Wrap (-$1)');
    addIngredientRow('lunch', 'Chicken Roll', 7.00, 'Chickpeas (-$4)');
    addIngredientRow('dinner', 'Pasta Pack', 1.50, 'Zucchini Strips (+$1)');
    calculateEverything();
});

function updateBudgetLabel(val) {
    currentBudget = parseFloat(val);
    document.getElementById('budget-limit-val').innerText = val;
    calculateEverything();
}

function addIngredientRow(mealType, name='', cost='', sub='') {
    const container = document.querySelector(`[data-meal="${mealType}"] .ingredient-inputs`);
    const uniqueId = 'ing_' + Math.random().toString(36).substr(2, 9);
    
    const row = document.createElement('div');
    row.id = uniqueId;
    row.className = "grid grid-cols-12 gap-2 items-center bg-gray-50 p-1.5 rounded border border-gray-100";
    row.innerHTML = `
        <input type="text" value="${name}" placeholder="Item" class="col-span-5 p-1 text-xs border rounded ing-name" oninput="calculateEverything()">
        <input type="number" value="${cost}" placeholder="0.00" step="0.01" class="col-span-2 p-1 text-xs border rounded ing-cost" oninput="calculateEverything()">
        <input type="text" value="${sub}" placeholder="Alternative" class="col-span-3 p-1 text-xs border rounded ing-sub" oninput="calculateEverything()">
        <div class="col-span-2 text-center">
            <input type="checkbox" class="w-4 h-4 accent-blue-600 ing-owned" onchange="calculateEverything()">
        </div>
    `;
    container.appendChild(row);
}

function toggleSub(rowId) {
    if (activeSubstitutions.has(rowId)) {
        activeSubstitutions.delete(rowId);
    } else {
        activeSubstitutions.add(rowId);
    }
    calculateEverything();
}

// Handles switching between states, locking inputs, and updating workflow layout
function changeState(newState) {
    currentAppState = newState;
    const formInputs = document.querySelectorAll('#meals-form-container input, #budget-range');
    const addButtons = document.querySelectorAll('.btn-add-ing');
    const workflowContainer = document.getElementById('workflow-action-container');

    // Reset visual stepper headers
    document.getElementById('step-1').className = "text-gray-400";
    document.getElementById('step-2').className = "text-gray-400";
    document.getElementById('step-3').className = "text-gray-400";

    if (newState === 'draft') {
        document.getElementById('step-1').className = "text-blue-600 border-b-2 border-blue-600 pb-1";
        formInputs.forEach(i => i.removeAttribute('disabled'));
        addButtons.forEach(b => b.classList.remove('hidden'));
        
        workflowContainer.innerHTML = `
            <button onclick="changeState('review')" class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-blue-700 transition">
                Review & Generate Lists
            </button>
        `;
    } 
    else if (newState === 'review') {
        document.getElementById('step-2').className = "text-amber-600 border-b-2 border-amber-600 pb-1";
        formInputs.forEach(i => i.setAttribute('disabled', true));
        addButtons.forEach(b => b.classList.add('hidden'));

        workflowContainer.innerHTML = `
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-2 text-xs text-amber-800 font-medium">
                👉 Review prices and swap substitutions on the right if you are over budget. Once ready, final lock your plan.
            </div>
            <div class="grid grid-cols-2 gap-3">
                <button onclick="changeState('draft')" class="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition text-sm">
                    ⬅️ Change Meals
                </button>
                <button onclick="changeState('confirmed')" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition text-sm shadow-xs">
                    ✅ Confirm Plan
                </button>
            </div>
        `;
    } 
    else if (newState === 'confirmed') {
        document.getElementById('step-3').className = "text-green-600 border-b-2 border-green-600 pb-1";
        formInputs.forEach(i => i.setAttribute('disabled', true));
        addButtons.forEach(b => b.classList.add('hidden'));

        // Generate warm personalized wishes based on budget standing
        const totalCostElement = document.getElementById('dash-cost').innerText;
        const finalCost = parseFloat(totalCostElement.replace('$', ''));
        let greetingMessage = "Make today delicious! 🍳";
        
        if (finalCost <= currentBudget) {
            greetingMessage = "You crushed your budget targets today! Enjoy your delicious, guilt-free meals and have a wonderful day ahead! 🌟";
        } else {
            greetingMessage = "Meals are set and you're ready to cook! Don't sweat the small stuff—enjoy your culinary creations today! 🔥";
        }

        workflowContainer.innerHTML = `
            <div class="p-5 bg-linear-to-br from-green-50 to-emerald-100 border border-green-200 rounded-xl text-center shadow-xs">
                <span class="text-3xl block mb-2">✨ ✨ ✨</span>
                <p class="text-sm font-black text-green-900 uppercase tracking-wide">Plan Confirmed & Active!</p>
                <p class="text-xs text-emerald-800 font-medium mt-2 italic px-2">"${greetingMessage}"</p>
                
                <hr class="my-4 border-green-200/60">
                
                <button onclick="changeState('draft')" class="text-xs text-blue-600 font-bold hover:text-blue-800 underline">
                    Reset & Create New Plan
                </button>
            </div>
        `;
    }
    calculateEverything();
}

function calculateEverything() {
    let totalTime = 0;
    let totalCost = 0;
    let missingGroceries = [];
    let mealTasks = [];

    // Order matters for timeline prioritization: Breakfast -> Lunch -> Dinner
    const meals = ['breakfast', 'lunch', 'dinner'];

    meals.forEach(mealKey => {
        const block = document.querySelector(`[data-meal="${mealKey}"]`);
        const name = block.querySelector('.meal-name').value || `${mealKey.charAt(0).toUpperCase() + mealKey.slice(1)} Meal`;
        const time = parseInt(block.querySelector('.meal-time').value) || 0;
        
        totalTime += time;
        if (time > 0) {
            mealTasks.push({ 
                meal: name, 
                time: time,
                type: mealKey // used to establish timeline priority
            });
        }

        const rows = block.querySelectorAll('.ingredient-inputs > div');
        rows.forEach(row => {
            const ingName = row.querySelector('.ing-name').value;
            const ingCost = parseFloat(row.querySelector('.ing-cost').value) || 0;
            const ingSub = row.querySelector('.ing-sub').value;
            const isOwned = row.querySelector('.ing-owned').checked;

            if (ingName && !isOwned) {
                const isCurrentlySubbed = activeSubstitutions.has(row.id);
                let displayedName = ingName;
                let evaluatedCost = ingCost;

                if (isCurrentlySubbed && ingSub) {
                    displayedName = `${ingSub} (Sub for ${ingName})`;
                    const match = ingSub.match(/\(([+-])\$([\d.]+)\)/);
                    if (match) {
                        const sign = match[1] === '+' ? 1 : -1;
                        const diff = parseFloat(match[2]);
                        evaluatedCost = Math.max(0, ingCost + (sign * diff));
                    }
                }

                totalCost += evaluatedCost;
                missingGroceries.push({
                    id: row.id,
                    name: displayedName,
                    cost: evaluatedCost,
                    hasAlternative: !!ingSub,
                    isSubbed: isCurrentlySubbed,
                    mealOrigin: mealKey
                });
            }
        });
    });

    // Update Top Dashboard Metrics
    document.getElementById('dash-time').innerText = `${totalTime} mins`;
    document.getElementById('dash-cost').innerText = `$${totalCost.toFixed(2)}`;
    
    const budgetStatusCard = document.getElementById('dash-budget-status');
    const statusText = document.getElementById('dash-status-text');

    if (totalCost <= currentBudget) {
        budgetStatusCard.className = "bg-green-50 border border-green-200 p-5 rounded-xl flex flex-col justify-center";
        statusText.className = "text-xl font-bold text-green-800";
        statusText.innerText = "Under Budget";
    } else {
        budgetStatusCard.className = "bg-red-50 border border-red-200 p-5 rounded-xl flex flex-col justify-center animate-pulse";
        statusText.className = "text-xl font-bold text-red-800";
        statusText.innerText = "Over Budget!";
    }

    // Render Groceries List Column
    const groceryContainer = document.getElementById('grocery-todo-list');
    if (missingGroceries.length === 0) {
        groceryContainer.innerHTML = `<li class="text-sm text-gray-400 italic text-center py-4">All clear! No missing ingredients.</li>`;
    } else {
        // PRIORITIZATION RULE: In 'confirmed' state, groceries are flagged for immediate action.
        groceryContainer.innerHTML = missingGroceries.map(item => {
            const isConfirmed = (currentAppState === 'confirmed');
            const checkboxClass = isConfirmed ? 'inline-block' : 'hidden';
            const actionBtnClass = (currentAppState === 'review') ? 'inline-block' : 'hidden';
            const textStyle = isConfirmed ? 'text-amber-950 font-medium' : 'text-gray-700';

            return `
                <li class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 transition ${isConfirmed ? 'border-l-4 border-l-amber-500 bg-amber-50/40' : ''}">
                    <div class="flex items-center gap-3">
                        <input type="checkbox" class="${checkboxClass} w-4 h-4 text-amber-600 accent-amber-600 rounded">
                        <div>
                            <span class="text-sm font-semibold ${textStyle} block">
                                ${isConfirmed ? `<span class="text-xs uppercase bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded mr-1 font-bold">Buy</span> ` : ''}${item.name}
                            </span>
                            <span class="text-xs font-bold text-blue-600">$${item.cost.toFixed(2)}</span>
                        </div>
                    </div>
                    <button onclick="toggleSub('${item.id}')" class="${actionBtnClass} text-xs px-2 py-1 rounded border transition ${item.isSubbed ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200' : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'}">
                        ${item.isSubbed ? 'Undo Sub' : 'Swap Sub'}
                    </button>
                </li>
            `;
        }).join('');
    }

    // Render Prep Management Checklist
    const prepContainer = document.getElementById('prep-task-list');
    if (mealTasks.length === 0) {
        prepContainer.innerHTML = `<li class="text-sm text-gray-400 italic text-center py-4">Set times to see scheduling metrics.</li>`;
    } else {
        // PRIORITIZATION RULE: Chronological sorting (Breakfast -> Lunch -> Dinner)
        const orderWeight = { breakfast: 1, lunch: 2, dinner: 3 };
        mealTasks.sort((a, b) => orderWeight[a.type] - orderWeight[b.type]);

        prepContainer.innerHTML = mealTasks.map((task, index) => {
            const isConfirmed = (currentAppState === 'confirmed');
            const disabledStr = isConfirmed ? '' : 'disabled';
            
            // Visual indicators for priority sequence
            let priorityBadgeColor = "bg-gray-200 text-gray-700";
            if (task.type === 'breakfast') priorityBadgeColor = "bg-blue-100 text-blue-800 font-bold";
            if (task.type === 'lunch') priorityBadgeColor = "bg-green-100 text-green-800 font-bold";
            if (task.type === 'dinner') priorityBadgeColor = "bg-purple-100 text-purple-800 font-bold";

            return `
                <li class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 ${isConfirmed ? 'border-l-4 border-l-blue-500' : ''}">
                    <input type="checkbox" ${disabledStr} class="w-4 h-4 text-blue-600 accent-blue-600 rounded">
                    <div class="text-sm w-full flex items-center justify-between">
                        <div>
                            <span class="text-gray-700 font-medium block">Prep <strong class="text-gray-900">${task.meal}</strong></span>
                            <span class="text-xs text-gray-400">Allocate <span class="font-bold text-gray-600">${task.time} mins</span></span>
                        </div>
                        <span class="text-[10px] uppercase px-2 py-0.5 rounded ${priorityBadgeColor}">
                            Step ${index + 1}
                        </span>
                    </div>
                </li>
            `;
        }).join('');
    }
}