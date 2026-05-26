---
version: alpha
name: APEX Design System
description: >
  Reference UI/UX pour APEX, simulation de conduite 3D dark-first avec showroom
  automobile, cockpit in-game, HUD telemetry, generation procedurale et rendu
  Three.js. Le canvas 3D reste le produit principal ; l'interface agit comme
  une couche tactique motorsport, compacte, lisible et reactive.
colors:
  accent: "#ffffff"
  accent-glow: "#ffffff66"
  danger: "#ff3b30"
  success: "#34c759"
  warning: "#ffcc00"
  motorsport: "#ff8a1f"
  motorsport-light: "#c65f12"
  page-bg-dark: "#050505"
  page-bg-solid: "#000000"
  page-bg-light: "#eef1ec"
  surface-light-solid: "#f4f6f3"
  text-dark: "#ffffff"
  text-light: "#10120f"
  black: "#000000"
  start-hover: "#ffaa4d"
typography:
  display-xl:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "8rem"
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: "0"
  display-lg:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "7rem"
    fontWeight: 700
    lineHeight: 0.8
    letterSpacing: "0"
    fontFeature: "tabular-nums"
  telemetry-speed:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "4.2rem"
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: "0"
    fontFeature: "tabular-nums"
  telemetry-gear:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "3.4rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0"
  vehicle-title:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "2.2rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.05em"
  heading-sm:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.1em"
  action-md:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.1em"
  body-md:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0"
  label-md:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.05em"
  label-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.12em"
  micro-caps:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "1px"
spacing:
  base: "4px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
  xxxl: "64px"
  screen-padding-desktop: "2rem"
  screen-padding-mobile: "1rem"
  hud-offset-desktop: "3rem"
  hud-offset-mobile: "1rem"
  showroom-gap-min: "1rem"
  showroom-gap-max: "3rem"
rounded:
  none: "0"
  xs: "2px"
  sm: "4px"
  md: "6px"
  toggle: "12px"
  full: "9999px"
components:
  menu-overlay:
    background: "linear edge shade + radial focus"
    depth: "blur 2px"
    zIndex: "100"
  cyber-button:
    typography: "{typography.action-md}"
    backgroundColor: "rgba(255,255,255,0.03)"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.none}"
    padding: "1.2rem 2rem"
    clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)"
  showroom-start:
    typography: "{typography.display-lg}"
    backgroundColor: "{colors.motorsport}"
    textColor: "{colors.black}"
    height: "80px"
  showroom-panel:
    backgroundColor: "rgba(8,8,10,0.58)"
    borderColor: "rgba(255,255,255,0.1)"
    depth: "blur 18px + directional shadow"
    clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)"
  telemetry-gauge:
    size: "280px"
    strokeWidth: "8px"
    activeStroke: "{colors.accent}"
    redlineStroke: "{colors.danger}"
  settings-panel:
    width: "320px"
    backgroundColor: "rgba(10,10,12,0.85)"
    depth: "blur 40px"
---

# APEX - Design System UI/UX

Ce document est la reference de design pour les pages **showroom** et **jeu**. Il consolide les decisions observees dans les composants React, les modules CSS et la documentation projet existante.

Il doit guider les prochains developpements sans remplacer le code source. Les valeurs normatives vivent dans les tokens CSS de `src/css/base/_tokens.css`; ce document decrit comment les appliquer avec coherence.

## Overview

APEX est une simulation de conduite 3D. L'interface ne doit jamais devenir le produit principal : elle sert la selection, la comprehension et le controle pendant que le rendu Three.js porte l'experience.

**Direction esthetique :** cockpit motorsport tactique, sombre par defaut, angulaire, compact, technique, avec accent orange mecanique pour les actions de pilotage et les etats actifs.

**Personnalite :** precise, rapide, tendue, lisible, immersive. L'UI doit evoquer un systeme embarque de performance, pas un dashboard SaaS.

**Public :** joueur/pilote qui veut choisir un vehicule, lancer une session et lire instantanement son etat de conduite.

**Element memorable :** la tension entre une scene 3D glossy plein ecran et une interface ciselee, decoupee, presque instrumentale, qui laisse le vehicule et la piste respirer.

**Principes produit :**

