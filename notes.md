### NOTES ###

Nouvelle branche pour cette mission (respecte les règles).


Dans menu principal > scene 3D:

Vu qu'on dispose maintenant de R3F et Drei on va pouvoir moderniser le design de notre app. D'abord le menu principal:

https://github.com/pmndrs/examples/tree/main/demos/






===================== DONE =====================



Dans menu principal > vehicule info:
Lors d'un changement de vehicule:
1. Animer les scores. Il faut que les nombres défilent de la valeur précédente à la nouvelle valeur.
2. Animer les barres de statistique: on veut un remplissage dynamique et fluide des jauges selon la différence de stats entre les deux véhicules. Il ne faut pas remplir de 0 à la nouvelle valeur à chaque changement, mais remplir/vider de la valeur actuelle jusqu'à la nouvelle valeur.


On travaille sur le menu principal, je te joint un screenshot du menu actuel pour que tu comprennes mieux.
Modifications:

1. Recule la caméra véhicule: la voiture est beaucoup trop proche et donc "grande" dans l'UI.

2. Le zoom sur le véhicule ne marche plus, corrige !

3. La lumière projetée sur le véhicule n'est pas assez élégante

4. Pour le sol: je t'ai joint une image pour que tu comprenes le sol glossy que je veux.

5. Il faut la même marge/espace en dessous et au dessus du bouton "start engine"




2. Corriger le contraste du texte: plusieurs textes deviennent illisibles sur le fond.

3.  réaliste, le contour au sol crée un cercle blanc trop "brut". Regarde la doc Three.js ou des exemples en ligne pour trouver une lumière appropriée au rendu studio/showroom premium.

4. Le sol doit être glossy comme sur l'image jointe.

5. Le nom du véhicule doit s'adapter pour n'occuper qu'une seule ligne.

6. Les flèches pour changer de voiture doivent être plus proches du nom du véhicule + centrées verticalement par rapport au nom.

7. Dans les stats de véhicule:
- enlève le dégradé dans la jauge.
- affiche le score sans "/100" et met le au bout de la jauge.
- les flèches vertes/rouyges suffisent pour comprendre l'écart de stats entre deux véhicules, pas besoin d'écrire le nombre d'écart.
- assure toi que les textes de stats, score, etc soient alignés correctement.



Ce qu’il faut modifier:

1. Hiérarchie visuelle:
Renforcer clairement : voiture → CTA → stats → mode → circuit.
Actuellement l’œil hésite entre la voiture, la preview circuit et les gros blocs noirs.
Position du CTA:
Mettre Start Engine en bas centre, plus large, plus lumineux et plus dominant.
Le CTA est actuellement dans la colonne droite, donc il ressemble à une action secondaire.

2. Fond trop vide:
Actuellement on a la voiture dans un prévisualiseur au centre avec des bordures. Ce qu'il faudrait c'est que la "scène" de la voiture occupe la totalité de l’ecran et que les menus soient par dessus comme des overlays. (voir image joinnte)
Actuellement au sol dans le prévisualiseur de voiture on voit un rectangle, enlève le.
On veut un vrai rendu studio avec éclairage pro et sol studio glossy frosted avec contact shadow et reflet léger.

3. Panneau modes:
Donner plus de poids au mode actif visuellement.
L’état sélectionné est visible mais encore trop proche d’un bouton debug.

4. Preview circuit:
Transformer la preview en vraie mini-map stylisée avec ligne de départ, direction.
Le tracé actuel est lisible mais trop rudimentaire pour un jeu premium.

5. Stats véhicule:
Uniformiser les unités de mesure en score entre 1 et 100. Avoir des km/h, des poids, etc. mélangés rendait la lecture difficile.

6. Espacement global:
Aligner tous les blocs sur une grille stricte.
Certains éléments flottent correctement, mais l’ensemble manque encore de précision “AAA”.

7. Flèches carousel:
- Les rapprocher du nom du véhicule & aligner avec le nom du véhicule.
- Les agrandir, et ne pas les mettre dans un conteneur visible.

8. Bords et panels:
Remplacer les rectangles filaires par des surfaces plus travaillées : blur, transparence, gradients, bevels subtils.

9. Animations d’entrée:
Un menu premium doit avoir une apparition contrôlée : voiture, panels, CTA, stats.

10. Transitions véhicule:
Le changement de voiture doit être fluide : slide ou swap animé.

