# SPRINT modular-css-menu-preview — Modularisation CSS et preview véhicule

# Date : 2026-05-23

# Statut : termine

# Composants :
- `src/css/style.css`
- `src/css/base/_tokens.css`
- `src/css/base/_layout.css`
- `src/css/showroom/_shell.css`
- `src/css/showroom/_modes.css`
- `src/css/showroom/_vehicle.css`
- `src/css/showroom/_track.css`
- `src/css/components/_legacy-menu.css`
- `src/css/components/_controls.css`
- `src/css/components/_theme-toggle.css`
- `src/css/components/_hud.css`
- `src/css/components/_settings-panel.css`
- `src/css/components/_loader-motion-responsive.css`
- `src/css/components/_favorites.css`
- `src/ts/ui/menu/VehiclePreview.ts`
- `src/ts/ui/menu/vehiclePreviewScene.ts`
- `src/ts/ui/menu/MainMenuController.ts`
- `README.md`

# Validation :
- `src/css/style.css` devient un point d'entree de `14` lignes qui importe des modules CSS par responsabilite.
- Tous les modules CSS applicatifs sont sous `250` lignes ; le plus grand est `_loader-motion-responsive.css` avec `242` lignes.
- Extraction des helpers de scene statique de preview vehicule dans `vehiclePreviewScene.ts`.
- `VehiclePreview.ts` passe sous le seuil avec `242` lignes ; `MainMenuController.ts` passe a `250` lignes sans changer son contrat public.
- Scan applicatif `src` hors librairie tierce Cannon : seuls `src/ts/main.ts` (`959`) et `src/ts/vehicles/SimpleCar.ts` (`1000`) restent au-dessus de `250` lignes.
- `npm run build` : succes.
- `npm run test:trackgen` : succes sur `406` cas.
- `npx tsc --noEmit` : toujours bloque par incompatibilite existante entre `typescript@3.9.9` et les definitions recentes `@types/node` / `undici-types`.

# Risques restants :
- `main.ts` et `SimpleCar.ts` concentrent encore orchestration monde/camera/input et logique vehicule/drivetrain/physique. Leur decoupe doit etre traitee dans un sprint moteur dedie pour eviter une regression de conduite.
- La modularisation CSS preserve l'ordre de cascade existant ; une verification visuelle desktop/mobile reste recommandee apres merge.

# SPRINT showroom-main-menu — Refonte menu showroom automobile

# Date : 2026-05-23

# Statut : termine

# Composants :
- `index.html`
- `src/css/style.css`
- `src/ts/main.ts`
- `src/ts/ui/menu/catalog.ts`
- `src/ts/ui/menu/MainMenuController.ts`
- `src/ts/ui/menu/VehiclePreview.ts`
- `src/ts/ui/menu/ProceduralTrackPreview.ts`
- `src/ts/ui/menu/renderers.ts`

# Validation :
- Menu principal refondu en showroom automobile : marque discrete, modes a gauche, preview vehicule 3D dominante, circuit a droite, CTA `START ENGINE` en bas centre.
- Carousel vehicule avec stats extensibles, navigation gauche/droite, rotation automatique et drag pointer.
- Preview procedurale top-down avec longueur, difficulte, seed et action `New Track`.
- Mode `AI` indisponible et mode `Contre la montre` desactive tant que `race_tracks/Cartoon_Track1.glb` est absent.
- Selection vehicule/mode/circuit restauree via IndexedDB et sauvegardee avec le vrai `vehicleId`.
- `World` accepte une configuration procedurale optionnelle tout en conservant le contrat existant `World(carModelPath, levelId)`.
- `npm run build` : succes.
- `npm run test:trackgen` : succes sur `406` cas.
- `npx tsc --noEmit` : toujours bloque par incompatibilite existante entre `typescript@3.9.9` et les definitions recentes `@types/node` / `undici-types`.
- Dev server local `http://127.0.0.1:5173/` : reponse HTTP `200`, markup showroom present, bundle `200`, asset Grand Prix absent confirme en `404`.

# Risques restants :
- La validation visuelle navigateur integree n'a pas pu etre pilotee dans cette session car l'outil Browser n'exposait pas de runtime `node_repl js`; une verification manuelle desktop/mobile reste recommandee.
- Les previews GLB dependent des assets `car_models/`; le fallback showroom couvre l'echec de chargement mais ne remplace pas une validation visuelle modele par modele.
- Les modules `MainMenuController.ts` et `VehiclePreview.ts` restent legerement au-dessus de 200 lignes pour conserver des responsabilites coherentes sans sur-fragmentation.

# SPRINT persistence-indexeddb — Persistance locale des données avec IndexedDB

# Date : 2026-05-23

# Statut : termine

# Composants :
- `src/ts/core/AppStorage.ts`
- `src/ts/main.ts`
- `index.html`
- `src/css/style.css`
- `package.json`

