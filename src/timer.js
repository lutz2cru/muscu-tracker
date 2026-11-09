// Chrono de repos.
// Écran verrouillé, le JavaScript d'une page est mis en pause : on ne peut pas compter sur setTimeout.
// Stratégie :
//  1. un fichier audio généré (silence de la durée du repos puis bips) lancé au clic : la lecture
//     d'un média continue écran verrouillé, donc les bips sonnent à l'heure ;
//  2. Wake Lock pour empêcher l'écran de se mettre en veille pendant la séance (si le navigateur le permet) ;
//  3. vibration (Android) et bips Web Audio quand la page est visible ;
//  4. la fin est stockée en horodatage : au retour sur la page ou après rechargement, l'affichage est juste.
const KEY = 'muscu.timer';
const RATE = 8000;

let audio = null;
let audioUrl = null;
let tick = null;
let wakeLock = null;
let awakeWanted = false;
let onChange = () => {};

function readEnd() {
  const v = Number(localStorage.getItem(KEY));
  return v > 0 ? v : null;
}

// WAV 8 bits mono : `silence` secondes de silence puis 3 bips à 880 Hz.
function buildWav(silence) {
  const beep = 0.25, gap = 0.15, count = 3;
  const n = Math.round(RATE * (silence + count * (beep + gap)));
  const buf = new Uint8Array(44 + n);
  const dv = new DataView(buf.buffer);
  const str = (o, s) => [...s].forEach((c, i) => buf[o + i] = c.charCodeAt(0));
  str(0, 'RIFF'); dv.setUint32(4, 36 + n, true); str(8, 'WAVEfmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, RATE, true); dv.setUint32(28, RATE, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  str(36, 'data'); dv.setUint32(40, n, true);
  buf.fill(128, 44);
  const start = Math.round(RATE * silence);
  for (let b = 0; b < count; b++) {
    const s0 = start + Math.round(RATE * b * (beep + gap));
    for (let i = 0; i < RATE * beep; i++) buf[44 + s0 + i] = 128 + Math.round(100 * Math.sin(2 * Math.PI * 880 * i / RATE));
  }
  return new Blob([buf], { type: 'audio/wav' });
}

// Doit être appelé pendant un geste utilisateur (clic), sinon le navigateur bloque la lecture.
function armAudio(seconds) {
  stopAudio();
  audioUrl = URL.createObjectURL(buildWav(Math.max(0, seconds)));
  audio = new Audio(audioUrl);
  audio.play().catch(err => console.warn('Lecture audio refusée', err));
}

function stopAudio() {
  if (audio) { audio.pause(); audio = null; }
  if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
}

function alarm() {
  navigator.vibrate?.([400, 200, 400, 200, 400]);
  // Si le fichier audio n'a pas pu jouer (ex. après rechargement), bips via Web Audio.
  if (!audio || audio.paused) {
    try {
      const ctx = new AudioContext();
      [0, 0.4, 0.8].forEach(t => {
        const o = ctx.createOscillator();
        o.frequency.value = 880;
        o.connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.25);
      });
    } catch { /* pas de son possible */ }
  }
}

export async function keepAwake() {
  awakeWanted = true;
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* refusé (batterie faible, page non sécurisée...) */ }
}

export function releaseAwake() {
  awakeWanted = false;
  wakeLock?.release();
  wakeLock = null;
}

export function remaining() {
  const end = readEnd();
  return end ? Math.max(0, Math.ceil((end - Date.now()) / 1000)) : null;
}

function loop() {
  clearInterval(tick);
  tick = setInterval(() => {
    const r = remaining();
    if (r === null) { clearInterval(tick); return; }
    if (r === 0) {
      clearInterval(tick);
      localStorage.removeItem(KEY);
      alarm();
    }
    onChange(r);
  }, 250);
}

export function startTimer(seconds) {
  localStorage.setItem(KEY, String(Date.now() + seconds * 1000));
  armAudio(seconds);
  keepAwake();
  loop();
  onChange(seconds);
}

export function addTime(seconds) {
  const r = remaining();
  if (r === null) return;
  startTimer(r + seconds);
}

export function stopTimer() {
  localStorage.removeItem(KEY);
  clearInterval(tick);
  stopAudio();
  onChange(null);
}

// À appeler au chargement : reprend un chrono en cours (ex. après rechargement).
export function initTimer(listener) {
  onChange = listener;
  const r = remaining();
  if (r !== null) { loop(); onChange(r); }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (awakeWanted) keepAwake(); // le Wake Lock est relâché quand la page est cachée
    const end = readEnd();
    if (end && end <= Date.now()) { localStorage.removeItem(KEY); alarm(); onChange(0); }
  });
}