- Le canvas 3D est prioritaire sur toutes les surfaces UI.
- Une page = une intention dominante.
- Les infos critiques restent aux bords de l'ecran.
- Les interactions repondent immediatement : hover, active, focus, disabled, busy, transition spatiale.
- La couleur semantique signale un etat ou une action, jamais une decoration gratuite.

## Colors

La palette repose sur un noir graphite, du blanc fonctionnel et un accent motorsport orange. Le theme clair existe pour le confort, mais le theme sombre reste la reference visuelle.

**Tokens sombres principaux :**

- `--c-page-bg: #050505` : fond global et base immersive.
- `--c-bg-dark: #000000` : overlays bloquants, loader, surfaces de contraste maximal.
- `--c-text: #ffffff` : texte principal, telemetry, icones, lignes actives.
- `--c-text-soft: rgba(255,255,255,0.65)` : metadata et labels secondaires.
- `--c-text-muted: rgba(255,255,255,0.5)` : aides, unites, indications non critiques.
- `--c-bg-glass: rgba(10,10,12,0.65)` : hints clavier et badges.
- `--c-bg-panel: rgba(10,10,12,0.85)` : panneau lateral de configuration.
- `--c-bg-elevated: rgba(8,8,10,0.58)` : panneaux showroom translucides.
- `--c-border-subtle: rgba(255,255,255,0.1)` : structure technique discrete.
- `--c-border-strong: rgba(255,255,255,0.3)` : hover, focus visuel secondaire.

**Accent motorsport :**

- `--c-motorsport: #ff8a1f` : CTA principal, selection active, start marker, sliders vehicule.
- `--c-motorsport-soft: rgba(255,138,31,0.74)` : bordures hover et selection.
- `--c-motorsport-dim: rgba(255,138,31,0.18)` : fond actif et halo miniature.
- `--c-motorsport-glow: rgba(255,138,31,0.46)` : lumiere fonctionnelle sur elements actifs.

**Semantique :**

- `--c-danger: #ff3b30` : redline RPM, action destructrice `ABORT SESSION`.
- `--c-success: #34c759` : confirmation, statut de generation positif.
- `--c-warning: #ffcc00` : degradation ou attention future.

**Theme clair :**

- Base `#eef1ec` et surface `#f4f6f3`, avec texte `#10120f`.
- L'orange devient `#c65f12` pour conserver le contraste.
- Ne jamais introduire de cartes blanches flottantes ; le clair reste un cockpit clair, pas un SaaS.

**Regles couleur :**

- Ne pas introduire de gradients violet/bleu.
- Ne pas utiliser l'orange pour du decoratif passif : il signifie action, selection, energie ou piste.
- Maintenir le contraste WCAG AA sur texte fonctionnel.
- Les nouvelles couleurs doivent passer par tokens et avoir une variante claire/sombre.
- Ne jamais signaler un etat uniquement par couleur : combiner label, `disabled`, `aria-busy`, iconographie ou contraste de bordure.

## Typography

La typographie traduit la mecanique et la telemetry. `Rajdhani` porte les titres, valeurs et actions ; `Inter` porte les labels utilitaires. Le debug peut utiliser une pile monospace systeme.

**Roles :**

- **Brand / titres techniques :** `Rajdhani`, uppercase, graisse 600-700, espacement controle.
- **Telemetry :** `Rajdhani`, chiffres tabulaires, grandes tailles, line-height serre.
- **Actions :** `Rajdhani`, uppercase, letter-spacing `0.1em` a `0.2em`.
- **Labels :** `Inter`, uppercase, taille reduite, opacite secondaire.
- **Debug :** monospace uniquement pour diagnostics F3.

**Echelle a respecter :**

- `11px` : micro labels, key descriptions.
- `0.72rem` / `0.75rem` : metadata compactes.
- `0.8rem` / `0.9rem` : unites, valeurs secondaires.
- `1rem` : texte utilitaire.
- `1.1rem` / `1.2rem` : labels de bouton et headings de panneau.
- `2.2rem` : nom vehicule showroom.
- `3.4rem` : rapport de boite.
- `4.2rem` : vitesse centrale.
- `7rem` / `8rem` : display exceptionnel, pause ou grands titres.

**Regles :**

