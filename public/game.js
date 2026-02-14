/**
 * MIND LOGIC LENS - FULL ENGINE
 * Features: IndexedDB, 5 Levels, Dynamic UI, Math Logic
 */

// --- 1. DATABASE & STATE ---
const DB_NAME = "MindLogicDB";
const STORE_NAME = "user_progress";

const Storage = {
    db: null,
    async init() {
        return new Promise((resolve, reject) => {
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
            request.onerror = (e) => reject(e);
        });
    },
    async saveXP(xp) {
        if (!this.db) return;
        const tx = this.db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put({ id: "xp", val: xp });
    },
    async getXP() {
        if (!this.db) return 0;
        return new Promise((resolve) => {
            const tx = this.db.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).get("xp");
            req.onsuccess = () => resolve(req.result ? req.result.val : 0);
            req.onerror = () => resolve(0);
        });
    }
};

// --- 2. GAME LEVELS CONFIGURATION ---
const Levels = [
    {
        id: 1,
        title: "Classic Algebra",
        desc: "The standard number prediction trick.",
        difficulty: "Easy",
        color: "border-green-500",
        type: "guided",
        steps: [
            "Think of a number between 1 and 100.",
            "Multiply your number by 2.",
            "Add 10 to the result.",
            "Divide the new result by 2.",
            "Subtract your ORIGINAL number from the current total."
        ],
        solve: () => 5,
        proof: "Algebraic Proof:\nLet x be your number.\n1. 2x\n2. 2x + 10\n3. (2x + 10) / 2 = x + 5\n4. (x + 5) - x = 5\nThe result is constant."
    },
    {
        id: 2,
        title: "Reverse Engineer",
        desc: "I will calculate your secret number.",
        difficulty: "Medium",
        color: "border-cyan-500",
        type: "input_solve",
        steps: [
            "Think of any number.",
            "Multiply it by 3.",
            "Add 15 to the result.",
            "Multiply by 2.",
            "Enter your current total below:"
        ],
        // Math: 2(3x + 15) = y  -> 6x + 30 = y -> x = (y - 30) / 6
        solve: (y) => (y - 30) / 6,
        proof: "Inverse Operations:\nEquation: 2(3x + 15) = y\n6x + 30 = y\n6x = y - 30\nx = (y - 30) / 6"
    },
    {
        id: 3,
        title: "The Symbol Oracle",
        desc: "A matrix reading illusion.",
        difficulty: "Hard",
        color: "border-neon",
        type: "symbol_grid",
        steps: [
            "Think of any 2-digit number (e.g., 23).",
            "Add the two digits together (2 + 3 = 5).",
            "Subtract that sum from your original number (23 - 5 = 18).",
            "Find the symbol corresponding to your result in the grid below.",
            "Concentrate on that symbol..."
        ],
        // Logic: 10a + b - (a + b) = 9a. Result is always multiple of 9.
        solve: () => Game.tempData.targetSymbol, 
        proof: "Digit Theory:\nNumber = 10a + b\nSum = a + b\nOperation: (10a + b) - (a + b) = 9a\nThe result is always a multiple of 9. All multiples of 9 shared the same symbol."
    },
    {
        id: 4,
        title: "Binary Search",
        desc: "I will find your number in 7 steps.",
        difficulty: "Expert",
        color: "border-yellow-500",
        type: "binary_search",
        min: 1,
        max: 100,
        initStep: "Think of a number between 1 and 100.",
        proof: "Binary Search Algorithm (O(log n)):\nBy asking if the number is greater than the midpoint, we eliminate half the possibilities every turn.\n2^7 = 128, covering the 1-100 range."
    },
    {
        id: 5,
        title: "Randomized Logic",
        desc: "A trick that changes every time.",
        difficulty: "Variable",
        color: "border-red-500",
        type: "guided_dynamic",
        // Steps generated at runtime in initLevel
        proof: "Dynamic Algebra:\nThe coefficients were generated randomly, but the variables cancel out leaving only the constant term."
    }
];

