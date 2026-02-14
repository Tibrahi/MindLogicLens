/**
 * MIND LOGIC LENS - CORE ENGINE
 * * Architecture:
 * - Storage: IndexedDB Wrapper
 * - Levels: Configuration Objects
 * - Game: Main Controller
 * - Builder: Logic Sandbox
 */

// --- 1. STORAGE UTILS ---
const DB_NAME = "MindLogicDB_v2";
const STORE_NAME = "player_data";

const Storage = {
    db: null,
    async init() {
        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "id" });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            request.onerror = () => resolve(); // Fail gracefully
        });
    },
    async setData(key, val) {
        if (!this.db) return;
        const tx = this.db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put({ id: key, val: val });
    },
    async getData(key) {
        if (!this.db) return null;
        return new Promise((resolve) => {
            const tx = this.db.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).get(key);
            req.onsuccess = () => resolve(req.result ? req.result.val : null);
            req.onerror = () => resolve(null);
        });
    }
};

// --- 2. GAME CONTENT ---
const Levels = [
    {
        id: "lvl1",
        title: "The Classic",
        difficulty: "Novice",
        color: "border-green-500",
        type: "linear",
        steps: [
            "Think of a number between 1 and 50.",
            "Multiply your number by 2.",
            "Add 10 to the total.",
            "Divide the result by 2.",
            "Subtract your ORIGINAL number."
        ],
        solve: () => 5,
        proof: "Let x be your number.\n1. 2x\n2. 2x + 10\n3. (2x + 10)/2 = x + 5\n4. x + 5 - x = 5\nThe variable cancels out."
    },
    {
        id: "lvl2",
        title: "Reverse Engineer",
        difficulty: "Apprentice",
        color: "border-cyan-500",
        type: "input",
        steps: [
            "Think of any number.",
            "Multiply it by 4.",
            "Add 12 to the result.",
            "Divide by 2.",
            "Enter your current total below:"
        ],
        // Math: (4x + 12)/2 = 2x + 6.  User enters Y. x = (Y-6)/2
        solve: (input) => (input - 6) / 2,
        proof: "I reversed your steps.\nYour Equation: (4x + 12) / 2 = Result\n2x + 6 = Result\n2x = Result - 6\nx = (Result - 6) / 2"
    },
    {
        id: "lvl3",
        title: "Symbol Oracle",
        difficulty: "Adept",
        color: "border-neon",
        type: "symbol",
        steps: [
            "Think of a 2-digit number (e.g., 23).",
            "Add the two digits together (2 + 3 = 5).",
            "Subtract that sum from your original number (23 - 5 = 18).",
            "Find your result in the table below and memorize the symbol.",
            "Focus on that symbol..."
        ],
        solve: () => Game.state.targetSymbol,
        proof: "Any 2-digit number 10a + b minus sum (a+b) equals 9a.\nThe result is ALWAYS a multiple of 9.\nI simply placed the same symbol on every multiple of 9."
    },
    {
        id: "lvl4",
        title: "Binary Mind",
        difficulty: "Master",
        color: "border-yellow-500",
        type: "binary",
        min: 1,
        max: 100,
        init: "Think of a number between 1 and 100.",
        proof: "Binary Search Algorithm (O(log n)).\nBy cutting the possibilities in half with every question, I can find any number from 1-100 in just 7 steps."
    },
    {
        id: "lvl5",
        title: "Chaos Theory",
        difficulty: "Grand Master",
        color: "border-red-500",
        type: "dynamic",
        proof: "Dynamic Algebra Generation.\nThe coefficients were randomized at runtime, but the logic ensures 'x' is eliminated."
    }
];

