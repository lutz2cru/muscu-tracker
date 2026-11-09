// Étape 2 du plan : afficher la séance du jour à partir de data/program.json.
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

async function loadProgram() {
  const res = await fetch('data/program.json');
  return res.json();
}

function sessionsForDay(program, day) {
  return Object.entries(program.sessions).filter(([, s]) => s.days.includes(day));
}

function renderSession(program, key, session, day) {
  const items = session.items.filter(i => !i.only_days || i.only_days.includes(day));
  const li = items.map(i => {
    const ex = program.exercises[i.exercise];
    return `<li>${ex.name} <span class="meta">${i.sets} × ${i.reps}</span></li>`;
  }).join('');
  return `<section class="session ${key}"><h2>${session.name}</h2><ul>${li}</ul></section>`;
}

async function main() {
  const program = await loadProgram();
  const day = new Date().getDay();
  document.getElementById('today').textContent = `Aujourd'hui : ${DAYS[day]}`;
  const todays = sessionsForDay(program, day);
  document.getElementById('sessions').innerHTML = todays.length
    ? todays.map(([k, s]) => renderSession(program, k, s, day)).join('')
    : '<p class="meta">Pas de séance prévue aujourd\'hui (handball ou repos).</p>';
}

main();
