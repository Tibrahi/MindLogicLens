/**
 * MIND LOGIC LENS - CORE ENGINE
 */

// --- 1. INDEXEDDB HANDLER ---
const DB_NAME = "MindLogicDB";
const STORE_NAME = "progress";

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
        tx.objectStore(STORE_NAME).put({ id: "user_xp", val: xp });
    },
    async getXP() {
        if (!this.db) return 0;
        return new Promise((resolve) => {
            const tx = this.db.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).get("user_xp");
            req.onsuccess = () => resolve(req.result ? req.result.val : 0);
            req.onerror = () => resolve(0);
        });
    }
};

// --- 2. GAME LEVELS CONFIG ---
// This allows you to easily add the "Impossible Mode" or "Magic Squares" later.
const Levels = [
    {
        id: 1,
        title: "The Classic Illusion",
        desc: "Beginner Algebra",
        color: "border-green-500",
        type: "guided", // Step by step, constant result
        steps: [
            "Think of a number between 1 and 100.",
            "Multiply that number by 2.",
            "Add 10 to the result.",
            "Divide the new result by 2.",
            "Subtract your ORIGINAL number."
        ],
        solve: () => 5, // The math: ((2x + 10)/2) - x = x + 5 - x = 5
        proof: "Algebra: Let number be x. $$ \\frac{2x + 10}{2} - x = 5 $$"
    },
    {
        id: 2,
        title: "Reverse Engineer",
        desc: "Predictive Calc",
        color: "border-yellow-500",
        type: "input_solve", // User gives final result, we find original
        steps: [
            "Think of any number.",
            "Multiply it by 4.",
            "Add 12 to the result.",
            "Enter the result below:"
        ],
        // Logic: 4x + 12 = y -> x = (y-12)/4
        solve: (input) => (input - 12) / 4,
        proof: "We used inverse operations. If $$ 4x + 12 = y $$, then $$ x = \\frac{y - 12}{4} $$."
    },
    {
        id: 3,
        title: "Binary Mind Reader",
        desc: "Logarithmic Search",
        color: "border-purple-500",
        type: "interactive", // Yes/No questions
        min: 1,
        max: 100,
        initStep: "Think of a number between 1 and 100.",
        proof: "Binary Search Algorithm: We cut the search space in half with every question. $$ O(\\log n) $$ efficiency."
    }
];