11. Comparaison de stats vehicule:
Afficher brièvement les variations en vert/rouge ou avec flèches lors du changement de véhicule. Pour qu’on puisse comparer facilement les stats de deux véhicules lors du changement de voiture.

12. Chargement 3D propre	Skeleton:
Afficher un spinner discret ou silhouette pendant le chargement du modèle.
Fallback véhicule	Si le modèle 3D échoue, afficher une silhouette ou une carte véhicule propre.

13. Toggle thème:
Plutot qu'un toggle switch, utilise un bouton animé comme dans l'image jointe.




On va refondre le menu principal pour lui donner un design type showroom automobile minimaliste, élégant et interactif. On veut une UX plus premium, centrée sur le choix du véhicule, du mode de jeu et du circuit.

Implémentation attendue :

1. Layout général
- Créer un menu principal en 3 zones :
  - Haut gauche : logo + titre de l’app, petit et discret.
  - Gauche : sélection du mode de jeu.
  - Centre : sélecteur de véhicule principal.
  - Droite : prévisualisation du circuit.
  - Bas centre : CTA principal “Start Engine”.
- Le design doit être minimaliste, lisible, responsive, avec une hiérarchie visuelle claire.
- La voiture doit être l’élément dominant de l’écran.

2. Logo / titre
- Déplacer le logo + nom de l’app en haut à gauche.
- Réduire sa taille (alignée avec le bouton de thème)
- Style sobre : pas de gros header central.

3. Sélecteur de véhicule central
- Ajouter un carousel de véhicules.
- Au centre: une prévisualisation 3D du véhicule sélectionné.
- Le véhicule doit tourner lentement sur lui-même. L’utilisateur doit pouvoir le faire tourner avec la souris / pointer drag.
- Si le modèle 3D possède des animations, jouer l’animation principale en boucle.
- Afficher le véhicule sur un sol glossy / frosted.
- La couleur du sol doit dépendre du thème courant de l’application.
- Prévoir un fallback propre si le modèle 3D n’est pas disponible.

4. Infos véhicule
- Sous la voiture, afficher :
  - nom du véhicule
  - caractéristiques principales
- Caractéristiques recommandées :
  - vitesse max
  - accélération
  - maniabilité
  - freinage
  - poids
  - adhérence
- Utiliser une présentation lisible : jauges + valeurs numériques courtes.
- Chaque véhicule doit avoir ses propres stats.
- Les stats doivent être définies dans une structure de données claire et extensible.

5. Navigation carousel
- Ajouter une flèche à gauche et une flèche à droite du nom du véhicule. Les flèches changent le véhicule sélectionné.
- Transition courte entre véhicules : slide latéral dans la direction de la flèche utilisée. Le véhicule suivant doit apparaître progressivement depuis l'extérieur de l'écran.

6. Modes de jeu à gauche
- Remplacer le dropdown “select track” par des boutons de mode.
- Exemples :
  - Free roam (procedural actuel)
  - Contre la montre (grand prix actuel)
  - AI (grisé car actuellement indisponible, on implémentera plus tard)
- Le mode actif doit être clairement visible.

7. Prévisualisation circuit à droite
- Afficher une preview du circuit sélectionné.
- Pour un circuit existant : miniature top-down.
- Pour le mode procédural :
  - afficher la preview du circuit généré
  - ajouter un bouton “New Track” pour relancer la génération.
- Afficher des infos utiles sur le circuit :
  - longueur
  - difficulté
  - seed si pertinent
- La preview circuit ne doit pas concurrencer visuellement la voiture centrale.

8. CTA principal
- Placer un gros bouton “Start Engine” en bas centre.
- Il doit être le call-to-action principal (états hover, focus, pressed et disabled).
- Désactiver le bouton si aucune combinaison valide véhicule/mode/circuit n’est sélectionnée.
- Au clic, lancer la partie avec :
  - véhicule sélectionné
  - mode sélectionné
  - circuit sélectionné ou généré

9. UX / polish à ajouter
- Ajouter support responsive : desktop prioritaire, mais layout propre sur écrans plus petits.
- Ajouter focus states visibles pour accessibilité.
- Ajouter loading state pour modèles 3D et génération de circuit.
- Ajouter empty/error states propres.
- Précharger le véhicule suivant/précédent si possible.
- Mémoriser la dernière sélection utilisateur si l’app a déjà un système de persistance.

10. Contraintes techniques
- Garder le code maintenable et extensible pour ajouter facilement de nouveaux véhicules, modes, circuits,  etc.




