# SPRINT menu-vehicle-loop-logs — Stabilisation changement véhicule showroom

# Date : 2026-05-24

# Statut : termine

# Composants :
- `src/ts/react/App.tsx`
- `src/ts/react/components/VehiclePreviewStage.tsx`
- `src/ts/ui/menu/VehiclePreview.ts`

# Validation :
- Le changement de véhicule remet maintenant `vehicleDirection` à `0` en fin de transition afin d'éviter qu'un rendu ultérieur rejoue la même animation directionnelle.
- `VehiclePreviewStage` ignore explicitement les demandes de rendu du même `vehicle.id` et conserve le preload des véhicules adjacents.
- `VehiclePreview` ignore aussi un `setVehicle` vers le véhicule déjà actif hors transition.
- Correction de la cause racine de boucle : l'effet d'hydratation IndexedDB ne depend plus de `selection` via `setTheme`, ce qui evitait une relecture des anciennes preferences a chaque changement de vehicule.
- La selection vehicule est maintenant persistee au moment du clic pour aligner IndexedDB sur l'etat menu courant.
- Ajout de logs ciblés `[APEX][VehicleMenu]`, `[APEX][VehicleStage]` et `[APEX][VehiclePreview]` pour tracer demande, skip, fin, stale load et fallback d'erreur modèle.
- `npm run build` : succes.
- `npx tsc --noEmit` : succes.
- `npm run test:trackgen` : succes sur `406` cas.
- Serveur local `http://127.0.0.1:5173/` : reponse HTTP `200`.

# Risques restants :
- Risque faible : les logs console peuvent etre verbeux pendant le diagnostic ; ils sont limites aux changements de vehicule et aux chargements modele, pas a la frame loop.
- La verification visuelle navigateur integree n'a pas pu etre pilotee dans cette session car l'outil d'execution Browser requis n'etait pas expose.
- Le depot contenait deja des changements non committes dans des fichiers React avant ce sprint ; ils ont ete preserves.

# SPRINT skyshader-esm-runtime-fix — Compatibilite navigateur SkyShader

# Date : 2026-05-24

# Statut : termine

# Composants :
- `src/lib/shaders/SkyShader.js`

# Validation :
- Remplacement du chargement CommonJS `require('three')` par un import ESM compatible Vite/navigateur.
- `npx tsc --noEmit` : succes.
- `npm run build` : succes.
- `npm run test:trackgen` : succes sur `406` cas.

# Risques restants :
- Risque faible : le contenu GLSL et le contrat exporte `SkyShader` ne changent pas.
- Validation navigateur manuelle recommandee sur le demarrage de la scene pour confirmer l'absence de regression visuelle du ciel.

# SPRINT typescript-skyshader-resolution — Stabilisation diagnostics TypeScript

# Date : 2026-05-24

# Statut : termine

# Composants :
- `src/lib/shaders/SkyShader.d.ts`
- `tsconfig.json`

# Validation :
- Ajout d'une declaration TypeScript locale pour `SkyShader`, avec uniforms Three.js types.
- Migration de `moduleResolution` vers `Bundler` pour aligner la configuration sur Vite/TypeScript moderne.
- Suppression de `baseUrl` deprecie et conservation de l'alias `cannon` via cible `paths` relative explicite.
- `npx tsc --noEmit` : succes.
- `npm run build` : succes.
- `npm run test:trackgen` : succes sur `406` cas.

# Risques restants :
- Aucun risque runtime attendu : le shader JavaScript n'est pas modifie, seule sa surface de typage est declaree.
- La resolution `Bundler` correspond au pipeline Vite actuel ; a surveiller uniquement si un futur tooling Node pur consomme directement `tsconfig.json`.

# SPRINT react-vite-modernization — Migration React/Vite installable

# Date : 2026-05-24

# Statut : termine

# Composants :
- `index.html`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.mts`
- `src/ts/main.ts`
- `src/ts/react/App.tsx`
- `src/ts/react/main.tsx`
- `src/ts/react/types.ts`
- `src/ts/react/components/Showroom.tsx`
- `src/ts/react/components/VehiclePreviewStage.tsx`
- `src/ts/react/components/TrackMiniature.tsx`
- `src/ts/react/components/Hud.tsx`
- `src/ts/react/components/SettingsPanel.tsx`
- `src/ts/world/ProceduralTrack.ts`
- `src/ts/world/track/trackGeometry.ts`
- `README.md`

# Validation :
- `npm install` : succes apres regeneration du lockfile npm 10 aligne avec React, ReactDOM, Vite, plugin React et TypeScript 5.
- `index.html` est reduit au shell React `#root`, au script anti-flash theme et a l'entree `/src/ts/react/main.tsx`.
- L'UI principale est montee par React : loading, showroom, preview vehicule 3D, preview piste, HUD, pause et panneau procedural.
- `World` reste hors React et expose un contrat runtime plus propre : montage dans `#game-container`, callback pause, nettoyage explicite des listeners, seed procedural chargeable et `dispose()`.
- Vite transforme explicitement le bundle CommonJS local `src/lib/cannon/cannon.js`, ce qui supprime les warnings Rollup d'exports Cannon manquants.
- Le build Vite separe les chunks `react`, `three`, `cannon` et application pour ameliorer la mise en cache et eviter un bundle monolithique.
- Correction TypeScript Three r113 : `vertexColors` utilise `THREE.VertexColors`.
- `npm run build` : succes.
- `npm run test:trackgen` : succes sur `406` cas.
- `npx tsc --noEmit` : succes.
- Dev server local `http://127.0.0.1:8080/` : reponse HTTP `200`, entree React presente, module `main.tsx` servi en `200`.

