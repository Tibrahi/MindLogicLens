/**
 * MIND LOGIC LENS · FULL SYSTEM
 * Includes IndexedDB, all six modes, difficulty scaling, achievements & history.
 */

// ==================== INDEXED DB ====================
const DB = {
    db: null,
    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MindLogicLensDB', 2);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('profile')) {
                    db.createObjectStore('profile', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('history')) {
                    const store = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp');
                }
                if (!db.objectStoreNames.contains('achievements')) {
                    db.createObjectStore('achievements', { keyPath: 'name' });
                }
                if (!db.objectStoreNames.contains('customPuzzles')) {
                    db.createObjectStore('customPuzzles', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    },
    async getProfile() {
        const tx = this.db.transaction('profile', 'readonly');
        const store = tx.objectStore('profile');
        return new Promise(resolve => {
            const req = store.get('user');
            req.onsuccess = () => resolve(req.result || { id: 'user', username: 'Agent', totalXP: 0, streak: 0, unlockedLevels: [0] });
        });
    },
    async saveProfile(profile) {
        const tx = this.db.transaction('profile', 'readwrite');
        tx.objectStore('profile').put(profile);
        return tx.complete;
    },
    async addHistory(entry) {
        const tx = this.db.transaction('history', 'readwrite');
        tx.objectStore('history').add({ ...entry, timestamp: Date.now() });
        return tx.complete;
    },
    async getHistory(limit = 10) {
        const tx = this.db.transaction('history', 'readonly');
        const store = tx.objectStore('history');
        const index = store.index('timestamp');
        return new Promise(resolve => {
            const entries = [];
            index.openCursor(null, 'prev').onsuccess = e => {
                const cursor = e.target.result;
                if (cursor) {
                    entries.push(cursor.value);
                    if (entries.length < limit) cursor.continue();
                    else resolve(entries);
                } else resolve(entries);
            };
        });
    },
    async getAchievements() {
        const tx = this.db.transaction('achievements', 'readonly');
        const store = tx.objectStore('achievements');
        return new Promise(resolve => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
        });
    },
    async addAchievement(ach) {
        const tx = this.db.transaction('achievements', 'readwrite');
        tx.objectStore('achievements').put(ach);
        return tx.complete;
    },
    async saveCustomPuzzle(puzzle) {
        const tx = this.db.transaction('customPuzzles', 'readwrite');
        return tx.objectStore('customPuzzles').add(puzzle);
    }
};