// --- 3. GAME ENGINE ---
const Game = {
    currentLevel: null,
    stepIndex: 0,
    userXP: 0,
    tempData: {}, 
    
    // DOM Cache
    ui: {
        home: document.getElementById('scene-home'),
        game: document.getElementById('scene-game'),
        result: document.getElementById('scene-result'),
        instr: document.getElementById('game-instruction'),
        btn: document.getElementById('action-btn'),
        inputArea: document.getElementById('input-area'),
        input: document.getElementById('user-input'),
        binaryArea: document.getElementById('binary-area'),
        symbolGrid: document.getElementById('symbol-grid'),
        progressBar: document.getElementById('progress-bar'),
        xpDisplay: document.getElementById('xp-display'),
        finalReveal: document.getElementById('final-reveal'),
        explanation: document.getElementById('logic-explanation'),
        levelGrid: document.getElementById('level-grid'),
        instrContainer: document.getElementById('game-instruction-container')
    },

    async init() {
        await Storage.init();
        this.userXP = await Storage.getXP();
        this.updateXP();
        this.renderMenu();
    },

    // --- MENU RENDERER ---
    renderMenu() {
        this.ui.levelGrid.innerHTML = Levels.map((lvl, index) => `
            <div onclick="Game.startLevel(${index})" 
                 class="group cursor-pointer bg-white/5 border-l-4 ${lvl.color} p-6 rounded hover:bg-white/10 transition-all hover:scale-[1.02] duration-200">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-display font-bold text-lg text-white group-hover:text-neon">${lvl.title}</h3>
                    <span class="text-[10px] bg-black/50 px-2 py-1 rounded text-gray-400">${lvl.difficulty}</span>
                </div>
                <p class="text-sm text-gray-400 font-light">${lvl.desc}</p>
            </div>
        `).join('');
        this.switchScene('home');
    },

    // --- LEVEL INITIALIZER ---
    startLevel(index) {
        this.currentLevel = Levels[index];
        this.stepIndex = 0;
        this.tempData = {};
        
        // Reset UI Components
        this.ui.inputArea.classList.add('hidden');
        this.ui.binaryArea.classList.add('hidden');
        this.ui.symbolGrid.classList.add('hidden');
        this.ui.btn.classList.remove('hidden');
        this.ui.input.value = '';
        this.ui.btn.innerText = "START";
        
        // Specific Logic for Dynamic Levels
        if (this.currentLevel.type === 'guided_dynamic') {
            this.generateRandomLevel();
        } else if (this.currentLevel.type === 'symbol_grid') {
            this.generateSymbolGrid();
        } else if (this.currentLevel.type === 'binary_search') {
            this.tempData = { min: this.currentLevel.min, max: this.currentLevel.max };
        }

        this.switchScene('game');
        document.getElementById('game-title').innerText = this.currentLevel.title;

        // Start Logic
        if (this.currentLevel.type === 'binary_search') {
            this.ui.instr.innerText = this.currentLevel.initStep;
            this.ui.btn.onclick = () => this.startBinaryLoop();
        } else {
            this.updateStep();
            this.ui.btn.onclick = () => this.nextStep();
        }
    },

    // --- DYNAMIC LEVEL GENERATOR (Level 5) ---
    generateRandomLevel() {
        // Logic: ((x * a) + b) / a - x = b/a ?? No.
        // Let's do: Take x, add A, multiply by B, subtract (B*x), result is A*B.
        const A = Math.floor(Math.random() * 10) + 5; // 5 to 15
        const B = Math.floor(Math.random() * 4) + 2;  // 2 to 5
        
        this.tempData.dynamicResult = A * B;
        
        this.currentLevel.steps = [
            "Think of any number.",
            `Add ${A} to your number.`,
            `Multiply the result by ${B}.`,
            `Subtract ${B} times your ORIGINAL number.`,
            // (x + A)*B - Bx = Bx + AB - Bx = AB
        ];
        this.currentLevel.solve = () => this.tempData.dynamicResult;
        this.currentLevel.proof = `Let number be x.\n1. x + ${A}\n2. ${B}(x + ${A}) = ${B}x + ${A*B}\n3. (${B}x + ${A*B}) - ${B}x = ${A*B}`;
    },

    // --- SYMBOL GRID GENERATOR (Level 3) ---
    generateSymbolGrid() {
        const symbols = ['☮','☯','☪','☢','☣','⚡','❄','♫','⚓','⚔','⚖','⚛'];
        const target = symbols[Math.floor(Math.random() * symbols.length)];
        this.tempData.targetSymbol = target;
        
        let html = '';
        for(let i=0; i<100; i++) {
            // Multiples of 9 get the target symbol
            const sym = (i % 9 === 0) ? target : symbols[Math.floor(Math.random() * symbols.length)];
            html += `<div class="flex justify-between bg-white/5 px-2 rounded"><span class="text-gray-400">${i}</span> <span class="text-neon font-bold">${sym}</span></div>`;
        }
        this.ui.symbolGrid.innerHTML = html;
    },

    // --- STEP HANDLER (Linear Levels) ---
    updateStep() {
        const lvl = this.currentLevel;
        const totalSteps = lvl.steps.length;
        const pct = (this.stepIndex / totalSteps) * 100;
        this.ui.progressBar.style.width = `${pct}%`;

        // Content
        if (this.stepIndex < totalSteps) {
            // Animation for text change
            this.ui.instr.classList.remove('animate-fade-in');
            void this.ui.instr.offsetWidth; // trigger reflow
            this.ui.instr.classList.add('animate-fade-in');
            
            this.ui.instr.innerText = lvl.steps[this.stepIndex];
            
            // Check for Symbol Grid Step
            if (lvl.type === 'symbol_grid' && this.stepIndex === totalSteps - 1) {
                this.ui.symbolGrid.classList.remove('hidden');
            } else {
                this.ui.symbolGrid.classList.add('hidden');
            }

            // Check for Input Step
            if (lvl.type === 'input_solve' && this.stepIndex === totalSteps - 1) {
                this.ui.inputArea.classList.remove('hidden');
                this.ui.input.focus();
                this.ui.btn.innerText = "PREDICT";
            } else {
                this.ui.btn.innerText = (this.stepIndex === totalSteps - 1) ? "REVEAL" : "NEXT STEP";
            }
        } else {
            this.finishLevel();
        }
    },

    nextStep() {
        this.stepIndex++;
        this.updateStep();
    },

    // --- BINARY SEARCH LOGIC (Level 4) ---
    startBinaryLoop() {
        this.ui.btn.classList.add('hidden'); 
        this.ui.binaryArea.classList.remove('hidden');
        this.askBinaryQuestion();
    },

    askBinaryQuestion() {
        const { min, max } = this.tempData;
        
        if (min === max) {
            this.tempData.finalAnswer = min;
            this.finishLevel();
            return;
        }

        const mid = Math.floor((min + max) / 2);
        this.tempData.mid = mid;

        this.ui.instr.innerHTML = `Is your number greater than <span class="text-neon font-bold">${mid}</span>?`;

        // Event Listeners (ensure strictly one-time binding or reset)
        document.getElementById('btn-yes').onclick = () => {
            this.tempData.min = mid + 1;
            this.askBinaryQuestion();
        };
        document.getElementById('btn-no').onclick = () => {
            this.tempData.max = mid;
            this.askBinaryQuestion();
        };
    },

    // --- FINISH & REVEAL ---
    finishLevel() {
        let result = "?";
        const lvl = this.currentLevel;

        try {
            if (lvl.type === 'input_solve') {
                const val = parseFloat(this.ui.input.value);
                if (isNaN(val)) { alert("Input required!"); this.stepIndex--; return; }
                result = lvl.solve(val);
                // Check for integer float issues
                if (!Number.isInteger(result)) result = result.toFixed(1);
            } else if (lvl.type === 'binary_search') {
                result = this.tempData.finalAnswer;
            } else {
                result = lvl.solve();
            }
        } catch(e) {
            console.error(e);
            result = "Error";
        }

        // Add XP
        this.userXP += 150;
        Storage.saveXP(this.userXP);
        this.updateXP();

        // Switch to Reveal
        this.switchScene('result');
        this.ui.finalReveal.innerText = "";
        
        // "Calculating" Effect
        let shuffle = 0;
        const interval = setInterval(() => {
            this.ui.finalReveal.innerText = Math.floor(Math.random() * 99);
            shuffle++;
            if (shuffle > 15) {
                clearInterval(interval);
                this.ui.finalReveal.innerText = result;
                this.ui.explanation.innerText = lvl.proof;
            }
        }, 80);
    },

    // --- UTILS ---
    switchScene(name) {
        ['home', 'game', 'result'].forEach(s => this.ui[s].classList.add('hidden'));
        this.ui['scene-'+name].classList.remove('hidden');
    },
    updateXP() {
        this.ui.xpDisplay.innerText = this.userXP.toString().padStart(4, '0');
    },
    returnToHome() {
        this.renderMenu();
    },
    restartLevel() {
        const idx = Levels.findIndex(l => l.id === this.currentLevel.id);
        this.startLevel(idx);
    }
};

// Init Game
window.onload = () => Game.init();