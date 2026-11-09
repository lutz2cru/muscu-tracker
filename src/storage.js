// Sauvegarde locale (localStorage). Chaque appel écrit immédiatement : rien ne se perd si l'écran se ferme.
const KEY = 'muscu.v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Lecture des données impossible', e);
  }
  return { workouts: [], current: null };
}

function save(db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function localDate(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function currentWorkout() {
  const db = load();
  return db.workouts.find(w => w.id === db.current) || null;
}

export function startWorkout(sessions, day) {
  const db = load();
  const w = { id: uid(), date: localDate(), day, sessions, startedAt: new Date().toISOString(), sets: [] };
  db.workouts.push(w);
  db.current = w.id;
  save(db);
  return w;
}

// Crée ou met à jour une série (clé : exercice + numéro de série).
export function saveSet(workoutId, { exercise, number, weight, reps, failure }) {
  const db = load();
  const w = db.workouts.find(x => x.id === workoutId);
  if (!w) throw new Error('Séance introuvable');
  const existing = w.sets.find(s => s.exercise === exercise && s.number === number);
  const data = { exercise, number, weight, reps, failure, at: new Date().toISOString() };
  if (existing) Object.assign(existing, data);
  else w.sets.push({ id: uid(), ...data });
  save(db);
}

export function finishWorkout() {
  const db = load();
  const w = db.workouts.find(x => x.id === db.current);
  if (w) {
    w.finishedAt = new Date().toISOString();
    // Une séance sans aucune série validée n'est pas gardée.
    if (!w.sets.length) db.workouts = db.workouts.filter(x => x !== w);
  }
  db.current = null;
  save(db);
}

// Séries d'un exercice lors de la dernière séance (hors séance en cours) où il a été fait.
export function lastSetsFor(exercise, excludeId) {
  const db = load();
  for (let i = db.workouts.length - 1; i >= 0; i--) {
    const w = db.workouts[i];
    if (w.id === excludeId) continue;
    const sets = w.sets.filter(s => s.exercise === exercise).sort((a, b) => a.number - b.number);
    if (sets.length) return { date: w.date, sets };
  }
  return null;
}
