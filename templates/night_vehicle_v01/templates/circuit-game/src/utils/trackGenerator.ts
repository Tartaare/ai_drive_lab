import * as THREE from 'three';

export interface TrackConfig {
  numControlPoints: number;    // Nombre de points de contrôle (8-20 recommandé)
  baseRadius: number;          // Rayon de base du circuit
  radiusVariation: number;     // Variation aléatoire du rayon (0-1)
  angleVariation: number;      // Variation angulaire des points (0-1)
  trackWidth: number;          // Largeur de la route
  sampleCount: number;         // Nombre de points échantillonnés sur la spline
  seed?: number;               // Seed optionnelle pour la reproductibilité
}

export interface TrackData {
  centerPoints: THREE.Vector3[];
  leftBorder: THREE.Vector3[];
  rightBorder: THREE.Vector3[];
  startLineIndex: number;
  curve: THREE.CatmullRomCurve3;
}

// Générateur pseudo-aléatoire avec seed
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// Vérifie si deux segments se croisent (en 2D, on ignore Y)
function segmentsIntersect(
  p1: THREE.Vector3, p2: THREE.Vector3,
  p3: THREE.Vector3, p4: THREE.Vector3
): boolean {
  const d1x = p2.x - p1.x;
  const d1z = p2.z - p1.z;
  const d2x = p4.x - p3.x;
  const d2z = p4.z - p3.z;

  const cross = d1x * d2z - d1z * d2x;
  if (Math.abs(cross) < 1e-10) return false;

  const dx = p3.x - p1.x;
  const dz = p3.z - p1.z;

  const t = (dx * d2z - dz * d2x) / cross;
  const u = (dx * d1z - dz * d1x) / cross;

  // On exclut les extrémités pour éviter les faux positifs aux jonctions
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}

// Vérifie si la courbe a des auto-intersections
function hasSelfIntersection(points: THREE.Vector3[]): boolean {
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    
    // On compare avec tous les segments non adjacents
    for (let j = i + 2; j < n; j++) {
      // Éviter de comparer le dernier segment avec le premier (ils sont adjacents dans une boucle)
      if (i === 0 && j === n - 1) continue;
      
      const p3 = points[j];
      const p4 = points[(j + 1) % n];
      
      if (segmentsIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }
  
  return false;
}

// Génère les points de contrôle autour d'un cercle avec variations
function generateControlPoints(config: TrackConfig, rng: SeededRandom): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const angleStep = (Math.PI * 2) / config.numControlPoints;

  for (let i = 0; i < config.numControlPoints; i++) {
    // Angle de base + variation
    const baseAngle = i * angleStep;
    const angleOffset = rng.range(-1, 1) * config.angleVariation * angleStep * 0.4;
    const angle = baseAngle + angleOffset;

    // Rayon avec variation
    const radiusOffset = rng.range(-1, 1) * config.radiusVariation * config.baseRadius;
    const radius = config.baseRadius + radiusOffset;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    points.push(new THREE.Vector3(x, 0, z));
  }

  return points;
}

// Calcule les bords de la route à partir des points centraux
function computeTrackBorders(
  centerPoints: THREE.Vector3[],
  trackWidth: number
): { left: THREE.Vector3[]; right: THREE.Vector3[] } {
  const left: THREE.Vector3[] = [];
  const right: THREE.Vector3[] = [];
  const halfWidth = trackWidth / 2;
  const n = centerPoints.length;

  for (let i = 0; i < n; i++) {
    const prev = centerPoints[(i - 1 + n) % n];
    const curr = centerPoints[i];
    const next = centerPoints[(i + 1) % n];

    // Tangente lissée (moyenne des directions avant/après)
    const tangent = new THREE.Vector3()
      .subVectors(next, prev)
      .normalize();

    // Normale perpendiculaire (dans le plan XZ)
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

    // Points des bords
    left.push(curr.clone().add(normal.clone().multiplyScalar(halfWidth)));
    right.push(curr.clone().add(normal.clone().multiplyScalar(-halfWidth)));
  }

  return { left, right };
}

// Génère un circuit valide (sans auto-intersection)
export function generateTrack(config: TrackConfig): TrackData {
  const maxAttempts = 50;
  let attempt = 0;
  let seed = config.seed ?? Math.floor(Math.random() * 1000000);

  while (attempt < maxAttempts) {
    const rng = new SeededRandom(seed + attempt);
    
    // Générer les points de contrôle
    const controlPoints = generateControlPoints(config, rng);
    
    // Créer la courbe CatmullRom fermée
    const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.5);
    
    // Échantillonner la courbe
    const centerPoints = curve.getPoints(config.sampleCount);
    // Retirer le dernier point (doublon du premier pour une courbe fermée)
    centerPoints.pop();
    
    // Vérifier les auto-intersections
    if (!hasSelfIntersection(centerPoints)) {
      // Calculer les bords
      const { left, right } = computeTrackBorders(centerPoints, config.trackWidth);
      
      // Vérifier que les bords ne s'intersectent pas non plus
      if (!hasSelfIntersection(left) && !hasSelfIntersection(right)) {
        return {
          centerPoints,
          leftBorder: left,
          rightBorder: right,
          startLineIndex: 0,
          curve
        };
      }
    }
    
    attempt++;
  }

  // Fallback: circuit circulaire simple si aucun valide trouvé
  console.warn('Impossible de générer un circuit sans intersection, utilisation du fallback circulaire');
  return generateCircularTrack(config);
}

// Circuit circulaire simple (fallback)
function generateCircularTrack(config: TrackConfig): TrackData {
  const points: THREE.Vector3[] = [];
  
  for (let i = 0; i < config.numControlPoints; i++) {
    const angle = (i / config.numControlPoints) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * config.baseRadius,
      0,
      Math.sin(angle) * config.baseRadius
    ));
  }
  
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
  const centerPoints = curve.getPoints(config.sampleCount);
  centerPoints.pop();
  
  const { left, right } = computeTrackBorders(centerPoints, config.trackWidth);
  
  return {
    centerPoints,
    leftBorder: left,
    rightBorder: right,
    startLineIndex: 0,
    curve
  };
}

// Configuration par défaut
export const defaultTrackConfig: TrackConfig = {
  numControlPoints: 12,
  baseRadius: 50,
  radiusVariation: 0.4,
  angleVariation: 0.3,
  trackWidth: 10,
  sampleCount: 200
};
