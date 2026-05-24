# Documentation Technique : SimpleCar & Auto-Setup

Ce document explique comment intégrer vos propres modèles 3D de voitures sans configuration complexe.

## 🆕 Système "Auto-Setup" (Nouveau)

Grâce à la classe `VehicleSetup`, vous n'avez plus besoin d'ajouter manuellement des "Custom Properties" dans Blender. Le code analyse le nom des objets dans votre fichier 3D et configure tout automatiquement.

### Comment préparer votre modèle 3D (Blender / Sketchfab)

Il suffit de **bien nommer** vos objets. Le système cherche des mots-clés dans les noms.

#### 1. Les Roues
Les objets correspondants aux roues doivent contenir le mot `Wheel` (ou `Tire`, `Roue`) ET une indication de position :

- **Avant Gauche** : Doit contenir `FL` ou `Front` + `Left`.
  - *Exemples valides :* `Wheel_FL`, `Tire_Front_Left`, `CarWheel_FL_01`
- **Avant Droite** : Doit contenir `FR` ou `Front` + `Right`.
  - *Exemples valides :* `Wheel_FR`, `Tire_Front_Right`
- **Arrière Gauche** : Doit contenir `RL`, `Rear`/`Back` + `Left`.
  - *Exemples valides :* `Wheel_RL`, `Tire_Rear_Left`
- **Arrière Droite** : Doit contenir `RR`, `Rear`/`Back` + `Right`.
  - *Exemples valides :* `Wheel_RR`, `Tire_Rear_Right`

#### 2. Le Volant (Optionnel)
Doit contenir `Steering` et `Wheel`.
- *Exemple :* `Steering_Wheel`, `Interior_SteeringWheel`

#### 3. La Collision (Automatique !)
Le système calcule automatiquement la taille de votre voiture (Bounding Box) et génère une boîte de collision physique invisible autour. Vous n'avez rien à faire.

---

## Utilisation dans le code

Pour charger une voiture, pointez simplement vers le fichier `.glb` :

```javascript
// Dans index.html ou main.ts
const world = new SimpleCar.World('car_models/car_blue.glb');
```

Le `VehicleSetup` s'exécutera automatiquement au chargement pour :
1. Trouver les roues et les détacher si nécessaire.
2. Configurer la traction (AWD par défaut) et la direction (Roues avant).
3. Créer la physique du châssis.

## Configuration Physique Avancée

Si vous souhaitez modifier le comportement (poids, suspension), modifiez le fichier `src/ts/vehicles/SimpleCar.ts` :

```typescript
const handlingSetup = {
    radius: 0.25,               // Rayon des roues (en mètres)
    suspensionStiffness: 20,    // Rigidité
    suspensionRestLength: 0.35, // Longueur suspension
    frictionSlip: 0.8,          // Adhérence
    // ...
};
```