# Validation :
- Intégration complète de la bibliothèque `idb` pour encapsuler l'asynchronisme de IndexedDB de manière moderne et typée.
- Création du singleton `AppStorage` gérant 4 magasins d'objets distincts : préférences utilisateur (véhicule/niveau/thème), configuration de circuit procédural (sliders), circuits favoris (sauvegarde de graine et paramètres avec nom automatique), et historique des sessions (chronos/durée de conduite).
- Intégration asynchrone transparente au chargement de `index.html` (sans freeze visuel).
- Autosave avec anti-rebond (debounce) de 300ms sur la configuration des curseurs de piste.
- Interface utilisateur dédiée aux favoris intégrée au volet "Track Configuration" (jusqu'à 10 circuits max, boutons Load et Supprimer interactifs).
- `npm run build` : succès.
- `npm run test:trackgen` : succès (406/406 PASS).

# Risques restants :
- L'utilisation de IndexedDB n'affecte pas le rendu 3D, mais l'état asynchrone initial de chargement doit être géré avec soin si la scène 3D démarre avant la fin de la restauration des données (actuellement résolu par le délai de chargement initial de 1.2s).

# SPRINT modular-track-architecture — Découpe piste procédurale

# Date : 2026-05-23

# Statut : termine

# Composants :
- `src/ts/world/ProceduralTrack.ts`
- `src/ts/world/track/trackTypes.ts`
- `src/ts/world/track/trackSpatial.ts`
- `src/ts/world/track/trackControlPoints.ts`
- `src/ts/world/track/trackCurvature.ts`
- `src/ts/world/track/trackValidation.ts`
- `src/ts/world/track/trackGeneration.ts`
- `src/ts/world/track/trackGeometry.ts`
- `src/ts/world/track/trackKerbs.ts`
- `scripts/test-trackgen.js`
- `README.md`

# Validation :
- `ProceduralTrack.ts` passe de `1284` lignes à une façade de `13` lignes pour préserver les imports existants.
- Les modules extraits restent sous `250` lignes : génération `244`, géométrie `198`, spatial `196`, validation `196`, control points `181`, courbure `147`, kerbs `79`, types `67`.
- Le runner `test-trackgen` charge maintenant récursivement les modules TypeScript locaux au lieu de transpiler seulement la façade.
- `npm run build` : succès.
- `npm run test:trackgen` : succès sur `406` cas.
- `npx tsc --noEmit` : toujours bloqué par incompatibilité existante entre `typescript@3.9.9` et les définitions récentes `@types/node` / `undici-types`.

# Risques restants :
- Le comportement de génération est validé par la matrice déterministe actuelle, mais une validation visuelle navigateur reste recommandée pour confirmer le rendu des kerbs et lignes de bord après découpe.
- Les autres gros fichiers (`SimpleCar.ts`, `main.ts`, `style.css`, `index.html`) restent à modulariser dans des sprints séparés pour limiter le risque de régression.

# SPRINT theme-toggle-ux — Theme clair/sombre menu principal

# Date : 2026-05-23

# Statut : termine

# Composants :
- `index.html`
- `src/css/style.css`
- `design_language.md`

# Validation :
- Ajout d'un bouton `theme-toggle` minimaliste en haut a droite du menu principal.
- Theme persistant via `localStorage` (`apex-theme`) apres choix utilisateur.
- Initialisation sans flash via `data-theme` avant chargement CSS, avec fallback `prefers-color-scheme`.
- Etats accessibles : `aria-label`, `aria-pressed`, focus visible et respect de `prefers-reduced-motion`.
- `npm run build` : succes.
- `npm run test:trackgen` : succes sur `406` cas.
- `npx tsc --noEmit` : bloque par incompatibilite existante entre `typescript@3.9.9` et les definitions recentes `@types/node` / `undici-types`.

# Risques restants :
- Le theme clair a ete integre par tokens UI ; une validation visuelle navigateur desktop/mobile reste recommandee pour juger le contraste exact sur scene 3D active.
- Le HUD herite du theme clair pendant la conduite ; a surveiller sur circuits tres lumineux si le rendu 3D evolue.

# SPRINT track-generation-radius-fix — Stabilisation génération procédurale

# Date : 2026-05-21

# Statut : terminé

# Composants :
- `src/ts/world/ProceduralTrack.ts`

# Validation :
- Génération directe en mémoire sur `facile`, `moyen`, `difficile`, `expert`, `vraiment_difficile` avec seed `4242` : succès sans fallback circulaire.
- `npm run build` : succès.
- `npx tsc --noEmit` : bloqué par incompatibilité existante entre `typescript@3.9.9` et les définitions récentes `@types/node` / `undici-types`.

# Risques restants :
- Le score de difficulté reste une métrique QA non bloquante ; certains circuits peuvent être plus agressifs que leur libellé.
- Quand aucune ligne droite stricte de 40 m n’est trouvée, le départ utilise l’index le plus bas en Z avec un avertissement console.

# SPRINT trackgen-test-matrix — Couverture paramètres Track Configuration

# Date : 2026-05-22

# Statut : terminé

# Composants :
- `src/ts/world/ProceduralTrack.ts`
- `scripts/test-trackgen.js`
- `package.json`

# Validation :
- `npm run test:trackgen` : succès sur default, largeurs `18`, `22`, `26`, `30`, et preset dense expert.
- `npm run build` : succès.
- `npx tsc --noEmit` : bloqué par incompatibilité existante entre `typescript@3.9.9` et les définitions récentes `@types/node` / `undici-types`.

# Risques restants :
- Le test couvre des seeds déterministes ; il ne remplace pas un fuzz test exhaustif sur des centaines de seeds.
- Les très grandes largeurs restent limitées par le slider applicatif à `30`.

# SPRINT trackgen-combinatorial-coverage — Couverture complète des sliders circuit

# Date : 2026-05-22

# Statut : terminé

# Composants :
- `src/ts/world/ProceduralTrack.ts`
- `scripts/test-trackgen.js`

# Validation :
- `npm run test:trackgen` : succès sur `326` cas.
- Couverture testée : presets, grille min/milieu/max de `complexity`, `scale`, `chaos`, `twist`, `width`, plus `80` combinaisons fuzz déterministes.
- `npm run build` : succès.
- `npx tsc --noEmit` : bloqué par incompatibilité existante entre `typescript@3.9.9` et les définitions récentes `@types/node` / `undici-types`.

# Risques restants :
- `angleVariation` / `TWIST` est couvert comme valeur d’entrée, mais le générateur actuel ne l’utilise pas encore comme facteur géométrique distinct.
- La couverture est forte sur bornes et fuzz déterministe, mais pas exhaustive sur toutes les valeurs discrètes possibles des sliders.

# SPRINT trackgen-max-settings-seeds — Stabilisation seeds à paramètres maximum

# Date : 2026-05-22

# Statut : terminé

# Composants :
- `src/ts/world/ProceduralTrack.ts`
- `scripts/test-trackgen.js`

# Validation :
- Reproduction : plusieurs seeds pseudo-aléatoires échouaient avec `complexity=20`, `scale=150`, `chaos=100%`, `twist=100%`, `width=30`.
- Correction : la passe de relaxation des rayons serrés est montée à `96` itérations uniquement sur les tentatives rejetées `radius_too_small`.
- `npm run test:trackgen` : succès sur `406` cas, dont `80` seeds dédiées tous paramètres au maximum.
- `npm run build` : succès.
- `npx tsc --noEmit` : bloqué par incompatibilité existante entre `typescript@3.9.9` et les définitions récentes `@types/node` / `undici-types`.

# Risques restants :
- Le test couvre 80 seeds max-settings déterministes, pas l’ensemble infini des seeds possibles.
- Le lissage supplémentaire n’est déclenché que sur `radius_too_small`; les autres raisons de rejet restent strictes.

# SPRINT trackgen-attempt-budget-ui-lock — Budget de génération et état bouton

# Date : 2026-05-22

# Statut : terminé

# Composants :
- `src/ts/world/ProceduralTrack.ts`
- `index.html`
- `src/css/style.css`

# Validation :
- Le générateur tente maintenant jusqu’à `500` circuits avant fallback circulaire.
- Le bouton `GENERATE NEW TRACK` devient indisponible pendant la génération.
- Le statut `Génération du circuit...` s’affiche sous le bouton comme un log accessible via `role="status"` et `aria-live="polite"`.
- L’état UI utilise `disabled` et `aria-busy` pour bloquer les doubles clics.

# Risques restants :
- La génération reste synchrone ; l’UI affiche bien l’état avant calcul, mais le thread principal reste occupé pendant la recherche.
- Les sliders Track Configuration déclenchent toujours une génération directe à chaque input.

# SPRINT track-edge-lines-kerb-collisions — Bordures piste et collisions kerbs

# Date : 2026-05-22

# Statut : terminé

# Composants :
- `src/ts/world/ProceduralTrack.ts`
- `src/ts/main.ts`
- `scripts/test-trackgen.js`

# Validation :
- Ajout de bandes blanches mesh continues sur les deux bords procéduraux, largeur `0.18 m`, inférieure aux kerbs `0.8 m`.
- Ajout de collisions Cannon statiques pour les kerbs procéduraux, recréées à chaque génération/changement de circuit.
- `npm run test:trackgen` : succès sur `406` cas.
- `npm run build` : succès.
- `npx tsc --noEmit` : bloqué par incompatibilité existante entre `typescript@3.9.9` et les définitions récentes `@types/node` / `undici-types`.
- Dev server local `http://127.0.0.1:5173/` : réponse HTTP `200`.

# Risques restants :
- Les collisions kerbs utilisent un `Trimesh` statique par côté ; performance à surveiller sur machines faibles si le nombre de segments kerbs augmente fortement.
- Le navigateur intégré n’était pas pilotable dans cette session faute d’outil `node_repl js` exposé ; validation visuelle manuelle recommandée sur piste procédurale.
