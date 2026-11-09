# Muscu Tracker

Application web mobile pour suivre un programme de musculation Push/Pull (+ bloc jambes) autour d'un planning de handball. Propriétaire : Matthias. Langue de l'interface et de la doc : français.

## Où lire quoi
- `docs/plan.md` : objectif, versions, modèle de données, écrans, étapes.
- `data/program.json` : source de vérité du programme (séances, exercices, règles). Ne pas dupliquer son contenu dans le code.

## Règles de travail
- Avancer étape par étape selon `docs/plan.md` ; une étape = un commit avec son critère de fin vérifié.
- Pas de framework ni de bundler pour le MVP : HTML, CSS, JavaScript en modules ES.
- Mobile d'abord : gros boutons, saisie numérique, thème sombre, utilisable d'une main.
- Données sur l'appareil (localStorage puis IndexedDB). Aucun serveur avant la V3.
- Le programme se modifie dans `data/program.json`, pas dans le code.
- Jours : 0 = dimanche ... 6 = samedi (convention `Date.getDay()`).
- Ne jamais perdre une série saisie : sauvegarder à chaque validation.

## Lancer en local
`python -m http.server 8000` à la racine, puis ouvrir http://localhost:8000 (le `fetch` de program.json ne marche pas en ouvrant le fichier directement).

## État actuel
- Étapes 1 à 3 faites : accueil (séance du jour + autre séance), saisie des séries sauvegardée dans localStorage (clé `muscu.v1`, voir `src/storage.js`).
- Prochaine étape : 4, chrono de repos 2 min.

## Idées à ne pas oublier
- Chrono de repos : prévoir un son et la vibration ; vérifier le comportement écran verrouillé.
- Progression : 10 reps en série 1 et au moins 8 sur les suivantes => proposer +2 à 2,5 kg.