- Pas de tailles arbitraires si une taille existante suffit.
- `font-variant-numeric: tabular-nums` sur les valeurs dynamiques.
- Pas de letter-spacing negatif dans les nouvelles UI.
- Les labels restent courts ; eviter les paragraphes in-game.
- Ne pas ajouter de nouvelle famille typographique sans raison forte.

## Layout

APEX est compose d'un canvas 3D plein ecran et d'une couche UI fixe au-dessus.

**Structure globale :**

- `#game-container` : scene 3D plein ecran, prioritaire visuellement.
- `.ui-layer` : couche UI plein ecran, pointer-events desactives par defaut.
- Les elements interactifs retablissent `pointer-events: auto`.
- `.loader-overlay`, `.menu-overlay`, `#pause-overlay` : overlays bloquants.
- `.settings-panel` : panneau lateral gauche uniquement pendant conduite procedurale.

### Page Showroom

**But :** choisir une session, inspecter le vehicule, choisir/generer un circuit et lancer le moteur.

**Workflow UX :**

1. Lecture immediate de la marque `APEX` en haut gauche.
2. Choix du mode dans le panneau gauche.
3. Inspection du vehicule au centre, avec carousel, drag/zoom et stats.
4. Lecture du circuit dans le panneau droit.
5. Lancement via `START ENGINE`, CTA dominant en bas centre.
6. Reglages vehicule via bouton wrench, sans demonter la scene 3D.

**Composition desktop :**

- Grille 3 colonnes : gauche `minmax(230px, 0.62fr)`, centre `minmax(420px, 1.6fr)`, droite `minmax(240px, 0.66fr)`.
- Padding showroom : `6.5rem 2rem 8.5rem`.
- Le vehicule reste central et plus important que les panneaux.
- Les panneaux lateraux sont alignes en haut de la zone utile pour liberer le centre.
- `START ENGINE` est en bas centre, large, lumineux, unique CTA primaire.

**Composition mobile :**

- Layout monocolonne sous `768px`.
- Le vehicule reste en scene fixe plein ecran.
- Les panneaux passent sous la zone principale avec scroll vertical.
- La marque se compacte ; la baseline est masquee.
- Le CTA passe a `60px` de hauteur et taille reduite.
- Les stats vehicule passent en grille 2 colonnes.

### Page De Jeu

**But :** conduire sans friction, lire la telemetry critique et ajuster la piste si la session est procedurale.

**Workflow UX :**

1. Le joueur arrive directement dans la scene 3D.
2. HUD bas droite : vitesse, RPM, rapport, transmission.
3. Hints clavier bas gauche sur desktop.
4. Bouton settings haut gauche uniquement si le circuit est procedural.
5. `Escape` affiche la pause overlay avec `RESUME` et `ABORT SESSION`.

**Composition desktop :**

- HUD ancre bas droite a `3rem`.
- Hints clavier ancres bas gauche a `3rem`.
- Settings toggle haut gauche a `2rem`.
- Panneau settings gauche `320px`, hauteur 100%, z-index intermediaire.
- Le centre de la piste reste libre.

**Composition mobile :**

- HUD reduit par `transform: scale(0.7)`, ancre bas droite a `1rem`.
- Hints clavier masques.
- Eviter tout controle permanent au centre.

## Elevation & Depth

La profondeur vient de la transparence, du blur, de la bordure et du clip-path. Les cartes blanches et shadows SaaS sont interdites.

**Niveaux :**

- **Niveau 0 :** canvas 3D, HUD nu, aucune carte.
- **Niveau 1 :** badge ou hint avec `--c-bg-glass`, bordure subtile, radius faible.
- **Niveau 2 :** panneau showroom avec `--c-bg-elevated`, blur `18px`, shadow directionnelle, clip-path.
- **Niveau 3 :** panneau settings avec `--c-bg-panel`, blur `40px`, bordure droite.
- **Niveau 4 :** overlay bloquant loading/menu/pause, z-index fort, radial focus.

**Regles :**

- Eviter les shadows multiples hors showroom.
- Les glows sont fonctionnels : RPM, CTA actif, piste miniature, slider actif.
- Le blur fort est reserve aux panneaux qui isolent une tache.
- Ne pas empiler des cards dans des cards ; utiliser sections, bordures internes ou panneaux fonctionnels.

## Shapes

La forme APEX est angulaire, decoupee et mecanique.

**Formes principales :**

