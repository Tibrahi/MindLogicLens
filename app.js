// Application State Storage
const state = {
    user: null,
    score: 100, // Initial base starting score
    stage: 1,
    completedCount: 0,
    layout: 'card', // 'card' or 'split'
    records: [],
    currentPuzzle: null,
    selectedAuthAnswer: null
};

// Procedural Non-Math IQ Puzzle Generator Engine
const IQEngine = {
    shapes: ['fa-square', 'fa-circle', 'fa-play', 'fa-diamond', 'fa-star', 'fa-gear'],
    rotations: ['rotate-0', 'rotate-90', 'rotate-180', 'rotate-270'],

    generatePuzzle(stage) {
        const puzzleTypes = ['SPATIAL_ROTATION', 'PATTERN_ANOMALY', 'SEQUENCE_INTERSECTION'];
        const selectedType = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];

        if (selectedType === 'SPATIAL_ROTATION') {
            return this.generateRotationPuzzle();
        } else if (selectedType === 'PATTERN_ANOMALY') {
            return this.generateAnomalyPuzzle();
        } else {
            return this.generateIntersectionPuzzle();
        }
    },

    generateRotationPuzzle() {
        const baseShape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
        const correctIndex = Math.floor(Math.random() * 4);

        const matrix = [
            { shape: baseShape, rotation: 'rotate-0' },
            { shape: baseShape, rotation: 'rotate-90' },
            { shape: baseShape, rotation: 'rotate-180' },
            { shape: baseShape, rotation: this.rotations[correctIndex] }
        ];

        const options = [
            { id: 'A', rotation: 'rotate-270', isCorrect: correctIndex === 3 },
            { id: 'B', rotation: 'rotate-90', isCorrect: false },
            { id: 'C', rotation: 'rotate-180', isCorrect: false },
            { id: 'D', rotation: 'rotate-0', isCorrect: false }
        ].sort(() => Math.random() - 0.5);

        return {
            type: 'SPATIAL ROTATION SEQUENCE',
            instruction: 'Determine the correct angular alignment for the missing quadrant.',
            matrix: matrix,
            options: options,
            shape: baseShape
        };
    },

    generateAnomalyPuzzle() {
        const primaryShape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
        const anomalyShape = this.shapes.find(s => s !== primaryShape);

        const options = [
            { id: 'A', shape: primaryShape, isCorrect: false },
            { id: 'B', shape: primaryShape, isCorrect: false },
            { id: 'C', shape: anomalyShape, isCorrect: true },
            { id: 'D', shape: primaryShape, isCorrect: false }
        ].sort(() => Math.random() - 0.5);

        return {
            type: 'PATTERN ANOMALY DETECTION',
            instruction: 'Analyze the geometric array. Select the entity breaking symbolic symmetry.',
            options: options,
            matrix: null
        };
    },

    generateIntersectionPuzzle() {
        const shuffled = [...this.shapes].sort(() => Math.random() - 0.5);

        const options = [
            { id: 'A', shape: shuffled[0], isCorrect: true },
            { id: 'B', shape: shuffled[1], isCorrect: false },
            { id: 'C', shape: shuffled[2], isCorrect: false },
            { id: 'D', shape: shuffled[3], isCorrect: false }
        ].sort(() => Math.random() - 0.5);

        return {
            type: 'ABSTRACT SET INTERSECTION',
            instruction: 'Identify the structural primitive required to complete the logical key.',
            options: options,
            matrix: null
        };
    }
};