// --- 3. MAIN CONTROLLER ---
const Game = {
    xp: 0,
    state: {}, // Holds temporary level data
    ui: {},    // DOM Cache

    async init() {
        // Cache DOM elements for performance
        const ids = ['scene-home', 'scene-game', 'scene-result', 'scene-builder',
                     'level-grid', 'xp-display', 'rank-display', 'game-title', 
                     'game-instruction', 'progress-bar', 'action-btn', 
                     'input-area', 'user-input', 'binary-area', 'symbol-grid',
                     'final-reveal', 'logic-explanation'];
        ids.forEach(id => this.ui[id] = document.getElementById(id));

        // Load Data
        await Storage.init();
        this.xp = (await Storage.getData('xp')) || 0;
        this.updateStats();
        
        // Render Menu
        this.renderMenu();

        // Global Event Listeners for Binary Search (attached once)
        document.getElementById('btn-yes').onclick = () => this.handleBinary(true);
        document.getElementById('btn-no').onclick = () => this.handleBinary(false);
    },

    updateStats() {
        this.ui['xp-display'].innerText = this.xp.toString().padStart(4, '0');
        let rank = "NOVICE";
        if (this.xp > 500) rank = "APPRENTICE";
        if (this.xp > 1500) rank = "ADEPT";
        if (this.xp > 3000) rank = "MASTER";
        if (this.xp > 5000) rank = "ORACLE";
        this.ui['rank-display'].innerText = rank;
    },

    renderMenu() {
        this.switchScene('home');
        this.ui['level-grid'].innerHTML = Levels.map((lvl, idx) => `
            <div onclick="Game.startLevel(${idx})" 
                 class="group relative overflow-hidden cursor-pointer bg-panel border-l-4 ${lvl.color} p-6 rounded hover:bg-white/5 transition-all hover:scale-[1.02] duration-200 shadow-lg">
                <div class="flex justify-between items-start mb-2 relative z-10">
                    <h3 class="font-display font-bold text-lg text-white group-hover:text-neon transition">${lvl.title}</h3>
                    <span class="text-[10px] bg-black/50 px-2 py-1 rounded text-gray-400 border border-white/10">${lvl.difficulty}</span>
                </div>
                <p class="text-sm text-gray-400 font-light relative z-10">${lvl.id === 'lvl5' ? 'Randomized every time.' : 'Test your logic.'}</p>
                <div class="absolute -right-4 -bottom-4 text-8xl text-white/5 font-display group-hover:text-neon/10 transition select-none">${idx + 1}</div>
            </div>
        `).join('');
    },

    startLevel(indexOrObj) {
        // Prepare State
        const lvl = typeof indexOrObj === 'number' ? Levels[indexOrObj] : indexOrObj;
        this.state = {
            lvl: lvl,
            step: 0,
            data: {}
        };

        // Reset UI
        this.ui['input-area'].classList.add('hidden');
        this.ui['binary-area'].classList.add('hidden');
        this.ui['symbol-grid'].classList.add('hidden');
        this.ui['action-btn'].classList.remove('hidden');
        this.ui['user-input'].value = '';
        this.ui['game-title'].innerText = lvl.title;

        // Special Initialization
        if (lvl.type === 'dynamic') this.generateDynamicLevel();
        if (lvl.type === 'symbol') this.generateSymbolGrid();
        if (lvl.type === 'binary') {
            this.state.data = { min: lvl.min, max: lvl.max };
            this.state.step = -1; // -1 indicates intro
        }

        this.switchScene('game');
        this.updateGameStep();
    },

    updateGameStep() {
        const { lvl, step } = this.state;
        
        // Progress Bar
        const maxSteps = lvl.steps ? lvl.steps.length : 7; // Approx for binary
        const pct = Math.min(100, ((step + 1) / maxSteps) * 100);
        this.ui['progress-bar'].style.width = `${pct}%`;

        // --- BINARY LOGIC ---
        if (lvl.type === 'binary') {
            this.renderBinaryStep();
            return;
        }

        // --- LINEAR/INPUT/SYMBOL LOGIC ---
        if (step < lvl.steps.length) {
            // Text Animation
            const instr = this.ui['game-instruction'];
            instr.style.opacity = '0';
            instr.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                instr.innerText = lvl.steps[step];
                instr.style.opacity = '1';
                instr.style.transform = 'translateY(0)';
            }, 300);

            // Handle Specific UI elements
            const isLast = step === lvl.steps.length - 1;
            
            if (lvl.type === 'symbol' && isLast) {
                this.ui['symbol-grid'].classList.remove('hidden');
                this.ui['action-btn'].innerText = "I HAVE IT";
            } else if (lvl.type === 'input' && isLast) {
                this.ui['input-area'].classList.remove('hidden');
                this.ui['user-input'].focus();
                this.ui['action-btn'].innerText = "PREDICT";
            } else {
                this.ui['symbol-grid'].classList.add('hidden');
                this.ui['input-area'].classList.add('hidden');
                this.ui['action-btn'].innerText = "NEXT STEP";
            }

            this.ui['action-btn'].onclick = () => this.nextStep();
        } else {
            this.finish();
        }
    },

    nextStep() {
        this.state.step++;
        this.updateGameStep();
    },

    // --- LOGIC: BINARY SEARCH ---
    renderBinaryStep() {
        if (this.state.step === -1) {
            // Intro
            this.ui['game-instruction'].innerText = this.state.lvl.init;
            this.ui['action-btn'].classList.remove('hidden');
            this.ui['binary-area'].classList.add('hidden');
            this.ui['action-btn'].innerText = "START";
            this.ui['action-btn'].onclick = () => this.nextStep();
        } else {
            // Loop
            const { min, max } = this.state.data;
            if (min === max) {
                this.state.result = min;
                this.finish();
                return;
            }

            const mid = Math.floor((min + max) / 2);
            this.state.data.mid = mid;

            this.ui['game-instruction'].innerHTML = `Is your number greater than <span class="text-neon font-bold">${mid}</span>?`;
            this.ui['action-btn'].classList.add('hidden');
            this.ui['binary-area'].classList.remove('hidden');
        }
    },

    handleBinary(isYes) {
        // Classic Binary Search:
        // Range [1, 100]. Mid 50.
        // > 50? Yes -> Range [51, 100]. Min = Mid + 1
        // > 50? No  -> Range [1, 50]. Max = Mid
        
        const { mid } = this.state.data;
        if (isYes) {
            this.state.data.min = mid + 1;
        } else {
            this.state.data.max = mid;
        }
        this.state.step++;
        this.renderBinaryStep();
    },

    // --- LOGIC: DYNAMIC GENERATOR ---
    generateDynamicLevel() {
        // Form: ( (x + A) * B ) - Bx = Result
        const A = Math.floor(Math.random() * 20) + 1;
        const B = Math.floor(Math.random() * 5) + 2;
        const result = A * B;

        this.state.lvl.steps = [
            "Think of any number.",
            `Add ${A} to it.`,
            `Multiply the result by ${B}.`,
            `Subtract ${B} times your ORIGINAL number.`
        ];
        this.state.lvl.solve = () => result;
        this.state.lvl.proof = `Math Proof:\nLet number = x\n1. x + ${A}\n2. ${B}(x + ${A}) = ${B}x + ${A*B}\n3. (${B}x + ${A*B}) - ${B}x = ${A*B}`;
    },

    // --- LOGIC: SYMBOL GRID ---
    generateSymbolGrid() {
        const chars = ['⚛','☮','☯','☪','☢','☣','⚡','❄','♫','⚓','⚔','⚖'];
        const target = chars[Math.floor(Math.random() * chars.length)];
        this.state.targetSymbol = target;

        let html = '';
        // 0 to 99
        for(let i = 0; i < 100; i++) {
            // Trick: (10a+b) - (a+b) = 9a. Result is ALWAYS multiple of 9.
            // So 0, 9, 18... 81 need the target. 
            // Note: 90 and 99 are multiples, but max possible result of 99 - (9+9) = 81.
            const isMultipleOf9 = (i % 9 === 0);
            const sym = isMultipleOf9 ? target : chars[Math.floor(Math.random() * chars.length)];
            
            html += `
            <div class="flex items-center justify-between bg-white/5 p-2 rounded">
                <span class="text-gray-500 font-mono text-xs">${i}</span>
                <span class="text-neon font-bold text-lg">${sym}</span>
            </div>`;
        }
        this.ui['symbol-grid'].innerHTML = html;
    },

    // --- FINISH ---
    finish() {
        let finalVal = 0;
        try {
            if (this.state.lvl.type === 'input') {
                const val = parseFloat(this.ui['user-input'].value);
                if (isNaN(val)) { alert("Please enter a number."); this.state.step--; this.updateGameStep(); return; }
                finalVal = this.state.lvl.solve(val);
            } else if (this.state.lvl.type === 'binary') {
                finalVal = this.state.result;
            } else {
                finalVal = this.state.lvl.solve();
            }
        } catch(e) { finalVal = "Error"; }

        // XP Math
        this.xp += 100;
        if(this.state.lvl.difficulty === "Grand Master") this.xp += 150;
        Storage.setData('xp', this.xp);
        this.updateStats();

        // Render Result
        this.switchScene('result');
        this.ui['logic-explanation'].innerText = this.state.lvl.proof;
        
        // Slot Machine Effect
        const el = this.ui['final-reveal'];
        let iter = 0;
        const interval = setInterval(() => {
            el.innerText = Math.floor(Math.random() * 99);
            iter++;
            if(iter > 20) {
                clearInterval(interval);
                el.innerText = finalVal;
                // Check if float
                if(typeof finalVal === 'number' && !Number.isInteger(finalVal)) {
                    el.innerText = finalVal.toFixed(1);
                }
            }
        }, 50);
    },

    // --- UTILS ---
    switchScene(name) {
        ['home', 'game', 'result', 'builder'].forEach(id => this.ui['scene-'+id].classList.add('hidden'));
        this.ui['scene-'+name].classList.remove('hidden');
    },
    returnToHome() { this.renderMenu(); },
    restartLevel() { this.startLevel(this.state.lvl); },
    
    // --- BUILDER MODE ---
    openBuilder() {
        this.switchScene('builder');
        Builder.init();
    }
};

