import * as THREE from 'three';

export interface CurvatureMetrics {
    minRadius: number;
    maxCurvature: number;
    avgCurvature: number;
    turnCount: number;
    brakingZoneCount: number;
}

export function analyzeCurvature(points: THREE.Vector3[], _spacing: number): CurvatureMetrics {
    const n = points.length;
    let minRadius = Infinity;
    let maxCurvature = 0;
    let sumCurvature = 0;
    let turnCount = 0;
    let brakingZoneCount = 0;
    let inBrakingZone = false;

    for (let i = 0; i < n; i++) {
        const prev = points[(i - 1 + n) % n];
        const curr = points[i];
        const next = points[(i + 1) % n];

        const v1 = new THREE.Vector3().subVectors(curr, prev);
        const v2 = new THREE.Vector3().subVectors(next, curr);
        const len1 = v1.length();
        const len2 = v2.length();

        if (len1 > 1e-6 && len2 > 1e-6) {
            const dot = THREE.MathUtils.clamp(v1.dot(v2) / (len1 * len2), -1, 1);
            const deltaAngle = Math.acos(dot); // Heading direction change angle

            const s = (len1 + len2) * 0.5;
            let radius = Infinity;
            
            if (deltaAngle > 1e-5) {
                radius = s / (2 * Math.sin(deltaAngle / 2));
            }

            const curvature = 1 / radius;
            
            if (radius < minRadius) {
                minRadius = radius;
            }
            if (curvature > maxCurvature) {
                maxCurvature = curvature;
            }
            sumCurvature += curvature;

            // Turn is significant if radius < 50 meters
            if (radius < 50.0) {
                turnCount++;
            }

            // Braking zone is triggered if radius < 18 meters
            if (radius < 18.0) {
                if (!inBrakingZone) {
                    brakingZoneCount++;
                    inBrakingZone = true;
                }
            } else {
                inBrakingZone = false;
            }
        }
    }

    return {
        minRadius: minRadius,
        maxCurvature: maxCurvature,
        avgCurvature: sumCurvature / n,
        turnCount: Math.round(turnCount / 8), // Normalized to avoid multi-counting adjacent samples
        brakingZoneCount: brakingZoneCount
    };
}

export function getMinRadiusThreshold(difficulty: string): number {
    switch (difficulty) {
        case 'facile': return 4.0;
        case 'moyen': return 3.5;
        case 'difficile': return 3.0;
        case 'expert': return 2.5;
        case 'vraiment_difficile': return 2.0;
        default: return 3.5;
    }
}

function measureLocalRadius(prev: THREE.Vector3, curr: THREE.Vector3, next: THREE.Vector3): number {
    const v1 = new THREE.Vector3().subVectors(curr, prev);
    const v2 = new THREE.Vector3().subVectors(next, curr);
    const len1 = v1.length();
    const len2 = v2.length();

    if (len1 <= 1e-6 || len2 <= 1e-6) {
        return Infinity;
    }

    const dot = THREE.MathUtils.clamp(v1.dot(v2) / (len1 * len2), -1, 1);
    const deltaAngle = Math.acos(dot);

    if (deltaAngle <= 1e-5) {
        return Infinity;
    }

    const s = (len1 + len2) * 0.5;
    return s / (2 * Math.sin(deltaAngle / 2));
}

export function smoothTightRadii(
    points: THREE.Vector3[],
    minRadius: number,
    iterations: number
): THREE.Vector3[] {
    let smoothed = points.map(point => point.clone());
    const n = smoothed.length;

    for (let iteration = 0; iteration < iterations; iteration++) {
        const nextPoints = smoothed.map(point => point.clone());
        let changed = false;

        for (let i = 0; i < n; i++) {
            const prev = smoothed[(i - 1 + n) % n];
            const curr = smoothed[i];
            const next = smoothed[(i + 1) % n];
            const radius = measureLocalRadius(prev, curr, next);

            if (radius >= minRadius) {
                continue;
            }

            const severity = THREE.MathUtils.clamp((minRadius - radius) / minRadius, 0, 1);
            const midpoint = new THREE.Vector3().addVectors(prev, next).multiplyScalar(0.5);
            nextPoints[i].lerp(midpoint, 0.25 + severity * 0.35);
            changed = true;
        }

        smoothed = nextPoints;

        if (!changed) {
            break;
        }
    }

    return smoothed;
}


