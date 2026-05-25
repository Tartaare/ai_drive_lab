# APEX

> **Physics Driving Simulation** -- Interface cockpit motorsport dark-first avec generation procedurale de circuits, physique Cannon.js et rendu Three.js.

[![Build](https://img.shields.io/badge/build-vite-646cff)](https://vite.dev/)
[![React](https://img.shields.io/badge/react-18.3.1-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.4.5-blue)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/three.js-0.159.0-black)](https://threejs.org/)

---

## Vue d'ensemble

APEX est une simulation de conduite 3D immersive concue comme une experience cockpit : precise, responsive et minimale.

### Caracteristiques principales

- **Showroom automobile** -- Menu principal avec preview vehicule 3D glossy Drei, circuit top-down et entree reglages vehicule
- **Conduite physique** -- Simulation Cannon.js avec vehicule realiste
- **Circuits proceduraux** -- Generation infinie avec parametres configurables
- **Design System APEX** -- Interface cockpit motorsport, dark-first
- **Persistance locale** -- IndexedDB pour preferences et favoris
- **Responsive** -- Adaptation mobile avec HUD redimensionne
- **Accessible** -- Navigation clavier, ARIA labels

---

## Demarrage rapide

### Prerequis

- Node.js >= 18
- npm >= 9

### Installation

```bash
npm install
```

### Developpement

```bash
npm run dev
```
Serveur de developpement local : `http://127.0.0.1:8080`

### Production

```bash
npm run build
```
Le build optimise est genere dans `dist/`.

---

## Architecture du projet

```
├── dist/                     # Build Vite optimise
│   ├── assets/              # Chunks JS/CSS produits par Vite
│   └── index.html           # Entree production
├── src/
│   ├── css/
│   │   ├── style.css        # Point d'entree CSS modulaire
│   │   ├── base/            # Tokens et layout global
│   │   ├── showroom/        # Shell, modes, vehicule, circuit
│   │   └── components/      # Controles, HUD, settings, loader, favoris
│   ├── ts/
│   │   ├── main.ts          # Facade API moteur World / Three.js / Cannon.js
│   │   ├── react/           # Shell React, showroom, HUD, settings
│   │   ├── core/
│   │   │   └── AppStorage.ts # Persistance IndexedDB (idb v8)
│   │   ├── world/
│   │   │   ├── worldCore/   # Modules internes World : bootstrap, input, piste, runtime
│   │   │   ├── ProceduralTrack.ts      # Facade piste procedurale
│   │   │   └── track/
│   │   │       ├── trackTypes.ts       # Types et interfaces
│   │   │       ├── trackGeometry.ts    # Geometrie Three.js
│   │   │       ├── trackGeneration.ts  # Algorithme generation
│   │   │       ├── trackValidation.ts  # Validation courbure
│   │   │       ├── trackCurvature.ts   # Analyse geometrique
│   │   │       ├── trackKerbs.ts       # Bordures et vibreurs
│   │   │       └── trackSpatial.ts     # Helpers spatiaux
│   │   ├── vehicles/        # Facade SimpleCar, roues, modeles
│   │   │   └── simpleCar/   # Modules internes SimpleCar : runtime, transmission, controles
│   │   └── ui/              # Helpers UI partages
│   │       ├── SceneDebugPanel.ts # Panneau debug F3
│   │       └── menu/
│   │           └── catalog.ts     # Catalogue vehicules, modes et circuits
│   └── lib/                 # Librairies tierces (Cannon.js, shaders)
├── scripts/
│   └── test-trackgen.js     # Suite de tests deterministes (406 cas)
├── index.html               # Shell React + theme anti-flash
├── vite.config.mts          # Configuration Vite ESM
├── design_language.md       # Documentation Design System
└── app-progress.md          # Journal des sprints
```

---

## Commandes disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de developpement avec hot-reload |
| `npm run build` | Build production optimise |
| `npm run typecheck` | Verification TypeScript sans emission |
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
```bash
npm run typecheck
```

La verification TypeScript passe avec TypeScript 5 et la configuration TSX React.

---

## Stack technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Three.js | 0.159.0 | Rendu 3D WebGL |
| React Three Fiber | 8.17.x | Scene 3D React du showroom |
| Drei | 9.122.x | Sol glossy `MeshReflectorMaterial` et environnement showroom |
| Cannon.js | -- | Physique vehicule |
| React | 18.3.1 | UI declarative |
| TypeScript | 5.4.5 | Typage statique |
| Vite | 5.4.x | Dev server et build |
| idb | 8.0.3 | Wrapper IndexedDB |
| Rajdhani / Inter | -- | Typographie |

---

## Roadmap

- [x] Showroom automobile avec previews 3D (vehicule + circuit) et sous-vue reglages vehicule
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
| showroom-vehicle-settings-entry | 2026-05-25 | Acces reglages vehicule dans le Showroom React |
| react-vite-modernization | 2026-05-24 | Migration React/Vite, installation npm et validations |
| showroom-main-menu | 2026-05-23 | Refonte menu showroom automobile avec previews 3D |
| persistence-indexeddb | 2026-05-23 | Persistance locale via IndexedDB |
| modular-track-architecture | 2026-05-23 | Decoupage modulaire piste (1284 -> 13 lignes facade) |
| theme-toggle-ux | 2026-05-23 | Theme clair/sombre accessible |
| trackgen-max-settings-seeds | 2026-05-22 | Stabilisation 80 seeds max-settings |
| track-edge-lines-kerb-collisions | 2026-05-22 | Bordures et collisions kerbs |

---

## Licence

MIT -- Voir `package.json`