// ==================== LEVEL DEFINITIONS ====================
const Levels = [
    { // 0: Mind Reader
        id: 'mindReader',
        title: 'Mind Reader',
        description: 'Classic algebra illusion',
        baseDifficulty: 'Novice',
        color: 'border-green-500',
        type: 'linear',
        createSteps: (diff) => {
            let a, b;
            if (diff === 'Easy') { a = 2; b = 6; }
            else if (diff === 'Medium') { a = Math.floor(Math.random() * 5) + 3; b = Math.floor(Math.random() * 10) + 5; }
            else if (diff === 'Hard') { a = Math.floor(Math.random() * 8) + 3; b = Math.floor(Math.random() * 20) + 10; }
            else { a = Math.floor(Math.random() * 12) + 4; b = Math.floor(Math.random() * 30) + 15; }
            return {
                steps: [
                    "Think of a number.",
                    `Multiply it by ${a}.`,
                    `Add ${a * b}.`,
                    `Divide by ${a}.`,
                    "Subtract your original number."
                ],
                solve: () => b,
                proof: `(${a}x + ${a*b}) / ${a} - x = x + ${b} - x = ${b}`
            };
        }
    },
    { // 1: Reverse Solver
        id: 'reverseSolver',
        title: 'Reverse Solver',
        description: 'I will reverse your math',
        baseDifficulty: 'Apprentice',
        color: 'border-cyan-500',
        type: 'input',
        createSteps: (diff) => {
            let a, b;
            if (diff === 'Easy') { a = 2; b = 4; }
            else if (diff === 'Medium') { a = 3; b = 9; }
            else if (diff === 'Hard') { a = 5; b = 15; }
            else { a = 7; b = 21; }
            return {
                steps: [
                    "Think of a number.",
                    `Multiply it by ${a}.`,
                    `Add ${b}.`,
                    "Enter your final result:"
                ],
                solve: (val) => (val - b) / a,
                proof: `You did ${a}x + ${b} = ? → x = (result - ${b}) / ${a}`
            };
        }
    },
    { // 2: Pattern Lab (digital root)
        id: 'patternLab',
        title: 'Pattern Lab',
        description: 'Digital root mystery',
        baseDifficulty: 'Adept',
        color: 'border-yellow-500',
        type: 'symbol',
        createSteps: () => ({
            steps: [
                "Think of any number (at least two digits).",
                "Add all its digits together.",
                "Subtract that sum from your original number.",
                "Find the result in the table below.",
                "Memorize its symbol."
            ],
            solve: () => Game.state.targetSymbol,
            proof: "The result is always a multiple of 9. All multiples of 9 have the same symbol."
        })
    },
    { // 3: Detective Mode (decision tree)
        id: 'detective',
        title: 'Detective Mode',
        description: 'I will deduce your number',
        baseDifficulty: 'Expert',
        color: 'border-purple-500',
        type: 'detective',
        createSteps: (diff) => {
            let max;
            if (diff === 'Easy') max = 20;
            else if (diff === 'Medium') max = 50;
            else if (diff === 'Hard') max = 100;
            else max = 200;
            return {
                init: `Think of a number between 1 and ${max}.`,
                max,
                proof: "Decision tree & logical elimination"
            };
        }
    },
    { // 4: Binary Master
        id: 'binaryMaster',
        title: 'Binary Master',
        description: 'Guess in log₂(n) steps',
        baseDifficulty: 'Master',
        color: 'border-blue-500',
        type: 'binary',
        createSteps: (diff) => {
            let max;
            if (diff === 'Easy') max = 20;
            else if (diff === 'Medium') max = 50;
            else if (diff === 'Hard') max = 100;
            else max = 200;
            return {
                init: `Think of a number between 1 and ${max}.`,
                min: 1, max,
                proof: "Binary search halves the range each time."
            };
        }
    },
    { // 5: Grandmaster (mixed)
        id: 'grandmaster',
        title: 'Grandmaster',
        description: 'Algebra + binary combined',
        baseDifficulty: 'Grand Master',
        color: 'border-red-500',
        type: 'grandmaster',
        createSteps: (diff) => {
            let range;
            if (diff === 'Easy') range = 10;
            else if (diff === 'Medium') range = 30;
            else if (diff === 'Hard') range = 60;
            else range = 100;
            const shift = Math.floor(Math.random() * 5) + 3;
            return {
                steps: [
                    "Think of a number.",
                    `Add ${shift} to it.`,
                    "Now I will guess your new number using binary search."
                ],
                range,
                shift,
                proof: `First you added ${shift}, then I binary‑searched the result.`
            };
        }
    }
];

