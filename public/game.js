/**
 * MIND LOGIC LENS - ACTIVE ENGINE
 */

// --- DATA STORE ---
const Levels = [
    {
        id: "lvl1",
        title: "The Classic Illusion",
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
        proof: "Algebra Proof:\nLet x = number\n1. 2x\n2. 2x + 10\n3. (2x + 10)/2 = x + 5\n4. x + 5 - x = 5"
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
            "Input your CURRENT total below:"
        ],
        solve: (val) => (val - 6) / 2,
        proof: "I reversed your math:\nYour result was (4x + 12)/2 = 2x + 6\nI subtracted 6, then divided by 2 to find x."
    },
    {
        id: "lvl3",
        title: "Symbol Oracle",
        difficulty: "Adept",
        color: "border-neon",
        type: "symbol",
        steps: [
            "Think of a 2-digit number (e.g. 23).",
            "Add the two digits together (2+3=5).",
            "Subtract that sum from your original (23-5=18).",
            "Find your resulting number in the list below.",
            "Memorize the symbol next to it."
        ],
        solve: () => Game.state.targetSymbol,
        proof: "Mathematical Law:\n(10a + b) - (a + b) = 9a\nThe result is always a multiple of 9.\nI put the same symbol on every multiple of 9."
    },
    {
        id: "lvl4",
        title: "Binary Search",
        difficulty: "Master",
        color: "border-yellow-500",
        type: "binary",
        min: 1,
        max: 100,
        init: "Think of a number between 1 and 100.",
        proof: "Binary Search Algorithm:\nBy repeatedly dividing the range in half, I can find any number in log2(N) steps."
    },
    {
        id: "lvl5",
        title: "Dynamic Chaos",
        difficulty: "Grand Master",
        color: "border-red-500",
        type: "dynamic",
        proof: "Generated at Runtime:\nThe system built a custom equation where variables cancel out."
    }
];

