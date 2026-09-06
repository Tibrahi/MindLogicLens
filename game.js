// ====================== MINDLOGICLENS v3.0 (ENDLESS EDITION) ======================
// Dependancy: Requires FontAwesome 6 CDN loaded in your HTML head.

let state = {
    xp: 1240,
    streak: 1,
    level: 1,
    score: 0,
    endlessStage: 1,
    lastPlayDate: "",
    customModules: [],
    history: [],
    achievements: [
        { id: "first", name: "First Read", desc: "Complete initial protocol", icon: "fa-solid fa-bolt", unlocked: false },
        { id: "builder", name: "Architect", desc: "Construct custom sequence", icon: "fa-solid fa-cubes-stacked", unlocked: false },
        { id: "streak5", name: "Neural Flow", desc: "Reach Stage 5 in Endless Mode", icon: "fa-solid fa-fire", unlocked: false },
        { id: "expert", name: "Master Mind", desc: "Solve Stage 10+ Endless Protocol", icon: "fa-solid fa-brain", unlocked: false }
    ],
    modules: []
};

let currentModule = null;
let currentOps = [];
let isEndless = false;

// Audio System
const audio = {
    click: new Audio("https://freesound.org/data/previews/276/276951_5121236-lq.mp3"),
    success: new Audio("https://freesound.org/data/previews/320/320186_5270808-lq.mp3"),
    fail: new Audio("https://freesound.org/data/previews/331/331912_3248244-lq.mp3")
};

function playSound(sound) {
    if (audio[sound]) {
        audio[sound].currentTime = 0;
        audio[sound].play().catch(() => {}); // Prevent browser autoplay restrictions from throwing errors
    }
}

// Visual Effects: Confetti Cannon
function launchConfetti() {
    const canvas = document.createElement("canvas");
    canvas.className = "fixed inset-0 pointer-events-none z-50 w-full h-full";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ["#f59e0b", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6"];
    
    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - 50,
            size: Math.random() * 8 + 4,
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 4 - 2,
            angle: Math.random() * 360,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    let frame = 0;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.angle += 5;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.angle * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });
        frame++;
        if (frame < 100) requestAnimationFrame(animate);
        else canvas.remove();
    }
    animate();
}

// Procedural Continuous Protocol Generator (Infinite Game Logic)
function generateProceduralProtocol(stage = 1) {
    const opTypes = ["add", "sub", "mul", "div"];
    const icons = ["fa-microchip", "fa-atom", "fa-network-wired", "fa-diagram-project", "fa-cubes", "fa-dna"];
    
    // Scale sequence length and values by stage difficulty
    const stepCount = Math.min(2 + Math.floor(stage / 2), 7);
    const ops = [];

    for (let i = 0; i < stepCount; i++) {
        let op = opTypes[Math.floor(Math.random() * opTypes.length)];
        let val;

        if (op === "mul") val = Math.floor(Math.random() * 4) + 2;
        else if (op === "div") val = Math.floor(Math.random() * 3) + 2;
        else if (op === "add" || op === "sub") val = Math.floor(Math.random() * (10 + stage * 2)) + 1;

        ops.push({ op, val });
    }

    const diffLabel = stage <= 2 ? "Easy" : stage <= 5 ? "Medium" : stage <= 8 ? "Hard" : "Expert";

    return {
        id: `procedural-stage-${stage}`,
        name: `Neural Link Stage ${stage}`,
        desc: `Algorithmic pattern generated at procedural tier ${stage}.`,
        icon: icons[Math.floor(Math.random() * icons.length)],
        difficulty: diffLabel,
        ops: ops
    };
}

// Core Math Engines
function applyForward(ops, x) {
    let val = Number(x);
    for (let op of ops) {
        if (op.op === "add") val += op.val;
        else if (op.op === "sub") val -= op.val;
        else if (op.op === "mul") val *= op.val;
        else if (op.op === "div") val /= op.val;
    }
    return Math.round(val * 100) / 100;
}

function applyInverse(ops, final) {
    let val = Number(final);
    for (let i = ops.length - 1; i >= 0; i--) {
        const op = ops[i];
        if (op.op === "add") val -= op.val;
        else if (op.op === "sub") val += op.val;
        else if (op.op === "mul") val /= op.val;
        else if (op.op === "div") val *= op.val;
    }
    return Math.round(val * 100) / 100;
}

