const STORAGE_KEY = "fokusyou-v02";
const LAST_DAY_KEY = "fokusyou-last-day";

const areas = {
  health: { label: "Gesundheit", icon: "❤️" },
  work: { label: "Arbeit", icon: "💼" },
  finance: { label: "Finanzen", icon: "💰" },
  family: { label: "Familie", icon: "👨‍👩‍👧" },
  learning: { label: "Lernen", icon: "📚" },
  leisure: { label: "Freizeit", icon: "🎮" }
};

const starterState = {
  xp: 35,
  successes: 3,
  routines: [
    { id: id(), name: "Morgenroutine", area: "health", done: false, streak: 3 },
    { id: id(), name: "20 Minuten Bewegung", area: "health", done: false, streak: 5 },
    { id: id(), name: "Tagesplanung", area: "work", done: false, streak: 2 }
  ],
  goals: [
    { id: id(), name: "12 Bücher lesen", area: "learning", value: 2, target: 12, unit: "Bücher" },
    { id: id(), name: "1.000 € Rücklage", area: "finance", value: 250, target: 1000, unit: "€" }
  ]
};

let state = loadState();
let dialogMode = "routine";

const routineList = document.querySelector("#routineList");
const goalList = document.querySelector("#goalList");
const areaList = document.querySelector("#areaList");
const itemDialog = document.querySelector("#itemDialog");
const itemForm = document.querySelector("#itemForm");

resetRoutinesOnNewDay();
render();

