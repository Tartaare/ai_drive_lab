# Système de génération de circuit procédural

Ce document décrit le fonctionnement du **système de génération de circuit procédural** intégré au projet.

## Où est le code ?

- **Génération + construction de la géométrie Three.js** : `src/ts/world/ProceduralTrack.ts`
- **Intégration dans le jeu (choix de map / régénération / spawn / reset)** : `src/ts/main.ts` (classe `World`)
- **UI (sliders + bouton “Nouveau circuit”)** : `index.html`

## 1) Données et paramètres

### `TrackConfig`
Définit les paramètres de génération :

- `numControlPoints` : nombre de points de contrôle (recommandé 6–20)
- `baseRadius` : rayon de base du circuit
- `radiusVariation` : variation aléatoire du rayon (0–1)
- `angleVariation` : variation aléatoire de l’angle (0–1)
- `trackWidth` : largeur de la route
- `sampleCount` : nombre de points échantillonnés le long de la spline (plus élevé = plus lisse)
- `seed?` : seed optionnelle (permet la reproductibilité)

Une config par défaut existe dans :

- `defaultTrackConfig` (dans `ProceduralTrack.ts`)

### `TrackData`
Résultat de la génération :

- `centerPoints` : points échantillonnés du centre de la route (boucle fermée)
- `leftBorder` / `rightBorder` : bords de route calculés à partir de `centerPoints`
- `startLineIndex` : index de référence pour la ligne de départ (actuellement `0`)
- `curve` : `THREE.CatmullRomCurve3` (spline)

## 2) Algorithme de génération (résumé)

La génération se fait dans `generateTrack(config)`.

### Étape A — RNG déterministe
Une classe `SeededRandom` produit un pseudo-aléatoire reproductible à partir de `seed`.

### Étape B — Création des points de contrôle
`generateControlPoints(config, rng)` :

- place `numControlPoints` points autour d’un cercle
- applique :
  - une variation d’angle (contrôlée par `angleVariation`)
  - une variation de rayon (contrôlée par `radiusVariation`)

Ces points sont en `y=0` (plan XZ).

### Étape C — Spline fermée
On crée une spline fermée via :

- `new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.5)`

Puis on échantillonne `sampleCount` points :

- `curve.getPoints(sampleCount)`
- on retire le dernier point (qui duplique le premier sur une courbe fermée)

### Étape D — Auto-intersections
Le système vérifie l’absence d’auto-intersections **en 2D (X/Z)**.

- `segmentsIntersect(p1,p2,p3,p4)` : test de croisement de segments
- `hasSelfIntersection(points)` : compare les segments non adjacents

Si le centre s’auto-intersecte, on retente.

### Étape E — Calcul des bords de route
`computeTrackBorders(centerPoints, trackWidth)` :

- calcule une tangente lissée par point (différence `next - prev`)
- calcule la normale en XZ : `(-tangent.z, 0, tangent.x)`
- place :
  - `left = center + normal * (trackWidth/2)`
  - `right = center - normal * (trackWidth/2)`

Puis on vérifie que **les bords** ne s’auto-intersectent pas non plus.

### Étape F — Boucle d’essais + fallback
`generateTrack` tente jusqu’à `maxAttempts` variantes (en ajustant la seed via `seed + attempt`).

- Si aucune piste valide n’est trouvée, fallback sur une piste circulaire : `generateCircularTrack(config)`.

## 3) Construction de la géométrie (Three.js)

La fonction `createTrackObject(trackData)` construit un `THREE.Group` contenant :

- **Mesh route** :
  - `BufferGeometry` avec 2 sommets par point (gauche/droit)
  - indices pour triangles entre le point `i` et `i+1` (wrap modulo)
  - `MeshStandardMaterial` gris foncé

- **Lignes** (`THREE.Line`) :
  - bord gauche (blanc)
  - bord droit (blanc)
  - ligne centrale (jaune)
  - ligne de départ (rouge) entre `leftBorder[startLineIndex]` et `rightBorder[startLineIndex]`

## 4) Intégration dans le jeu (`World`)

### Sélection de la map
Dans `World.setLevel(levelId)` :

- `levelId === 'procedural'` :
  - `buildProceduralTrack()` : génère un `TrackData` à partir de `proceduralConfig + proceduralSeed`
  - stocke `proceduralTrackData`
  - ajoute le `THREE.Group` à la scène

- sinon :
  - charge le circuit GLB par défaut

### Paramétrage en runtime
Le `World` expose :

- `setProceduralParameter(key, value)` : met à jour la config et regénère si on est sur la map procédurale
- `randomizeProceduralSeed()` : change la seed et regénère
- `getProceduralConfig()` : permet à l’UI de synchroniser les sliders

### Spawn et reset (touche R)
Le spawn est centralisé via `getSpawnPosition()` :

- en procédural : utilise `centerPoints[startLineIndex]`
- sinon : position par défaut

La touche `R` réutilise cette même méthode (cohérence spawn initial / reset).

## 5) UI (paramètres joueur)

Dans `index.html` :

- panneau `#procedural-controls` :
  - sliders : points, rayon, variations, largeur
  - bouton “🔄 Nouveau circuit” (seed aléatoire)

- le panneau est visible uniquement quand la map sélectionnée est `procedural`.

## 6) Points d’attention / limitations actuelles

- La route procédurale est **principalement visuelle** : la physique du véhicule repose sur le sol (plan). Il n’y a pas encore de colliders dédiés pour les bordures.
- `startLineIndex` est actuellement fixé à `0`.
- Le système évite les auto-intersections du centre et des bords, mais il n’impose pas (encore) de contraintes supplémentaires (pentes, banking, checkpoints, etc.).
