---
version: alpha
name: APEX
description: >
  Simulation de conduite 3D dark-first avec variante claire optionnelle,
  inspiree d'un cockpit motorsport.
  L'interface doit rester immersive, technique et lisible sans masquer le rendu
  Three.js ni ralentir l'action.

colors:
  primary: "#ffffff"
  secondary: "rgba(255, 255, 255, 0.5)"
  tertiary: "rgba(255, 255, 255, 0.1)"
  background: "#050505"
  background-solid: "#000000"
  surface-glass: "rgba(10, 10, 12, 0.65)"
  surface-panel: "rgba(10, 10, 12, 0.85)"
  surface-control: "rgba(255, 255, 255, 0.03)"
  border-subtle: "rgba(255, 255, 255, 0.1)"
  border-strong: "rgba(255, 255, 255, 0.3)"
  text-primary: "#ffffff"
  text-secondary: "rgba(255, 255, 255, 0.65)"
  text-muted: "rgba(255, 255, 255, 0.45)"
  glow-white: "rgba(255, 255, 255, 0.4)"
  error: "#ff3b30"
  warning: "#ffcc00"
  success: "#34c759"
  light-background: "#eef1ec"
  light-surface-glass: "rgba(244, 246, 243, 0.72)"
  light-surface-panel: "rgba(244, 246, 243, 0.9)"
  light-text-primary: "#10120f"
  light-text-secondary: "rgba(16, 18, 15, 0.68)"
  light-border-subtle: "rgba(16, 18, 15, 0.13)"

typography:
  display-xl:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "8rem"
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: "-0.02em"
    textTransform: uppercase
  display-lg:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "7rem"
    fontWeight: 700
    lineHeight: 0.8
    letterSpacing: "-2px"
    fontVariantNumeric: tabular-nums
  display-md:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "4.2rem"
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: "-1px"
    fontVariantNumeric: tabular-nums
  heading-sm:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.1em"
    textTransform: uppercase
  body-md:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.4
  label-md:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.05em"
    textTransform: uppercase
  label-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "1px"
    textTransform: uppercase

spacing:
  base: "4px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
  xxxl: "64px"
  screen-padding: "2rem"
  hud-offset: "3rem"

rounded:
  none: "0"
  sm: "4px"
  md: "6px"
  full: "9999px"

motion:
  ease-smooth: "cubic-bezier(0.16, 1, 0.3, 1)"
  ease-elastic: "cubic-bezier(0.34, 1.56, 0.64, 1)"
  fast: "0.2s"
  normal: "0.3s"
  panel: "0.4s"
  overlay: "0.6s"

effects:
  blur-light: "10px"
  blur-strong: "40px"
  text-glow: "0 0 10px rgba(255, 255, 255, 0.5)"
  rpm-glow: "drop-shadow(0 0 6px rgba(255, 255, 255, 0.5))"
  redline-glow: "drop-shadow(0 0 10px #ff3b30)"
---

# APEX - Design System

APEX est une simulation de conduite 3D dont l'interface agit comme une couche cockpit : precise, responsive et minimale. Le rendu 3D reste le produit principal ; l'UI doit guider, informer et reagir sans voler l'attention. Le theme sombre reste l'identite par defaut ; le theme clair est une variante de confort visuel, pas une refonte graphique.

---

## Vue D'ensemble

**Direction esthetique :** interface tactique motorsport, monochrome, angulaire, inspiree HUD.  
**Personnalite :** technique, rapide, compacte, immersive.  
**Cible :** joueur/pilote qui doit comprendre l'etat de la voiture et lancer une session sans friction.  
**Element memorable :** le contraste entre une scene 3D plein ecran et une UI ciselee, en surimpression type cockpit.

**Cibles emotionnelles :** concentration, vitesse, precision, controle.  
**Anti-cibles :** dashboard SaaS generique, cartes blanches, gradients bleu/violet, decoration gratuite, UI qui couvre la piste.

---

## Principes UX

- Chaque ecran sert une intention dominante : charger, choisir une piste, conduire, configurer le circuit procedural ou reprendre la session.
- Les overlays plein ecran sont reserves aux etats bloquants : loading, menu principal, pause.
- En conduite, les informations critiques restent aux coins : telemetrie en bas a droite, aides clavier en bas a gauche, configuration a gauche.
- Les interactions doivent donner un retour immediat : hover, active, panneau qui glisse, barre de chargement animee, RPM dynamique.
- Les controles ne doivent jamais bloquer le rendu 3D sauf pendant les overlays intentionnels.