// ==================== GLOBAL GAME ENGINE ====================
const Game = {
    xp: 0,
    streak: 0,
    unlocked: [],
    state: {},
    ui: {},

    async init() {
        // cache ui
        const ids = ['scene-home','scene-game','scene-result','scene-builder','level-grid',
                     'xp-display','streak-display','game-title','game-instruction','progress-bar',
                     'action-btn','input-area','user-input','binary-area','symbol-grid',
                     'final-reveal','logic-explanation','difficulty-select','game-difficulty-badge',
                     'detective-area'];
        ids.forEach(id => this.ui[id] = document.getElementById(id));

        // buttons
        document.getElementById('btn-yes').onclick = () => this.handleBinary(true);
        document.getElementById('btn-no').onclick = () => this.handleBinary(false);

        // open db and load profile
        await DB.open();
        const profile = await DB.getProfile();
        this.xp = profile.totalXP || 0;
        this.streak = profile.streak || 0;
        this.unlocked = profile.unlockedLevels || [0];
        this.updateStats();

        // render menu
        this.renderMenu();

        // daily check
        const lastDaily = localStorage.getItem('lastDaily');
        const today = new Date().toDateString();
        if (lastDaily !== today) {
            document.querySelector('[onclick="Game.startDaily()"]').classList.add('border-cyan');
        }
    },

    updateStats() {
        this.ui['xp-display'].innerText = this.xp;
        this.ui['streak-display'].innerText = this.streak;
        document.getElementById('modal-xp').innerText = this.xp;
        document.getElementById('modal-streak').innerText = this.streak;
        DB.saveProfile({ id:'user', totalXP: this.xp, streak: this.streak, unlockedLevels: this.unlocked });
    },

    renderMenu() {
        const grid = this.ui['level-grid'];
        grid.innerHTML = Levels.map((lvl, idx) => {
            const unlocked = this.unlocked.includes(idx) ? '' : 'opacity-50 pointer-events-none';
            return `
            <div onclick="Game.startLevel(${idx})" 
                 class="group relative cursor-pointer bg-panel border-l-4 ${lvl.color} p-5 rounded shadow-lg hover:bg-white/5 transition-all active:scale-95 ${unlocked}">
                <div class="flex justify-between items-center mb-1">
                    <h3 class="font-display font-bold text-white group-hover:text-neon transition">${lvl.title}</h3>
                    <span class="text-[10px] bg-black px-2 py-1 rounded text-gray-400">${lvl.baseDifficulty}</span>
                </div>
                <div class="text-xs text-gray-500">${lvl.description}</div>
                ${!unlocked ? '<div class="absolute inset-0 bg-black/50 flex items-center justify-center text-neon text-sm">🔒 LOCKED</div>' : ''}
            </div>`;
        }).join('');
    },

    // Unified level starter (accepts index or full level object)
    startLevel(levelOrIndex) {
        let lvl;
        if (typeof levelOrIndex === 'object') {
            lvl = levelOrIndex;
            lvl.index = undefined; // mark as custom/daily
        } else {
            if (!this.unlocked.includes(levelOrIndex)) {
                alert('Complete previous levels first!');
                return;
            }
            const base = Levels[levelOrIndex];
            const diff = this.ui['difficulty-select'].value;
            const dynamic = base.createSteps(diff);
            lvl = { ...base, ...dynamic, index: levelOrIndex };
        }
        this.state = { lvl, step: 0, data: {} };
        const diff = this.ui['difficulty-select'].value;
        this.ui['game-difficulty-badge'].innerText = diff;
        this.ui['game-difficulty-badge'].className = `text-[10px] bg-black/50 px-2 py-1 rounded border border-white/10 diff-${diff.toLowerCase()}`;
        this.ui['game-title'].innerText = lvl.title;
        
        // reset ui
        ['input-area','binary-area','symbol-grid','detective-area'].forEach(id => this.ui[id].classList.add('hidden'));
        this.ui['action-btn'].classList.remove('hidden');
        this.ui['user-input'].value = '';

        // special setups
        if (lvl.type === 'symbol') this.generateSymbols();
        if (lvl.type === 'detective') this.initDetective(lvl);
        if (lvl.type === 'grandmaster') this.initGrandmaster(lvl);

        this.switchScene('game');
        this.updateStep();
    },

    updateStep() {
        const { lvl, step } = this.state;
        if (lvl.type === 'detective') return this.updateDetective();
        if (lvl.type === 'grandmaster' && step === 2) return this.runGrandmasterBinary();

        const max = lvl.steps ? lvl.steps.length : 1;
        this.ui['progress-bar'].style.width = `${Math.min(100, ((step+1)/max)*100)}%`;

        if (lvl.type === 'binary' && step === -1) {
            this.setInstruction(lvl.init);
            this.ui['action-btn'].classList.remove('hidden');
            this.ui['binary-area'].classList.add('hidden');
            this.ui['action-btn'].innerText = "START";
            this.ui['action-btn'].onclick = () => this.nextStep();
            return;
        }

        if (step < lvl.steps.length) {
            this.setInstruction(lvl.steps[step]);
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

    // ========== DETECTIVE MODE ==========
    initDetective(lvl) {
        const number = Math.floor(Math.random() * lvl.max) + 1;
        this.state.data = { secret: number, min: 1, max: lvl.max, questions: [] };
        this.state.step = 0;
        this.ui['detective-area'].innerHTML = '';
    },
    updateDetective() {
        const { secret, min, max } = this.state.data;
        if (min === max) {
            this.state.result = min;
            this.finish();
            return;
        }
        let question, check;
        const mid = Math.floor((min+max)/2);
        if (!this.state.data.askedGreater) {
            question = `Is your number greater than ${mid}?`;
            check = (ans) => ans ? (this.state.data.min = mid+1) : (this.state.data.max = mid);
            this.state.data.askedGreater = true;
        } else if (!this.state.data.askedEven) {
            question = "Is your number even?";
            check = (ans) => {
                if (ans) {
                    this.state.data.min = Math.ceil(this.state.data.min/2)*2;
                    this.state.data.max = Math.floor(this.state.data.max/2)*2;
                } else {
                    this.state.data.min = Math.ceil((this.state.data.min+1)/2)*2-1;
                    this.state.data.max = Math.floor((this.state.data.max-1)/2)*2+1;
                }
            };
            this.state.data.askedEven = true;
        } else {
            question = `Is your number greater than ${mid}?`;
            check = (ans) => ans ? (this.state.data.min = mid+1) : (this.state.data.max = mid);
        }

        this.setInstruction(question);
        this.ui['action-btn'].classList.add('hidden');
        this.ui['binary-area'].classList.remove('hidden');
        const yesHandler = () => {
            check(true);
            this.state.step++;
            this.updateDetective();
        };
        const noHandler = () => {
            check(false);
            this.state.step++;
            this.updateDetective();
        };
        document.getElementById('btn-yes').onclick = yesHandler;
        document.getElementById('btn-no').onclick = noHandler;
    },

    // ========== GRANDMASTER ==========
    initGrandmaster(lvl) {
        const secret = Math.floor(Math.random() * lvl.range) + 1;
        this.state.data = { secret, shifted: secret + lvl.shift, shift: lvl.shift, min: 1, max: lvl.range + lvl.shift };
        this.state.step = 0;
    },
    runGrandmasterBinary() {
        this.state.lvl.type = 'binary';
        this.state.data.min = 1;
        this.state.data.max = this.state.lvl.range + this.state.lvl.shift;
        this.state.step = -1;
        this.updateStep();
    },

    // ========== BINARY HANDLER ==========
    handleBinary(yes) {
        if (this.state.lvl.type === 'detective') return;
        const { mid } = this.state.data;
        if (yes) this.state.data.min = mid + 1;
        else this.state.data.max = mid;
        this.state.step++;
        this.updateStep();
    },

    // ========== SYMBOL GENERATOR ==========
    generateSymbols() {
        const symbols = ['☮','☯','☪','☢','☣','⚡','❄','♫','⚓'];
        const target = symbols[Math.floor(Math.random() * symbols.length)];
        this.state.targetSymbol = target;
        let html = '';
        for(let i=0; i<100; i++) {
            const sym = (i % 9 === 0) ? target : symbols[Math.floor(Math.random() * symbols.length)];
            html += `<div class="flex justify-between bg-white/5 p-1 rounded"><span class="text-gray-500 w-6">${i}</span><span class="text-neon font-bold">${sym}</span></div>`;
        }
        this.ui['symbol-grid'].innerHTML = html;
    },

    // ========== FINISH LEVEL ==========
    finish() {
        let res = 0;
        try {
            if (this.state.lvl.type === 'input') {
                const val = parseFloat(this.ui['user-input'].value);
                if(isNaN(val)) { alert("Enter a number!"); this.state.step--; this.updateStep(); return; }
                res = this.state.lvl.solve(val);
            } else if (this.state.lvl.type === 'detective' || this.state.lvl.type === 'binary') {
                res = this.state.result;
            } else {
                res = this.state.lvl.solve();
            }
        } catch(e) { res = "??"; }

        const diffMult = { Easy: 1, Medium: 2, Hard: 3, Expert: 5 }[this.ui['difficulty-select'].value] || 2;
        const gain = 50 * diffMult;
        this.xp += gain;
        this.streak += 1;
        this.checkAchievements();
        this.updateStats();

        DB.addHistory({ mode: this.state.lvl.title, score: gain, difficulty: this.ui['difficulty-select'].value });

        // unlock next level only if this is a standard level (has index)
        if (typeof this.state.lvl.index === 'number') {
            const nextIdx = this.state.lvl.index + 1;
            if (nextIdx < Levels.length && !this.unlocked.includes(nextIdx)) {
                this.unlocked.push(nextIdx);
            }
        }

        this.switchScene('result');
        this.ui['logic-explanation'].innerText = this.state.lvl.proof;

        // rolling animation
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

    checkAchievements() {
        const cheevos = [
            { name: 'First Blood', condition: this.xp >= 50 },
            { name: 'Streak 5', condition: this.streak >= 5 },
            { name: 'Streak 10', condition: this.streak >= 10 },
            { name: 'Expert Win', condition: this.ui['difficulty-select'].value === 'Expert' && this.state.lvl },
            { name: 'Builder', condition: false } // set in builder
        ];
        cheevos.forEach(async c => {
            if (c.condition) {
                const existing = await DB.getAchievements();
                if (!existing.find(a => a.name === c.name)) {
                    DB.addAchievement({ name: c.name, earnedAt: Date.now() });
                }
            }
        });
    },

    // ========== SCENE CONTROL ==========
    switchScene(name) {
        ['home','game','result','builder'].forEach(id => this.ui['scene-'+id].classList.add('hidden'));
        this.ui['scene-'+name].classList.remove('hidden');
    },

    returnToHome() {
        this.switchScene('home');
        this.renderMenu();
    },

    restartLevel() {
        this.startLevel(this.state.lvl.index !== undefined ? this.state.lvl.index : this.state.lvl);
    },

    openBuilder() {
        this.switchScene('builder');
        Builder.init();
    },

    async startDaily() {
        const today = new Date().toDateString();
        localStorage.setItem('lastDaily', today);
        const a = Math.floor(Math.random() * 8) + 2;
        const b = Math.floor(Math.random() * 20) + 5;
        const dailyLevel = {
            id: 'daily', title: 'Daily Challenge', difficulty: 'Special',
            color: 'border-cyan', type: 'linear',
            steps: [
                "Think of a number.",
                `Multiply it by ${a}.`,
                `Add ${a*b}.`,
                `Divide by ${a}.`,
                "Subtract your original number."
            ],
            solve: () => b,
            proof: `Today's trick: (${a}x + ${a*b}) / ${a} - x = ${b}`
        };
        this.startLevel(dailyLevel);
    }
};

// ==================== LOGIC BUILDER ====================
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
            if(s.t==='add') v+=s.v;
            if(s.t==='sub') v-=s.v;
            if(s.t==='mul') v*=s.v;
            if(s.t==='div') v/=s.v;
        });
        return v;
    },
    check() {
        const valid = Math.abs(this.calc(10) - this.calc(100)) < 0.001;
        const stat = document.getElementById('builder-status');
        stat.innerHTML = valid ? `<span class="text-green-400">Valid! Result is always ${this.calc(0)}</span>` : `<span class="text-red-400">Invalid (x still affects result)</span>`;
        stat.dataset.valid = valid;
    },
    async testAndSave() {
        if(document.getElementById('builder-status').dataset.valid === "true") {
            const labels = {add:'Add', sub:'Subtract', mul:'Multiply by', div:'Divide by'};
            const customLevel = {
                id: 'custom', title: 'Your Logic', difficulty: 'Builder', color: 'border-purple-500', type: 'linear',
                steps: ["Think of a number", ...this.steps.map(s => `${labels[s.t]} ${s.v}`)],
                solve: () => this.calc(0),
                proof: "Custom User Algorithm"
            };
            await DB.saveCustomPuzzle({ steps: this.steps, constant: this.calc(0), created: Date.now() });
            await DB.addAchievement({ name: 'Builder', earnedAt: Date.now() });
            Game.startLevel(customLevel);
        } else { alert("Trick must result in a constant number!"); }
    }
};

// ==================== PROFILE MODAL ====================
const ProfileModal = {
    async toggle() {
        const modal = document.getElementById('stats-modal');
        if (modal.classList.contains('hidden')) {
            const history = await DB.getHistory(5);
            const achievements = await DB.getAchievements();
            document.getElementById('history-list').innerHTML = history.map(h => 
                `<div class="flex justify-between text-gray-300"><span>${h.mode}</span><span>+${h.score} XP</span></div>`
            ).join('');
            document.getElementById('achievements-list').innerHTML = achievements.map(a => 
                `<div class="bg-white/5 p-2 rounded flex items-center gap-2">🏅 ${a.name}</div>`
            ).join('') || '<div class="text-gray-500">None yet</div>';
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }
};

// start
window.onload = () => Game.init();