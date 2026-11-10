// Chrono de repos, mode « musique » : la musique (Spotify...) continue de jouer.
// Une page web ne peut pas sonner écran verrouillé sans couper la musique de l'iPhone :
// on choisit donc de garder la musique et l'écran allumé.
//  1. bips Web Audio en mode « ambient » : ils se mélangent à la musique au lieu de la couper
//     (sur iPhone, ils peuvent être muets en mode silencieux) ;
//  2. Wake Lock pour empêcher l'écran de se mettre en veille pendant la séance ;
//  3. vibration (Android seulement) ;
//  4. la fin est stockée en horodatage : au retour sur la page, le chrono affiche le dépassement.
const KEY = 'muscu.timer';
const MAX_OVER = 10 * 60; // au-delà de 10 min de dépassement, on range le chrono

let ctx = null;
let tick = null;
let rang = false;
let wakeLock = null;
let awakeWanted = false;
let onChange = () => {};

function readEnd() {
  const v = Number(localStorage.getItem(KEY));
  return v > 0 ? v : null;
}

// Doit être appelé pendant un geste utilisateur (clic) : iOS n'autorise le son qu'après un geste.
function unlockAudio() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'ambient'; // se mélange à la musique
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== 'running') ctx.resume();
    // Un son vide joué pendant le clic débloque définitivement le contexte sur iOS.
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start();
  } catch { /* pas de Web Audio */ }
}

async function alarm() {
  rang = true;
  navigator.vibrate?.([400, 200, 400, 200, 400]);
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== 'running') await ctx.resume();
    const t0 = ctx.currentTime + 0.05;
    [0, 0.4, 0.8].forEach(t => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t0 + t);
      g.gain.exponentialRampToValueAtTime(0.6, t0 + t + 0.01);
      g.gain.setValueAtTime(0.6, t0 + t + 0.22);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + t);
      o.stop(t0 + t + 0.26);
    });
  } catch { /* pas de son possible */ }
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

// Secondes restantes ; négatif = repos dépassé de tant de secondes ; null = pas de chrono.
export function remaining() {
  const end = readEnd();
  if (!end) return null;
  const ms = end - Date.now();
  return ms > 0 ? Math.ceil(ms / 1000) : -Math.floor(-ms / 1000);
}

function update() {
  const r = remaining();
  if (r === null) { clearInterval(tick); return; }
  if (r <= -MAX_OVER) { stopTimer(); return; }
  if (r <= 0 && !rang) alarm();
  onChange(r);
}

function loop() {
  clearInterval(tick);
  tick = setInterval(update, 250);
}

export function startTimer(seconds) {
  localStorage.setItem(KEY, String(Date.now() + seconds * 1000));
  rang = false;
  unlockAudio();
  keepAwake();
  loop();
  onChange(seconds);
}

export function addTime(seconds) {
  const r = remaining();
  if (r === null) return;
  startTimer(Math.max(0, r) + seconds);
}

export function stopTimer() {
  localStorage.removeItem(KEY);
  clearInterval(tick);
  onChange(null);
}

// À appeler au chargement : reprend un chrono en cours (ex. après rechargement).
export function initTimer(listener) {
  onChange = listener;
  const r = remaining();
  if (r !== null) {
    rang = r <= 0; // déjà fini avant le rechargement : pas de bip, juste le dépassement
    loop();
    update();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (awakeWanted) keepAwake(); // le Wake Lock est relâché quand la page est cachée
    update();
  });
}
