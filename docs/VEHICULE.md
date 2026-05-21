# Véhicule (SimpleCar) — Fonctionnement

Ce document décrit le fonctionnement du véhicule du projet : **rendu Three.js**, **physique Cannon.js**, contrôles et logique de conduite.

## Où est le code ?

- **Véhicule + logique conduite** : `src/ts/vehicles/SimpleCar.ts`
- **Roue (métadonnées)** : `src/ts/vehicles/Wheel.ts`
- **Auto-setup du modèle (collision + roues)** : `src/ts/vehicles/VehicleSetup.ts`
- **Boucle de simulation / intégration World** : `src/ts/main.ts` (classe `World`)

---

## 1) Architecture générale

### 1.1 Deux représentations synchronisées
Le véhicule est représenté par :

- **Une entité physique Cannon** : `SimpleCar.collision` (`CANNON.Body`)
- **Une entité visuelle Three.js** : `SimpleCar` étend `THREE.Object3D` (et contient le modèle GLTF)

La synchronisation est faite dans `SimpleCar.update(timeStep)` :

- `this.position` ← `collision.interpolatedPosition`
- `this.quaternion` ← `collision.interpolatedQuaternion`

### 1.2 Modèle de roues : `CANNON.RaycastVehicle`
La conduite est basée sur `CANNON.RaycastVehicle` :

- le châssis est le `CANNON.Body` (`collision`)
- les roues sont simulées via des raycasts (pas via des rigid bodies de roues)
- Cannon calcule suspension et contacts sol → on met à jour les meshes de roues ensuite

---

## 2) Chargement / setup du modèle 3D

### 2.1 `VehicleSetup.prepareModel(model)`
Avant de créer `SimpleCar`, `World.loadCar()` appelle :

- `VehicleSetup.prepareModel(gltf.scene)`

Ce setup automatique :

- **Ajoute une boîte de collision** au modèle (mesh invisible) avec `userData` :
  - `{ data: 'collision', shape: 'box' }`
- **Détecte les roues** en se basant sur le nom des objets (ex: `wheel_fl`, `wheel_rr` …) et assigne `userData` :
  - `{ data: 'wheel', drive: 'fwd'|'rwd'|'awd', steering: 'true'|'false', radius: <mesuré> }`
- **Détecte le volant** (optionnel) et assigne :
  - `{ data: 'steering_wheel' }`

### 2.2 Lecture des métadonnées côté `SimpleCar`
Dans le constructeur de `SimpleCar` :

- `readVehicleData(gltf)` traverse la scène :
  - si `userData.data === 'wheel'` → crée `new Wheel(child)` et l’ajoute à `this.wheels`
  - si `userData.data === 'collision'` → crée une shape Cannon (`CANNON.Box` ou `CANNON.Sphere`) et l’attache au `CANNON.Body`
- `readCarData(gltf)` trouve `steering_wheel` pour animer le volant

---

## 3) Paramètres physiques (suspension, friction, etc.)

### 3.1 Matériau physique
Dans `SimpleCar` :

Le châssis utilise un matériau Cannon dédié :

- `const mat = new CANNON.Material('Car')`

Puis :

- `this.collision.material = mat`

### 3.2 Châssis
- `this.collision = new CANNON.Body({ mass: 50 })`
- shapes ajoutées via `collision.addShape(...)` (dépend du `userData`)

### 3.3 Roues (RaycastVehicle)
Les options de roues sont dérivées de `handlingSetup` :

- `suspensionStiffness`, `suspensionRestLength`, `maxSuspensionTravel`
- `dampingRelaxation`, `dampingCompression`
- `frictionSlip`
- `rollInfluence`
- `axleLocal`, `directionLocal`

Chaque roue est ajoutée via :

- `this.rayCastVehicle.addWheel(wheelOptions)`

Le `radius` utilisé est celui de la roue si `userData.radius` est présent, sinon le défaut.