// --- 3. GAME ENGINE ---
const Game = {
    currentLevel: null,
    stepIndex: 0,
    userXP: 0,
    tempData: {}, // For binary search bounds etc.

    // UI Elements
    ui: {
        home: document.getElementById('scene-home'),
        game: document.getElementById('scene-game'),
        result: document.getElementById('scene-result'),
        instr: document.getElementById('game-instruction'),
        btn: document.getElementById('action-btn'),
        inputArea: document.getElementById('input-area'),
        input: document.getElementById('user-input'),
        binaryArea: document.getElementById('binary-area'),
        progressBar: document.getElementById('progress-bar'),
        xpDisplay: document.getElementById('xp-display'),
        finalReveal: document.getElementById('final-reveal'),
        explanation: document.getElementById('logic-explanation')
    },

    async init() {
        await Storage.init();
        this.userXP = await Storage.getXP();
        this.updateXPUI();
        this.renderMenu();
    },

    renderMenu() {
        const grid = document.getElementById('level-grid');
        grid.innerHTML = Levels.map((lvl, index) => `
            <div onclick="Game.startLevel(${index})" 
                 class="cursor-pointer bg-gray-800 p-4 rounded-xl border-l-4 ${lvl.color} hover:bg-gray-700 hover:scale-105 transition transform shadow-lg group">
                <h3 class="font-bold text-white group-hover:text-neon">${lvl.title}</h3>
                <p class="text-xs text-gray-400 mt-1">${lvl.desc}</p>
            </div>
        `).join('');
        
        this.switchScene('home');
    },

    startLevel(index) {
        this.currentLevel = Levels[index];
        this.stepIndex = 0;
        this.tempData = {};
        
        // Reset UI
        this.ui.inputArea.classList.add('hidden');
        this.ui.binaryArea.classList.add('hidden');
        this.ui.input.value = '';
        this.ui.btn.classList.remove('hidden');
        this.ui.btn.textContent = "I'm Ready";
        
        this.switchScene('game');
        this.documentTitle(this.currentLevel.title);
        
        // Initialize specific level types
        if (this.currentLevel.type === 'interactive') {
            this.tempData = { min: this.currentLevel.min, max: this.currentLevel.max };
            this.ui.instr.textContent = this.currentLevel.initStep;
            this.ui.btn.onclick = () => this.startBinaryLoop();
        } else {
            this.updateStep();
            this.ui.btn.onclick = () => this.nextStep();
        }
    },

    // --- STANDARD LINEAR LEVELS (1 & 2) ---
    updateStep() {
        const lvl = this.currentLevel;
        const totalSteps = lvl.steps.length;
        
        // Progress Bar
        const progress = ((this.stepIndex) / totalSteps) * 100;
        this.ui.progressBar.style.width = `${progress}%`;

        // Content
        if (this.stepIndex < totalSteps) {
            this.ui.instr.innerHTML = `<span class="fade-in">${lvl.steps[this.stepIndex]}</span>`;
            this.ui.btn.textContent = (this.stepIndex === totalSteps - 1) ? "Reveal / Enter" : "Done";
            
            // Check if input is needed for this step
            if (lvl.type === 'input_solve' && this.stepIndex === totalSteps - 1) {
                this.ui.inputArea.classList.remove('hidden');
                this.ui.input.focus();
                this.ui.btn.textContent = "Analyze";
            }
        } else {
            this.finishLevel();
        }
    },

    nextStep() {
        this.stepIndex++;
        this.updateStep();
    },

    // --- BINARY SEARCH LOGIC (Level 5) ---
    startBinaryLoop() {
        this.ui.btn.classList.add('hidden'); // Hide main button, use Yes/No
        this.ui.binaryArea.classList.remove('hidden');
        this.askBinaryQuestion();
    },

    askBinaryQuestion() {
        const { min, max } = this.tempData;
        
        // If narrowed down to one
        if (min === max) {
            this.tempData.finalAnswer = min;
            this.finishLevel();
            return;
        }

        // Calculate Midpoint
        const mid = Math.floor((min + max) / 2);
        this.tempData.mid = mid;

        this.ui.instr.innerHTML = `<span class="fade-in">Is your number greater than <strong class="text-neon text-4xl">${mid}</strong>?</span>`;
        
        // Bind buttons
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
        let result = 0;
        const lvl = this.currentLevel;

        // Calculate Result based on type
        if (lvl.type === 'guided') {
            result = lvl.solve();
        } else if (lvl.type === 'input_solve') {
            const val = parseFloat(this.ui.input.value);
            if (isNaN(val)) { alert("Please enter a valid number"); this.stepIndex--; return; }
            result = lvl.solve(val);
        } else if (lvl.type === 'interactive') {
            result = this.tempData.finalAnswer;
        }

        // Award XP
        this.userXP += 100;
        Storage.saveXP(this.userXP);
        this.updateXPUI();

        // Show Reveal Screen
        this.switchScene('result');
        this.ui.finalReveal.textContent = "...";
        
        // Suspense Animation
        setTimeout(() => {
            this.ui.finalReveal.textContent = result;
            this.ui.explanation.innerHTML = lvl.proof;
        }, 1500);
    },

    // --- UTILITIES ---
    switchScene(sceneName) {
        ['home', 'game', 'result'].forEach(s => {
            this.ui[s].classList.add('hidden');
        });
        this.ui['scene-'+sceneName].classList.remove('hidden');
        
        if(sceneName === 'game') this.ui.game.classList.add('fade-in');
    },

    documentTitle(t) {
        document.getElementById('game-title').textContent = t;
    },

    updateXPUI() {
        this.ui.xpDisplay.textContent = this.userXP;
    },

    returnToHome() {
        this.renderMenu();
    },

    restartLevel() {
        const idx = Levels.findIndex(l => l.id === this.currentLevel.id);
        this.startLevel(idx);
    }
};

// Start the game
window.onload = () => Game.init();