// IndexedDB Native Storage Wrapper
const DB = {
    dbName: 'NexusIQ_DB',
    version: 1,
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('user_session')) {
                    db.createObjectStore('user_session', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('activity_logs')) {
                    db.createObjectStore('activity_logs', { autoIncrement: true });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(true);
            };
            request.onerror = (e) => reject(e);
        });
    },

    async saveSession(sessionData) {
        return new Promise((resolve) => {
            const tx = this.db.transaction('user_session', 'readwrite');
            const store = tx.objectStore('user_session');
            store.put({ id: 'current_user', ...sessionData });
            tx.oncomplete = () => resolve(true);
        });
    },

    async getSession() {
        return new Promise((resolve) => {
            const tx = this.db.transaction('user_session', 'readonly');
            const store = tx.objectStore('user_session');
            const req = store.get('current_user');
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    },

    async clearSession() {
        return new Promise((resolve) => {
            const tx = this.db.transaction('user_session', 'readwrite');
            const store = tx.objectStore('user_session');
            store.delete('current_user');
            tx.oncomplete = () => resolve(true);
        });
    },

    async addLog(logItem) {
        return new Promise((resolve) => {
            const tx = this.db.transaction('activity_logs', 'readwrite');
            const store = tx.objectStore('activity_logs');
            store.add(logItem);
            tx.oncomplete = () => resolve(true);
        });
    },

    async getLogs() {
        return new Promise((resolve) => {
            const tx = this.db.transaction('activity_logs', 'readonly');
            const store = tx.objectStore('activity_logs');
            const req = store.getAll();
            req.onsuccess = () => resolve((req.result || []).reverse());
            req.onerror = () => resolve([]);
        });
    }
};

// Global State
const state = {
    user: null,
    score: 100,
    stage: 1,
    completedCount: 0,
    streak: 1,
    lastLoginDate: null,
    layout: 'card',
    currentPuzzle: null,
    selectedAuthAnswer: null,
    currentAuthQuestion: null
};

// Challenging Logic & General Knowledge Questions Engine
const LogicEngine = {
    authQuestions: [
        {
            q: "A father's age is three times his son's age. In 12 years, the father will be twice as old as his son. What is the son's current age?",
            options: [
                { text: "A) 12 years old", isCorrect: true },
                { text: "B) 10 years old", isCorrect: false },
                { text: "C) 14 years old", isCorrect: false }
            ]
        },
        {
            q: "Which word continues the pattern: Apple, Banana, Cherry, Date, ______?",
            options: [
                { text: "A) Fig", isCorrect: false },
                { text: "B) Elderberry", isCorrect: true },
                { text: "C) Grape", isCorrect: false }
            ]
        },
        {
            q: "If 5 machines take 5 minutes to make 5 widgets, how long would 100 machines take to make 100 widgets?",
            options: [
                { text: "A) 100 minutes", isCorrect: false },
                { text: "B) 5 minutes", isCorrect: true },
                { text: "C) 1 minute", isCorrect: false }
            ]
        }
    ],

    gameQuestions: [
        {
            title: "Name & Logical Association",
            instruction: "Identify the entity that shares a direct logical relationship with the sequence.",
            q: "Which name does NOT fit the group: Socrates, Plato, Aristotle, Alexander, Pythagoras?",
            options: [
                { val: "Alexander (Military Leader, others are Philosophers)", isCorrect: true },
                { val: "Plato", isCorrect: false },
                { val: "Socrates", isCorrect: false },
                { val: "Pythagoras", isCorrect: false }
            ]
        },
        {
            title: "General Knowledge Riddle",
            instruction: "Solve the conceptual deduction puzzle.",
            q: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
            options: [
                { val: "A Map", isCorrect: true },
                { val: "A Globe", isCorrect: false },
                { val: "A Mirror", isCorrect: false },
                { val: "A Dream", isCorrect: false }
            ]
        },
        {
            title: "Sequential Word Logic",
            instruction: "Determine the missing link in the alphabetical order group.",
            q: "Alpha, Bravo, Charlie, Delta, Echo, _____?",
            options: [
                { val: "Foxtrot", isCorrect: true },
                { val: "Golf", isCorrect: false },
                { val: "Hotel", isCorrect: false },
                { val: "India", isCorrect: false }
            ]
        },
        {
            title: "Lateral Deductive Reasoning",
            instruction: "Process the situational truth matrix.",
            q: "Electric train moves North at 60mph. Wind blows West at 10mph. Which direction does smoke travel?",
            options: [
                { val: "No smoke (Electric Train)", isCorrect: true },
                { val: "South-West", isCorrect: false },
                { val: "West", isCorrect: false },
                { val: "North-West", isCorrect: false }
            ]
        }
    ],

    generateAuthQuestion() {
        return this.authQuestions[Math.floor(Math.random() * this.authQuestions.length)];
    },

    generatePuzzle() {
        const p = this.gameQuestions[Math.floor(Math.random() * this.gameQuestions.length)];
        const shuffledOpts = [...p.options].sort(() => Math.random() - 0.5);
        return { ...p, options: shuffledOpts };
    }
};

// Global App Orchestrator
const App = {
    async init() {
        await DB.init();
        this.setupAutoResponsive();
        await this.loadSession();
        this.updateUI();

        // Register Service Worker for Offline PWA Capabilities
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
    },

    setupAutoResponsive() {
        const updateDims = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            document.getElementById('screen-dim-tag').textContent = `${w}px × ${h}px (${w < 640 ? 'Mobile' : w < 1024 ? 'Tablet' : 'Desktop'})`;
            
            if (w < 768 && state.layout === 'split') {
                this.setLayout('card');
            }
        };
        window.addEventListener('resize', updateDims);
        updateDims();
    },

    async loadSession() {
        const session = await DB.getSession();
        if (session) {
            state.user = session.user;
            state.score = session.score ?? 100;
            state.stage = session.stage ?? 1;
            state.completedCount = session.completedCount ?? 0;
            state.streak = session.streak ?? 1;
            state.lastLoginDate = session.lastLoginDate;

            this.calculateStreak();
        }
    },

    calculateStreak() {
        const today = new Date().toDateString();
        if (state.lastLoginDate) {
            const last = new Date(state.lastLoginDate);
            const now = new Date();
            const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                state.streak += 1;
            } else if (diffDays > 1) {
                state.streak = 1;
            }
        } else {
            state.streak = 1;
        }
        state.lastLoginDate = today;
    },

    async saveSession() {
        await DB.saveSession({
            user: state.user,
            score: state.score,
            stage: state.stage,
            completedCount: state.completedCount,
            streak: state.streak,
            lastLoginDate: state.lastLoginDate
        });
    },

    updateUI() {
        document.getElementById('global-score').textContent = `${state.score} PT`;
        document.getElementById('streak-count').textContent = `${state.streak} ${state.streak === 1 ? 'Day' : 'Days'}`;

        if (state.user) {
            document.getElementById('nav-controls').classList.remove('hidden');
            document.getElementById('nav-controls').classList.add('flex');
            document.getElementById('user-display').textContent = state.user;
        } else {
            document.getElementById('nav-controls').classList.add('hidden');
            document.getElementById('nav-controls').classList.remove('flex');
        }
    },

    navigate(view) {
        document.querySelectorAll("section[id^='view-']").forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${view}`).classList.remove('hidden');

        if (view === 'game') {
            this.renderPuzzle();
        } else if (view === 'dashboard') {
            this.renderDashboard();
        }
    },

    setLayout(type) {
        state.layout = type;
        document.getElementById('btn-layout-card').className = type === 'card' 
            ? 'px-2.5 py-1 rounded-md font-semibold bg-white text-slate-800 shadow-sm transition' 
            : 'px-2.5 py-1 rounded-md font-semibold text-slate-500 hover:text-slate-800 transition';
        document.getElementById('btn-layout-split').className = type === 'split' 
            ? 'px-2.5 py-1 rounded-md font-semibold bg-white text-slate-800 shadow-sm transition' 
            : 'px-2.5 py-1 rounded-md font-semibold text-slate-500 hover:text-slate-800 transition';
        
        if (!document.getElementById('view-game').classList.contains('hidden')) {
            this.renderPuzzle();
        }
    },

    renderPuzzle() {
        state.currentPuzzle = LogicEngine.generatePuzzle();
        const container = document.getElementById('game-layout-container');
        document.getElementById('level-display-title').textContent = `Stage ${state.stage}`;
        
        const p = state.currentPuzzle;

        if (state.layout === 'card') {
            container.innerHTML = `
                <div class="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto w-full shadow-xl shadow-slate-200/50">
                    <div class="flex items-center gap-2 mb-2">
                        <i class="fa-solid fa-lightbulb text-brand-red text-xs"></i>
                        <span class="text-xs font-mono font-bold text-brand-red uppercase">${p.title}</span>
                    </div>
                    <p class="text-xs text-slate-500 font-medium mb-4">${p.instruction}</p>

                    <div class="bg-slate-50 border border-slate-200/60 rounded-xl p-5 text-center text-base sm:text-lg font-medium text-slate-800 mb-6 shadow-inner">
                        "${p.q}"
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${p.options.map((opt, idx) => `
                            <button onclick="App.evaluateAnswer(${opt.isCorrect})" class="p-3.5 bg-white border border-slate-200 hover:border-brand-red hover:bg-red-50/30 rounded-xl flex items-center justify-start gap-3 transition font-semibold text-slate-800 shadow-sm text-xs group">
                                <span class="text-xs font-bold text-brand-red">${String.fromCharCode(65 + idx)})</span>
                                <span class="text-left">${opt.val}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center gap-2 mb-2">
                                <i class="fa-solid fa-lightbulb text-brand-red text-xs"></i>
                                <span class="text-xs font-mono font-bold text-brand-red uppercase">${p.title}</span>
                            </div>
                            <p class="text-xs text-slate-500 font-medium mb-4">${p.instruction}</p>
                        </div>
                        <div class="bg-slate-50 border border-slate-200/60 rounded-xl p-6 text-center text-base font-medium text-slate-800 my-auto shadow-inner">
                            "${p.q}"
                        </div>
                    </div>

                    <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl shadow-slate-200/50 flex flex-col justify-center">
                        <span class="text-xs font-mono font-bold text-slate-400 mb-3 block uppercase">Select Logic Solution:</span>
                        <div class="space-y-2.5">
                            ${p.options.map((opt, idx) => `
                                <button onclick="App.evaluateAnswer(${opt.isCorrect})" class="w-full p-3.5 bg-white border border-slate-200 hover:border-brand-red hover:bg-red-50/30 rounded-xl flex items-center justify-between transition font-semibold text-slate-800 shadow-sm text-xs group">
                                    <span class="text-xs font-bold text-brand-red">Option ${String.fromCharCode(65 + idx)}</span>
                                    <span class="text-right">${opt.val}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
    },

    async evaluateAnswer(isCorrect) {
        if (isCorrect) {
            state.score += 20;
            state.stage += 1;
            state.completedCount += 1;

            await DB.addLog({ action: `Cleared Stage ${state.stage - 1}`, ptChange: +20, timestamp: new Date().toLocaleTimeString() });
            await this.saveSession();
            this.updateUI();
            this.showModal('Stage Passed! +20 PT Earned', 'fa-circle-check');
            this.renderPuzzle();
        } else {
            await this.deductPoints(10, 'Wrong Answer Selection');
        }
    },

    async skipLevel() {
        await this.deductPoints(10, 'Stage Skipped');
        if (state.score > 0) {
            state.stage += 1;
            await this.saveSession();
            this.updateUI();
            this.renderPuzzle();
        }
    },

    async deductPoints(pts, reason) {
        state.score -= pts;

        if (state.score <= 0) {
            state.score = 0;
            await DB.addLog({ action: `Knockout (${reason})`, ptChange: -pts, timestamp: new Date().toLocaleTimeString() });
            
            // Knockout Reset
            state.score = 100;
            state.stage = 1;
            await this.saveSession();
            this.updateUI();
            this.showModal('Knockout! Points Exhausted (0 PT). System Reset.', 'fa-skull');
            this.renderPuzzle();
        } else {
            await DB.addLog({ action: reason, ptChange: -pts, timestamp: new Date().toLocaleTimeString() });
            await this.saveSession();
            this.updateUI();
            this.showModal(`${reason}! -${pts} PT Deducted.`, 'fa-triangle-exclamation');
        }
    },

    async renderDashboard() {
        document.getElementById('dash-score').textContent = `${state.score} PT`;
        document.getElementById('dash-stage').textContent = `Stage ${state.stage}`;
        document.getElementById('dash-streak').textContent = `${state.streak} ${state.streak === 1 ? 'Day' : 'Days'}`;
        document.getElementById('dash-cleared').textContent = state.completedCount;

        const logs = await DB.getLogs();
        const list = document.getElementById('records-list');

        if (logs.length === 0) {
            list.innerHTML = `<div class="p-4 text-center text-slate-400 font-semibold">No activity logs recorded in IndexedDB yet.</div>`;
            return;
        }

        list.innerHTML = logs.map(r => `
            <div class="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span class="font-bold uppercase ${r.ptChange < 0 ? 'text-brand-red' : 'text-slate-800'}">${r.action}</span>
                <span class="font-bold ${r.ptChange < 0 ? 'text-brand-red' : 'text-emerald-600'}">${r.ptChange > 0 ? '+' : ''}${r.ptChange} PT</span>
                <span class="text-slate-400 text-[11px] font-semibold">${r.timestamp}</span>
            </div>
        `).join('');
    },

    showModal(msg, icon = 'fa-triangle-exclamation') {
        document.getElementById('modal-msg').textContent = msg;
        document.getElementById('modal-icon').innerHTML = `<i class="fa-solid ${icon}"></i>`;
        document.getElementById('custom-modal').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('custom-modal').classList.add('hidden');
    }
};

// Paginated Authentication Flow Controller
const Auth = {
    nextPage(pageNumber) {
        if (pageNumber === 2) {
            const name = document.getElementById('auth-username').value.trim();
            if (!name) {
                App.showModal('Please enter your candidate codename');
                return;
            }
            state.user = name;
            this.loadQuestion();
        }

        document.querySelectorAll('.auth-page').forEach(el => el.classList.add('hidden'));
        document.getElementById(`auth-page-${pageNumber}`).classList.remove('hidden');
        document.getElementById('auth-page-indicator').textContent = `Page ${pageNumber} of 2`;
    },

    loadQuestion() {
        state.currentAuthQuestion = LogicEngine.generateAuthQuestion();
        document.getElementById('auth-question-text').textContent = state.currentAuthQuestion.q;

        const container = document.getElementById('auth-options-container');
        container.innerHTML = state.currentAuthQuestion.options.map((opt, idx) => `
            <button onclick="Auth.selectAnswer(this, ${opt.isCorrect})" class="auth-opt w-full text-left p-3 rounded-lg border border-slate-200 hover:border-brand-red hover:bg-red-50/50 transition font-semibold text-slate-800">
                ${opt.text}
            </button>
        `).join('');
    },

    selectAnswer(btn, isCorrect) {
        document.querySelectorAll('.auth-opt').forEach(el => el.classList.remove('border-brand-red', 'bg-red-50/50'));
        btn.classList.add('border-brand-red', 'bg-red-50/50');
        state.selectedAuthAnswer = isCorrect;
    },

    async complete() {
        if (state.selectedAuthAnswer !== true) {
            App.showModal('Security Check Failed: Incorrect Answer');
            return;
        }

        const rememberMe = document.getElementById('auth-remember').checked;
        if (rememberMe) {
            await App.saveSession();
        }

        App.updateUI();
        App.navigate('game');
    },

    async logout() {
        state.user = null;
        await DB.clearSession();
        window.location.reload();
    }
};

// Application Bootstrapper
window.onload = async () => {
    await App.init();
    if (state.user) {
        App.navigate('game');
    } else {
        App.navigate('auth');
    }
};