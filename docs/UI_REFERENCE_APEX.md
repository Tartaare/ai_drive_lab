# UI Reference — APEX (Next Gen Racing)

Ce document est la **source unique** des noms d’éléments UI (IDs / classes) pour faciliter la communication design.

## Vue d’ensemble

- **[Rendu 3D]** `#game-container`
- **[Layer UI global]** `#ui-layer.ui-layer`
- **[Pages / Overlays]**
  - **Loading**: `#loading.loader-overlay`
  - **Main Menu**: `#main-menu.menu-overlay`
  - **Pause Menu**: `#pause-overlay.menu-overlay`
- **[HUD in-game]**
  - **Telemetry Cluster**: `#hud-cluster.hud-cluster`
  - **Controls Hint**: `#controls-hint.controls-hint`
- **[Panels / Tools]**
  - **Settings Toggle Button**: `#toggle-settings.settings-toggle`
  - **Settings Side Panel**: `#settings-panel.settings-panel`

---

## 1) Rendu 3D (Canvas / Game)

### Conteneur
- **ID**: `game-container`
- **Sélecteur**: `#game-container`
- **Rôle**: Conteneur destiné au canvas Three.js (le moteur injecte généralement un `<canvas>` ici).
- **Notes**:
  - Le CSS met ce conteneur en plein écran (layer de fond).

---

## 2) Layer UI global

### Conteneur UI
- **ID**: `ui-layer`
- **Classe**: `ui-layer`
- **Sélecteur**: `#ui-layer.ui-layer`
- **Rôle**: Contient toutes les pages/overlays et le HUD.
- **Comportement**:
  - `pointer-events: none` sur le conteneur.
  - Les éléments interactifs (boutons, selects, panel) doivent avoir `pointer-events: auto` (c’est le cas des principaux contrôles).

---

## 3) Page — Loading

### Overlay loading
- **ID**: `loading`
- **Classe**: `loader-overlay`
- **Sélecteur**: `#loading.loader-overlay`
- **Rôle**: Écran de chargement plein écran.

#### Enfants
- **Titre**: `<h3>` inline (pas d’ID)
- **Bar container**: `.loader-bar`
- **Bar animation**: `.loader-progress`

#### États
- **Visible**: par défaut
- **Masqué**: via la classe `.hidden` ajoutée en JS

---

## 4) Page — Main Menu

### Overlay menu principal
- **ID**: `main-menu`
- **Classe**: `menu-overlay hidden`
- **Sélecteur**: `#main-menu.menu-overlay`
- **Rôle**: Menu d’entrée (sélection circuit + démarrage).

#### Enfants
- **Bloc titre**: `.title-container`
  - **Titre**: `.main-title` (texte “APEX”)
  - **Sous-titre**: `.subtitle`

- **Grille actions**: `.menu-grid`
  - **Label**: `.slider-label` (inline styles)
  - **Select circuit**:
    - **ID**: `main-menu-level-select`
    - **Classe**: `cyber-select`
    - **Sélecteur**: `#main-menu-level-select.cyber-select`
    - **Valeurs**:
      - `default`
      - `procedural`

  - **Bouton start**:
    - **ID**: `start-game`
    - **Classe**: `cyber-btn`
    - **Sélecteur**: `#start-game.cyber-btn`

#### États
- **Masqué initialement**: `hidden` (retiré après le loading)

---

## 5) Page — Pause Menu

### Overlay pause
- **ID**: `pause-overlay`
- **Classe**: `menu-overlay hidden`
- **Sélecteur**: `#pause-overlay.menu-overlay`
- **Rôle**: Menu pause (ESC)

#### Enfants
- **Titre**: `<h1>` inline (pas d’ID)
- **Grille actions**: `.menu-grid`
  - **Bouton resume**:
    - **ID**: `resume-game`
    - **Classe**: `cyber-btn`
    - **Sélecteur**: `#resume-game.cyber-btn`
  - **Bouton abort / retour menu**:
    - **ID**: `back-to-menu`
    - **Classe**: `cyber-btn`
    - **Sélecteur**: `#back-to-menu.cyber-btn`

#### États
- **Masqué** par défaut via `hidden`
- **Toggle** via `Escape`

---

## 6) HUD — Telemetry Cluster

### Cluster global
- **ID**: `hud-cluster`
- **Classe**: `hud-cluster hidden`
- **Sélecteur**: `#hud-cluster.hud-cluster`
- **Rôle**: Regroupe vitesse + jauge RPM + rapport.

#### Bloc vitesse
- **Conteneur**: `.speed-container`
- **Valeur vitesse**:
  - **ID**: `speed-value`
  - **Classe**: `speed-value`
  - **Sélecteur**: `#speed-value.speed-value`
- **Unité vitesse**: `.speed-unit` (texte “KM/H”)

#### Bloc RPM + Gear
- **Conteneur jauge**: `.gauge-container`
- **SVG**: `<svg>` (pas d’ID)
  - **Arc background**:
    - **Classe**: `rpm-circle-bg`
    - **Sélecteur**: `.rpm-circle-bg`
  - **Arc dynamique**:
    - **ID**: `rpm-arc`
    - **Classe**: `rpm-circle-fill`
    - **Sélecteur**: `#rpm-arc.rpm-circle-fill`
    - **État redline**: classe `redline` ajoutée/retirée en JS

- **Gear**
  - **Conteneur**: `.gear-indicator`
  - **Valeur gear**:
    - **ID**: `gear-value`
    - **Sélecteur**: `#gear-value`
  - **Label gear**:
    - **Classe**: `.gear-label`

#### États
- **Masqué** par défaut: `hidden`
- **Affiché** au lancement du jeu: retrait de `hidden`