---

## Couleurs

- **Blanc primaire (`#ffffff`) :** texte principal, lignes actives, arcs RPM, CTA, curseurs, icones.
- **Noir fond (`#050505` / `#000000`) :** scene de base, loading, select, zones de contraste fort.
- **Verre sombre (`rgba(10, 10, 12, 0.65)`) :** fond d'overlay ou surface immersive transparente.
- **Panneau sombre (`rgba(10, 10, 12, 0.85)`) :** panneau lateral de configuration.
- **Bordures subtiles (`rgba(255, 255, 255, 0.1)`) :** delimitation technique sans effet carte.
- **Bordures fortes (`rgba(255, 255, 255, 0.3)`) :** hover et etats actifs.
- **Texte secondaire (`rgba(255, 255, 255, 0.65)`) :** badges et metadata lisibles.
- **Texte mute (`rgba(255, 255, 255, 0.45)` / `0.5`) :** labels, unites, aides.
- **Danger (`#ff3b30`) :** redline RPM et actions destructives comme `ABORT SESSION`.
- **Success (`#34c759`) :** confirmations futures uniquement, jamais decoratif.
- **Warning (`#ffcc00`) :** etats de degradation futurs uniquement.
- **Theme clair (`#eef1ec`, `#10120f`) :** variante de lisibilite, a utiliser par tokens uniquement.

### Regles Couleur

- Garder une interface presque monochrome ; la couleur semantique doit signaler un etat, jamais decorer.
- Ne pas introduire de gradients bleu/violet. Le seul gradient actuel est blanc vers blanc translucide pour le titre `APEX`.
- Maintenir le contraste WCAG AA sur tout texte fonctionnel.
- Utiliser les surfaces transparentes seulement quand le contexte 3D reste lisible derriere.
- Toute nouvelle couleur fonctionnelle doit passer par un token CSS compatible sombre/clair.

### Themes Clair / Sombre

- Le theme actif est porte par `:root[data-theme="dark|light"]`.
- Le stockage utilisateur utilise `localStorage` avec la cle `apex-theme`.
- En absence de choix utilisateur, l'application suit `prefers-color-scheme`.
- Le theme sombre reste la reference visuelle et la premiere validation.
- Le theme clair inverse l'encre et les surfaces avec une base froide neutre, sans carte blanche decorative.
- Les controles HUD et overlays doivent rester lisibles sur canvas 3D variable dans les deux themes.
- Le changement de theme doit etre instantane, accessible au clavier et annonce par `aria-pressed` / `aria-label`.

---

## Typographie

La typographie porte l'identite racing : `Rajdhani` pour les donnees, titres et controles ; `Inter` pour les labels secondaires et le texte utilitaire.

- **Display / telemetry :** `Rajdhani`, 700, chiffres tabulaires pour vitesse, RPM et rapport.
- **Actions :** `Rajdhani`, 600, uppercase, espacement large pour l'effet cockpit.
- **Labels / unites :** `Inter`, 500, uppercase, opacite reduite.
- **Debug technique :** pile monospace systeme uniquement pour les informations de diagnostic.

### Regles Typographiques

- Utiliser `font-variant-numeric: tabular-nums` sur toutes les valeurs dynamiques.
- Garder les labels courts, uppercase et tres espacés.
- Ne pas multiplier les polices : `Rajdhani`, `Inter`, monospace debug.
- Eviter les tailles arbitraires. Reprendre l'echelle actuelle : `11px`, `12px`, `0.75rem`, `0.8rem`, `0.9rem`, `1rem`, `1.2rem`, `3.4rem`, `4.2rem`, `7rem`, `8rem`.

---

## Layout

L'application est un canvas 3D plein ecran avec une couche UI fixe au-dessus.

### Structure

- `#game-container` occupe toute la fenetre et reste en `z-index: 0`.
- `#ui-layer` occupe toute la fenetre, `z-index: 10`, `pointer-events: none`.
- Les controles interactifs retablissent `pointer-events: auto`.
- Les overlays (`.menu-overlay`, `.loader-overlay`) occupent `inset: 0`.
- Le panneau settings glisse depuis la gauche sur `320px`.