// Global Application Controller
const App = {
    init() {
        this.loadStorage();
        this.updateUI();
    },

    loadStorage() {
        const saved = localStorage.getItem('nexus_iq_white_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                state.user = parsed.user;
                state.score = parsed.score ?? 100;
                state.stage = parsed.stage ?? 1;
                state.completedCount = parsed.completedCount ?? 0;
                state.records = parsed.records ?? [];
            } catch (e) {
                console.error("Storage parse error", e);
            }
        }
    },

    saveStorage() {
        localStorage.setItem('nexus_iq_white_state', JSON.stringify({
            user: state.user,
            score: state.score,
            stage: state.stage,
            completedCount: state.completedCount,
            records: state.records
        }));
    },

    updateUI() {
        document.getElementById('global-score').textContent = `${state.score} PT`;
        if (state.user) {
            document.getElementById('nav-controls').classList.remove('hidden');
            document.getElementById('user-display').textContent = state.user;
        } else {
            document.getElementById('nav-controls').classList.add('hidden');
        }
    },

    navigate(view) {
        document.querySelectorAll("section[id^='view-']").forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${view}`).classList.remove('hidden');

        if (view === 'game') {
            this.renderPuzzle();
        } else if (view === 'records') {
            this.renderRecords();
        }
    },

    setLayout(type) {
        state.layout = type;
        document.getElementById('btn-layout-card').className = type === 'card' 
            ? 'px-3 py-1 text-xs font-mono font-bold bg-black text-white' 
            : 'px-3 py-1 text-xs font-mono font-bold text-black hover:text-brand-red';
        document.getElementById('btn-layout-split').className = type === 'split' 
            ? 'px-3 py-1 text-xs font-mono font-bold bg-black text-white' 
            : 'px-3 py-1 text-xs font-mono font-bold text-black hover:text-brand-red';
        
        if (!document.getElementById('view-game').classList.contains('hidden')) {
            this.renderPuzzle();
        }
    },

    renderPuzzle() {
        state.currentPuzzle = IQEngine.generatePuzzle(state.stage);
        const container = document.getElementById('game-layout-container');
        document.getElementById('level-display-title').textContent = `STAGE ${state.stage}`;
        
        const p = state.currentPuzzle;

        if (state.layout === 'card') {
            container.innerHTML = `
                <div class="bg-white border-4 border-black p-8 max-w-xl mx-auto w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <span class="inline-block px-2 py-0.5 bg-brand-red text-white text-[10px] font-mono font-bold uppercase mb-2">${p.type}</span>
                    <p class="text-xs font-mono text-gray-700 font-bold mb-6 uppercase">${p.instruction}</p>

                    ${p.matrix ? `
                        <div class="grid grid-cols-2 gap-3 bg-white p-4 border-2 border-black mb-6 w-44 h-44 mx-auto">
                            <div class="flex items-center justify-center border border-black text-black text-2xl"><i class="fa-solid ${p.matrix[0].shape} ${p.matrix[0].rotation}"></i></div>
                            <div class="flex items-center justify-center border border-black text-black text-2xl"><i class="fa-solid ${p.matrix[1].shape} ${p.matrix[1].rotation}"></i></div>
                            <div class="flex items-center justify-center border border-black text-black text-2xl"><i class="fa-solid ${p.matrix[2].shape} ${p.matrix[2].rotation}"></i></div>
                            <div class="flex items-center justify-center border-2 border-brand-red bg-red-50 text-brand-red text-xl font-mono font-bold animate-pulse-fast">?</div>
                        </div>
                    ` : ''}

                    <div class="grid grid-cols-2 gap-3 font-mono">
                        ${p.options.map((opt, idx) => `
                            <button onclick="App.evaluateAnswer(${opt.isCorrect})" class="p-4 bg-white border-2 border-black hover:bg-black hover:text-white flex items-center justify-center gap-3 transition group">
                                <span class="text-xs font-bold text-brand-red group-hover:text-white">${String.fromCharCode(65 + idx)})</span>
                                ${opt.rotation ? `<i class="fa-solid ${p.shape} ${opt.rotation} text-xl"></i>` : ''}
                                ${opt.shape ? `<i class="fa-solid ${opt.shape} text-xl"></i>` : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <div class="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                        <div>
                            <span class="inline-block px-2 py-0.5 bg-brand-red text-white text-[10px] font-mono font-bold uppercase mb-2">${p.type}</span>
                            <p class="text-xs font-mono text-gray-700 font-bold mb-6 uppercase">${p.instruction}</p>
                        </div>
                        ${p.matrix ? `
                            <div class="grid grid-cols-2 gap-3 bg-white p-4 border-2 border-black w-44 h-44 mx-auto my-auto">
                                <div class="flex items-center justify-center border border-black text-black text-2xl"><i class="fa-solid ${p.matrix[0].shape} ${p.matrix[0].rotation}"></i></div>
                                <div class="flex items-center justify-center border border-black text-black text-2xl"><i class="fa-solid ${p.matrix[1].shape} ${p.matrix[1].rotation}"></i></div>
                                <div class="flex items-center justify-center border border-black text-black text-2xl"><i class="fa-solid ${p.matrix[2].shape} ${p.matrix[2].rotation}"></i></div>
                                <div class="flex items-center justify-center border-2 border-brand-red bg-red-50 text-brand-red text-xl font-mono font-bold animate-pulse-fast">?</div>
                            </div>
                        ` : '<div class="p-8 text-center text-xs font-mono text-gray-400 border-2 border-black my-auto">ARRAY PREPARED</div>'}
                    </div>

                    <div class="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center">
                        <span class="text-xs font-mono font-bold text-gray-500 mb-4 block uppercase">SELECT MATCHING ORIENTATION:</span>
                        <div class="space-y-3 font-mono">
                            ${p.options.map((opt, idx) => `
                                <button onclick="App.evaluateAnswer(${opt.isCorrect})" class="w-full p-4 bg-white border-2 border-black hover:bg-black hover:text-white flex items-center justify-between transition group">
                                    <span class="text-xs font-bold text-brand-red group-hover:text-white">OPTION ${String.fromCharCode(65 + idx)}</span>
                                    ${opt.rotation ? `<i class="fa-solid ${p.shape} ${opt.rotation} text-2xl"></i>` : ''}
                                    ${opt.shape ? `<i class="fa-solid ${opt.shape} text-2xl"></i>` : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
    },

    evaluateAnswer(isCorrect) {
        if (isCorrect) {
            state.score += 20;
            state.stage += 1;
            state.completedCount += 1;

            this.logRecord(`CLEARED STAGE ${state.stage - 1}`, +20);
            this.saveStorage();
            this.updateUI();
            this.showModal('STAGE PASSED! +20 PT EARNED', 'fa-circle-check');
            this.renderPuzzle();
        } else {
            this.deductPoints(10, 'WRONG SELECTION');
        }
    },

    skipLevel() {
        this.deductPoints(10, 'STAGE SKIPPED');
        if (state.score > 0) {
            state.stage += 1;
            this.saveStorage();
            this.updateUI();
            this.renderPuzzle();
        }
    },

    deductPoints(pts, reason) {
        state.score -= pts;

        if (state.score <= 0) {
            state.score = 0;
            this.logRecord(`KNOCKOUT (${reason})`, -pts);
            this.saveStorage();
            this.updateUI();
            this.showModal('KNOCKOUT! POINTS EXHAUSTED (0 PT). SYSTEM RESET.', 'fa-skull');
            
            // Reset progression state on knockout
            state.score = 100;
            state.stage = 1;
            this.saveStorage();
            this.updateUI();
            this.renderPuzzle();
        } else {
            this.logRecord(`${reason}`, -pts);
            this.saveStorage();
            this.updateUI();
            this.showModal(`${reason}! -${pts} PT DEDUCTED.`, 'fa-triangle-exclamation');
        }
    },

    logRecord(action, ptChange) {
        state.records.unshift({
            action: action,
            ptChange: ptChange,
            totalScore: state.score,
            timestamp: new Date().toLocaleTimeString()
        });
    },

    renderRecords() {
        document.getElementById('record-score').textContent = `${state.score} PT`;
        document.getElementById('record-stage').textContent = `STAGE ${state.stage}`;
        document.getElementById('record-count').textContent = state.completedCount;

        const list = document.getElementById('records-list');
        if (state.records.length === 0) {
            list.innerHTML = `<div class="p-4 text-center text-gray-500 font-bold">NO LOGGED RECORDS AVAILABLE.</div>`;
            return;
        }

        list.innerHTML = state.records.map(r => `
            <div class="flex justify-between p-3 border-2 border-black bg-white">
                <span class="font-bold uppercase ${r.ptChange < 0 ? 'text-brand-red' : 'text-black'}">${r.action}</span>
                <span class="font-bold ${r.ptChange < 0 ? 'text-brand-red' : 'text-black'}">${r.ptChange > 0 ? '+' : ''}${r.ptChange} PT</span>
                <span class="text-gray-500 font-bold">${r.timestamp}</span>
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

// Paginated Authentication Flow
const Auth = {
    nextPage(pageNumber) {
        if (pageNumber === 2) {
            const name = document.getElementById('auth-username').value.trim();
            if (!name) {
                App.showModal('ENTER OPERATOR CODENAME');
                return;
            }
            state.user = name;
        }

        document.querySelectorAll('.auth-page').forEach(el => el.classList.add('hidden'));
        document.getElementById(`auth-page-${pageNumber}`).classList.remove('hidden');
        document.getElementById('auth-page-indicator').textContent = `PAGE ${pageNumber} / 2`;
    },

    selectAnswer(btn, option) {
        document.querySelectorAll('.auth-opt').forEach(el => el.classList.remove('bg-black', 'text-white'));
        btn.classList.add('bg-black', 'text-white');
        state.selectedAuthAnswer = option;
    },

    complete() {
        App.saveStorage();
        App.updateUI();
        App.navigate('game');
    },

    logout() {
        state.user = null;
        localStorage.removeItem('nexus_iq_white_state');
        window.location.reload();
    }
};

// Application Bootstrapper
window.onload = () => {
    App.init();
    if (state.user) {
        App.navigate('game');
    } else {
        App.navigate('auth');
    }
};