// --- 4. BUILDER ENGINE ---
const Builder = {
    steps: [],
    
    init() {
        this.steps = [];
        this.render();
    },

    addOp(type) {
        let val = prompt("Enter a number value:");
        if(!val || isNaN(val)) return;
        this.steps.push({ type, val: parseFloat(val) });
        this.render();
    },

    render() {
        const container = document.getElementById('builder-steps');
        container.innerHTML = this.steps.map((s, i) => `
            <div class="p-3 bg-white/5 border-l-2 border-cyan flex justify-between items-center">
                <span class="text-sm text-gray-300">${i+2}. ${this.getLabel(s)}</span>
                <button onclick="Builder.remove(${i})" class="text-red-500 hover:text-white">×</button>
            </div>
        `).join('');
        this.calculatePreview();
    },

    getLabel(s) {
        switch(s.type) {
            case 'add': return `Add ${s.val}`;
            case 'sub': return `Subtract ${s.val}`;
            case 'mul': return `Multiply by ${s.val}`;
            case 'div': return `Divide by ${s.val}`;
        }
    },

    remove(idx) {
        this.steps.splice(idx, 1);
        this.render();
    },

    calculatePreview() {
        // Symbolic execution to see if X remains
        // We simulate with x=10 and x=100. If difference is 0, x is gone.
        const r1 = this.runMath(10);
        const r2 = this.runMath(100);
        const status = document.getElementById('builder-status');
        
        if (Math.abs(r1 - r2) < 0.001) {
            status.innerHTML = `<span class="text-green-400">Valid! Constant Result: ${r1}</span>`;
            status.dataset.valid = "true";
        } else {
            status.innerHTML = `<span class="text-red-400">Invalid: 'x' still exists. Add operations to cancel x.</span>`;
            status.dataset.valid = "false";
        }
    },

    runMath(x) {
        let val = x;
        this.steps.forEach(s => {
            if(s.type === 'add') val += s.val;
            if(s.type === 'sub') val -= s.val;
            if(s.type === 'mul') val *= s.val;
            if(s.type === 'div') val /= s.val;
        });
        return val;
    },

    testAndSave() {
        const status = document.getElementById('builder-status');
        if(status.dataset.valid !== "true") {
            alert("Your trick doesn't work! The result must be the same regardless of the starting number.");
            return;
        }

        const constant = this.runMath(0); // If x cancels, input 0 gives the constant
        
        const customLevel = {
            id: 'custom-' + Date.now(),
            title: "Custom Trick",
            difficulty: "Builder",
            color: "border-purple-500",
            type: "linear",
            steps: ["Think of a number", ...this.steps.map(s => this.getLabel(s))],
            solve: () => constant,
            proof: "This is a custom algorithm designed by the user."
        };

        Game.startLevel(customLevel);
    }
};

window.onload = () => Game.init();