### Espacement

| Token | Valeur | Usage |
|---|---:|---|
| `xs` | `4px` | Ajustements fins, labels proches |
| `sm` | `8px` | Gaps clavier, badges, petits paddings |
| `md` | `16px` | Groupes de controls, padding standard |
| `lg` | `24px` | Gaps menu, groupes sliders |
| `xl` | `32px` | Padding panneau, padding global UI |
| `xxl` | `48px` | Offset HUD desktop |
| `xxxl` | `64px` | Separation titre/menu |

### Responsive

- A `max-width: 768px`, le titre principal passe a `4rem`.
- Le HUD est reduit avec `transform: scale(0.7)` et reste ancre bas droite.
- Les hints clavier sont caches sur mobile pour liberer l'espace de conduite.
- Toute nouvelle UI mobile doit privilegier les coins et eviter le centre de la scene.

---

## Elevation & Profondeur

La profondeur vient de l'opacite, du blur et des bordures, pas de cartes empilees.

| Niveau | Methode | Usage |
|---|---|---|
| 0 | Aucun effet | Canvas 3D, HUD nu |
| 1 | Fond noir translucide + bordure subtile | Hints clavier, badge transmission |
| 2 | `backdrop-filter: blur(10px)` + radial sombre | Menus plein ecran |
| 3 | `backdrop-filter: blur(40px)` + panneau opaque | Settings procedural |

### Regles

- Eviter les box-shadows de carte. Les seuls effets lumineux doivent accompagner les donnees actives : titre, RPM, slider thumb.
- Les overlays peuvent assombrir la scene mais doivent conserver l'impression d'immersion.

---

## Formes

APEX utilise des formes angulaires et compactes. Les grands arrondis sont rares.

| Token | Valeur | Usage |
|---|---:|---|
| `none` | `0` | Selects, panneaux, overlays |
| `sm` | `4px` | Key icons, key groups |
| `md` | `6px` | Badges techniques |
| `full` | `9999px` | Bouton rond settings uniquement |
| `clip-cyber` | polygon | Boutons principaux angulaires |

### Regles

- Les CTA utilisent la decoupe `clip-path` cyber, pas un radius classique.
- Ne pas introduire de grandes cartes arrondies.
- Les formes rondes sont reservees aux controles iconiques isoles, comme `settings-toggle`.
- Les toggles iconiques comme `theme-toggle` peuvent utiliser `border-radius: full` quand leur fonction est binaire et compacte.

---

## Motion

- **Overlay menu :** transition `0.6s var(--ease-smooth)`, avec scale leger en sortie.
- **Boutons :** transition `0.3s var(--ease-smooth)`, barre laterale qui apparait au hover, press `scale(0.98)`.
- **Settings panel :** `transform 0.4s var(--ease-elastic)` depuis la gauche.
- **RPM :** mise a jour lineaire courte (`0.1s`) pour suivre la telemetrie.
- **Loading :** barre horizontale animee, pas de spinner.

### Accessibilite Motion

Ajouter `prefers-reduced-motion` avant toute nouvelle animation lourde. Les transitions d'etat doivent rester comprehensibles sans animation.

---

## Composants

### Overlay Menu (`.menu-overlay`)

Overlay plein ecran centre, radial sombre et blur leger. Utilise pour le menu principal et la pause.

```css
background: radial-gradient(circle at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 100%);
backdrop-filter: blur(var(--blur-light));
transition: all 0.6s var(--ease-smooth);
```

Etats : visible, `.hidden` avec opacite nulle, `scale(1.05)` et blur retire.

### Bouton Principal (`.cyber-btn`)

CTA angulaire, uppercase, blanc sur surface noire translucide. Le hover augmente le contraste, decale le padding gauche et active une barre verticale blanche.

```css
background: rgba(255,255,255,0.03);
border: 1px solid rgba(255,255,255,0.1);
clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
```

Variantes : danger via `border-color: var(--c-danger)`.

### Select Circuit (`.cyber-select`)

Controle pleine largeur, fond noir, bordure blanche discrete, typographie display uppercase.

Etats : hover avec `border-color: white`. Tout ajout doit inclure un focus visible clavier.

### Theme Toggle (`.theme-toggle`)

Bouton minimaliste haut droit du menu principal. Il utilise un rail compact et un orb anime avec icone soleil/lune.