# Risques restants :
- La validation navigateur automatisee visuelle n'a pas pu etre pilotee dans cette session car le plugin Browser etait present mais l'outil `node_repl js` requis n'etait pas expose.
- La migration conserve des controles DOM internes dans `World` et `VehiclePreview`; la prochaine etape doit reduire progressivement ces dependances sans casser la simulation.
- Le chunk Three.js reste naturellement volumineux pour une simulation WebGL ; il est isole en cache vendor, mais un lazy loading plus fin pourra etre etudie si le temps de premier chargement devient critique.
- Une validation manuelle desktop/mobile reste recommandee sur le carousel vehicule, Start Engine, pause Escape, F3 debug, sliders procedural et favoris IndexedDB.

# SPRINT showroom-carousel-swap-refine — Carousel 3D swap sans flash

# Date : 2026-05-24

# Statut : termine

# Composants :
- `src/ts/ui/menu/VehiclePreview.ts`

# Validation :
- Le swap véhicule utilise maintenant une distance offscreen calculée depuis la caméra showroom, le FOV, l’aspect ratio et l’encombrement réel du modèle au lieu d’un offset figé.
- Les changements directionnels conservent l’ancien véhicule affiché pendant le chargement du nouveau ; l’état `.vehicle-stage[data-state="loading"]` n’est plus déclenché au centre pendant un swap gauche/droite.
- Le cache GLTF mémorise désormais les promesses par `modelPath`, réutilise les chargements adjacents et clone la scène source avant chaque montage via `SkeletonUtils.clone` avec fallback `scene.clone(true)`.
- La transition passe à `520ms` avec `easeInOutCubic`, tout en conservant le verrouillage existant des flèches côté `MainMenuController`.
- La rotation courante est partagée entre modèle sortant et entrant ; aucun reset brutal à `0` n’est appliqué pendant un swap directionnel.
- `npm run build` : succes.
- `npx tsc --noEmit` : toujours bloque par l’incompatibilite historique entre `typescript@3.9.9` et les definitions recentes `@types/node` / `undici-types`.

# Risques restants :
- La sortie complète hors viewport dépend encore de la bounding box Three.js des assets ; une vérification visuelle manuelle reste nécessaire sur desktop et mobile pour chaque modèle GLB.
- Le fallback `scene.clone(true)` reste moins fiable que `SkeletonUtils.clone` pour des rigs complexes si un asset futur contourne le chemin standard GLTF skinné.

# SPRINT showroom-vehicle-swap-animation — Swap 3D fluide du carousel véhicule

# Date : 2026-05-24

# Statut : termine

# Composants :
- `src/ts/ui/menu/MainMenuController.ts`
- `src/ts/ui/menu/VehiclePreview.ts`
- `src/css/showroom/_vehicle.css`

# Validation :
- Le showroom véhicule utilise maintenant un vrai swap 3D à double présence avec ancien modèle sortant et nouveau modèle entrant simultanément.
- La durée de transition est fixe à `2000ms` pour les changements gauche/droite.
- Les clics répétés sur les flèches sont verrouillés pendant la transition pour éviter les chevauchements incohérents.
- Le fallback véhicule reste animé comme un entrant normal si le chargement GLB échoue.
- Le mode `prefers-reduced-motion` remplace le swap glissé par un remplacement immédiat.
- Correction de visibilité : le swap suit l’axe horizontal écran dérivé de la caméra showroom, et non l’axe monde `X` qui se lisait surtout comme un déplacement en profondeur.

# Risques restants :
- Le swap conserve une rotation commune entre ancien et nouveau véhicule pendant la transition ; une vérification visuelle reste recommandée sur tous les modèles GLB pour confirmer que leur silhouette reste lisible pendant le croisement.
- Le verrouillage des flèches privilégie la cohérence visuelle sur la réactivité ; si une file d’attente d’inputs est souhaitée plus tard, elle devra être conçue explicitement.

# SPRINT showroom-vehicle-scramble-loading — Feedback texte pendant chargement vehicule

# Date : 2026-05-24

# Statut : termine

# Composants :
- `src/ts/ui/menu/TextScrambler.ts`
- `src/ts/ui/menu/MainMenuController.ts`
- `src/ts/ui/menu/VehiclePreview.ts`

# Validation :
- Le message `Chargement du modèle` est retire pendant les changements de vehicule dans le showroom.
- Le nom du vehicule ainsi que les labels et scores de stats utilisent maintenant un effet scramble pendant le chargement du GLB.
- Le scramble se stabilise automatiquement a la fin du chargement ou sur fallback erreur.
- Les changements rapides de vehicule sont proteges par un token de rendu pour ignorer les chargements obsoletes.
- `npm run build` : succes.

# Risques restants :
- L'effet scramble ne couvre que les textes du bloc vehicule ; les fleches de delta restent immediates pour conserver la lisibilite comparative.
- Une verification visuelle manuelle desktop/mobile reste recommandee pour juger la densite percue de l'animation sur machines lentes.

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