- `clip-path polygon(10px/12px/16px)` pour boutons, panneaux et CTA.
- Radius `0` a `6px` pour elements rectangulaires.
- Radius rond reserve aux controles iconiques isoles (`settings-toggle`) ou orb du theme.
- Sliders : thumb carre, souvent tourne a 45 degres pour la piste procedurale.

**Regles :**

- Les grands arrondis sont interdits sur les CTA principaux.
- Les panneaux showroom doivent conserver leurs coins decoupes.
- Les controles iconiques peuvent etre compacts, mais la cible tactile doit rester proche de `40px`.
- Ne pas melanger formes molles et formes cyber dans la meme zone.

## Components

### Loader

Utilise pendant l'initialisation applicative.

- Texte : `INITIALIZING ENGINE`.
- Fond plein ecran `--c-bg-dark`.
- Barre horizontale animee, pas de spinner.
- Animation reversible et non bloquante visuellement.
- En reduced motion, supprimer l'animation.

### Menu Overlay

Utilise pour showroom et pause.

- Plein ecran, radial focus, assombrissement lateral.
- Transition sortie : opacity + scale leger.
- `pointer-events` coupes quand masque.
- Ne pas ajouter de contenu permanent inutile dans l'overlay.

### Brand Showroom

- Position haut gauche.
- `APEX` en `Rajdhani`, uppercase, letter-spacing fort.
- Baseline en `Inter`, petite, mute.
- Masquee pendant les reglages vehicule.
- Sur mobile, masquer la baseline pour economiser l'espace.

### Theme Toggle

- Iconique, haut droit, `30x30`.
- Etat gere par `aria-pressed`.
- Label accessible dynamique : activer theme sombre/clair.
- Pas de texte visible additionnel.
- Animation soleil/lune subtile ; desactivee en reduced motion.

### Showroom Mode Button

- Bouton decoupe, `min-height: 64px`.
- Label `Rajdhani`, metadata `Inter`.
- Hover : bordure plus forte, fond leger, barre laterale partielle.
- Actif : accent motorsport, barre laterale complete, `aria-pressed=true`.
- Disabled : opacity `0.42`, curseur non autorise.

### Vehicle Stage

- Scene 3D centrale React Three Fiber.
- Sol glossy avec reflection Drei, environnement dawn, fog et lumiere directionnelle.
- Drag/zoom autorises sans que les panneaux capturent le centre.
- Chargement/fallback doivent rester lisibles sans masquer durablement le vehicule.
- Les transitions gauche/droite verrouillent les fleches pour eviter les chevauchements.

### Vehicle Info

- Bloc bas centre, largeur max `740px`.
- Surface translucide decoupee avec blur `18px`.
- Nom vehicule centre, stats sous forme de meters.
- Navigation gauche/droite avec boutons typographiques.
- Wrench ouvre les reglages vehicule ; etat actif en motorsport.

### Vehicle Stats

- Labels courts.
- Barre animee + valeur numerique.
- Delta avec fleche haut/bas uniquement pendant comparaison.
- Les valeurs modifiees dans les reglages doivent se repercuter immediatement apres sauvegarde.

### Vehicle Settings View

Sous-vue showroom, sans demontage de la scene 3D.

- Masque brand, theme, modes, track, stats et CTA principal.
- Conserve vehicule et mini selecteur.
- Focus automatique sur fermeture.
- `Escape` ferme la sous-vue.
- Panneaux lateraux `Drive mode` et `Circuit` gardent la meme identite clip-path.
- Sliders stats : accent motorsport, valeur visible, actions `Annuler` et `Enregistrer`.
- Bouton `Enregistrer` affiche `Enregistrement...` pendant la persistence.

### Track Preview

- Panneau droit showroom.
- Miniature SVG top-down avec grille, halo motorsport, ligne blanche et marqueur depart.
- Corps : label, longueur, difficulte, seed.
- Bouton `New Track` secondaire, plein largeur.
- Etat indisponible : opacity reduite et raison explicite.

### Start Engine CTA

- Action primaire du showroom.
- Largeur du bloc vehicule, hauteur desktop `80px`, mobile `60px`.
- Accent motorsport plein, texte noir, glow fonctionnel.
- Animation pulse tres subtile autorisee seulement si elle ne gene pas.
- Disabled si selection invalide ou sous-vue reglages ouverte.
- Un seul CTA primaire par ecran.

