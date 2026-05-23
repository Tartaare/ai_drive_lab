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
