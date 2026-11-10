// Garde l'écran allumé pendant une séance (Wake Lock : HTTPS ou localhost seulement).
let wakeLock = null;
let wanted = false;

export async function keepAwake() {
  wanted = true;
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* refusé (batterie faible, page non sécurisée...) */ }
}

export function releaseAwake() {
  wanted = false;
  wakeLock?.release();
  wakeLock = null;
}

// Le Wake Lock est relâché quand la page est cachée : on le redemande au retour.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wanted) keepAwake();
});
