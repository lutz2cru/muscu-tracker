// Accueil (séance du jour ou autre séance) et séance en cours avec saisie des séries.
import { currentWorkout, startWorkout, saveSet, finishWorkout, lastSetsFor } from './storage.js';
import { advice, kg } from './progress.js';
import { initTimer, startTimer, addTime, stopTimer, keepAwake, releaseAwake } from './timer.js';

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const app = document.getElementById('app');
let program;
let itemsByEx = {}; // exercice -> item de la séance en cours

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

const SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const sessionName = k => esc(program.sessions[k].name);
const countSets = items => items.reduce((n, i) => n + i.sets, 0);

// Semaine du lundi au dimanche, avec une pastille par séance prévue.
function weekStrip(today) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((today + 6) % 7));
  return [1, 2, 3, 4, 5, 6, 0].map((day, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const keys = sessionsForDay(day);
    const dots = keys.length
      ? keys.map(k => `<i class="dot ${k}"></i>`).join('')
      : '<i class="dot off"></i>';
    return `<div class="d ${day === today ? 'today' : ''}">${SHORT[day]}<b>${date.getDate()}</b><span class="dots">${dots}</span></div>`;
  }).join('');
}

function renderHome() {
  const day = new Date().getDay();
  const todays = sessionsForDay(day);
  const rawDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  let hero;
  if (todays.length) {
    const groups = todays.map(k => ({ k, items: itemsFor(k, day) }));
    const nbEx = groups.reduce((n, g) => n + g.items.length, 0);
    const nbSets = groups.reduce((n, g) => n + countSets(g.items), 0);
    const list = groups.map(g =>
      (todays.length > 1 ? `<li class="group ${g.k}">${sessionName(g.k)}</li>` : '') +
      g.items.map(i => `<li><span>${esc(program.exercises[i.exercise].name)}</span><span class="tag">${i.sets} × ${i.reps}</span></li>`).join('')
    ).join('');
    const c2 = todays[1] ? `--c2: var(--${todays[1]})` : '';
    hero = `
      <section class="hero ${todays[0]}" style="${c2}">
        <p class="label">Séance du jour</p>
        <h2>${todays.map(sessionName).join(' + ')}</h2>
        <p class="summary meta">${nbEx} exercices · ${nbSets} séries · repos ${program.rest_seconds / 60} min</p>
        <ul class="ex-list">${list}</ul>
        <button class="btn btn-primary" data-start="${todays.join(',')}">Commencer la séance</button>
      </section>`;
  } else {
    hero = `
      <section class="hero rest" style="--accent: var(--border)">
        <p class="label">Aujourd'hui</p>
        <h2>Pas de muscu prévue</h2>
        <p class="summary meta">Jour de handball ou de repos. Tu peux quand même lancer une séance ci-dessous.</p>
      </section>`;
  }

  const others = Object.keys(program.sessions).map(k => {
    const days = program.sessions[k].days.map(d => DAYS[d]).join(', ');
    return `<button class="choice ${k}" data-start="${k}">
        <span class="bar"></span>
        <span class="txt"><strong>${sessionName(k)}</strong><span class="meta">${days}</span></span>
        <span class="chev">›</span>
      </button>`;
  }).join('');

  app.innerHTML = `
    <header class="home-head">
      <p class="eyebrow">${dateLabel}</p>
      <h1>Muscu Tracker</h1>
    </header>
    <div class="week">${weekStrip(day)}</div>
    <p class="legend">${Object.keys(program.sessions).map(k => `<span class="${k}"><i class="dot"></i>${sessionName(k)}</span>`).join('')}</p>
    ${hero}
    <h3 class="section-title">${todays.length ? 'Autre séance' : 'Choisir une séance'}</h3>
    <div class="choices">${others}</div>`;
}

function setRow(item, n, saved, prev, lastSet) {
  const v = saved || {};
  // Charge préremplie : celle de la même série la dernière fois, sinon celle de la série précédente.
  const weight = v.weight ?? lastSet?.weight ?? prev?.weight ?? '';
  const reps = v.reps ?? '';
  const failureBox = n > 1
    ? `<label class="fail"><input type="checkbox" data-f ${v.failure ? 'checked' : ''}><span>échec</span></label>` : '<span></span>';
  return `
    <div class="set ${saved ? 'done' : ''}" data-ex="${item.exercise}" data-n="${n}">
      <span class="num">${n}</span>
      <input data-w type="text" inputmode="decimal" placeholder="kg" value="${weight}" aria-label="Charge série ${n}">
      <input data-r type="text" inputmode="numeric" placeholder="${item.reps}" value="${reps}" aria-label="Reps série ${n}">
      ${failureBox}
      <button class="btn ok" data-save aria-label="Valider la série ${n}">${saved ? '✓' : 'OK'}</button>
    </div>`;
}

const fmtDate = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
};

// Rappel de la dernière séance et, si elle a rempli l'objectif, la charge conseillée.
function lastBlock(item, last) {
  if (!last) return '<p class="last">Première fois : choisis une charge pour faire le bas de la fourchette.</p>';
  const chips = last.sets.map(s =>
    `<span class="chip ${s.failure ? 'fail' : ''}">${kg(s.weight)} × ${s.reps}</span>`).join('');
  const a = advice(item, last.sets);
  const up = a?.status === 'ready'
    ? `<p class="advice ready">⬆ Objectif atteint la dernière fois : passe à <b>${kg(last.sets[0].weight + 2)} – ${kg(last.sets[0].weight + 2.5)} kg</b>.</p>` : '';
  return `<p class="last">Dernière fois · ${fmtDate(last.date)} ${chips}</p>${up}`;
}