### HUD Telemetry

- Bas droite, `280px`.
- Gauge RPM SVG avec arc blanc ; redline en danger.
- Vitesse centrale en grand `Rajdhani`, chiffres tabulaires.
- Rapport de boite sous la vitesse.
- Badge transmission en haut droit du gauge.
- Debug RPM visible en texte compact.
- Ne pas ajouter de longs labels dans le HUD.

### Controls Hint

- Bas gauche desktop uniquement.
- Opacity `0.6`, passe a `1` au hover.
- Groupes de touches sur surface glass.
- Capsules 24x24, touche longue pour `SPACE`.
- Masque sur mobile.

### Settings Toggle In-Game

- Haut gauche, rond `40x40`.
- Visible uniquement en conduite procedurale.
- Hover inverse fond/texte pour feedback immediat.
- Doit conserver `aria-label`.

### Settings Panel In-Game

- Panneau lateral gauche `320px`.
- Slide-in depuis `translateX(-100%)`.
- Contient generation, preset difficulte, sliders, favoris.
- Le panneau ne doit pas bloquer le HUD ni la lecture de piste plus que necessaire.
- Generation : bouton disabled + `aria-busy` + status live `Generation du circuit...`.
- Favoris : compteur `n/10`, empty state explicite, load/delete accessibles.

### Sliders Proceduraux

- Label gauche, valeur droite.
- Track 2px, thumb blanc carre tourne a 45 degres.
- Valeur mise a jour instantanement.
- Percentages conservent `%`.
- Toute interaction manuelle bascule la difficulte vers `custom`.

### Pause Overlay

- Overlay plein ecran.
- Titre `PAUSED`.
- Deux actions seulement : `RESUME` et `ABORT SESSION`.
- `ABORT SESSION` utilise la variante danger.
- Aucun panneau secondaire dans cet etat.

## States

### Loading

- Toujours contextualise : texte d'action moteur + barre.
- Pas de spinner vide.
- Ne pas afficher de controls tant que les preferences et disponibilites de piste ne sont pas connues.

### Empty

- Favoris vides : message court `No saved circuits yet.`
- Futurs empty states : expliquer ce qui manque et proposer l'action directe.
- Pas d'illustration decorative.

### Error

- Expliquer l'echec en une phrase.
- Proposer une action de reprise si possible.
- Utiliser danger uniquement pour erreurs ou actions destructives.
- Les assets GLB indisponibles doivent avoir fallback visuel ou raison explicite.

### Disabled

- Utiliser `disabled` natif quand possible.
- Ajouter `aria-disabled` si le controle reste structurellement present.
- Reduire opacity et bloquer pointer-events.
- Ne pas seulement changer la couleur.

### Busy

- Utiliser `aria-busy=true` sur les boutons qui declenchent une generation.
- Garder un `role=status` avec `aria-live=polite`.
- Eviter les doubles triggers pendant les operations synchrones couteuses.

### Success

- Confirmation subtile et non bloquante.
- Accent success reserve a feedback systeme, jamais a decoration.

## Motion

La motion doit expliquer un changement spatial ou un etat.

**Durations existantes :**

- Hover boutons : `0.2s` a `0.3s`.
- Panneaux showroom : entree `0.72s`.
- Sous-vue reglages vehicule : `0.45s` a `0.52s`.
- Panneau settings : `0.4s` avec `--ease-elastic`.
- Overlay : `0.6s`.
- RPM : `0.1s linear` pour suivre la telemetry.

**Easings :**

- `--ease-smooth: cubic-bezier(0.16, 1, 0.3, 1)`.
- `--ease-elastic: cubic-bezier(0.34, 1.56, 0.64, 1)` uniquement pour slide-in ou feedback spatial.

**Regles :**

- Pas d'animation decorative sans fonction.
- Reduced motion doit supprimer animations lourdes et transitions non essentielles.
- Les changements de vehicule utilisent un verrouillage pour proteger la coherence.
- Les animations doivent privilegier `transform` et `opacity`.

## Accessibility

