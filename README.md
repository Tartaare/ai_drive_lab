# APEX

Simulation de conduite 3D dark-first avec interface cockpit motorsport, physique Cannon.js et rendu Three.js.

## Structure

- `src/ts/main.ts` orchestre le monde, la scène, la voiture, les entrées et le pont UI actuel.
- `src/ts/world/ProceduralTrack.ts` est une façade stable pour la piste procédurale.
- `src/ts/world/track/` contient les modules piste : types, géométrie, génération, validation, courbure, kerbs et helpers spatiaux.
- `src/ts/vehicles/` contient la voiture, les roues et la préparation des modèles.
- `src/css/style.css` porte le design system APEX actuel.
- `scripts/test-trackgen.js` valide la génération procédurale sur une matrice déterministe.

## Commandes

```bash
npm run build
npm run test:trackgen
npx tsc --noEmit
```

`npx tsc --noEmit` est actuellement bloqué par l’écart entre `typescript@3.9.9` et des définitions récentes `@types/node` / `undici-types`.
