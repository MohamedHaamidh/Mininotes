const NOTES_KEY = "mininotes.notes";
const THEME_KEY = "mininotes.theme";
const SAVE_DELAY = 400;

const homeView = document.querySelector("#home-view");
const editorView = document.querySelector("#editor-view");
const noteList = document.querySelector("#note-list");
const emptyState = document.querySelector("#empty-state");
const editorForm = document.querySelector("#editor-form");
const titleInput = document.querySelector("#note-title");
const bodyInput = document.querySelector("#note-body");
const saveStatus = document.querySelector("#save-status");
const themeToggle = document.querySelector("#theme-toggle");

let notes = [];
let selectedId = null;
let saveTimer = null;

function createId() {
  if (globalThis.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (note) =>
        note &&
        typeof note.id === "string" &&
        typeof note.title === "string" &&
        typeof note.body === "string"
    );
  } catch {
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  saveTimer = null;
  setStatus("Saved");
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light theme" : "Switch to dark theme"
  );
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
}

function sortedNotes() {
  return [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function previewText(body) {
  const text = body.replace(/\s+/g, " ").trim();
  if (!text) return "Empty note";
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
}

function formatEdited(timestamp) {
  if (!timestamp) return "Not edited yet";
  const formatted = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
  return `Edited ${formatted}`;
}

function playEnter(view) {
  view.classList.remove("is-entering");
  void view.offsetWidth;
  view.classList.add("is-entering");
}

function showHome() {
  editorView.hidden = true;
  homeView.hidden = false;
  renderHome();
  playEnter(homeView);
}

function showEditor() {
  homeView.hidden = true;
  editorView.hidden = false;
  renderEditor();
  playEnter(editorView);
}

function renderHome() {
  const ordered = sortedNotes();
  noteList.replaceChildren();
  const hasNotes = ordered.length > 0;
  noteList.hidden = !hasNotes;
  emptyState.hidden = hasNotes;

  for (const note of ordered) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "note-card";
    button.dataset.id = note.id;

    const title = document.createElement("span");
    title.className = "note-title";
    title.textContent = note.title.trim() || "Untitled";

    const snippet = document.createElement("span");
    snippet.className = "note-preview";
    snippet.textContent = previewText(note.body);

    const edited = document.createElement("time");
    edited.className = "note-date";
    if (note.updatedAt) edited.dateTime = new Date(note.updatedAt).toISOString();
    edited.textContent = formatEdited(note.updatedAt);

    button.append(title, snippet, edited);
    item.append(button);
    noteList.append(item);
  }
}

function renderEditor() {
  const note = notes.find((item) => item.id === selectedId) || null;
  if (!note) {
    showHome();
    return;
  }
  titleInput.value = note.title;
  bodyInput.value = note.body;
}

function createNote() {
  flushSave();
  const note = {
    id: createId(),
    title: "",
    body: "",
    updatedAt: Date.now(),
  };
  notes.push(note);
  selectedId = note.id;
  saveNotes();
  showEditor();
  titleInput.focus();
}

function selectNote(id) {
  if (!notes.some((note) => note.id === id)) return;
  flushSave();
  selectedId = id;
  showEditor();
  setStatus("Saved");
}

function backToNotes() {
  flushSave();
  selectedId = null;
  showHome();
}

function setStatus(text) {
  saveStatus.textContent = text;
}

function scheduleSave() {
  setStatus("Saving…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNotes, SAVE_DELAY);
}

function flushSave() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveNotes();
}

function updateNote(field, value) {
  const note = notes.find((item) => item.id === selectedId);
  if (!note) return;
  note[field] = value;
  note.updatedAt = Date.now();
  scheduleSave();
}

function deleteNote() {
  const note = notes.find((item) => item.id === selectedId);
  if (!note) return;
  const name = note.title.trim() || "Untitled";
  const confirmed = window.confirm(`Delete "${name}"? This cannot be undone.`);
  if (!confirmed) return;

  notes = notes.filter((item) => item.id !== selectedId);
  selectedId = null;
  clearTimeout(saveTimer);
  saveTimer = null;
  saveNotes();
  showHome();
}

noteList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  selectNote(button.dataset.id);
});

document.querySelector("#new-note").addEventListener("click", createNote);
document.querySelector("#empty-new-note").addEventListener("click", createNote);
document.querySelector("#back-button").addEventListener("click", backToNotes);
document.querySelector("#delete-note").addEventListener("click", deleteNote);
themeToggle.addEventListener("click", toggleTheme);

editorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  flushSave();
});

titleInput.addEventListener("input", () => {
  updateNote("title", titleInput.value);
});

bodyInput.addEventListener("input", () => {
  updateNote("body", bodyInput.value);
});

titleInput.addEventListener("blur", flushSave);
bodyInput.addEventListener("blur", flushSave);
window.addEventListener("pagehide", flushSave);

notes = loadNotes();
applyTheme(loadTheme());
showHome();
