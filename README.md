# APEX

> **Physics Driving Simulation** -- Interface cockpit motorsport dark-first avec generation procedurale de circuits, physique Cannon.js et rendu Three.js.

[![Build](https://img.shields.io/badge/build-webpack-blue)](https://webpack.js.org/)
[![TypeScript](https://img.shields.io/badge/typescript-3.9.9-blue)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/three.js-0.113.0-black)](https://threejs.org/)

---

## Vue d'ensemble

APEX est une simulation de conduite 3D immersive concue comme une experience cockpit : precise, responsive et minimale.

### Caracteristiques principales

- **Conduite physique** -- Simulation Cannon.js avec vehicule realiste
- **Circuits proceduraux** -- Generation infinie avec parametres configurables
- **Design System APEX** -- Interface cockpit motorsport, dark-first
- **Persistance locale** -- IndexedDB pour preferences et favoris
- **Responsive** -- Adaptation mobile avec HUD redimensionne
- **Accessible** -- Navigation clavier, ARIA labels

---

## Demarrage rapide

### Prerequis

- Node.js >= 14
- npm >= 6

### Installation

```bash
npm install
```

### Developpement

```bash
npm run dev
```
Serveur de developpement local : `http://localhost:8080`

### Production

```bash
npm run build
```
Le bundle optimise est genere dans `build/simple_car.min.js`

---

## Architecture du projet

```
├── build/                    # Bundle Webpack optimise
│   ├── assets/car.glb       # Modele 3D du vehicule
│   └── simple_car.min.js   # Bundle principal
├── src/
│   ├── css/
│   │   └── style.css        # Design System APEX complet
│   ├── ts/
│   │   ├── main.ts          # Orchestration monde/scene/entrees
│   │   ├── core/
│   │   │   └── AppStorage.ts # Persistance IndexedDB (idb v8)
│   │   ├── world/
│   │   │   ├── ProceduralTrack.ts      # Facade piste procedurale
│   │   │   └── track/
│   │   │       ├── trackTypes.ts       # Types et interfaces
│   │   │       ├── trackGeometry.ts    # Geometrie Three.js
│   │   │       ├── trackGeneration.ts  # Algorithme generation
│   │   │       ├── trackValidation.ts  # Validation courbure
│   │   │       ├── trackCurvature.ts   # Analyse geometrique
│   │   │       ├── trackKerbs.ts       # Bordures et vibreurs
│   │   │       └── trackSpatial.ts     # Helpers spatiaux
│   │   ├── vehicles/        # Vehicule, roues, modeles
│   │   └── ui/              # Composants interface
│   └── lib/                 # Librairies tierces (Cannon.js, shaders)
├── scripts/
│   └── test-trackgen.js     # Suite de tests deterministes (406 cas)
├── index.html               # Application principale
├── design_language.md       # Documentation Design System
└── app-progress.md          # Journal des sprints
```

---

## Commandes disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de developpement avec hot-reload |
| `npm run build` | Build production optimise |
| `npm run test:trackgen` | Tests de generation procedurale (406 cas) |
| `npx tsc --noEmit` | Verification types TypeScript |

---

## Generation procedurale

Le systeme de generation procedurale supporte :

- **5 presets de difficulte** : Facile, Moyen, Difficile, Expert, Vraiment difficile
- **6 parametres configurables** :
  - `complexity` -- Nombre de points de controle (3-20)
  - `scale` -- Rayon de base des courbes (50-150m)
  - `chaos` -- Variation aleatoire des rayons (0-100%)
  - `twist` -- Variation angulaire (0-100%)
  - `width` -- Largeur de piste (12-30m)
  - `seed` -- Graine deterministe pour reproduction

- **Favoris** -- Sauvegarde jusqu'a 10 circuits personnalises
- **Budget de generation** -- Jusqu'a 500 tentatives avant fallback circulaire

---

## Persistance des donnees

`AppStorage` gere 4 magasins IndexedDB via la librairie `idb` :

| Magasin | Contenu | Capacite |
|---------|---------|----------|
| `user-prefs` | Vehicule choisi, mode/niveau, theme | 1 entree |
| `track-config` | Sliders de generation, preset difficulte | 1 entree |
| `saved-circuits` | Circuits favoris (nom, seed, parametres) | 10 max |
| `sessions` | Historique temps au tour, duree | 50 dernieres |

Restauration asynchrone au chargement sans blocage du rendu initial.

---

## Design System

### Direction esthetique
- Interface **tactique motorsport**, monochrome, angulaire, inspiree HUD
- **Personnalite** : technique, rapide, compacte, immersive
- **Anti-cibles** : dashboard SaaS generique, cartes blanches, gradients bleu/violet

### Themes
- **Sombre** (defaut) -- Fond `#050505`, UI blanc translucide
- **Clair** -- Variante `#eef1ec` avec inversion des tokens
- Commutation instantanee, persistance `localStorage`, respect `prefers-color-scheme`

### Typographie
- **Rajdhani** -- Titres, donnees telemetrie (chiffres tabulaires)
- **Inter** -- Labels, texte utilitaire

Documentation complete : `design_language.md`

---

## Tests

### Suite de tests piste
```bash
npm run test:trackgen
```

Couverture actuelle :
- **406 cas** testes -- presets, min/milieu/max de tous les sliders, combinaisons fuzz
- **80 seeds** avec parametres maximum (complexity=20, scale=150, chaos/twist=100%, width=30)
- Validation deterministe : memes seeds = memes circuits

### Verification TypeScript
> **Note** : `npx tsc --noEmit` est actuellement bloque par incompatibilite entre `typescript@3.9.9` et definitions `@types/node` / `undici-types` recentes. Le build Webpack fonctionne normalement.

---

## Stack technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Three.js | 0.113.0 | Rendu 3D WebGL |
| Cannon.js | -- | Physique vehicule |
| TypeScript | 3.9.9 | Typage statique |
| Webpack | 4.46.0 | Bundling |
| idb | 8.0.3 | Wrapper IndexedDB |
| Rajdhani / Inter | -- | Typographie |

---

## Roadmap

- [x] Architecture modulaire piste procedurale
- [x] Persistance IndexedDB avec 4 magasins
- [x] Theme clair/sombre avec toggle accessible
- [x] Collisions kerbs et bordures
- [x] Tests deterministes 406 cas
- [ ] Mode multijoueur (WebRTC)
- [ ] IA de conduite (recherche de trajectoire)
- [ ] Edition de circuit manuel
- [ ] Leaderboard global

---

## Journal de developpement

Les sprints realises sont documentes dans `app-progress.md` :

| Sprint | Date | Focus |
|--------|------|-------|
| persistence-indexeddb | 2026-05-23 | Persistance locale via IndexedDB |
| modular-track-architecture | 2026-05-23 | Decoupage modulaire piste (1284 -> 13 lignes facade) |
| theme-toggle-ux | 2026-05-23 | Theme clair/sombre accessible |
| trackgen-max-settings-seeds | 2026-05-22 | Stabilisation 80 seeds max-settings |
| track-edge-lines-kerb-collisions | 2026-05-22 | Bordures et collisions kerbs |

---

## Licence

MIT -- Voir `package.json`
