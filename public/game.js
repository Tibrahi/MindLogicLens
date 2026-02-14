const Levels = [
    {
        title: "Algebraic Zero",
        type: "linear",
        steps: ["Think of a number.", "Multiply by 2.", "Add 10.", "Divide by 2.", "Subtract your original number."],
        solve: () => 5,
        proof: "Math: ((2x + 10) / 2) - x = 5. The variable x is eliminated."
    },
    {
        title: "The Decoder",
        type: "input",
        steps: ["Think of a number.", "Multiply it by 4.", "Add 12.", "Divide by 2.", "Enter your result below:"],
        solve: (input) => (input - 6) / 2,
        proof: "I reversed your steps: x = (Result * 2 - 12) / 4 simplifies to (Result - 6) / 2."
    },
    {
        title: "Binary Oracle",
        type: "binary",
        min: 1, max: 100,
        proof: "Binary Search: I narrowed the field by half each time, finding your number in log2(100) steps."
    }
];

const Game = {
    xp: 0,
    state: {},
    ui: {},

    init() {
        const ids = ['scene-home', 'scene-game', 'scene-result', 'scene-builder', 'level-grid', 'xp-display', 'game-title', 'game-instruction', 'progress-bar', 'action-btn', 'input-area', 'user-input', 'binary-area', 'symbol-grid', 'final-reveal', 'logic-explanation'];
        ids.forEach(id => this.ui[id] = document.getElementById(id));
        
        this.xp = parseInt(localStorage.getItem('mindlogic_xp') || 0);
        this.updateXP();
        this.renderMenu();

        document.getElementById('btn-yes').onclick = () => this.handleBinary(true);
        document.getElementById('btn-no').onclick = () => this.handleBinary(false);
    },

    renderMenu() {
        this.switchScene('home');
        this.ui.levelGrid.innerHTML = Levels.map((l, i) => `
            <div onclick="Game.startLevel(${i})" class="bg-panel border border-white/10 p-6 rounded-xl hover:border-cyan cursor-pointer transition-all">
                <h3 class="font-display text-sm text-cyan mb-2">${l.title}</h3>
                <p class="text-xs text-gray-400">Protocol: ${l.type.toUpperCase()}</p>
            </div>
        `).join('');
    },

    startLevel(idx) {
        const lvl = Levels[idx];
        this.state = { lvl, step: 0, data: { min: lvl.min, max: lvl.max } };
        this.switchScene('game');
        this.ui.gameTitle.innerText = lvl.title;
        this.updateStep();
    },

    updateStep() {
        const { lvl, step } = this.state;
        this.ui.inputArea.classList.add('hidden');
        this.ui.binaryArea.classList.add('hidden');

        if (lvl.type === 'binary') {
            this.runBinaryLogic();
        } else {
            this.ui.gameInstruction.innerText = lvl.steps[step];
            const isLast = step === lvl.steps.length - 1;
            
            if (isLast && lvl.type === 'input') {
                this.ui.inputArea.classList.remove('hidden');
            }
            
            this.ui.actionBtn.innerText = isLast ? "REVEAL MIND" : "NEXT STEP";
            this.ui.actionBtn.onclick = () => isLast ? this.finish() : this.nextStep();
        }
        this.ui.progressBar.style.width = `${((step + 1) / (lvl.steps?.length || 7)) * 100}%`;
    },

    nextStep() { this.state.step++; this.updateStep(); },

    runBinaryLogic() {
        const { min, max } = this.state.data;
        if (min === max) { this.state.result = min; this.finish(); return; }
        
        const mid = Math.floor((min + max) / 2);
        this.state.data.mid = mid;
        this.ui.gameInstruction.innerHTML = `Is your number greater than <span class="text-neon">${mid}</span>?`;
        this.ui.actionBtn.classList.add('hidden');
        this.ui.binaryArea.classList.remove('hidden');
    },

    handleBinary(isGreater) {
        if (isGreater) this.state.data.min = this.state.data.mid + 1;
        else this.state.data.max = this.state.data.mid;
        this.state.step++;
        this.updateStep();
    },

    finish() {
        let res;
        if (this.state.lvl.type === 'input') {
            res = this.state.lvl.solve(parseFloat(this.ui.userInput.value));
        } else if (this.state.lvl.type === 'binary') {
            res = this.state.result;
        } else {
            res = this.state.lvl.solve();
        }

        this.xp += 100;
        localStorage.setItem('mindlogic_xp', this.xp);
        this.updateXP();

        this.switchScene('result');
        this.ui.finalReveal.innerText = res;
        this.ui.logicExplanation.innerText = this.state.lvl.proof;
    },

    switchScene(s) {
        ['home', 'game', 'result', 'builder'].forEach(id => this.ui[id].classList.add('hidden'));
        this.ui[s].classList.remove('hidden');
    },

    updateXP() { this.ui.xpDisplay.innerText = this.xp.toString().padStart(4, '0'); },
    returnToHome() { this.renderMenu(); },
    openBuilder() { this.switchScene('builder'); Builder.init(); }
};

const Builder = {
    steps: [],
    init() { this.steps = []; this.render(); },
    addOp(type) {
        const val = parseFloat(prompt("Enter value:"));
        if (!isNaN(val)) { this.steps.push({ type, val }); this.render(); }
    },
    render() {
        const labels = { add: '+', sub: '-', mul: '×', div: '÷' };
        document.getElementById('builder-steps').innerHTML = this.steps.map((s, i) => `
            <div class="bg-white/5 p-3 rounded flex justify-between">
                <span>Step ${i+1}: ${labels[s.type]} ${s.val}</span>
            </div>
        `).join('');
    },
    testAndSave() {
        const calc = (x) => {
            let res = x;
            this.steps.forEach(s => {
                if (s.type === 'add') res += s.val;
                if (s.type === 'sub') res -= s.val;
                if (s.type === 'mul') res *= s.val;
                if (s.type === 'div') res /= s.val;
            });
            return res;
        };
        // Verify if x cancels out (check if f(10) == f(100))
        if (Math.abs(calc(10) - calc(100)) < 0.01) {
            const final = calc(0);
            Levels.push({
                title: "Custom Logic", type: "linear",
                steps: ["Think of a number", ...this.steps.map(s => `Apply ${s.type} ${s.val}`)],
                solve: () => final, proof: "User-defined logical constant."
            });
            Game.renderMenu();
        } else {
            alert("This isn't a mind-reading trick! Your result still depends on the starting number.");
        }
    }
};

window.onload = () => Game.init();