// Règle de progression (docs/plan.md) : haut de la fourchette en série 1 et au moins le bas
// de la fourchette sur les suivantes => +2 à 2,5 kg. Pour "8-10" : 10 reps en série 1, >= 8 ensuite.
// Pour une cible fixe ("15") il faut la cible sur toutes les séries.

export function repRange(reps) {
  const [a, b] = String(reps).split('-').map(Number);
  return { min: a, max: b || a };
}

export const kg = n => String(Math.round(n * 10) / 10).replace('.', ',');

// sets : séries validées d'un exercice. Renvoie { status, text } ou null s'il n'y a rien à dire.
//  status "ready"   : objectif atteint sur toutes les séries => augmenter la prochaine fois
//  status "on_track": série 1 au haut de la fourchette, reste à tenir les suivantes
export function advice(item, sets) {
  const { min, max } = repRange(item.reps);
  const byNum = n => sets.find(s => s.number === n);
  const first = byNum(1);
  if (!first || first.reps < max) return null;
  const others = [];
  for (let n = 2; n <= item.sets; n++) others.push(byNum(n));
  if (others.some(s => s && s.reps < min)) return null;
  if (others.some(s => !s)) {
    return { status: 'on_track', text: `${max} reps en série 1 : tiens au moins ${min} sur les suivantes pour monter la charge.` };
  }
  const w = first.weight;
  return { status: 'ready', text: `Objectif atteint : la prochaine fois, passe à ${kg(w + 2)} – ${kg(w + 2.5)} kg.` };
}
