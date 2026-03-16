/**
 * MIND LOGIC LENS · GOLD EDITION
 * 20+ levels, black/white/gold theme, premium typography.
 */

// ==================== INDEXED DB (unchanged) ====================
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

// ==================== GLOBAL GAME ENGINE (minimal changes, only color references updated) ====================
const Game = {
    xp: 0,
    streak: 0,
    unlocked: [],
    state: {},
    ui: {},

    async init() {
        // cache ui (same as before)
        const ids = ['scene-home','scene-game','scene-result','scene-builder','level-grid',
                     'xp-display','streak-display','game-title','game-instruction','progress-bar',
                     'action-btn','input-area','user-input','binary-area','symbol-grid',
                     'final-reveal','logic-explanation','difficulty-select','game-difficulty-badge',
                     'detective-area'];
        ids.forEach(id => this.ui[id] = document.getElementById(id));

        document.getElementById('btn-yes').onclick = () => this.handleBinary(true);
        document.getElementById('btn-no').onclick = () => this.handleBinary(false);

        await DB.open();
        const profile = await DB.getProfile();
        this.xp = profile.totalXP || 0;
        this.streak = profile.streak || 0;
        this.unlocked = profile.unlockedLevels || [0];
        this.updateStats();
        this.renderMenu();

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
            lvl.index = undefined;
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

    // All other methods (updateStep, setInstruction, initDetective, updateDetective, initGrandmaster,
    // runGrandmasterBinary, handleBinary, generateSymbols, finish, checkAchievements, switchScene,
    // returnToHome, restartLevel, openBuilder, startDaily) remain exactly the same as in the previous version.
    // They are omitted here for brevity but must be included in the actual file.
    // Please refer to the previous complete game.js for the full implementation.
};

// ==================== LOGIC BUILDER (unchanged) ====================
const Builder = { /* ... same as before ... */ };

// ==================== PROFILE MODAL (unchanged) ====================
const ProfileModal = { /* ... same as before ... */ };

// start
window.onload = () => Game.init();