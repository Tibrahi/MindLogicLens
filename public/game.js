/**
 * MIND LOGIC LENS · GOLD EDITION
 * 24 levels, black/white/gold theme, premium typography.
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

// ==================== 24 LEVEL DEFINITIONS ====================
const Levels = [
    // 0: Mind Reader (classic)
    { id: 'mindReader1', title: 'The Classic', description: 'Basic algebra illusion', baseDifficulty: 'Novice', color: 'border-gold', type: 'linear',
      createSteps: (diff) => {
          let a, b;
          if (diff === 'Easy') { a = 2; b = 6; }
          else if (diff === 'Medium') { a = 3; b = 9; }
          else if (diff === 'Hard') { a = 5; b = 15; }
          else { a = 7; b = 21; }
          return {
              steps: ["Think of a number.", `Multiply it by ${a}.`, `Add ${a*b}.`, `Divide by ${a}.`, "Subtract your original number."],
              solve: () => b,
              proof: `(${a}x + ${a*b}) / ${a} - x = ${b}`
          };
      }
    },
    // 1: Reverse Solver
    { id: 'reverse1', title: 'Reverse Solver I', description: 'I reverse your math', baseDifficulty: 'Apprentice', color: 'border-gold', type: 'input',
      createSteps: (diff) => {
          let a, b;
          if (diff === 'Easy') { a = 2; b = 4; }
          else if (diff === 'Medium') { a = 3; b = 9; }
          else if (diff === 'Hard') { a = 5; b = 15; }
          else { a = 7; b = 21; }
          return {
              steps: ["Think of a number.", `Multiply it by ${a}.`, `Add ${b}.`, "Enter your final result:"],
              solve: (val) => (val - b) / a,
              proof: `${a}x + ${b} = ? → x = (result - ${b}) / ${a}`
          };
      }
    },
    // 2: Pattern Lab (digital root)
    { id: 'pattern1', title: 'Digital Root', description: 'Symbol mystery', baseDifficulty: 'Adept', color: 'border-gold', type: 'symbol',
      createSteps: () => ({
          steps: ["Think of any number (at least two digits).", "Add all its digits together.", "Subtract that sum from your original number.", "Find the result in the table below.", "Memorize its symbol."],
          solve: () => Game.state.targetSymbol,
          proof: "Result is always a multiple of 9. All multiples of 9 have the same symbol."
      })
    },
    // 3: Detective Mode (small range)
    { id: 'detective1', title: 'Detective I', description: 'Deduce 1-20', baseDifficulty: 'Expert', color: 'border-gold', type: 'detective',
      createSteps: () => ({ init: "Think of a number between 1 and 20.", max: 20, proof: "Decision tree & logical elimination" })
    },
    // 4: Binary Master (small)
    { id: 'binary1', title: 'Binary I', description: 'Guess 1-20', baseDifficulty: 'Master', color: 'border-gold', type: 'binary',
      createSteps: () => ({ init: "Think of a number between 1 and 20.", min: 1, max: 20, proof: "Binary search halves the range." })
    },
    // 5: Grandmaster I
    { id: 'grand1', title: 'Grandmaster I', description: 'Algebra + binary', baseDifficulty: 'Grand Master', color: 'border-gold', type: 'grandmaster',
      createSteps: (diff) => {
          let range = diff === 'Easy' ? 10 : diff === 'Medium' ? 20 : diff === 'Hard' ? 30 : 40;
          const shift = Math.floor(Math.random() * 3) + 2;
          return { steps: ["Think of a number.", `Add ${shift} to it.`, "Now I will guess your new number."], range, shift, proof: `Added ${shift}, then binary search.` };
      }
    },
    // 6: Mind Reader II
    { id: 'mindReader2', title: 'Mind Reader II', description: 'Different constants', baseDifficulty: 'Novice', color: 'border-gold', type: 'linear',
      createSteps: (diff) => {
          let a, b;
          if (diff === 'Easy') { a = 3; b = 9; }
          else if (diff === 'Medium') { a = 4; b = 12; }
          else if (diff === 'Hard') { a = 6; b = 18; }
          else { a = 8; b = 24; }
          return { steps: ["Think of a number.", `Multiply by ${a}.`, `Add ${a*b}.`, `Divide by ${a}.`, "Subtract original."], solve: () => b, proof: `Result = ${b}` };
      }
    },
    // 7: Reverse Solver II
    { id: 'reverse2', title: 'Reverse Solver II', description: 'Different ops', baseDifficulty: 'Apprentice', color: 'border-gold', type: 'input',
      createSteps: (diff) => {
          let a, b;
          if (diff === 'Easy') { a = 3; b = 6; }
          else if (diff === 'Medium') { a = 4; b = 12; }
          else if (diff === 'Hard') { a = 6; b = 18; }
          else { a = 9; b = 27; }
          return { steps: ["Think of a number.", `Multiply by ${a}.`, `Add ${b}.`, "Enter result:"], solve: (val) => (val - b) / a, proof: `x = (result - ${b})/${a}` };
      }
    },
    // 8: Pattern Lab II (different symbol set)
    { id: 'pattern2', title: 'Symbol Master', description: 'Another symbol trick', baseDifficulty: 'Adept', color: 'border-gold', type: 'symbol',
      createSteps: () => ({
          steps: ["Think of a two-digit number.", "Reverse its digits.", "Subtract smaller from larger.", "Find your number in the table."],
          solve: () => Game.state.targetSymbol,
          proof: "The result is always a multiple of 9."
      })
    },
    // 9: Detective II (1-50)
    { id: 'detective2', title: 'Detective II', description: 'Deduce 1-50', baseDifficulty: 'Expert', color: 'border-gold', type: 'detective',
      createSteps: () => ({ init: "Think of a number between 1 and 50.", max: 50, proof: "Decision tree" })
    },
    // 10: Binary II (1-50)
    { id: 'binary2', title: 'Binary II', description: 'Guess 1-50', baseDifficulty: 'Master', color: 'border-gold', type: 'binary',
      createSteps: () => ({ init: "Think of a number between 1 and 50.", min: 1, max: 50, proof: "Binary search" })
    },
    // 11: Grandmaster II
    { id: 'grand2', title: 'Grandmaster II', description: 'Add then binary', baseDifficulty: 'Grand Master', color: 'border-gold', type: 'grandmaster',
      createSteps: (diff) => {
          let range = diff === 'Easy' ? 15 : diff === 'Medium' ? 25 : diff === 'Hard' ? 40 : 60;
          const shift = Math.floor(Math.random() * 5) + 3;
          return { steps: ["Think of a number.", `Add ${shift}.`, "Now guess."], range, shift, proof: `Shift ${shift}` };
      }
    },
    // 12: Mind Reader III (larger numbers)
    { id: 'mindReader3', title: 'Mind Reader III', description: 'Bigger multipliers', baseDifficulty: 'Novice', color: 'border-gold', type: 'linear',
      createSteps: (diff) => {
          let a, b;
          if (diff === 'Easy') { a = 4; b = 8; }
          else if (diff === 'Medium') { a = 5; b = 15; }
          else if (diff === 'Hard') { a = 7; b = 21; }
          else { a = 9; b = 27; }
          return { steps: ["Think of a number.", `Multiply by ${a}.`, `Add ${a*b}.`, `Divide by ${a}.`, "Subtract original."], solve: () => b, proof: `Result = ${b}` };
      }
    },
    // 13: Reverse Solver III
    { id: 'reverse3', title: 'Reverse Solver III', description: 'Larger constants', baseDifficulty: 'Apprentice', color: 'border-gold', type: 'input',
      createSteps: (diff) => {
          let a, b;
          if (diff === 'Easy') { a = 4; b = 8; }
          else if (diff === 'Medium') { a = 5; b = 15; }
          else if (diff === 'Hard') { a = 7; b = 21; }
          else { a = 10; b = 30; }
          return { steps: ["Think of a number.", `Multiply by ${a}.`, `Add ${b}.`, "Enter result:"], solve: (val) => (val - b) / a, proof: `x = (result - ${b})/${a}` };
      }
    },
    // 14: Detective III (1-100)
    { id: 'detective3', title: 'Detective III', description: 'Deduce 1-100', baseDifficulty: 'Expert', color: 'border-gold', type: 'detective',
      createSteps: () => ({ init: "Think of a number between 1 and 100.", max: 100, proof: "Decision tree" })
    },
    // 15: Binary III (1-100)
    { id: 'binary3', title: 'Binary III', description: 'Guess 1-100', baseDifficulty: 'Master', color: 'border-gold', type: 'binary',
      createSteps: () => ({ init: "Think of a number between 1 and 100.", min: 1, max: 100, proof: "Binary search" })
    },
    // 16: Grandmaster III
    { id: 'grand3', title: 'Grandmaster III', description: 'Add and search', baseDifficulty: 'Grand Master', color: 'border-gold', type: 'grandmaster',
      createSteps: (diff) => {
          let range = diff === 'Easy' ? 20 : diff === 'Medium' ? 40 : diff === 'Hard' ? 70 : 100;
          const shift = Math.floor(Math.random() * 7) + 4;
          return { steps: ["Think of a number.", `Add ${shift}.`, "Now guess."], range, shift, proof: `Shift ${shift}` };
      }
    },
    // 17: Pattern Lab III (digital root with different instruction)
    { id: 'pattern3', title: 'Digital Root II', description: 'Another digit trick', baseDifficulty: 'Adept', color: 'border-gold', type: 'symbol',
      createSteps: () => ({
          steps: ["Think of a three-digit number.", "Add its digits.", "Subtract that sum from the original.", "Find the result in the table."],
          solve: () => Game.state.targetSymbol,
          proof: "Result is multiple of 9."
      })
    },
    // 18: Mind Reader IV (with subtraction variant)
    { id: 'mindReader4', title: 'Mind Reader IV', description: 'Subtraction variant', baseDifficulty: 'Novice', color: 'border-gold', type: 'linear',
      createSteps: (diff) => {
          let a, b;
          if (diff === 'Easy') { a = 2; b = 5; }
          else if (diff === 'Medium') { a = 3; b = 8; }
          else if (diff === 'Hard') { a = 4; b = 12; }
          else { a = 6; b = 18; }
          return { steps: ["Think of a number.", `Multiply by ${a}.`, `Subtract ${a*b}.`, `Divide by ${a}.`, "Add original."], solve: () => -b, proof: `Result = ${-b}` };
      }
    },
    // 19: Reverse Solver IV (subtraction)
    { id: 'reverse4', title: 'Reverse Solver IV', description: 'Subtraction variant', baseDifficulty: 'Apprentice', color: 'border-gold', type: 'input',
      createSteps: (diff) => {
          let a, b;
          if (diff === 'Easy') { a = 2; b = 4; }
          else if (diff === 'Medium') { a = 3; b = 9; }
          else if (diff === 'Hard') { a = 5; b = 15; }
          else { a = 7; b = 21; }
          return { steps: ["Think of a number.", `Multiply by ${a}.`, `Subtract ${b}.`, "Enter result:"], solve: (val) => (val + b) / a, proof: `x = (result + ${b})/${a}` };
      }
    },
    // 20: Detective IV (1-200)
    { id: 'detective4', title: 'Detective IV', description: 'Deduce 1-200', baseDifficulty: 'Expert', color: 'border-gold', type: 'detective',
      createSteps: () => ({ init: "Think of a number between 1 and 200.", max: 200, proof: "Decision tree" })
    },
    // 21: Binary IV (1-200)
    { id: 'binary4', title: 'Binary IV', description: 'Guess 1-200', baseDifficulty: 'Master', color: 'border-gold', type: 'binary',
      createSteps: () => ({ init: "Think of a number between 1 and 200.", min: 1, max: 200, proof: "Binary search" })
    },
    // 22: Grandmaster IV
    { id: 'grand4', title: 'Grandmaster IV', description: 'Advanced mix', baseDifficulty: 'Grand Master', color: 'border-gold', type: 'grandmaster',
      createSteps: (diff) => {
          let range = diff === 'Easy' ? 30 : diff === 'Medium' ? 60 : diff === 'Hard' ? 90 : 150;
          const shift = Math.floor(Math.random() * 10) + 5;
          return { steps: ["Think of a number.", `Add ${shift}.`, "Now guess."], range, shift, proof: `Shift ${shift}` };
      }
    },
    // 23: Pattern Lab IV (another symbol set)
    { id: 'pattern4', title: 'Symbol Oracle', description: 'Final symbol mystery', baseDifficulty: 'Adept', color: 'border-gold', type: 'symbol',
      createSteps: () => ({
          steps: ["Think of any number.", "Double it.", "Add the digits of the result.", "Continue until single digit.", "Find that digit in the table."],
          solve: () => Game.state.targetSymbol,
          proof: "Digital root invariant."
      })
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
            document.querySelector('[onclick="Game.startDaily()"]').classList.add('border-gold');
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
                    <h3 class="font-display font-bold text-light group-hover:text-gold transition">${lvl.title}</h3>
                    <span class="text-[10px] bg-black px-2 py-1 rounded text-light/60">${lvl.baseDifficulty}</span>
                </div>
                <div class="text-xs text-light/40">${lvl.description}</div>
                ${!unlocked ? '<div class="absolute inset-0 bg-black/50 flex items-center justify-center text-gold text-sm">🔒 LOCKED</div>' : ''}
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
        this.ui['game-difficulty-badge'].className = `text-[10px] bg-black/50 px-2 py-1 rounded border border-white/10 text-light/80 diff-${diff.toLowerCase()}`;
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
            html += `<div class="flex justify-between bg-white/5 p-1 rounded"><span class="text-light/40 w-6">${i}</span><span class="text-gold font-bold">${sym}</span></div>`;
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
            color: 'border-gold', type: 'linear',
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
            <div class="flex justify-between items-center bg-white/5 p-2 rounded text-sm border-l-2 border-gold mb-1">
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
                id: 'custom', title: 'Your Logic', difficulty: 'Builder', color: 'border-gold', type: 'linear',
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
                `<div class="flex justify-between text-light/60"><span>${h.mode}</span><span>+${h.score} XP</span></div>`
            ).join('');
            document.getElementById('achievements-list').innerHTML = achievements.map(a => 
                `<div class="bg-white/5 p-2 rounded flex items-center gap-2 text-gold">🏅 ${a.name}</div>`
            ).join('') || '<div class="text-light/40">None yet</div>';
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }
};

// start
window.onload = () => Game.init();