On améliorer l'UX en ajoutant le choix d'activer un thème sombre / clair pour l'app. L'utilisateur pourra ainsi choisir si il souhaite une ambiance sombre ou claire.
UI: dans le menu principal en haut à droite on va ajouter un bouton animé de changement de thème.
Pense à mettre à jour/respecter le design language.




La doc promet plus que le code !
Le fichier [circuit_generation.md](circuit_generation.md) décrit une version “APEX v2” assez ambitieuse : ligne de départ verrouillée, grammaire de segments, QAReport, validation de courbure, clearance, surface 3D, difficulté gameplay, kerbs physiques.

Mais le code ne respecte pas encore parfaitement cette promesse.

1. Les seuils de rayon ne correspondent pas à la spec

La doc annonce des rayons minimums par preset : 22 m, 16 m, 12 m, 9 m, 7 m.

Le code, lui, retourne :

facile: 4.0
moyen: 3.5
difficile: 3.0
expert: 2.5
vraiment_difficile: 2.0

Puis il prend Math.max(threshold, trackWidth * 0.55), ce qui reste très inférieur aux valeurs annoncées.

Conséquence : la validation de rayon existe, mais elle est beaucoup trop permissive. Le circuit peut encore produire des virages physiquement agressifs tout en étant accepté.

2. Le score de difficulté est calculé mais pas réellement utilisé pour rejeter

La doc dit que le circuit est rejeté si le score de difficulté sort de la plage du preset.

Dans le code, calculateDifficultyScore est appelé, qaReport.difficultyScore est rempli, puis qaReport.accepted = true est mis sans comparaison avec une plage cible.

Conséquence : les presets ne garantissent pas encore une vraie difficulté. Ils influencent la génération, mais ils ne filtrent pas strictement le résultat final.

3. La droite de départ est meilleure, mais la garantie est contournée

Le code cherche bien une ligne droite stricte de 40 m avec flèche orthogonale ≤ 0,25 m et déviation locale ≤ 3°.

Mais si aucune portion valide n’est trouvée, il accepte quand même le circuit avec findFallbackStartIndex, basé sur le point au Z le plus bas.

Conséquence : la spec dit “spawn garanti sur vraie droite”, mais le code dit plutôt “on essaie, sinon fallback”. Ce n’est pas mauvais pour éviter un blocage du générateur, mais il faut le refléter dans le QAReport : hasValidStartStraight devrait être false, et le circuit devrait éventuellement être rejeté selon le mode strict.

4. Le QAReport est présent mais incomplet

straightCount, longestStraight et hasValidStartStraight existent dans le rapport, mais je ne vois pas leur alimentation réelle dans la validation. Ils sont initialisés, mais pas mis à jour avant acceptation.

Conséquence : le rapport QA donne une impression d’observabilité plus complète qu’elle ne l’est réellement.

5. La “grammaire de segments” reste une perturbation locale

La doc parle de grammaire : hairpin, chicane, esses, sweeper, straight.

Le code contient bien une logique insertMidpoints avec ces types, mais elle reste attachée à des midpoints sur une enveloppe/hull.

Conséquence : c’est mieux qu’avant, mais ce n’est pas encore une vraie génération par intention de tracé. On a encore principalement :

forme globale -> perturbations typées -> spline -> validation

Pas encore :

séquence de sections pilotables -> géométrie contrainte -> validation gameplay

Point positif notable : les kerbs

Là, l’amélioration est concrète. Avant, les kerbs étaient surtout décoratifs. Maintenant :

SurfaceType inclut bien 'kerb'.
kerb a un facteur de friction 0.92.
la voiture applique une force verticale oscillante quand elle détecte un kerb.

C’est une bonne direction. Je nuancerais seulement deux choses :

performance.now() dans une simulation physique peut rendre le comportement moins déterministe que si la vibration dépendait du temps de simulation.
Une force verticale directe sur le body est simple, mais un peu brute ; à terme, mieux vaudrait l’appliquer via les roues/suspensions ou comme modulation de suspension.

