const STORAGE_KEY = "fokusyou-v01";

const defaultState = {
  routines: [
    { id: crypto.randomUUID(), name: "Morgenroutine", done: false, streak: 3 },
    { id: crypto.randomUUID(), name: "20 Minuten Bewegung", done: false, streak: 5 }
  ],
  goals: [
    { id: crypto.randomUUID(), name: "12 Bücher lesen", value: 2, target: 12, unit: "Bücher" }
  ],
  totalSuccesses: 0
};

let state = loadState();
let dialogMode = "routine";

const routineList = document.querySelector("#routineList");
const goalList = document.querySelector("#goalList");
const itemDialog = document.querySelector("#itemDialog");
const itemForm = document.querySelector("#itemForm");
const itemName = document.querySelector("#itemName");
const itemTarget = document.querySelector("#itemTarget");
const itemUnit = document.querySelector("#itemUnit");

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  renderGreeting();
  renderRoutines();
  renderGoals();
  renderStats();
  saveState();
}

function renderGreeting() {
  const hour = new Date().getHours();
  const text = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  document.querySelector("#greeting").textContent = text;
}

function renderRoutines() {
  if (!state.routines.length) {
    routineList.innerHTML = '<div class="empty">Noch keine Routine angelegt.</div>';
    return;
  }

  routineList.innerHTML = state.routines.map(routine => `
    <article class="card item-card">
      <button class="check-button ${routine.done ? "done" : ""}" data-routine="${routine.id}" aria-label="Routine umschalten">
        ${routine.done ? "✓" : "○"}
      </button>
      <div>
        <div class="item-title">${escapeHtml(routine.name)}</div>
        <div class="item-meta">🔥 ${routine.streak} Tage Serie</div>
      </div>
      <button class="increment" data-delete-routine="${routine.id}" aria-label="Routine löschen">⋯</button>
    </article>
  `).join("");
}

function renderGoals() {
  if (!state.goals.length) {
    goalList.innerHTML = '<div class="empty">Noch kein Ziel angelegt.</div>';
    return;
  }

  goalList.innerHTML = state.goals.map(goal => {
    const percent = Math.min(100, Math.round((goal.value / goal.target) * 100));
    return `
      <article class="card item-card">
        <div style="font-size:1.5rem">🎯</div>
        <div>
          <div class="item-title">${escapeHtml(goal.name)}</div>
          <div class="item-meta">${goal.value} / ${goal.target} ${escapeHtml(goal.unit)} · ${percent}%</div>
          <div class="goal-progress"><span style="width:${percent}%"></span></div>
        </div>
        <button class="increment" data-goal="${goal.id}" aria-label="Fortschritt erhöhen">+1</button>
      </article>
    `;
  }).join("");
}

function renderStats() {
  const done = state.routines.filter(r => r.done).length;
  const total = state.routines.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const bestStreak = Math.max(0, ...state.routines.map(r => r.streak || 0));

  document.querySelector("#todayDone").textContent = done;
  document.querySelector("#todayTotal").textContent = total;
  document.querySelector("#progressPercent").textContent = `${percent}%`;
  document.querySelector("#progressRing").style.setProperty("--progress", `${percent * 3.6}deg`);
  document.querySelector("#bestStreak").textContent = bestStreak;
  document.querySelector("#totalSuccesses").textContent = state.totalSuccesses;
}

routineList.addEventListener("click", event => {
  const toggle = event.target.closest("[data-routine]");
  const remove = event.target.closest("[data-delete-routine]");

  if (toggle) {
    const routine = state.routines.find(r => r.id === toggle.dataset.routine);
    if (!routine) return;
    routine.done = !routine.done;
    if (routine.done) {
      routine.streak += 1;
      state.totalSuccesses += 1;
      navigator.vibrate?.(35);
    } else {
      routine.streak = Math.max(0, routine.streak - 1);
      state.totalSuccesses = Math.max(0, state.totalSuccesses - 1);
    }
    render();
  }

  if (remove) {
    const id = remove.dataset.deleteRoutine;
    if (confirm("Routine wirklich löschen?")) {
      state.routines = state.routines.filter(r => r.id !== id);
      render();
    }
  }
});

goalList.addEventListener("click", event => {
  const button = event.target.closest("[data-goal]");
  if (!button) return;
  const goal = state.goals.find(g => g.id === button.dataset.goal);
  if (!goal || goal.value >= goal.target) return;
  goal.value += 1;
  state.totalSuccesses += 1;
  navigator.vibrate?.(25);
  render();
});

document.querySelector("#addRoutineButton").addEventListener("click", () => openDialog("routine"));
document.querySelector("#addGoalButton").addEventListener("click", () => openDialog("goal"));

function openDialog(mode) {
  dialogMode = mode;
  itemForm.reset();
  document.querySelector("#dialogTypeLabel").textContent = mode === "routine" ? "Routine" : "Ziel";
  document.querySelector("#dialogTitle").textContent = mode === "routine" ? "Neue Routine" : "Neues Ziel";
  document.querySelector("#targetField").hidden = mode === "routine";
  document.querySelector("#unitField").hidden = mode === "routine";
  if (mode === "goal") {
    itemTarget.value = 10;
    itemUnit.value = "Schritte";
  }
  itemDialog.showModal();
  setTimeout(() => itemName.focus(), 80);
}

itemForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = itemName.value.trim();
  if (!name) return;

  if (dialogMode === "routine") {
    state.routines.unshift({
      id: crypto.randomUUID(),
      name,
      done: false,
      streak: 0
    });
  } else {
    const target = Math.max(1, Number(itemTarget.value) || 1);
    state.goals.unshift({
      id: crypto.randomUUID(),
      name,
      value: 0,
      target,
      unit: itemUnit.value.trim() || "Schritte"
    });
  }

  itemDialog.close();
  render();
});

document.querySelector("#settingsButton").addEventListener("click", () => {
  alert("Einstellungen, Dashboard-Anpassung und Benutzerkonto folgen in der nächsten Version.");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

render();