Regles :
- Toujours fournir `aria-label` et `aria-pressed`.
- Conserver une cible confortable sur mobile et desktop.
- Ne pas afficher de texte visible additionnel : l'icone et la position suffisent.
- Respecter `prefers-reduced-motion` en supprimant les transitions du toggle.
- Ne jamais appliquer de filtre global au canvas ; seuls les tokens UI changent.

### HUD Telemetrie (`.hud-cluster`)

Bloc bas droite regroupant RPM, vitesse, rapport et mode transmission. Les chiffres sont grands, tabulaires et blancs.

Regles :
- Garder les donnees critiques dans le gauge.
- Ne pas ajouter de texte descriptif long.
- Le mode transmission reste un badge discret.

### Gauge RPM (`.rpm-circle-fill`)

Arc SVG blanc avec glow, rouge en redline.

Etats :
- Normal : stroke blanc.
- Redline : `stroke: var(--c-danger)` + glow rouge.

### Hints Clavier (`.controls-hint`)

Groupes compacts bas gauche, fond noir translucide, opacite `0.6`, opacite `1` au hover.

Regles :
- Masquer sur mobile.
- Garder les descriptions courtes.
- Les touches utilisent des capsules 24x24, sauf touches longues.

### Panneau Settings (`.settings-panel`)

Panneau gauche `320px`, fond sombre dense, blur fort, bordure droite. Sert uniquement a la configuration du circuit procedural.

Etats :
- Ferme : `transform: translateX(-100%)`.
- Ouvert : `.active` avec `translateX(0)`.

### Sliders Proceduraux

Range input avec track 2px et thumb carre blanc tourne a 45 degres. Le hover agrandit le thumb.

Regles :
- Chaque slider a un label gauche et une valeur droite.
- Les valeurs doivent se mettre a jour instantanement pendant l'input.
- Les pourcentages doivent conserver le suffixe `%`.

### Loading (`.loader-overlay`)

Fond noir plein ecran, texte court et barre de progression animee. Pas de spinner.

---

## Etats Systemes

- **Loading :** `INITIALIZING ENGINE` + barre horizontale animee.
- **Empty :** pour une future liste vide, preferer un message court avec action directe, sans illustration decorative.
- **Error :** expliquer l'echec en une phrase, proposer une action de reprise, utiliser `#ff3b30`.
- **Success :** confirmation subtile, non bloquante, utiliser `#34c759`.
- **Disabled :** opacite reduite et curseur non interactif ; ne pas seulement changer la couleur.

---

## Accessibilite

- Ajouter un `:focus-visible` clair pour tout nouveau bouton, select ou input.
- Les controles iconiques doivent avoir un nom accessible (`aria-label`) si le texte visible manque.
- Ne jamais dependre uniquement de la couleur pour signaler un etat.
- Conserver un contraste suffisant sur fonds 3D variables.
- Les zones interactives doivent rester confortables sur mobile, minimum cible tactile proche de `40px`.

---

## Performance

- Ne pas ajouter de DOM dense au-dessus du canvas pendant la conduite.
- Preferer `transform` et `opacity` pour les transitions.
- Eviter les blurs multiples superposes ; le blur fort est reserve au panneau settings.
- Les mises a jour telemetrie doivent rester textuelles/SVG simples et ne pas declencher de layout global.

---

## Do / Don't

### Do

- Utiliser `Rajdhani` pour les titres, chiffres et actions.
- Garder les surfaces sombres, transparentes et fonctionnelles.
- Ancrer les infos de conduite aux bords de l'ecran.
- Utiliser le rouge uniquement pour danger/redline.
- Verifier desktop et mobile avant d'ajouter un element HUD.

### Don't

- Ne pas ajouter de cartes blanches ou de dashboard generique.
- Ne pas introduire de gradients bleu/violet ou de glassmorphism decoratif.
- Ne pas couvrir le centre de la piste pendant la conduite.
- Ne pas ajouter de longs textes d'aide in-game.
- Ne pas utiliser d'arrondis larges sur les CTA principaux.

---

## Sources Actuelles

- `src/css/style.css` : tokens CSS, composants et responsive.
- `index.html` : structure DOM des overlays, HUD et panneau procedural.
- `docs/UI_REFERENCE_APEX.md` : inventaire des IDs, classes, etats et triggers UI.
