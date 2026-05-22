# Spécifications Techniques : Générateur Procédural de Circuits (APEX v2)

Ce document décrit le pipeline géométrique, les validations physiques/gameplay et les processus d'observabilité QA du générateur de circuits de course destiné aux équipes Dev et QA Senior.

---

## 1. Pipeline de Génération Géométrique

La génération repose sur une approche **Generate-and-Test** déterministe basée sur une graine (`seed` + `attempt`). Elle comporte 9 phases géométriques distinctes implémentées dans [ProceduralTrack.ts](file:///c:/Users/Coco/Documents/1-Python%20Stuff/1-Algo%20Car/1-Apps/1_Deep_Learning_Car/1_New/ai_driver_v00/src/ts/world/ProceduralTrack.ts) :

```
[ Graine ] ──> 1. Points 2D Aléatoires + Droite de Départ Verrouillée (Z = -0.85 R)
                   │
                   ▼
  3. Répulsion pushApart (Statique pour départ) ──> 4. Convex Hull (Graham Scan)
                                                        │
                                                        ▼
  6. Adoucissement fixAngles (Exclut départ) <── 5. Réinsertion pStartMid CCW
       (Angles < 80°)
   │
   ▼
 7. Spline Catmull-Rom Centripète ──> 8. Rééchantillonnage SpacedPoints (2m)
                                           │
                                           ▼
 10. Rapport QA (Validation) <── 9. Synthèse Bords & Grammaire de Perturbations Typées
```

1. **Injection de la Ligne de Départ (Verrouillage Absolu)** : Définition déterministe tout en bas du plan à $Z = -R_{\text{base}} \times 0.85$ de 3 points colinéaires :
   $$P_{\text{startLeft}} = (-0.45 R_{\text{base}}, 0, -0.85 R_{\text{base}})$$
   $$P_{\text{startMid}} = (0, 0, -0.85 R_{\text{base}})$$
   $$P_{\text{startRight}} = (0.45 R_{\text{base}}, 0, -0.85 R_{\text{base}})$$
   Les autres points aléatoires sont contraints à $Z > -0.85 R_{\text{base}} + 15\text{m}$ pour préserver le plan de départ.
2. **Répulsion Harmonique (`pushApart`)** : Relaxation itérative (15 passes). Les 3 points de départ sont gelés comme statiques (`isPointLocked`) ; ils repoussent activement les autres points à une distance $\ge 2.5 \times \text{trackWidth}$ pour éviter les pincements.
3. **Convex Hull (Graham Scan)** : Calcul de l'enveloppe convexe 2D. $P_{\text{startLeft}}$ et $P_{\text{startRight}}$ en forment naturellement les extrémités inférieures.
4. **Réinsertion CCW de la Ligne Droite** : Réintégration de $P_{\text{startMid}}$ pile entre les points extrêmes gauche et droit de départ pour garantir l'alignement absolu.
5. **Grammaire de Segments par Perturbation localisée** : Durant `insertMidpoints`, chaque segment valide (hors ligne de départ verrouillée) subit une perturbation typée déterministe liée à la graine :
   * `hairpin` (Épingle) : 2 points profonds insérés vers l'intérieur pour un virage sec à $180^\circ$.
   * `chicane` : Enchaînement gauche-droite rapide via 2 points à offsets opposés.
   * `esses` (S-curves) : 3 points oscillants dessinant un enchaînement sinueux rythmé.
   * `sweeper` (Courbe rapide) : Déviation minime pour conserver une vitesse de passage élevée.
   * `straight` (Ligne droite) : Aucune perturbation géométrique insérée.
6. **Adoucissement des Angles (`fixAngles`)** : Adoucit les angles fermés ($< 80^\circ$) en interpolant les sommets (5 passes, exclut les points verrouillés).
7. **Spline Catmull-Rom Centripète** : Interpolation via `THREE.CatmullRomCurve3`.
8. **Rééchantillonnage Régulier** : Discrétisation stricte par longueur d'arc à un pas de **$2.0$ mètres**.
9. **Synthèse des Bords Gauche/Droite** : Déport des limites de piste de $\pm \frac{\text{trackWidth}}{2}$.

---

## 2. Validation Strict du Circuit & Rapport QA (`QAReport`)

Chaque circuit généré génère un rapport QA rigoureux. Un échec à l'un des filtres rejette le circuit et lance la tentative suivante (même seed + tentative).

### Structure de l'Observabilité QA (`QAReport`)
```typescript
export interface QAReport {
    seed: number;
    attempt: number;
    accepted: boolean;
    rejectionReason: RejectionReason | null;
    length: number;
    minRadius: number;
    maxCurvature: number;
    avgCurvature: number;
    straightCount: number;
    longestStraight: number;
    turnCount: number;
    minTrackClearance: number;
    difficultyScore: number;
    hasValidStartStraight: boolean;
    selfIntersections: number;
}
```

### Critères de Filtrage Géométrique et Physique

* **Rayon de Courbure Local ($R$) Continu** : Calculé sur chaque triplet $(P_{i-1}, P_i, P_{i+1})$ avec $s \approx 2\text{m}$ :
  $$R_i = \frac{s}{2 \sin(\theta/2)} \quad (\text{avec } \theta \text{ l'angle de déviation})$$
  Rejet si $R_{\min} < \text{Seuil de Preset}$ (ex: $22\text{m}$ facile, $16\text{m}$ moyen, $12\text{m}$ difficile, $7\text{m}$ nightmare).
* **Clearance Segment-Segment** : Pour tout couple $(P_i, P_j)$ séparé par plus de $30\text{m}$ de distance d'arc :
  $$\text{Distance Euclidienne } (P_i, P_j) \ge 2.2 \times \text{trackWidth}$$
* **Validation de la Surface Tridimensionnelle** :
  * *Non-croisement* : Les segments gauche $[L_i, L_{i+1}]$ et droit $[R_i, R_{i+1}]$ ne doivent jamais s'intersecter.
  * *Pincement* : La largeur locale $dist(L_i, R_i)$ doit être dans la tolérance $[93\%, 107\%]$ de `trackWidth`.
  * *Continuité vectorielle* : Les normales successives doivent satisfaire $\vec{n}_i \cdot \vec{n}_{i+1} > 0$ (pas de torsion).
* **Score de Difficulté Gameplay** : Calculé sur un score normalisé $D \in [0.0, 1.0]$ intégrant la courbure moyenne, maximale, le nombre de freinages ($R_i < 18\text{m}$) et l'étroitesse. Rejet si le score dévie du preset (ex: $[0.24, 0.51]$ pour Moyen).
* **Ligne Droite de Départ Spawn** : Recherche et calage du spawn (index 0) au milieu d'une droite de $40\text{m}$ validée avec déviation orthogonale $\le 0.25\text{m}$ et déviation angulaire locale $\le 3^\circ$ par joint.

---

## 3. Profils de Difficulté Prédéfinis

Les 5 presets adaptent dynamiquement le générateur :

| Paramètre | FACILE | MOYEN | DIFFICILE | EXPERT | CAUCHEMAR |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Points de Contrôle ($N$)** | 8 | 10 | 12 | 14 | 16 |
| **Base Radius ($R$)** | 50m | 65m | 80m | 95m | 110m |
| **Chaos (Radius Var.)** | 15% | 30% | 40% | 50% | 60% |
| **Twist (Angle Var.)** | 10% | 25% | 35% | 45% | 55% |
| **Largeur de Piste** | 14m | 10m | 8.5m | 7.5m | 6.5m |
| **Rayon Min $R_{\min}$** | $\ge 22.0\text{m}$ | $\ge 16.0\text{m}$ | $\ge 12.0\text{m}$ | $\ge 9.0\text{m}$ | $\ge 7.0\text{m}$ |
| **Cible Difficulté $D$** | $[0.0, 0.26]$ | $[0.24, 0.51]$ | $[0.49, 0.71]$ | $[0.69, 0.89]$ | $[0.87, 1.0]$ |

---

## 4. Vibreurs 3D (Kerbs) & Physique de Surface

Les vibreurs tirent parti d'un comportement physique enrichi :
* **Surface physique `'kerb'`** : Retourné par `getSurfaceTypeAt` pour les roues en contact avec le vibreur.
* **Grip Réduit** : Le coefficient d'adhérence sur `'kerb'` est fixé à **`0.92`** (dans `SimpleCar.ts`) pour simuler le caractère glissant du relief peint (asphalte = $1.0$, herbe = $0.55$).
* **Vibrations Physiques Hautes Fréquences** : Si au moins une roue touche une surface `'kerb'`, des vibrations de suspension périodiques de **$35\text{ Hz}$** d'amplitude proportionnelle à la vitesse sont directement appliquées comme forces Cannon.js sur le châssis, simulant un retour physique parfait.