### 3.4 Adhérence réaliste (pneu x surface)
L’adhérence des roues est pilotée via `WheelInfo.frictionSlip` (Cannon RaycastVehicle). Ce paramètre limite l’impulsion maximale appliquée au contact sol/roue, et influence directement :

- le grip latéral (tendance à glisser)
- le transfert de couple (motricité)

#### 3.4.1 Types de surface
`SimpleCar` expose le type :

- `export type SurfaceType = 'default' | 'asphalt' | 'grass' | 'dirt' | 'ice'`

Dans `World.loadCar()` on branche un sampler :

- `car.setSurfaceSampler((x, z) => this.getSurfaceTypeAt(x, z))`

`World.getSurfaceTypeAt(x, z)` retourne une surface en fonction du niveau :

- niveau **procedural** :
  - `asphalt` sur la route (distance au centerline <= `trackWidth/2`)
  - `dirt` sur l’accotement proche (bande de +2m)
  - `grass` au-delà
- autres niveaux : fallback `grass` (à améliorer si on ajoute des collisions/metadata sol sur les meshes)

#### 3.4.2 Types de pneus (compound)
`SimpleCar` expose :

- `export type TireCompound = 'street' | 'sport' | 'offroad'`
- `SimpleCar.tireCompound` (par défaut `street`)

#### 3.4.3 Calcul du frictionSlip effectif
À chaque frame, après mise à jour des raycasts de roues, `SimpleCar.update()` appelle `updateWheelFrictionFromSurface()` qui ajuste `wheelInfos[i].frictionSlip` en combinant :

- une base `baseFrictionSlip` (issue de `handlingSetup.frictionSlip`)
- un facteur de compound (`street/sport/offroad`)
- un facteur de surface (`asphalt/grass/dirt/ice`)

Le résultat est clampé dans une plage sûre pour rester stable.

#### 3.4.4 Optimisation (FPS)
Pour éviter du travail inutile :

- `SimpleCar` garde en cache la dernière surface par roue (`lastSurfaceByWheel`)
- `frictionSlip` n’est recalculé/appliqué que si la surface détectée change

---

## 4) Contrôles et mapping des actions

### 4.1 Actions
`SimpleCar.actions` mappe les actions à des `KeyBinding` :

- `throttle` → `KeyW`
- `reverse` → `KeyS`
- `brake` → `Space`
- `left` → `KeyA`
- `right` → `KeyD`

Côté `World` (`handleKeyboard`) :

- les événements clavier appellent `car.triggerAction(action, pressed)`

### 4.2 Frein
Dans `onInputChange()` :

- si `brake.justPressed` → `setBrake(brakeForce, 'rwd')`
- si `brake.justReleased` → `setBrake(0, 'rwd')`

### 4.3 Touche S : frein 4 roues / marche arrière
La touche `S` (`reverse`) a un comportement contextuel :

- si la voiture avance au-delà d’un petit seuil de vitesse (`reverseBrakeSpeedThreshold`), `S` déclenche un **freinage 4 roues** via `setBrake(brakeForce)` (sans filtre) et coupe la force moteur
- une fois quasi à l’arrêt, `S` redevient une **marche arrière** (application de force moteur négative dédiée)

L’état interne `reverseBrakeActive` évite de rester freiné quand on relâche `S`.

---

## 5) Moteur / boîte (logique simplifiée)

Dans `SimpleCar.update(timeStep)` :

Le powertrain n’utilise plus une force moteur constante : il est basé sur un **régime moteur (RPM)**, une **courbe de couple** et des **rapports de boîte réels**.

### 5.1 Régime moteur (RPM) + inertie
`SimpleCar` maintient un état interne :

- `engineRpm` (régime courant)
- `idleRpm` (ralenti)
- `maxRpm` (zone rouge)

Le RPM est lissé (inertie moteur) : il ne suit pas instantanément l’entrée ou la vitesse des roues.

### 5.2 Courbe de couple (torque curve)
Le couple moteur dépend du régime via une courbe simple (quelques points interpolés). Le couple appliqué est :

- `engineTorqueNm = torqueCurve(rpm) * throttle`