function getStepText(op) {
    switch (op.op) {
        case "add": return `Add ${op.val}`;
        case "sub": return `Subtract ${op.val}`;
        case "mul": return `Multiply by ${op.val}`;
        case "div": return `Divide by ${op.val}`;
    }
}

function saveState() {
    localStorage.setItem("mindlogic_state_v3", JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem("mindlogic_state_v3");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
        } catch (e) {
            console.error("State recovery error", e);
        }
    }
}

// Main Game Controller
const Game = {
    init() {
        loadState();
        this.updateDisplays();
        this.populateLevels();
    },

    updateDisplays() {
        document.getElementById("xp-display").textContent = state.xp;
        document.getElementById("streak-display").textContent = state.streak;
    },

    populateLevels() {
        const grid = document.getElementById("level-grid");
        if (!grid) return;
        grid.innerHTML = "";

        // Generate dynamic modules
        state.modules = [
            generateProceduralProtocol(1),
            generateProceduralProtocol(3),
            generateProceduralProtocol(6),
            generateProceduralProtocol(10)
        ];

        const allMods = [...state.modules, ...state.customModules];

        allMods.forEach((mod, index) => {
            const card = document.createElement("div");
            card.className = `glass-card rounded-xl p-5 cursor-pointer flex flex-col justify-between group transition-all transform hover:-translate-y-1 hover:shadow-2xl`;

            const badgeColor =
                mod.difficulty === "Easy" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                mod.difficulty === "Medium" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                mod.difficulty === "Hard" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
                "text-purple-400 bg-purple-500/10 border-purple-500/20";

            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start mb-3">
                        <div class="w-12 h-12 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center text-amber-400 shadow-[0_4px_10px_rgba(0,0,0,0.5)] transform group-hover:rotate-6 group-hover:scale-110 transition-all">
                            <i class="${mod.icon.includes('fa-') ? mod.icon : 'fa-solid ' + mod.icon} text-xl drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]"></i>
                        </div>
                        <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${badgeColor}">${mod.difficulty}</span>
                    </div>
                    <h4 class="font-bold text-slate-100 text-base mb-1 group-hover:text-amber-400 transition-colors">${mod.name}</h4>
                    <p class="text-slate-400 text-xs leading-relaxed line-clamp-2">${mod.desc}</p>
                </div>
                <div class="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-400 group-hover:text-slate-200">
                    <span>INITIATE PROTOCOL</span>
                    <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </div>
            `;
            card.onclick = () => {
                playSound("click");
                isEndless = false;
                this.startGame(mod);
            };
            grid.appendChild(card);
        });
    },

    startEndlessMode() {
        playSound("click");
        isEndless = true;
        state.endlessStage = 1;
        const endlessMod = generateProceduralProtocol(state.endlessStage);
        this.startGame(endlessMod);
    },

    startGame(mod) {
        currentModule = mod;
        currentOps = [...mod.ops];

        document.querySelectorAll("section[id^='scene-']").forEach(s => s.classList.add("hidden"));
        document.getElementById("scene-game").classList.remove("hidden");

        document.getElementById("game-title").textContent = mod.name;
        document.getElementById("game-difficulty-badge").textContent = isEndless ? `INFINITE - STAGE ${state.endlessStage}` : mod.difficulty;
        document.getElementById("game-instruction").innerHTML = `Select an integer initial value <span class="font-mono text-amber-400">x</span> (1–50), then perform sequence below:`;

        const stepsContainer = document.getElementById("steps-list");
        stepsContainer.innerHTML = currentOps.map((op, i) => `
            <div class="flex items-center gap-3 bg-slate-950/70 border border-slate-800/80 px-3.5 py-2.5 rounded-lg text-xs font-mono shadow-inner hover:border-amber-500/30 transition">
                <span class="w-6 h-6 flex items-center justify-center bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold rounded shadow-[0_2px_4px_rgba(0,0,0,0.4)]">${i + 1}</span>
                <span class="text-slate-200">${getStepText(op)}</span>
            </div>
        `).join("");

        const inputEl = document.getElementById("user-input");
        if (inputEl) {
            inputEl.value = "";
            inputEl.focus();
        }
        document.getElementById("progress-bar").style.width = isEndless ? `${Math.min(state.endlessStage * 10, 100)}%` : "50%";
    },

    submitAnswer() {
        const inputEl = document.getElementById("user-input");
        let userFinal = parseFloat(inputEl.value);

        if (isNaN(userFinal)) {
            playSound("fail");
            CustomAlert.show("Please enter a valid numeric computed result.");
            return;
        }

        const recovered = applyInverse(currentOps, userFinal);
        const rounded = Math.round(recovered);

        if (rounded < 1 || rounded > 50) {
            playSound("fail");
            CustomAlert.show("Computed state yields initial x outside bounds (1–50). Check your operations.");
            return;
        }

        this.showResult(rounded, userFinal);
    },

    showResult(recoveredX, finalInput) {
        playSound("success");
        launchConfetti();

        document.querySelectorAll("section[id^='scene-']").forEach(s => s.classList.add("hidden"));
        document.getElementById("scene-result").classList.remove("hidden");

        document.getElementById("final-reveal").textContent = recoveredX;

        let expl = `Input Value Output: ${finalInput}\nInverse Sequence Applied:\n`;
        currentOps.slice().reverse().forEach((op) => {
            const invOp = op.op === 'add' ? 'sub' : op.op === 'sub' ? 'add' : op.op === 'mul' ? 'div' : 'mul';
            expl += ` └ Invert ${op.op} (${op.val}) → ${invOp}\n`;
        });
        expl += `Recovered Initial State: x = ${recoveredX}`;

        document.getElementById("logic-explanation").textContent = expl;

        const xpGain = (isEndless ? state.endlessStage * 30 : 50) * Math.min(state.streak, 5);
        state.xp += xpGain;

        const today = new Date().toDateString();
        if (state.lastPlayDate !== today) {
            state.streak++;
            state.lastPlayDate = today;
        }

        state.history.unshift({
            name: isEndless ? `Endless Stage ${state.endlessStage}` : currentModule.name,
            xp: xpGain,
            date: new Date().toLocaleDateString()
        });
        if (state.history.length > 10) state.history.pop();

        const contBtn = document.getElementById("continue-btn");
        if (contBtn) {
            if (isEndless) {
                contBtn.textContent = `NEXT STAGE (${state.endlessStage + 1}) →`;
                contBtn.onclick = () => {
                    state.endlessStage++;
                    Game.startGame(generateProceduralProtocol(state.endlessStage));
                };
            } else {
                contBtn.textContent = "CONTINUE";
                contBtn.onclick = () => Game.returnToHome();
            }
        }

        this.updateDisplays();
        this.checkAchievements();
        saveState();
    },

    restartCurrent() {
        playSound("click");
        if (currentModule) this.startGame(currentModule);
    },

    returnToHome() {
        playSound("click");
        isEndless = false;
        document.querySelectorAll("section[id^='scene-']").forEach(s => s.classList.add("hidden"));
        document.getElementById("scene-home").classList.remove("hidden");
        this.populateLevels();
    },

    openBuilder() {
        playSound("click");
        document.querySelectorAll("section[id^='scene-']").forEach(s => s.classList.add("hidden"));
        document.getElementById("scene-builder").classList.remove("hidden");
        Builder.reset();
    },

    checkAchievements() {
        if (state.xp >= 100) state.achievements[0].unlocked = true;
        if (state.customModules.length >= 1) state.achievements[1].unlocked = true;
        if (state.endlessStage >= 5) state.achievements[2].unlocked = true;
        if (state.endlessStage >= 10) state.achievements[3].unlocked = true;
        saveState();
    },

    addCustomModule(newMod) {
        state.customModules.push(newMod);
        saveState();
        this.populateLevels();
    }
};

// Builder Module (with Drag-and-Drop)
const Builder = {
    currentOps: [],

    reset() {
        this.currentOps = [];
        this.renderSteps();
    },

    addOp(type) {
        playSound("click");
        const valStr = prompt(`Enter numerical operand for ${type.toUpperCase()}:`, type === "mul" || type === "div" ? "2" : "5");
        if (valStr === null) return;

        const val = parseFloat(valStr);
        if (isNaN(val) || val === 0) {
            CustomAlert.show("Operand must be a non-zero number.");
            return;
        }

        this.currentOps.push({ op: type, val: val });
        this.renderSteps();
    },

    renderSteps() {
        const container = document.getElementById("builder-steps");
        if (!container) return;
        container.innerHTML = "";

        if (this.currentOps.length === 0) {
            container.innerHTML = `<div class="text-slate-500 italic text-center py-10 text-xs font-mono">No steps appended. Select operations below to build sequence.</div>`;
            document.getElementById("builder-status").textContent = "0 OP";
            return;
        }

        this.currentOps.forEach((op, i) => {
            const div = document.createElement("div");
            div.className = "flex items-center justify-between bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-lg text-xs font-mono cursor-grab active:cursor-grabbing hover:border-amber-500/40 transition shadow-md";
            div.draggable = true;
            div.dataset.index = i;

            div.innerHTML = `
                <div class="flex items-center gap-3 pointer-events-none">
                    <i class="fa-solid fa-grip-vertical text-slate-600"></i>
                    <span class="text-amber-400 font-bold">${i + 1}.</span>
                    <span class="text-slate-200">${getStepText(op)}</span>
                </div>
                <button onclick="Builder.removeStep(${i})" class="text-slate-500 hover:text-rose-400 transition">&times;</button>
            `;

            // Drag and Drop Logic
            div.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("text/plain", i);
            });

            div.addEventListener("dragover", (e) => e.preventDefault());

            div.addEventListener("drop", (e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
                const toIndex = i;
                if (fromIndex !== toIndex) {
                    const movedItem = this.currentOps.splice(fromIndex, 1)[0];
                    this.currentOps.splice(toIndex, 0, movedItem);
                    this.renderSteps();
                }
            });

            container.appendChild(div);
        });

        document.getElementById("builder-status").textContent = `${this.currentOps.length} OP ACTIVE`;
    },

    removeStep(index) {
        playSound("click");
        this.currentOps.splice(index, 1);
        this.renderSteps();
    },

    testAndSave() {
        if (this.currentOps.length === 0) {
            CustomAlert.show("Sequence must contain at least one operation.");
            return;
        }

        const testX = Math.floor(Math.random() * 20) + 1;
        const computedFinal = applyForward(this.currentOps, testX);
        const recovered = applyInverse(this.currentOps, computedFinal);

        if (Math.abs(recovered - testX) < 0.01) {
            const newMod = {
                id: "custom-" + Date.now(),
                name: "Protocol #" + (state.customModules.length + 1),
                desc: "Custom user-architected pathway.",
                icon: "fa-solid fa-gears",
                difficulty: "Medium",
                ops: [...this.currentOps]
            };

            Game.addCustomModule(newMod);
            playSound("success");
            CustomAlert.show("Protocol verified and saved successfully.", "✅");
            Game.returnToHome();
        } else {
            playSound("fail");
            CustomAlert.show("Sequence state inversion failure. Ensure arithmetic integrity.");
        }
    }
};

// Neural Profile Modal
const ProfileModal = {
    toggle() {
        playSound("click");
        const modal = document.getElementById("stats-modal");
        if (!modal) return;

        if (!modal.classList.contains("hidden")) {
            modal.classList.add("hidden");
            return;
        }

        modal.classList.remove("hidden");

        document.getElementById("modal-xp").textContent = state.xp;
        document.getElementById("modal-streak").textContent = state.streak;

        const achContainer = document.getElementById("achievements-list");
        if (achContainer) {
            achContainer.innerHTML = "";
            state.achievements.forEach(ach => {
                const div = document.createElement("div");
                div.className = `flex gap-3 bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl items-center ${
                    ach.unlocked ? "border-amber-500/40 bg-amber-500/5" : "opacity-40"
                }`;
                div.innerHTML = `
                    <div class="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400">
                        <i class="${ach.icon} text-lg"></i>
                    </div>
                    <div>
                        <div class="text-xs font-bold text-slate-200">${ach.name}</div>
                        <div class="text-[10px] text-slate-400 leading-tight">${ach.desc}</div>
                    </div>
                `;
                achContainer.appendChild(div);
            });
        }
    }
};

// Global Exports
window.Game = Game;
window.ProfileModal = ProfileModal;
window.Builder = Builder;

// Keyboard Listener
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !document.getElementById("scene-game").classList.contains("hidden")) {
        const input = document.getElementById("user-input");
        if (document.activeElement === input) {
            Game.submitAnswer();
        }
    }
});

// Initialization
window.onload = () => {
    Game.init();
    console.log("%cMindLogicLens Endless 3D Edition v3.0 Loaded", "color:#f59e0b; font-weight:bold; font-size:14px;");
};