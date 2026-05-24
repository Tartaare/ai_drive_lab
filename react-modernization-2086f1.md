# Plan — Modernisation React APEX

Moderniser APEX vers une application React/Vite sans casser le moteur Three.js/Cannon en isolant d’abord la simulation, puis en migrant l’UI par couches validables.

## Contexte observé

- **Stack actuelle** : Webpack 4, TypeScript 3.9.9, bundle UMD `SimpleCar`, `index.html` avec 560+ lignes de DOM/script inline.
- **Moteur critique** : `src/ts/main.ts` expose `World`, manipule le canvas, la pause, les inputs clavier et la boucle de rendu.
- **UI actuelle** : menu showroom, HUD, panneau procedural, favoris et thème pilotés par IDs DOM + script inline.
- **Persistance** : `AppStorage` IndexedDB déjà découplé et à conserver.
- **Risque Git** : branche actuelle `feature/scene-debug-panel` avec `src/ts/ui/menu/VehiclePreview.ts` modifié ; à préserver avant toute migration.

## Architecture cible

- **Build** : remplacer Webpack par Vite + TypeScript moderne + React/ReactDOM, en gardant les chemins d’assets existants (`car_models`, `textures`, `race_tracks` si présent).
- **Entrée app** : `src/ts/main.ts` devient une API moteur importable, et un nouveau point d’entrée React monte l’interface dans `#root`.
- **Moteur 3D** : garder `World`, `SimpleCar`, `ProceduralTrack`, `VehiclePreview` et `SceneDebugPanel` hors React au départ.
- **Pont React ↔ moteur** : créer une couche d’orchestration typée qui détient `world`, `gameStarted`, `selection`, télémétrie, pause et config circuit.
- **UI React** : migrer les écrans existants sans redesign destructif : Loading, Showroom, Pause, HUD, Controls Hint, Settings Panel, Favorites.
- **Design** : conserver strictement le langage APEX cockpit motorsport via les CSS modules existants et les tokens `design_language.md`.

## Plan d’exécution

1. **Sécuriser le sprint**
   - Créer une branche dédiée depuis l’état approuvé.
   - Vérifier/stabiliser la modification existante de `VehiclePreview.ts` avant d’installer ou supprimer des dépendances.
   - Vérification : `git status --short --branch` clair sur les fichiers touchés.

2. **Moderniser l’outillage sans changer le gameplay**
   - Installer React, ReactDOM, Vite, plugin React, TypeScript moderne et types React.
   - Remplacer les scripts `dev`/`build` par Vite.
   - Adapter `tsconfig` pour TSX, JSX React et modules ES.
   - Vérification : build Vite minimal qui charge encore les assets et le CSS.

3. **Créer le shell React contrôlé**
   - Réduire `index.html` à un `#root`, au script d’initialisation thème anti-flash et au point d’entrée React.
   - Reproduire la structure UI existante en composants typés, sans changement visuel majeur.
   - Vérification : menu, thème, loading et structure DOM visibles sans démarrer le moteur.

4. **Migrer l’orchestration runtime**
   - Déplacer le script inline vers hooks/services React : start/stop, pause, debug F3, settings procedural, favoris, télémétrie 50ms.
   - Garder `World` instancié une seule fois par session, avec cleanup explicite au retour menu.
   - Vérification : lancer session, pause/reprise, retour menu, génération circuit, sliders, favoris, HUD RPM/vitesse/rapport.

5. **Nettoyer les contrats et documenter**
   - Supprimer les dépendances Webpack obsolètes uniquement après build React stable.
   - Mettre à jour `README.md` et `app-progress.md`.
   - Vérification finale : `npm run build`, `npm run test:trackgen`, puis `npx tsc --noEmit` si l’upgrade TypeScript a résolu le blocage historique.

## Régressions probables à prévenir

- **Canvas mal monté** : `World` ajoute actuellement le canvas à `document.body`; il faudra garantir qu’il reste derrière l’UI et qu’il est bien supprimé au `dispose()`.
- **Double listeners clavier** : React + `World` + ancien script peuvent doubler Escape/F3/input si la migration n’est pas atomique.
- **Télémetrie stale** : intervalle HUD doit être nettoyé à l’arrêt pour éviter lectures sur un `world` détruit.
- **Thème désynchronisé** : `data-theme`, `localStorage` et preview 3D doivent rester synchrones.
- **Assets Vite** : les chemins `textures/...`, `car_models/...`, `race_tracks/...` doivent rester servis à la racine.
- **TypeScript** : l’upgrade peut révéler des erreurs masquées par `ts-loader transpileOnly`.

## Stratégie de validation

- **Automatique** : `npm run build`, `npm run test:trackgen`, `npx tsc --noEmit` si possible.
- **Manuelle desktop** : chargement menu, carousel véhicule, thème clair/sombre, start engine, pause Escape, F3 debug, retour menu.
- **Manuelle gameplay** : accélération/frein/direction, reset `R`, transmission `M`, shifts, HUD télémétrie.
- **Manuelle procedural** : regenerate, sliders, preset difficulté, save/load/delete favoris.
- **Responsive** : viewport mobile pour menu, HUD réduit, settings panel et absence de blocage du centre de piste.

## Recommandation

Même avec une modernisation complète, je recommande une migration en commits courts et réversibles : outillage, shell React, orchestration, puis nettoyage Webpack. C’est la voie la plus sûre pour obtenir React sans casser la simulation.