Priorités suivantes:
Corriger getMinRadiusThreshold pour utiliser les vrais seuils de la spec : 22, 16, 12, 9, 7 m.
Faire appliquer les plages de difficulté au lieu de seulement calculer difficultyScore.
Remplir réellement straightCount, longestStraight, hasValidStartStraight.
Décider si l’absence de ligne droite stricte est un warning ou un rejet. Aujourd’hui c’est un warning déguisé en acceptation.
Ajouter des tests de seeds fixes, par exemple 20 seeds par preset, avec export des QAReports.
Aligner les noms de difficulté : la doc parle de FACILE / MOYEN / DIFFICILE / EXPERT / CAUCHEMAR, le code utilise notamment vraiment_difficile. Il faut éviter ces divergences. On va plutot utiliser des niveaux: 1 étant le plus facile et 5 le plus difficile.






1. Pour les bords du circuit on a déjà des kerbs placés procéduralement. J'aimerai ajouter une bordure type ligne blanche tout le long des bords du circuit (la largeur de la ligne doit être plus fine que les kerbs).
2. Actuellement les kerbs n'ont pas de collision (les roues passent à travers). Je pense qu'ils devraient avoir une collision.



- On va améliorer/modifier le systeme de génération de circuits procéduraux. Voici les étapes pour créer un circuit valide:

    1. Générer des points de contrôle 2D
    2. Les ordonner en boucle
    3. Les espacer / repousser s’ils sont trop proches
    4. Ajouter quelques points intermédiaires déplacés pour créer des virages
    5. Corriger les angles trop serrés
    6. Lisser avec CatmullRomCurve3 centripetal
    7. Rééchantillonner par distance régulière
    8. Construire les bords gauche/droite
    9. Rejeter le circuit s’il échoue aux tests
    10. Recommencer avec la même seed + tentative suivante

Pourquoi ce système:

L’approche “points aléatoires → convex hull → espacement → déformation → spline → mesh” est une méthode classique et simple pour générer des circuits. Il est recommandé de partir d’une représentation facile à visualiser plutôt que d’utiliser du bruit ou des systèmes plus abstraits, puis de construire un polygone, repousser les points trop proches, ajouter des points intermédiaires perturbés, corriger les angles trop fermés, et enfin appliquer une spline Catmull-Rom pour lisser le circuit.

Three.js supporte déjà CatmullRomCurve3 avec courbe fermée et types centripetal, chordal ou catmullrom. Le type centripetal est le choix le plus sûr ici, car il limite mieux les boucles et les artefacts quand les points de contrôle sont irrégulièrement espacés.

Une autre idée utile pour ce projet : détecter les virages à partir de l’angle entre trois points de contrôle pour placer des kerbs.

Architecture concrète à viser
1. Garder une spline fermée
Le projet utilise déjà Three.js, donc il faut renforcer le système actuel plutôt que le remplacer par une architecture externe.

2. Remplacer la génération radiale par une génération “hull + perturbation”

Au lieu de placer les points autour d’un cercle avec un rayon variable :

angle régulier + rayon aléatoire

faire plutôt :

points aléatoires dans une zone
→ convex hull
→ insertion de midpoints perturbés
→ pushApart
→ fixAngles

Résultat attendu : circuits moins circulaires, plus variés, avec des lignes droites, des virages larges, des virages serrés et des formes concaves contrôlées.

3. Ajouter une validation simple

Chaque candidat doit être rejeté si :

longueur < minLength
longueur > maxLength
angle trop serré
courbure trop forte
bord gauche/droit s’intersecte
distance entre deux portions non adjacentes trop faible
ligne droite de départ introuvable

Ce n’est pas une optimisation lourde. C’est juste du generate-and-test, beaucoup plus simple.

4. Attribuer niveaux selon la difficulté des circuits : facile, moyen, difficile, difficile, vraiment difficile.

5. Rééchantillonner par distance

Ne pas dépendre uniquement de getPoints(sampleCount). Pour la conduite, la surface, les checkpoints et la progression, il faut des points espacés régulièrement en mètres.

Système final recommandé

Le meilleur système serait donc :

Controlled Spline Track Generator
= Convex/concave hull
+ midpoint perturbation
+ point spacing correction
+ angle correction
+ centripetal Catmull-Rom spline
+ arc-length resampling
+ simple validation metrics
+ difficulty profiles


Tu es un game developper senior, QA senior, designer frontend et critique de jeu et design. Tu as le regard d'un designer Apple, la rigueur et la créativité d'un ingénieur senior chez Epic Games. Tu ne valides pas — tu certifies.
Voici un projet permettant de conduire une voiture sur un circuit procédural.
On veut améliorer le systeme de génération de circuit.
Analyse le et fais des propositions d'ameliorations.