function id() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(starterState);
  } catch {
    return structuredClone(starterState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function resetRoutinesOnNewDay() {
  const lastDay = localStorage.getItem(LAST_DAY_KEY);
  const today = todayKey();
  if (lastDay && lastDay !== today) {
    state.routines.forEach(routine => routine.done = false);
  }
  localStorage.setItem(LAST_DAY_KEY, today);
  saveState();
}

function levelInfo(xp) {
  const level = Math.floor(xp / 100) + 1;
  const current = xp % 100;
  return { level, current, needed: 100 - current };
}

function render() {
  renderHeader();
  renderLevel();
  renderRoutines();
  renderGoals();
  renderAreas();
  renderStats();
  saveState();
}

function renderHeader() {
  const now = new Date();
  const hour = now.getHours();
  document.querySelector("#greeting").textContent =
    hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  document.querySelector("#todayDate").textContent =
    now.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}

function renderLevel() {
  const info = levelInfo(state.xp);
  document.querySelector("#levelNumber").textContent = info.level;
  document.querySelector("#levelOrb").textContent = info.level;
  document.querySelector("#xpNumber").textContent = state.xp;
  document.querySelector("#xpBar").style.width = `${info.current}%`;
  document.querySelector("#xpNext").textContent = `Noch ${info.needed} XP bis Level ${info.level + 1}`;
}

function renderRoutines() {
  if (!state.routines.length) {
    routineList.innerHTML = '<div class="empty">Noch keine Routine angelegt.</div>';
    return;
  }
  routineList.innerHTML = state.routines.map(r => {
    const area = areas[r.area] || areas.health;
    return `
      <article class="card item-card">
        <button class="check-btn ${r.done ? "done" : ""}" data-routine="${r.id}" aria-label="Routine umschalten">
          ${r.done ? "✓" : "○"}
        </button>
        <div>
          <div class="item-title">${escapeHtml(r.name)}</div>
          <div class="item-meta">🔥 ${r.streak} Tage Serie · +5 XP</div>
          <span class="area-pill">${area.icon} ${area.label}</span>
        </div>
        <button class="menu-btn" data-delete-routine="${r.id}" aria-label="Routine löschen">⋯</button>
      </article>
    `;
  }).join("");
}

function renderGoals() {
  if (!state.goals.length) {
    goalList.innerHTML = '<div class="empty">Noch kein Ziel angelegt.</div>';
    return;
  }
  goalList.innerHTML = state.goals.map(g => {
    const area = areas[g.area] || areas.health;
    const percent = Math.min(100, Math.round((g.value / g.target) * 100));
    return `
      <article class="card item-card">
        <div style="font-size:1.45rem">🎯</div>
        <div>
          <div class="item-title">${escapeHtml(g.name)}</div>
          <div class="item-meta">${formatNumber(g.value)} / ${formatNumber(g.target)} ${escapeHtml(g.unit)} · ${percent}%</div>
          <div class="progress"><span style="width:${percent}%"></span></div>
          <span class="area-pill">${area.icon} ${area.label}</span>
        </div>
        <button class="plus-btn" data-goal="${g.id}" aria-label="Fortschritt erhöhen">+1</button>
      </article>
    `;
  }).join("");
}

function renderAreas() {
  const scores = {};
  Object.keys(areas).forEach(key => scores[key] = 0);

  state.routines.forEach(r => {
    if (r.done) scores[r.area] = Math.min(100, (scores[r.area] || 0) + 25);
  });
  state.goals.forEach(g => {
    const percent = Math.min(100, Math.round((g.value / g.target) * 100));
    scores[g.area] = Math.max(scores[g.area] || 0, percent);
  });

  areaList.innerHTML = Object.entries(areas).map(([key, area]) => `
    <article class="card area-card">
      <div class="area-row">
        <strong>${area.icon} ${area.label}</strong>
        <small>${scores[key]}%</small>
      </div>
      <div class="progress"><span style="width:${scores[key]}%"></span></div>
    </article>
  `).join("");
}

function renderStats() {
  const done = state.routines.filter(r => r.done).length;
  document.querySelector("#todayDone").textContent = `${done}/${state.routines.length}`;
  document.querySelector("#successCount").textContent = state.successes;
  document.querySelector("#bestStreak").textContent =
    Math.max(0, ...state.routines.map(r => r.streak || 0));
}

routineList.addEventListener("click", event => {
  const toggle = event.target.closest("[data-routine]");
  const remove = event.target.closest("[data-delete-routine]");

  if (toggle) {
    const routine = state.routines.find(r => r.id === toggle.dataset.routine);
    if (!routine) return;

    if (!routine.done) {
      routine.done = true;
      routine.streak += 1;
      state.xp += 5;
      state.successes += 1;
      navigator.vibrate?.(35);
    } else {
      routine.done = false;
      routine.streak = Math.max(0, routine.streak - 1);
      state.xp = Math.max(0, state.xp - 5);
      state.successes = Math.max(0, state.successes - 1);
    }
    render();
  }

  if (remove) {
    if (confirm("Routine wirklich löschen?")) {
      state.routines = state.routines.filter(r => r.id !== remove.dataset.deleteRoutine);
      render();
    }
  }
});

goalList.addEventListener("click", event => {
  const button = event.target.closest("[data-goal]");
  if (!button) return;

  const goal = state.goals.find(g => g.id === button.dataset.goal);
  if (!goal || goal.value >= goal.target) return;

  const wasIncomplete = goal.value < goal.target;
  goal.value += 1;
  state.xp += 2;
  state.successes += 1;

  if (wasIncomplete && goal.value >= goal.target) {
    state.xp += 25;
    alert("🏆 Ziel erreicht! Du erhältst 25 Bonus-XP.");
  }

  navigator.vibrate?.(25);
  render();
});

document.querySelector("#addRoutineButton").addEventListener("click", () => openItemDialog("routine"));
document.querySelector("#addGoalButton").addEventListener("click", () => openItemDialog("goal"));
document.querySelector("#closeDialog").addEventListener("click", () => itemDialog.close());
document.querySelector("#cancelDialog").addEventListener("click", () => itemDialog.close());

function openItemDialog(mode) {
  dialogMode = mode;
  itemForm.reset();
  document.querySelector("#dialogLabel").textContent = mode === "routine" ? "Routine" : "Ziel";
  document.querySelector("#dialogTitle").textContent = mode === "routine" ? "Neue Routine" : "Neues Ziel";
  document.querySelector("#goalFields").hidden = mode === "routine";

  if (mode === "goal") {
    document.querySelector("#itemTarget").value = 10;
    document.querySelector("#itemUnit").value = "Schritte";
  }

  itemDialog.showModal();
  setTimeout(() => document.querySelector("#itemName").focus(), 80);
}

itemForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = document.querySelector("#itemName").value.trim();
  const area = document.querySelector("#itemArea").value;
  if (!name) return;

  if (dialogMode === "routine") {
    state.routines.unshift({ id: id(), name, area, done: false, streak: 0 });
  } else {
    const target = Math.max(1, Number(document.querySelector("#itemTarget").value) || 1);
    const unit = document.querySelector("#itemUnit").value.trim() || "Schritte";
    state.goals.unshift({ id: id(), name, area, value: 0, target, unit });
  }

  itemDialog.close();
  render();
});

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    if (button.dataset.page === "today") return;
    const titles = {
      goals: ["Zielübersicht", "Eine eigene Seite für Ziele, gemeinsame Ziele und Meilensteine folgt als Nächstes."],
      calendar: ["Kalender", "Termine, Erinnerungen und Routinen werden später an einem Ort verbunden."],
      work: ["Arbeitszeiten", "Start, Pause, Feierabend und Überstunden kommen in einem eigenen Modul."]
    };
    openInfo(...titles[button.dataset.page]);
  });
});

document.querySelector("#profileButton").addEventListener("click", () => {
  openInfo("Profil & Freunde", "Profil, Datenschutz, Freundesliste, gemeinsame Ziele und Bestenlisten sind bereits für spätere Versionen eingeplant.");
});

document.querySelector("#closeInfo").addEventListener("click", () => document.querySelector("#infoDialog").close());

function openInfo(title, text) {
  document.querySelector("#infoTitle").textContent = title;
  document.querySelector("#infoText").textContent = text;
  document.querySelector("#infoDialog").showModal();
}

function formatNumber(value) {
  return Number(value).toLocaleString("de-DE");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