- Tous les boutons iconiques ont un `aria-label`.
- Les boutons a selection utilisent `aria-pressed`.
- Les etats asynchrones utilisent `aria-busy` et `role=status` quand pertinent.
- `Escape` ferme les reglages vehicule et la pause reste controlee par le moteur.
- Focus visible : outline `2px solid --c-focus-ring`, offset `4px`.
- Les controls caches pendant les reglages vehicule passent en `aria-hidden` et `tabIndex=-1`.
- Les cibles tactiles importantes doivent viser `40px` minimum.
- Les hints clavier ne sont pas la seule source de controle ; ils sont aides visuelles.
- Ne pas mettre de texte critique avec opacite trop faible sur fond 3D lumineux.

## Performance

- Ne pas densifier le DOM pendant la conduite.
- Les updates telemetry doivent rester textuelles/SVG simples.
- Eviter les blurs superposes ; blur fort reserve au panneau settings.
- Le canvas showroom est couteux : eviter de demonter/remonter la scene pour des sous-vues UI.
- Les transitions doivent utiliser `transform` et `opacity`.
- La generation de piste peut bloquer le thread principal ; toujours fournir feedback avant calcul.
- Les assets 3D doivent avoir fallback et preload adjacent lorsque possible.

## Implementation Boundaries

**Sources React principales :**

- `src/ts/react/App.tsx` : phases `loading`, `menu`, `driving`.
- `src/ts/react/components/Showroom.tsx` : page showroom et sous-vue reglages.
- `src/ts/react/components/Hud.tsx` : telemetry in-game.
- `src/ts/react/components/SettingsPanel.tsx` : configuration procedurale.
- `src/ts/react/components/VehicleSettingsView.tsx` : reglages vehicule.
- `src/ts/react/components/TrackMiniature.tsx` : miniature circuit.

**Sources CSS principales :**

- `src/css/base/_tokens.css` : tokens couleurs, fonts, easings.
- `src/css/showroom/_shell.css` : structure showroom et reglages vehicule.
- `src/css/showroom/_modes.css` : boutons de modes.
- `src/css/showroom/_vehicle.css` : bloc vehicule, stats, navigation.
- `src/css/showroom/_track.css` : preview circuit et CTA start.
- `src/css/components/_hud.css` : HUD et hints.
- `src/css/components/_settings-panel.css` : panneau procedural.
- `src/css/components/_controls.css` : boutons, select, focus.
- `src/css/components/_loader-motion-responsive.css` : loader, keyframes, responsive, reduced motion.

## Do's and Don'ts

### Do

- Utiliser les tokens CSS existants avant d'ajouter une valeur.
- Garder le vehicule et la piste visuellement dominants.
- Ancrer les infos de conduite aux coins.
- Utiliser l'orange pour action, selection et energie motorsport.
- Documenter les nouveaux etats loading/error/empty.
- Verifier desktop et mobile pour tout changement de layout showroom.
- Preserver le focus clavier et les labels accessibles.
- Privilegier des changements chirurgicaux.

### Don't

- Ne pas ajouter de dashboard generique, cartes blanches ou layouts SaaS.
- Ne pas introduire de gradients violet/bleu.
- Ne pas couvrir le centre de la piste pendant la conduite.
- Ne pas ajouter de longs textes d'aide dans le HUD.
- Ne pas multiplier les polices.
- Ne pas utiliser de grands arrondis sur panneaux et CTA.
- Ne pas demonter la scene 3D showroom pour une sous-vue UI.
- Ne pas masquer une erreur asset sans feedback.
- Ne pas faire reposer un etat uniquement sur la couleur.

## Regression Checklist

Avant de livrer un changement UI/UX :

- **Showroom :** brand visible, panels lisibles, vehicule central, carousel verrouille pendant transition.
- **CTA :** `START ENGINE` est unique et disabled si selection invalide.
- **Reglages vehicule :** focus sur fermeture, `Escape` fonctionne, elements caches non focusables.
- **Jeu :** HUD bas droite lisible, hints desktop seulement, centre de piste libre.
- **Settings in-game :** generation busy visible, favoris vides explicites, delete accessible.
- **Responsive :** mobile sous `768px` sans chevauchement texte/panneaux.
- **Reduced motion :** pas d'animation essentielle qui disparait sans alternative.
- **Theme clair :** contrastes conserves, pas de carte blanche decorative.
- **Build :** `npm run build`.
- **Types :** `npx tsc --noEmit` ou `npm run typecheck`.
- **Tests piste :** `npm run test:trackgen` si la piste, settings ou generation sont touches.
