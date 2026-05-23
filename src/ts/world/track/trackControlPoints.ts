import * as THREE from 'three';
import { SeededRandom, isPointLocked } from './trackSpatial';

export function insertMidpoints(
    points: THREE.Vector3[],
    chaos: number,
    baseRadius: number,
    rng: SeededRandom
): THREE.Vector3[] {
    const result: THREE.Vector3[] = [];
    const n = points.length;
    
    // Abstract layout grammar kinds
    const segmentKinds = ['straight', 'hairpin', 'chicane', 'esses', 'sweeper'];

    for (let i = 0; i < n; i++) {
        const curr = points[i];
        const next = points[(i + 1) % n];

        result.push(curr.clone());

        // Skip perturbation on starting straight locked line
        if (isPointLocked(curr, baseRadius) && isPointLocked(next, baseRadius)) {
            continue;
        }

        const tangent = new THREE.Vector3().subVectors(next, curr);
        const length = tangent.length();

        if (length > 10.0) {
            const kindIdx = Math.floor(rng.range(0, segmentKinds.length));
            const kind = segmentKinds[kindIdx];

            const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
            const mid = new THREE.Vector3().addVectors(curr, next).multiplyScalar(0.5);

            if (kind === 'straight') {
                continue; // Do not perturb, keep straight transition segment
            } else if (kind === 'sweeper') {
                // Wide progressive corner
                const perturbAmount = rng.range(0.12, 0.22) * length * chaos;
                mid.addScaledVector(normal, perturbAmount);
                result.push(mid);
            } else if (kind === 'hairpin') {
                // Double points creating a deep 180° hairpin turn
                const depth = rng.range(0.45, 0.65) * length * chaos;
                const p1 = curr.clone().addScaledVector(tangent, 0.35).addScaledVector(normal, depth);
                const p2 = curr.clone().addScaledVector(tangent, 0.65).addScaledVector(normal, depth);
                result.push(p1, p2);
            } else if (kind === 'chicane') {
                // Rapid left-right double corner
                const offset = rng.range(0.20, 0.35) * length * chaos;
                const p1 = curr.clone().addScaledVector(tangent, 0.33).addScaledVector(normal, offset);
                const p2 = curr.clone().addScaledVector(tangent, 0.66).addScaledVector(normal, -offset);
                result.push(p1, p2);
            } else if (kind === 'esses') {
                // Rhythmesses S-curves
                const offset = rng.range(0.18, 0.30) * length * chaos;
                const p1 = curr.clone().addScaledVector(tangent, 0.25).addScaledVector(normal, offset);
                const p2 = curr.clone().addScaledVector(tangent, 0.50).addScaledVector(normal, -offset);
                const p3 = curr.clone().addScaledVector(tangent, 0.75).addScaledVector(normal, offset);
                result.push(p1, p2, p3);
            }
        }
    }

    return result;
}

// --- Smooth Sharp Angles ---
export function fixAngles(points: THREE.Vector3[], minAngleRad: number, baseRadius: number, iterations: number = 3): void {
    const n = points.length;
    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < n; i++) {
            const curr = points[i];
            if (isPointLocked(curr, baseRadius)) continue; // Keep the locked starting line flat

            const prev = points[(i - 1 + n) % n];
            const next = points[(i + 1) % n];

            const v1 = new THREE.Vector3().subVectors(prev, curr);
            const v2 = new THREE.Vector3().subVectors(next, curr);

            const len1 = v1.length();
            const len2 = v2.length();

            if (len1 > 1e-6 && len2 > 1e-6) {
                const dot = v1.dot(v2) / (len1 * len2);
                const angle = Math.acos(THREE.MathUtils.clamp(dot, -1, 1));

                if (angle < minAngleRad) {
                    const target = new THREE.Vector3().addVectors(prev, next).multiplyScalar(0.5);
                    curr.lerp(target, 0.45);
                }
            }
        }
    }
}

// --- Arc length based starting straight search with strict straight line check ---
export function findStartingStraight(points: THREE.Vector3[], spacing: number, minLength: number): number {
    const n = points.length;
    const neededPoints = Math.ceil(minLength / spacing);

    for (let i = 0; i < n; i++) {
        let isStraight = true;

        const A = points[i];
        const B = points[(i + neededPoints) % n];

        const dx = B.x - A.x;
        const dz = B.z - A.z;
        const len = Math.sqrt(dx * dx + dz * dz);

        if (len < 1e-6) {
            continue;
        }

        // 1. Orthogonal distance validation (flèche orthogonale)
        // Ensure no point deviates by more than 0.25m from the straight line AB
        for (let k = 1; k < neededPoints; k++) {
            const P = points[(i + k) % n];
            const dist = Math.abs((P.x - A.x) * dz - (P.z - A.z) * dx) / len;
            if (dist > 0.25) {
                isStraight = false;
                break;
            }
        }

        if (!isStraight) continue;

        // 2. Strict local angular deviation check (maximum 3 degrees per segment)
        for (let k = 0; k < neededPoints; k++) {
            const idx1 = (i + k) % n;
            const idx2 = (i + k + 1) % n;
            const idx3 = (i + k + 2) % n;

            const p1 = points[idx1];
            const p2 = points[idx2];
            const p3 = points[idx3];

            const v1 = new THREE.Vector3().subVectors(p1, p2);
            const v2 = new THREE.Vector3().subVectors(p3, p2);
            const len1 = v1.length();
            const len2 = v2.length();

            if (len1 > 1e-6 && len2 > 1e-6) {
                const dot = v1.dot(v2) / (len1 * len2);
                const angle = Math.acos(THREE.MathUtils.clamp(dot, -1, 1));
                const diffFromStraight = Math.abs(angle - Math.PI);
                
                // Allow maximum 3 degrees deviation per joint
                if (diffFromStraight > (3 * Math.PI) / 180) {
                    isStraight = false;
                    break;
                }
            }
        }

        if (isStraight) {
            // Return the middle index of the valid straight section
            return Math.round((i + neededPoints / 2) % n);
        }
    }
    return -1;
}

export function findFallbackStartIndex(points: THREE.Vector3[]): number {
    let startIndex = 0;
    let lowestZ = points[0].z;

    for (let i = 1; i < points.length; i++) {
        if (points[i].z < lowestZ) {
            lowestZ = points[i].z;
            startIndex = i;
        }
    }

    return startIndex;
}