### 5.3 Accélérateur progressif (filtrage input)
L’entrée `throttle` est filtrée pour éviter un comportement on/off :

- montée plus lente (`throttleRiseRate`)
- descente plus rapide (`throttleFallRate`)

### 5.4 Boîte auto : rapports + final drive
La boîte est modélisée avec :

- `gearRatios[]` (1..6)
- `reverseRatio`
- `finalDrive`
- `wheelRadius` (récupéré depuis `RaycastVehicle.wheelInfos[i].radius`, fallback sinon)

Le couple moteur est converti en force aux roues (avec un rendement `drivelineEfficiency`).

### 5.5 Logique d’auto-shift crédible + anti-oscillation
Le passage de rapports est basé sur le RPM :

- upshift si `engineRpm > upshiftRpm`
- downshift si `engineRpm < downshiftRpm`
- kickdown si throttle élevé et `engineRpm` bas (`kickdownRpm`)

Pour éviter les oscillations :

- `shiftCooldownTimer` impose un cooldown après chaque changement

### 5.6 Temps de passage + coupure de couple
Pendant un changement de rapport :

- `shiftTimer` simule le temps de passage
- le couple est réduit (torque cut) et réappliqué progressivement

### 5.7 Frein moteur (engine braking)
Quand l’accélérateur est relâché, un couple négatif est ajouté (frein moteur) afin de limiter la sensation de “glisse” et stabiliser la vitesse.

### 5.8 Télémétrie (HUD)
`SimpleCar` expose :

- `currentGear`
- `currentRpm`
- `redlineRpm`

Le HUD (dans `index.html`) peut utiliser ces valeurs pour une jauge RPM cohérente.

---

## 6) Direction (avec amortissement)

La direction est pilotée par un simulateur de ressort :

- `this.steeringSimulator = new SpringSimulator(60, 10, 0.6)`

Dans `physicsPreStep(body)` :

- calcule la vitesse signée (dot produit) pour alimenter `_speed`
- applique une résistance aérodynamique (drag) longitudinale (∝ v²) pour stabiliser la vitesse max
- calcule une correction de drift (`Utils.getSignedAngleBetweenVectors`)
- fixe `steeringSimulator.target` en fonction de :
  - input gauche/droite
  - vitesse (réduction de l’angle de braquage à haute vitesse)

Dans `update(timeStep)` :

- `steeringSimulator.simulate(timeStep)`
- `setSteeringValue(steeringSimulator.position)` sur les roues directrices
- si volant détecté → animation visuelle (`steeringWheel.rotation.z`)

---

## 7) Rotation en l’air (air control)

Quand les roues ne touchent plus le sol :

- `airSpinTimer` augmente
- le joueur peut influencer la rotation via `physicsPreStep` en modifiant `collision.angularVelocity`

L’influence dépend :

- du temps passé en l’air
- de la vitesse
- et d’un facteur de flip si le véhicule est retourné

---

## 8) Mise à jour dans la boucle de jeu (`World`)

Dans `World.animate()` :

1. calcul `timeStep` (clamp)
2. si pas en pause :
   - `physicsWorld.step(fixedTimeStep, timeStep, 10)`
   - `car.update(timeStep)` (synchro visuelle + logique moteur/direction)
3. `sky.update(camera)`
4. `updateCamera()` (caméra suiveuse)
5. `renderer.render(scene, camera)`

Le callback `collision.preStep` est utilisé pour exécuter `SimpleCar.physicsPreStep(...)` avant l’étape physique.

---

## 9) Spawn / reset

- `World.loadCar()` positionne la voiture avec `car.reset(x,y,z)` (ou `setPosition`)
- `SimpleCar.reset(...)` remet :
  - position
  - vitesses linéaires / angulaires à zéro
  - quaternion à `(0,0,0,1)`
  - actions/clavier à l’état relâché
  - mise à jour des transformations de roues

Côté `World`, la touche `R` appelle aussi `reset()` (et utilise la position de spawn adaptée au niveau).
