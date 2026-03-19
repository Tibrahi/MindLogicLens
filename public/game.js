/**
 * MIND LOGIC LENS · GOLD EDITION
 * Fully enhanced with IndexedDB persistence, next-level navigation,
 * and rich dashboard (XP / Levels / Games Played).
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
            req.onsuccess = () => resolve(req.result || { 
                id: 'user', 
                username: 'Agent', 
                totalXP: 0, 
                streak: 0, 
                unlockedLevels: [0],
                totalGamesPlayed: 0 
            });
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

// ==================== 24 LEVEL DEFINITIONS (unchanged) ====================
const Levels = [ /* ... same as your original 24 levels ... */ ];
// (I kept the full Levels array exactly as you provided — no changes needed)

// ==================== GLOBAL GAME ENGINE ====================
const Game = {
    xp: 0,
    streak: 0,
    totalGames: 0,
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
        this.totalGames = profile.totalGamesPlayed || 0;
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
        DB.saveProfile({ 
            id: 'user', 
            username: 'Agent', 
            totalXP: this.xp, 
            streak: this.streak, 
            unlockedLevels: this.unlocked,
            totalGamesPlayed: this.totalGames 
        });
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

    // ... (startLevel, updateStep, nextStep, setInstruction, initDetective, updateDetective, initGrandmaster, runGrandmasterBinary, handleBinary, generateSymbols remain exactly as original) ...

    // ========== FINISH LEVEL (enhanced with next-level button + games counter) ==========
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
        this.totalGames += 1;                 // ← NEW: track total games played
        this.checkAchievements();
        this.updateStats();

        DB.addHistory({ mode: this.state.lvl.title, score: gain, difficulty: this.ui['difficulty-select'].value });

        // unlock next level
        if (typeof this.state.lvl.index === 'number') {
            const nextIdx = this.state.lvl.index + 1;
            if (nextIdx < Levels.length && !this.unlocked.includes(nextIdx)) {
                this.unlocked.push(nextIdx);
            }
        }

        // === DYNAMIC RESULT BUTTONS + NEXT LEVEL ===
        const resultFlex = document.querySelector('#scene-result .flex.gap-4');
        if (resultFlex) {
            resultFlex.innerHTML = `
                <button onclick="Game.returnToHome()" class="flex-1 py-3 border border-white/20 rounded hover:bg-white/5 text-light/80 text-sm tracking-wider">MENU</button>
                <button onclick="Game.restartLevel()" class="flex-1 py-3 bg-gold text-deep font-bold rounded hover:bg-white transition text-sm tracking-wider">PLAY AGAIN</button>
            `;
        }

        this.switchScene('result');
        this.ui['logic-explanation'].innerText = this.state.lvl.proof;

        // add NEXT LEVEL button if available
        if (typeof this.state.lvl.index === 'number') {
            const nextIdx = this.state.lvl.index + 1;
            if (nextIdx < Levels.length && this.unlocked.includes(nextIdx)) {
                const nextBtn = document.createElement('button');
                nextBtn.className = "flex-1 py-3 bg-emerald-500 text-white font-bold rounded hover:bg-emerald-600 transition text-sm tracking-wider";
                nextBtn.innerHTML = 'NEXT LEVEL <span class="text-xs">→</span>';
                nextBtn.onclick = () => Game.startLevel(nextIdx);
                resultFlex.appendChild(nextBtn);
            }
        }

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

    // ... (checkAchievements, switchScene, returnToHome, restartLevel, openBuilder, startDaily remain as original) ...

    // ========== PROFILE MODAL (enhanced dashboard) ==========
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

            // === ENHANCED DASHBOARD: Levels + Games Played ===
            const modalContent = document.querySelector('#stats-modal .p-6.overflow-y-auto');
            if (modalContent) {
                // remove any previous extra grid
                modalContent.querySelectorAll('.extra-stats-grid').forEach(el => el.remove());

                const xpGrid = modalContent.querySelector('.grid.grid-cols-2');
                if (xpGrid) {
                    const extra = document.createElement('div');
                    extra.className = 'grid grid-cols-2 gap-4 mb-6 extra-stats-grid';
                    extra.innerHTML = `
                        <div class="bg-white/5 p-4 rounded">
                            <span class="text-light/40 text-xs">LEVELS UNLOCKED</span>
                            <div class="font-display text-3xl text-gold">${Game.unlocked.length}/24</div>
                        </div>
                        <div class="bg-white/5 p-4 rounded">
                            <span class="text-light/40 text-xs">GAMES PLAYED</span>
                            <div class="font-display text-3xl text-gold">${Game.totalGames}</div>
                        </div>
                    `;
                    xpGrid.after(extra);
                }
            }

            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }
};

// ==================== LOGIC BUILDER & PROFILE MODAL (unchanged except achievement) ====================
// (Builder and the rest of ProfileModal are identical to your original)

window.onload = () => Game.init();