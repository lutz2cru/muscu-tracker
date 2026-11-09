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
- Étape 4 faite : chrono de repos (`src/timer.js`), lancé à chaque série validée. Reste à confirmer sur un vrai téléphone que les bips sonnent écran verrouillé.
- Étape 5 faite : rappel de la dernière séance par exercice (charge préremplie) et conseil de progression (`src/progress.js`).
- En ligne : https://lutz2cru.github.io/muscu-tracker/ (GitHub Pages, publié à chaque push sur `main`).
- Prochaines étapes : 6, utilisation réelle pendant une semaine ; retravailler l'interface pour qu'elle soit agréable pour d'autres utilisateurs. Le MVP est complet.

## Idées à ne pas oublier
- Chrono écran verrouillé : un fichier audio (silence + bips) est lancé au clic, car le JS est suspendu écran verrouillé. La vibration ne marche que sur Android (pas sur iPhone).
- Wake Lock (écran gardé allumé) exige HTTPS ou localhost : il ne marche pas en testant sur le téléphone via http://IP-du-PC:8000 ; il marchera sur GitHub Pages.
- Progression généralisée à la fourchette de reps : haut de la fourchette en série 1, au moins le bas ensuite (8-10 => 10 puis >= 8 ; cible fixe 15 => 15 partout).