---

## 7) HUD — Controls Hint

### Panneau hints
- **ID**: `controls-hint`
- **Classe**: `controls-hint hidden`
- **Sélecteur**: `#controls-hint.controls-hint`
- **Rôle**: Rappels des touches (bas gauche)

#### Items
Chaque item est un:
- **Groupe**: `.key-group`
  - **Touches**: `.key-icon` (1 ou plusieurs)
  - **Description**: `.key-desc`

Touches visibles:
- **Throttle/Brake**: `W` + `S`
- **Steer**: `A` + `D`
- **Handbrake**: `SPACE`
- **Reset**: `R`

#### États
- **Masqué** par défaut: `hidden`
- **Affiché** au lancement du jeu: retrait de `hidden`

---

## 8) Tooling — Settings Toggle

### Bouton toggle settings
- **ID**: `toggle-settings`
- **Classe**: `settings-toggle hidden`
- **Sélecteur**: `#toggle-settings.settings-toggle`
- **Rôle**: Ouvre/ferme le panneau latéral settings.
- **Icon**: `<svg>` inline (pas d’ID)

#### États
- **Masqué** par défaut: `hidden`
- **Affiché** au lancement du jeu (puis potentiellement caché si level != procedural).

---

## 9) Panel — Settings (Procedural)

### Conteneur panneau
- **ID**: `settings-panel`
- **Classe**: `settings-panel`
- **Sélecteur**: `#settings-panel.settings-panel`
- **Rôle**: Configuration du circuit procédural.

#### États
- **Fermé** par défaut: panneau hors écran (CSS transform)
- **Ouvert**: classe `active` ajoutée (`.settings-panel.active`)

### Header
- **Conteneur**: `.settings-header`
- **Titre**: `<h3>` (pas d’ID)
- **Bouton fermer**:
  - **ID**: `close-settings`
  - **Classe**: `close-btn`
  - **Sélecteur**: `#close-settings.close-btn`

### Actions
- **Bouton regenerate**:
  - **ID**: `proc-regenerate`
  - **Classe**: `cyber-btn`
  - **Sélecteur**: `#proc-regenerate.cyber-btn`
  - **Rôle**: `world.randomizeProceduralSeed()`

### Sliders (proc)
Chaque slider est un `.slider-group` contenant:
- **Label row**: `.slider-label`
- **Value badge**: `.slider-value` (+ un ID dédié)
- **Input**: `<input type="range">` (+ un ID dédié)

#### Slider: numControlPoints
- **Input ID**: `proc-numControlPoints`
- **Value ID**: `proc-numControlPoints-value`
- **Param world**: `numControlPoints`

#### Slider: baseRadius
- **Input ID**: `proc-baseRadius`
- **Value ID**: `proc-baseRadius-value`
- **Param world**: `baseRadius`

#### Slider: radiusVariation
- **Input ID**: `proc-radiusVariation`
- **Value ID**: `proc-radiusVariation-value`
- **Param world**: `radiusVariation` (valeur UI 0..100 -> world 0..1)

#### Slider: angleVariation
- **Input ID**: `proc-angleVariation`
- **Value ID**: `proc-angleVariation-value`
- **Param world**: `angleVariation` (valeur UI 0..100 -> world 0..1)

#### Slider: trackWidth
- **Input ID**: `proc-trackWidth`
- **Value ID**: `proc-trackWidth-value`
- **Param world**: `trackWidth`

---

## 10) États / Classes globales (CSS)

### `.hidden`
- **Utilisation**: état “non visible / non interactif”
- **Effets**:
  - `opacity: 0 !important`
  - `pointer-events: none !important`
  - `visibility: hidden`

### `.menu-overlay`
- **Utilisation**: pages full-screen (main menu, pause)
- **Transition**: `transition: all 0.6s var(--ease-smooth)`

### `.settings-panel.active`
- **Utilisation**: panneau latéral ouvert
- **Effet**: `transform: translateX(0)` (sinon off-screen)

### `.rpm-circle-fill.redline`
- **Utilisation**: sur-régime
- **Effet**: stroke rouge + glow

---

## 11) Triggers (JS) — Table de correspondance

- **Loading -> Main Menu**
  - **Action**: `ui.loading.classList.add('hidden')`
  - **Action**: `ui.mainMenu.classList.remove('hidden')`

- **Start session** (`#start-game`)
  - **Action**: `new SimpleCar.World('car_models/car_blue.glb', level)`
  - **UI**: cache `#main-menu`, affiche `#hud-cluster`, `#controls-hint`, `#toggle-settings`

- **Pause** (`Escape`)
  - **Toggle**: `#pause-overlay.hidden` add/remove

- **Settings panel**
  - **Toggle button**: `#toggle-settings` => toggle `.active` sur `#settings-panel`
  - **Close**: `#close-settings` => retire `.active`

- **Procedural regenerate**
  - **Button**: `#proc-regenerate` => `world.randomizeProceduralSeed()` + refresh UI

- **Sliders**
  - **Input**: `input` event => `world.setProceduralParameter(param, value)` + update text

---

## 12) Notes importantes (pour communication design)

- **“Page”** = overlay plein écran (`#loading`, `#main-menu`, `#pause-overlay`).
- **“HUD”** = éléments in-game non plein écran (`#hud-cluster`, `#controls-hint`, `#toggle-settings`, `#settings-panel`).
- Les styles principaux sont attachés aux classes:
  - Boutons: `.cyber-btn`
  - Selects: `.cyber-select`
  - Overlays: `.menu-overlay`
  - Sliders: `.slider-group`, `.slider-label`, `.slider-value`

