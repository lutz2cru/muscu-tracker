# Plan du projet : application de suivi de musculation

Version de référence : le document en ligne « Plan du projet : application de suivi de musculation ».

## Objectif
Remplacer le carnet papier : afficher la séance du jour, enregistrer chaque série, dire quand augmenter la charge. Usage sur téléphone, une main, réseau faible.

## Programme (voir data/program.json)
Repris des fiches papier de Matthias (Séance 1 et Séance 2), abdos remplacés par un bloc jambes.
- Pecs, épaules, triceps (push) : lundi et jeudi
- Dos, biceps (pull) : mercredi et dimanche
- Bloc jambes : mercredi seulement, après le dos (dimanche = lendemain de match)
- Handball : mardi, vendredi, samedi (pas de musculation)
- Ajouts pour le handball : rotation externe d'épaule, face pull, leg curl assis, adducteurs.

## Règles d'entraînement
- 3 ou 4 séries par exercice (voir program.json), repos 2 min.
- Fourchette 8-12 reps en général, 12-15 pour élévations latérales, face pull, adducteurs.
- Séries suivantes : isolation à l'échec ; exercices lourds à 1-2 reps de l'échec.
- Progression : haut de la fourchette en série 1 et au moins le bas ensuite => +2 à 2,5 kg.
- Décharge toutes les 6 à 8 semaines (~60 % des charges, sans échec).

## Versions
| Version | Contenu | Données |
| --- | --- | --- |
| MVP | Programme préchargé, choix de séance, saisie charge/reps, rappel de la dernière séance, conseil de progression | Téléphone |
| V2 | Historique, courbes, export CSV, PWA, hors ligne | Téléphone |
| V3 | Édition du programme, notes par série, synchro | Serveur + base |

## Modèle de données
- Exercice : id, nom, type (heavy|isolation), note technique
- Modèle de séance : id, nom, jours, liste ordonnée d'exercices avec séries et reps cibles
- Séance réalisée : id, date, modèle utilisé
- Série : id, séance, exercice, numéro, charge (kg), reps, à l'échec (oui/non)

## Écrans
1. Accueil : séance du jour (selon le jour), possibilité d'en choisir une autre.
2. Séance en cours : exercices, 3 séries avec charge/reps préremplies, message de progression.
3. Historique : séances passées, courbes par exercice (V2).
Contraintes : gros boutons, saisie numérique rapide, thème sombre, rien ne se perd si l'écran se ferme.

## Stack
HTML/CSS/JS (modules ES, sans framework au départ), IndexedDB ou localStorage, PWA en V2, courbes avec Chart.js ou uPlot, serveur FastAPI + SQLite/PostgreSQL en V3, hébergement GitHub Pages.

## Étapes (critère de fin)
1. Cadrage : dépôt Git + program.json (3 séances et exercices). [FAIT]
2. Squelette : accueil avec la séance du jour. [FAIT]
3. Saisie d'une série, sauvegarde locale (survit au rechargement). [FAIT]
4. Chrono de repos 2 min. [RETIRÉ pour l'instant, à reprendre plus tard : voir commit 4e45e99]
5. Rappel dernière séance + message de progression (10 reps en série 1 déclenche le conseil). [FAIT]
6. Utilisation réelle une semaine, liste des frictions.
7. V2 : historique, courbes, export CSV, PWA hors ligne.
8. V3 : serveur FastAPI et synchro, si besoin confirmé.