// Conseil en direct pendant la séance, recalculé à chaque série validée.
function updateAdvice(w, exercise) {
  const el = app.querySelector(`.exercise[data-ex="${exercise}"] .advice.live`);
  if (!el) return;
  const a = advice(itemsByEx[exercise], w.sets.filter(s => s.exercise === exercise));
  el.hidden = !a;
  el.className = `advice live ${a?.status === 'ready' ? 'ready' : ''}`;
  el.textContent = a ? a.text : '';
}

// Compteurs : séries faites par exercice, progression globale, exercice en cours.
function refreshStatus(w) {
  let done = 0, total = 0, activeSet = false;
  app.querySelectorAll('.exercise').forEach(card => {
    const item = itemsByEx[card.dataset.ex];
    const n = w.sets.filter(s => s.exercise === item.exercise && s.number <= item.sets).length;
    done += n; total += item.sets;
    const complete = n >= item.sets;
    card.querySelector('.badge').textContent = complete ? '✓' : `${n}/${item.sets}`;
    card.classList.toggle('complete', complete);
    card.classList.toggle('active', !complete && !activeSet);
    if (!complete) activeSet = true;
  });
  app.querySelector('.progress .fill').style.width = `${total ? (100 * done / total) : 0}%`;
  app.querySelector('.progress .meta').textContent = `${done}/${total} séries`;
}

function renderWorkout(w) {
  itemsByEx = {};
  const blocks = w.sessions.map(k => {
    const exercises = itemsFor(k, w.day).map(item => {
      const ex = program.exercises[item.exercise];
      itemsByEx[item.exercise] = item;
      const last = lastSetsFor(item.exercise, w.id);
      let prev = null;
      const rows = [];
      for (let n = 1; n <= item.sets; n++) {
        const saved = w.sets.find(s => s.exercise === item.exercise && s.number === n);
        rows.push(setRow(item, n, saved, prev, last?.sets.find(s => s.number === n)));
        prev = saved || prev;
      }
      return `<article class="exercise ${k}" data-ex="${item.exercise}">
        <div class="ex-head"><h3>${esc(ex.name)}<span class="target">${item.sets} séries × ${item.reps} reps</span></h3><span class="badge"></span></div>
        <p class="cue">${esc(ex.cue)}</p>
        ${lastBlock(item, last)}
        <div class="sets-head"><span>#</span><span>kg</span><span>reps</span><span></span><span></span></div>
        ${rows.join('')}
        <p class="advice live" hidden></p>
      </article>`;
    }).join('');
    const title = w.sessions.length > 1 ? `<h2 class="group-title ${k}">${sessionName(k)}</h2>` : '';
    return title + exercises;
  }).join('');
  const names = w.sessions.map(k => `<span class="${k}">${sessionName(k)}</span>`).join(' + ');
  app.innerHTML = `
    <header class="wk-head">
      <div class="wk-row"><h1>${names}</h1><button class="btn btn-quiet" data-finish>Terminer</button></div>
      <div class="progress"><div class="track"><div class="fill"></div></div><span class="meta"></span></div>
    </header>
    ${blocks}
    <button class="btn btn-primary finish ${w.sessions[0]}" data-finish>Terminer la séance</button>`;
  Object.keys(itemsByEx).forEach(ex => updateAdvice(w, ex));
  refreshStatus(w);
}

function render() {
  const w = currentWorkout();
  if (w) { renderWorkout(w); keepAwake(); } else renderHome();
}

// Barre du chrono, fixée en bas de l'écran.
const bar = document.getElementById('timer');
let timerTotal = 0;
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// r : secondes restantes, négatif quand le repos est dépassé (affiché en +m:ss).
function renderTimer(r) {
  if (r === null) { bar.hidden = true; return; }
  bar.hidden = false;
  timerTotal = Math.max(timerTotal, r, program.rest_seconds);
  const over = r <= 0;
  bar.classList.toggle('over', over);
  bar.querySelector('.t-label').textContent = over ? 'Repos terminé · Go !' : 'Repos';
  bar.querySelector('.time').textContent = over ? `+${fmt(-r)}` : fmt(r);
  bar.querySelector('.t-fill').style.width = `${100 * Math.max(0, r) / timerTotal}%`;
  bar.querySelector('[data-skip]').textContent = over ? 'OK' : 'Passer';
}

function restart(seconds) {
  timerTotal = seconds;
  startTimer(seconds);
}

bar.addEventListener('click', e => {
  if (e.target.closest('[data-more]')) { timerTotal += 30; addTime(30); }
  if (e.target.closest('[data-skip]')) stopTimer();
});

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
    stopTimer();
    releaseAwake();
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
    const w = currentWorkout();
    updateAdvice(w, row.dataset.ex);
    refreshStatus(w);
    row.classList.add('done');
    btn.textContent = '✓';
    restart(program.rest_seconds);
    // Préremplit la charge de la série suivante si elle est vide.
    const card = row.closest('.exercise');
    if (card.classList.contains('complete')) {
      // Exercice terminé : on amène le suivant à l'écran.
      app.querySelector('.exercise.active')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
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
    initTimer(renderTimer);
    render();
  } catch (err) {
    app.innerHTML = '<p>Impossible de charger le programme. Lance le site avec <code>python -m http.server 8000</code>.</p>';
    console.error(err);
  }
}

main();