// --- MAIN ENGINE ---
const Game = {
    xp: 0,
    state: {},
    ui: {},

    init() {
        // Cache DOM
        const ids = ['scene-home', 'scene-game', 'scene-result', 'scene-builder',
                     'level-grid', 'xp-display', 'game-title', 
                     'game-instruction', 'progress-bar', 'action-btn', 
                     'input-area', 'user-input', 'binary-area', 'symbol-grid',
                     'final-reveal', 'logic-explanation'];
        ids.forEach(id => this.ui[id] = document.getElementById(id));

        // Setup Binary Buttons
        document.getElementById('btn-yes').onclick = () => this.handleBinary(true);
        document.getElementById('btn-no').onclick = () => this.handleBinary(false);

        // Load XP (Simple LocalStorage for simplicity in this version)
        this.xp = parseInt(localStorage.getItem('mindLogicXP') || '0');
        this.updateStats();
        this.renderMenu();
    },

    updateStats() {
        this.ui['xp-display'].innerText = this.xp;
    },

    renderMenu() {
        this.switchScene('home');
        this.ui['level-grid'].innerHTML = Levels.map((lvl, idx) => `
            <div onclick="Game.startLevel(${idx})" 
                 class="group relative cursor-pointer bg-panel border-l-4 ${lvl.color} p-5 rounded shadow-lg hover:bg-white/5 transition-all active:scale-95">
                <div class="flex justify-between items-center mb-1">
                    <h3 class="font-display font-bold text-white group-hover:text-neon transition">${lvl.title}</h3>
                    <span class="text-[10px] bg-black px-2 py-1 rounded text-gray-400">${lvl.difficulty}</span>
                </div>
                <div class="text-xs text-gray-500">${lvl.type.toUpperCase()} PROTOCOL</div>
            </div>
        `).join('');
    },

    startLevel(indexOrObj) {
        const lvl = typeof indexOrObj === 'number' ? Levels[indexOrObj] : indexOrObj;
        this.state = { lvl: lvl, step: 0, data: {} };
        
        // Reset UI
        ['input-area', 'binary-area', 'symbol-grid'].forEach(id => this.ui[id].classList.add('hidden'));
        this.ui['action-btn'].classList.remove('hidden');
        this.ui['user-input'].value = '';
        this.ui['game-title'].innerText = lvl.title;
        
        if (lvl.type === 'dynamic') this.generateDynamic();
        if (lvl.type === 'symbol') this.generateSymbols();
        if (lvl.type === 'binary') {
            this.state.data = { min: lvl.min, max: lvl.max };
            this.state.step = -1; 
        }

        this.switchScene('game');
        this.updateStep();
    },

    updateStep() {
        const { lvl, step } = this.state;
        const max = lvl.steps ? lvl.steps.length : 7;
        this.ui['progress-bar'].style.width = `${Math.min(100, ((step+1)/max)*100)}%`;

        // 1. Binary Mode
        if (lvl.type === 'binary') {
            this.renderBinary();
            return;
        }

        // 2. Standard Modes
        if (step < lvl.steps.length) {
            this.setInstruction(lvl.steps[step]);
            
            // Handle Last Step UI
            const isLast = step === lvl.steps.length - 1;
            this.ui['action-btn'].onclick = () => this.nextStep();
            this.ui['action-btn'].innerText = isLast ? "REVEAL" : "NEXT STEP";

            if (lvl.type === 'symbol' && isLast) {
                this.ui['symbol-grid'].classList.remove('hidden');
            } else if (lvl.type === 'input' && isLast) {
                this.ui['input-area'].classList.remove('hidden');
                this.ui['user-input'].focus();
                this.ui['action-btn'].innerText = "CALCULATE";
            } else {
                this.ui['symbol-grid'].classList.add('hidden');
                this.ui['input-area'].classList.add('hidden');
            }
        } else {
            this.finish();
        }
    },

    nextStep() {
        this.state.step++;
        this.updateStep();
    },

    setInstruction(text) {
        const el = this.ui['game-instruction'];
        el.style.opacity = '0';
        el.style.transform = 'translateY(5px)';
        setTimeout(() => {
            el.innerHTML = text;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 200);
    },

    // --- LOGIC MODULES ---

    renderBinary() {
        if (this.state.step === -1) {
            this.setInstruction(this.state.lvl.init);
            this.ui['action-btn'].classList.remove('hidden');
            this.ui['binary-area'].classList.add('hidden');
            this.ui['action-btn'].innerText = "START";
            this.ui['action-btn'].onclick = () => this.nextStep();
        } else {
            const { min, max } = this.state.data;
            if (min === max) {
                this.state.result = min;
                this.finish();
                return;
            }
            const mid = Math.floor((min + max) / 2);
            this.state.data.mid = mid;
            this.setInstruction(`Is your number greater than <span class="text-neon font-bold">${mid}</span>?`);
            this.ui['action-btn'].classList.add('hidden');
            this.ui['binary-area'].classList.remove('hidden');
        }
    },

    handleBinary(yes) {
        const { mid } = this.state.data;
        if (yes) this.state.data.min = mid + 1;
        else this.state.data.max = mid;
        this.state.step++;
        this.renderBinary();
    },

    generateDynamic() {
        const A = Math.floor(Math.random() * 10) + 2;
        const B = Math.floor(Math.random() * 5) + 2;
        this.state.lvl.steps = [
            "Think of a number.",
            `Multiply it by ${A}.`,
            `Add ${A*B} to the result.`,
            `Divide by ${A}.`,
            `Subtract your ORIGINAL number.`
        ];
        this.state.lvl.solve = () => B;
        this.state.lvl.proof = `(${A}x + ${A*B}) / ${A} - x = B\n(${A}(x+${B}))/${A} - x = B\nx + ${B} - x = ${B}`;
    },

    generateSymbols() {
        const symbols = ['☮','☯','☪','☢','☣','⚡','❄','♫','⚓'];
        const target = symbols[Math.floor(Math.random() * symbols.length)];
        this.state.targetSymbol = target;
        
        let html = '';
        for(let i=0; i<100; i++) {
            // Logic: Result is always multiple of 9
            const sym = (i % 9 === 0) ? target : symbols[Math.floor(Math.random() * symbols.length)];
            html += `<div class="flex justify-between bg-white/5 p-1 rounded"><span class="text-gray-500 w-6">${i}</span><span class="text-neon font-bold">${sym}</span></div>`;
        }
        this.ui['symbol-grid'].innerHTML = html;
    },

    finish() {
        let res = 0;
        try {
            if (this.state.lvl.type === 'input') {
                const val = parseFloat(this.ui['user-input'].value);
                if(isNaN(val)) { alert("Enter a number!"); this.state.step--; this.updateStep(); return; }
                res = this.state.lvl.solve(val);
            } else if (this.state.lvl.type === 'binary') {
                res = this.state.result;
            } else {
                res = this.state.lvl.solve();
            }
        } catch(e) { res = "Error"; }

        // Increase XP
        this.xp += 50;
        localStorage.setItem('mindLogicXP', this.xp);
        this.updateStats();

        this.switchScene('result');
        this.ui['logic-explanation'].innerText = this.state.lvl.proof;
        
        // Rolling number animation
        const el = this.ui['final-reveal'];
        let count = 0;
        const int = setInterval(() => {
            el.innerText = Math.floor(Math.random() * 99);
            count++;
            if(count > 15) {
                clearInterval(int);
                el.innerText = res;
            }
        }, 60);
    },

    switchScene(name) {
        ['home', 'game', 'result', 'builder'].forEach(id => this.ui['scene-'+id].classList.add('hidden'));
        this.ui['scene-'+name].classList.remove('hidden');
    },
    returnToHome() { this.init(); },
    restartLevel() { this.startLevel(this.state.lvl); },
    
    // --- BUILDER ---
    openBuilder() {
        this.switchScene('builder');
        Builder.init();
    }
};

const Builder = {
    steps: [],
    init() { this.steps = []; this.render(); },
    addOp(type) {
        const v = prompt("Enter a number:");
        if(v && !isNaN(v)) { this.steps.push({t:type, v:parseFloat(v)}); this.render(); }
    },
    render() {
        const c = document.getElementById('builder-steps');
        const labels = {add:'Add', sub:'Subtract', mul:'Multiply by', div:'Divide by'};
        c.innerHTML = this.steps.map((s,i) => `
            <div class="flex justify-between items-center bg-white/5 p-2 rounded text-sm border-l-2 border-cyan mb-1">
                <span>${i+1}. ${labels[s.t]} ${s.v}</span>
                <button onclick="Builder.del(${i})" class="text-red-400">×</button>
            </div>
        `).join('');
        this.check();
    },
    del(i) { this.steps.splice(i,1); this.render(); },
    calc(x) {
        let v = x;
        this.steps.forEach(s => {
            if(s.t==='add') v+=s.v; if(s.t==='sub') v-=s.v;
            if(s.t==='mul') v*=s.v; if(s.t==='div') v/=s.v;
        });
        return v;
    },
    check() {
        // If calc(10) and calc(100) are same, x is cancelled
        const valid = Math.abs(this.calc(10) - this.calc(100)) < 0.001;
        const stat = document.getElementById('builder-status');
        stat.innerHTML = valid ? `<span class="text-green-400">Valid! Result is always ${this.calc(0)}</span>` : `<span class="text-red-400">Invalid (x still affects result)</span>`;
        stat.dataset.valid = valid;
    },
    testAndSave() {
        if(document.getElementById('builder-status').dataset.valid === "true") {
            const labels = {add:'Add', sub:'Subtract', mul:'Multiply by', div:'Divide by'};
            Game.startLevel({
                id:'custom', title:'Your Logic', difficulty:'Builder', color:'border-purple-500', type:'linear',
                steps: ["Think of a number", ...this.steps.map(s => `${labels[s.t]} ${s.v}`)],
                solve: () => this.calc(0),
                proof: "Custom User Algorithm"
            });
        } else { alert("Trick must result in a constant number!"); }
    }
};

window.onload = () => Game.init();