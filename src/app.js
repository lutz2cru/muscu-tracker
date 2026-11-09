// Accueil (séance du jour ou autre séance) et séance en cours avec saisie des séries.
import { currentWorkout, startWorkout, saveSet, finishWorkout } from './storage.js';

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const app = document.getElementById('app');
let program;

async function loadProgram() {
  const res = await fetch('data/program.json');
  return res.json();
}

// Séances prévues ce jour, une séance avec "after" passe après celle qu'elle suit.
function sessionsForDay(day) {
  const keys = Object.keys(program.sessions).filter(k => program.sessions[k].days.includes(day));
  return keys.sort((a, b) => (program.sessions[a].after === b ? 1 : program.sessions[b].after === a ? -1 : 0));
}

// Exercices d'une séance pour un jour. Hors de ses jours, on garde toutes les variantes.
function itemsFor(key, day) {
  const s = program.sessions[key];
  const planned = s.days.includes(day);
  return s.items.filter(i => !i.only_days || !planned || i.only_days.includes(day));
}

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderHome() {
  const day = new Date().getDay();
  const todays = sessionsForDay(day);
  const cards = todays.map(k => {
    const li = itemsFor(k, day).map(i =>
      `<li>${esc(program.exercises[i.exercise].name)} <span class="meta">${i.sets} × ${i.reps}</span></li>`).join('');
    return `<section class="session ${k}"><h2>${esc(program.sessions[k].name)}</h2><ul>${li}</ul></section>`;
  }).join('');
  const others = Object.keys(program.sessions).map(k =>
    `<button class="btn ghost ${k}" data-start="${k}">${esc(program.sessions[k].name)}</button>`).join('');

  app.innerHTML = `
    <h1>Muscu Tracker</h1>
    <p class="meta">Aujourd'hui : ${DAYS[day]}</p>
    ${todays.length
      ? cards + `<button class="btn primary" data-start="${todays.join(',')}">Commencer</button>`
      : '<p class="meta">Pas de séance prévue aujourd\'hui (handball ou repos).</p>'}
    <h3>Autre séance</h3>
    <div class="row">${others}</div>`;
}

function setRow(item, n, saved, prev) {
  const v = saved || {};
  const weight = v.weight ?? prev?.weight ?? '';
  const reps = v.reps ?? '';
  const failureBox = n > 1
    ? `<label class="fail"><input type="checkbox" data-f ${v.failure ? 'checked' : ''}> échec</label>` : '<span></span>';
  return `
    <div class="set ${saved ? 'done' : ''}" data-ex="${item.exercise}" data-n="${n}">
      <span class="num">${n}</span>
      <input data-w type="text" inputmode="decimal" placeholder="kg" value="${weight}" aria-label="Charge série ${n}">
      <input data-r type="text" inputmode="numeric" placeholder="${item.reps}" value="${reps}" aria-label="Reps série ${n}">
      ${failureBox}
      <button class="btn ok" data-save>${saved ? '✓' : 'OK'}</button>
    </div>`;
}

function renderWorkout(w) {
  const blocks = w.sessions.map(k => {
    const exercises = itemsFor(k, w.day).map(item => {
      const ex = program.exercises[item.exercise];
      let prev = null;
      const rows = [];
      for (let n = 1; n <= item.sets; n++) {
        const saved = w.sets.find(s => s.exercise === item.exercise && s.number === n);
        rows.push(setRow(item, n, saved, prev));
        prev = saved || prev;
      }
      return `<article class="exercise"><h3>${esc(ex.name)} <span class="meta">${item.sets} × ${item.reps}</span></h3>
        <p class="meta">${esc(ex.cue)}</p>${rows.join('')}</article>`;
    }).join('');
    return `<section class="session ${k}"><h2>${esc(program.sessions[k].name)}</h2>${exercises}</section>`;
  }).join('');
  app.innerHTML = `<h1>Séance en cours</h1>${blocks}
    <button class="btn primary" data-finish>Terminer la séance</button>`;
}

function render() {
  const w = currentWorkout();
  w ? renderWorkout(w) : renderHome();
}

app.addEventListener('click', e => {
  const start = e.target.closest('[data-start]');
  if (start) {
    startWorkout(start.dataset.start.split(','), new Date().getDay());
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (e.target.closest('[data-finish]')) {
    if (!confirm('Terminer la séance ?')) return;
    finishWorkout();
    render();
    window.scrollTo(0, 0);
    return;
  }
  const btn = e.target.closest('[data-save]');
  if (btn) {
    const row = btn.closest('.set');
    const weight = parseFloat(row.querySelector('[data-w]').value.replace(',', '.'));
    const reps = parseInt(row.querySelector('[data-r]').value, 10);
    if (!(weight >= 0) || !(reps > 0)) {
      row.classList.add('error');
      setTimeout(() => row.classList.remove('error'), 800);
      return;
    }
    const failure = !!row.querySelector('[data-f]')?.checked;
    saveSet(currentWorkout().id, { exercise: row.dataset.ex, number: Number(row.dataset.n), weight, reps, failure });
    row.classList.add('done');
    btn.textContent = '✓';
    // Préremplit la charge de la série suivante si elle est vide.
    const next = row.nextElementSibling;
    if (next?.classList.contains('set')) {
      const nw = next.querySelector('[data-w]');
      if (!nw.value) nw.value = weight;
      if (!next.classList.contains('done')) next.querySelector('[data-r]').focus();
    }
  }
});

// Une valeur modifiée après validation doit être revalidée.
app.addEventListener('input', e => {
  const row = e.target.closest('.set.done');
  if (row) { row.classList.remove('done'); row.querySelector('[data-save]').textContent = 'OK'; }
});

async function main() {
  try {
    program = await loadProgram();
    render();
  } catch (err) {
    app.innerHTML = '<p>Impossible de charger le programme. Lance le site avec <code>python -m http.server 8000</code>.</p>';
    console.error(err);
  }
}

main();
