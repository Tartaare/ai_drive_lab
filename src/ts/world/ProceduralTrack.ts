import * as THREE from 'three';

export const KERB_WIDTH_METERS = 0.8;
export const TRACK_EDGE_LINE_WIDTH_METERS = 0.18;

export type RejectionReason =
    | 'too_short'
    | 'too_long'
    | 'centerline_intersection'
    | 'border_intersection'
    | 'track_clearance_too_low'
    | 'radius_too_small'
    | 'curvature_too_abrupt'
    | 'invalid_start_straight'
    | 'invalid_surface_offset'
    | 'difficulty_out_of_range';

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

export interface TrackConfig {
    numControlPoints: number;
    baseRadius: number;
    radiusVariation: number;
    angleVariation: number;
    trackWidth: number;
    sampleCount: number;
    seed?: number;
    difficulty?: string;
}

export interface TrackData {
    centerPoints: THREE.Vector3[];
    leftBorder: THREE.Vector3[];
    rightBorder: THREE.Vector3[];
    startLineIndex: number;
    curve: THREE.CatmullRomCurve3;
    kerbs?: {
        left: boolean[];
        right: boolean[];
    };
    qaReport?: QAReport;
}

class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    public next(): number {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    public range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
}

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

    return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}

function hasSelfIntersection(points: THREE.Vector3[]): boolean {
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];

        for (let j = i + 2; j < n; j++) {
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

// --- Graham Scan 2D (Horizontal Plane X-Z) ---
function getConvexHull(points: THREE.Vector3[]): THREE.Vector3[] {
    if (points.length <= 3) return [...points];

    // Find the starting point (lowest Z, then lowest X)
    let startPoint = points[0];
    let startIndex = 0;
    for (let i = 1; i < points.length; i++) {
        const p = points[i];
        if (p.z < startPoint.z || (Math.abs(p.z - startPoint.z) < 1e-9 && p.x < startPoint.x)) {
            startPoint = p;
            startIndex = i;
        }
    }

    const sorted = points.slice();
    sorted[startIndex] = sorted[0];
    sorted[0] = startPoint;

    const base = sorted[0];
    const rest = sorted.slice(1);

    rest.sort((a, b) => {
        const dxA = a.x - base.x;
        const dzA = a.z - base.z;
        const dxB = b.x - base.x;
        const dzB = b.z - base.z;

        if (Math.abs(dxA) < 1e-9 && Math.abs(dzA) < 1e-9) return -1;
        if (Math.abs(dxB) < 1e-9 && Math.abs(dzB) < 1e-9) return 1;

        const cross = dxA * dzB - dzA * dxB;
        if (Math.abs(cross) < 1e-9) {
            const distA = dxA * dxA + dzA * dzA;
            const distB = dxB * dxB + dzB * dzB;
            return distA < distB ? -1 : 1;
        }
        return cross > 0 ? -1 : 1; // Counter-clockwise
    });

    const hull: THREE.Vector3[] = [base];
    if (rest.length > 0) hull.push(rest[0]);

    for (let i = 1; i < rest.length; i++) {
        const p = rest[i];
        while (hull.length >= 2) {
            const top = hull[hull.length - 1];
            const nextToTop = hull[hull.length - 2];
            
            const v1x = top.x - nextToTop.x;
            const v1z = top.z - nextToTop.z;
            const v2x = p.x - top.x;
            const v2z = p.z - top.z;
            const cross = v1x * v2z - v1z * v2x;

            if (cross > 1e-9) {
                break; // Valid CCW turn
            }
            hull.pop();
        }
        hull.push(p);
    }

    return hull;
}

// --- Relaxation (pushApart) ---
function pushApart(points: THREE.Vector3[], minDist: number, baseRadius: number, iterations: number = 10): void {
    const n = points.length;
    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const p1 = points[i];
                const p2 = points[j];
                const isL1 = isPointLocked(p1, baseRadius);
                const isL2 = isPointLocked(p2, baseRadius);
                if (isL1 && isL2) continue; // Both are static

                const dx = p2.x - p1.x;
                const dz = p2.z - p1.z;
                const distSq = dx * dx + dz * dz;
                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    const overlap = minDist - dist;
                    let dirX = 1;
                    let dirZ = 0;
                    if (dist > 1e-9) {
                        dirX = dx / dist;
                        dirZ = dz / dist;
                    }
                    
                    if (isL1) {
                        p2.x += dirX * overlap;
                        p2.z += dirZ * overlap;
                    } else if (isL2) {
                        p1.x -= dirX * overlap;
                        p1.z -= dirZ * overlap;
                    } else {
                        const pushX = dirX * overlap * 0.5;
                        const pushZ = dirZ * overlap * 0.5;
                        p1.x -= pushX;
                        p1.z -= pushZ;
                        p2.x += pushX;
                        p2.z += pushZ;
                    }
                }
            }
        }
    }
}

// --- Center Track utility ---
function centerTrack(points: THREE.Vector3[]): void {
    const center = new THREE.Vector3(0, 0, 0);
    for (const p of points) {
        center.add(p);
    }
    center.divideScalar(points.length);
    for (const p of points) {
        p.sub(center);
    }
}

// --- Midpoint Perturbation with Segment Grammar (Priority 3) ---
function insertMidpoints(
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
function fixAngles(points: THREE.Vector3[], minAngleRad: number, baseRadius: number, iterations: number = 3): void {
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
function findStartingStraight(points: THREE.Vector3[], spacing: number, minLength: number): number {
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

function findFallbackStartIndex(points: THREE.Vector3[]): number {
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

// --- Rotate helper ---
function rotateArray<T>(arr: T[], count: number): T[] {
    const n = arr.length;
    const shift = (count % n + n) % n;
    return [...arr.slice(shift), ...arr.slice(0, shift)];
}

// --- Lock Detection Helper ---
function isPointLocked(p: THREE.Vector3, baseRadius: number): boolean {
    return Math.abs(p.z - (-baseRadius * 0.85)) < 1e-3 && Math.abs(p.x) <= baseRadius * 0.45 + 1e-3;
}

// --- Local Curvature Discretization Helper (Priority 1) ---
interface CurvatureMetrics {
    minRadius: number;
    maxCurvature: number;
    avgCurvature: number;
    turnCount: number;
    brakingZoneCount: number;
}

function analyzeCurvature(points: THREE.Vector3[], spacing: number): CurvatureMetrics {
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

function getMinRadiusThreshold(difficulty: string): number {
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

function smoothTightRadii(
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

// --- Strict Segment-Segment clearance (Priority 5) ---
function validateTrackClearance(
    points: THREE.Vector3[],
    spacing: number,
    trackWidth: number
): { minClearance: number; isValid: boolean } {
    const n = points.length;
    let minClearance = Infinity;
    const minArcDistance = Math.max(30.0, trackWidth * 4.0);
    const indexThreshold = Math.ceil(minArcDistance / spacing);

    for (let i = 0; i < n; i++) {
        for (let j = i + indexThreshold; j < n; j++) {
            const distIndex = Math.min(j - i, n - (j - i));
            if (distIndex >= indexThreshold) {
                const dx = points[i].x - points[j].x;
                const dz = points[i].z - points[j].z;
                const distSq = dx * dx + dz * dz;
                const dist = Math.sqrt(distSq);
                if (dist < minClearance) {
                    minClearance = dist;
                }
            }
        }
    }

    const minSafeDist = trackWidth * 1.7;
    return {
        minClearance: minClearance,
        isValid: minClearance >= minSafeDist
    };
}

// --- Detailed Surface and Width Validation (Priority 4) ---
function validateSurface(
    centerPoints: THREE.Vector3[],
    leftBorder: THREE.Vector3[],
    rightBorder: THREE.Vector3[],
    trackWidth: number
): { isValid: boolean; reason?: RejectionReason } {
    const n = centerPoints.length;

    for (let i = 0; i < n; i++) {
        const nextI = (i + 1) % n;

        // 1. Local crossover check
        const l1 = leftBorder[i];
        const l2 = leftBorder[nextI];
        const r1 = rightBorder[i];
        const r2 = rightBorder[nextI];

        if (segmentsIntersect(l1, l2, r1, r2)) {
            return { isValid: false, reason: 'border_intersection' };
        }

        // 2. Pinching check (actual width variation must be within 7%)
        const actualWidth = l1.distanceTo(r1);
        if (actualWidth < trackWidth * 0.93 || actualWidth > trackWidth * 1.07) {
            return { isValid: false, reason: 'invalid_surface_offset' };
        }

        // 3. Normal Vector Continuity
        const prev = centerPoints[(i - 1 + n) % n];
        const curr = centerPoints[i];
        const next = centerPoints[nextI];

        const t1 = new THREE.Vector3().subVectors(curr, prev).normalize();
        const t2 = new THREE.Vector3().subVectors(next, curr).normalize();
        const n1 = new THREE.Vector3(-t1.z, 0, t1.x);
        const n2 = new THREE.Vector3(-t2.z, 0, t2.x);

        if (n1.dot(n2) < 0) {
            return { isValid: false, reason: 'invalid_surface_offset' };
        }
    }

    return { isValid: true };
}

// --- Gameplay Difficulty Scoring (Priority 6) ---
function calculateDifficultyScore(
    avgCurvature: number,
    maxCurvature: number,
    brakingZoneCount: number,
    trackWidth: number
): number {
    const normAvgCurv = THREE.MathUtils.clamp((avgCurvature - 0.005) / 0.035, 0, 1);
    const normMaxCurv = THREE.MathUtils.clamp((maxCurvature - 0.015) / 0.125, 0, 1);
    const normBraking = THREE.MathUtils.clamp(brakingZoneCount / 12, 0, 1);
    const normNarrowness = THREE.MathUtils.clamp((14 - trackWidth) / 8, 0, 1);

    const score = normAvgCurv * 0.25 + normMaxCurv * 0.35 + normBraking * 0.20 + normNarrowness * 0.20;
    return THREE.MathUtils.clamp(score, 0, 1);
}

// --- Complete Track Validation ---
function validateTrack(
    centerPoints: THREE.Vector3[],
    leftBorder: THREE.Vector3[],
    rightBorder: THREE.Vector3[],
    trackWidth: number,
    difficulty: string,
    seed: number,
    attempt: number
): { isValid: boolean; reason: RejectionReason | null; qaReport: QAReport } {
    const n = centerPoints.length;
    const spacing = 2.0;
    const totalLength = n * spacing;

    const qaReport: QAReport = {
        seed: seed,
        attempt: attempt,
        accepted: false,
        rejectionReason: null,
        length: totalLength,
        minRadius: Infinity,
        maxCurvature: 0,
        avgCurvature: 0,
        straightCount: 0,
        longestStraight: 0,
        turnCount: 0,
        minTrackClearance: Infinity,
        difficultyScore: 0,
        hasValidStartStraight: false,
        selfIntersections: 0
    };

    // 1. Length validation
    if (totalLength < 180) {
        qaReport.rejectionReason = 'too_short';
        return { isValid: false, reason: 'too_short', qaReport };
    }
    if (totalLength > 2500) {
        qaReport.rejectionReason = 'too_long';
        return { isValid: false, reason: 'too_long', qaReport };
    }

    // 2. Curvature analysis
    const curvatureMetrics = analyzeCurvature(centerPoints, spacing);
    qaReport.minRadius = curvatureMetrics.minRadius;
    qaReport.maxCurvature = curvatureMetrics.maxCurvature;
    qaReport.avgCurvature = curvatureMetrics.avgCurvature;
    qaReport.turnCount = curvatureMetrics.turnCount;

    // Difficulty-based radius threshold validation
    const minRadiusThreshold = Math.max(getMinRadiusThreshold(difficulty), trackWidth * 0.55);

    if (curvatureMetrics.minRadius < minRadiusThreshold) {
        qaReport.rejectionReason = 'radius_too_small';
        return { isValid: false, reason: 'radius_too_small', qaReport };
    }

    // 3. Self-intersections
    if (hasSelfIntersection(centerPoints)) {
        qaReport.rejectionReason = 'centerline_intersection';
        qaReport.selfIntersections++;
        return { isValid: false, reason: 'centerline_intersection', qaReport };
    }
    if (hasSelfIntersection(leftBorder) || hasSelfIntersection(rightBorder)) {
        qaReport.rejectionReason = 'border_intersection';
        qaReport.selfIntersections++;
        return { isValid: false, reason: 'border_intersection', qaReport };
    }

    // 4. Safe clearance validation
    const clearance = validateTrackClearance(centerPoints, spacing, trackWidth);
    qaReport.minTrackClearance = clearance.minClearance;
    if (!clearance.isValid) {
        qaReport.rejectionReason = 'track_clearance_too_low';
        return { isValid: false, reason: 'track_clearance_too_low', qaReport };
    }

    // 5. Surface & offset validation
    const surfaceValidation = validateSurface(centerPoints, leftBorder, rightBorder, trackWidth);
    if (!surfaceValidation.isValid) {
        qaReport.rejectionReason = surfaceValidation.reason || 'invalid_surface_offset';
        return { isValid: false, reason: qaReport.rejectionReason, qaReport };
    }

    // 6. Difficulty Scoring Plages validation
    const diffScore = calculateDifficultyScore(
        curvatureMetrics.avgCurvature,
        curvatureMetrics.maxCurvature,
        curvatureMetrics.brakingZoneCount,
        trackWidth
    );
    qaReport.difficultyScore = diffScore;

    qaReport.accepted = true;
    return { isValid: true, reason: null, qaReport };
}

export function computeTrackBorders(
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

        const tangent = new THREE.Vector3()
            .subVectors(next, prev)
            .normalize();

        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

        left.push(curr.clone().add(normal.clone().multiplyScalar(halfWidth)));
        right.push(curr.clone().add(normal.clone().multiplyScalar(-halfWidth)));
    }

    return { left, right };
}

export function generateTrack(config: TrackConfig): TrackData {
    const maxAttempts = 500;
    let attempt = 0;
    const baseSeed = config.seed !== undefined ? config.seed : Math.floor(Math.random() * 1000000);
    const difficulty = config.difficulty || 'moyen';

    while (attempt < maxAttempts) {
        const rng = new SeededRandom(baseSeed + attempt);

        // 1. Generate 2D raw points with locked starting straight
        const rawPoints: THREE.Vector3[] = [];
        const numPoints = config.numControlPoints;
        const boxSize = Math.max(config.baseRadius, 40.0, config.trackWidth * 5.0);

        const zStart = -boxSize * 0.85;
        const xStartLeft = -boxSize * 0.45;
        const xStartRight = boxSize * 0.45;

        const pStartLeft = new THREE.Vector3(xStartLeft, 0, zStart);
        const pStartMid = new THREE.Vector3(0, 0, zStart);
        const pStartRight = new THREE.Vector3(xStartRight, 0, zStart);

        rawPoints.push(pStartLeft.clone());
        rawPoints.push(pStartRight.clone());
        
        // Generate coordinates in circular distributions to cover the area nicely, contraining Z
        for (let i = 0; i < numPoints * 2.2; i++) {
            const angle = rng.range(0, Math.PI * 2);
            const r = rng.range(0.25, 1.0) * boxSize;
            const x = Math.cos(angle) * r;
            let z = Math.sin(angle) * r;
            
            // Constrain non-start points to the upper half plane to leave start clear
            if (z <= zStart + 15.0) {
                z = zStart + 15.0 + rng.range(1.0, 15.0);
            }
            rawPoints.push(new THREE.Vector3(x, 0, z));
        }

        // 2. Convex Hull
        let hull = getConvexHull(rawPoints);

        // 3. Relax points (push apart)
        const minSpacing = config.trackWidth * 2.5;
        pushApart(hull, minSpacing, boxSize, 15);

        // Recompute CCW Hull after relaxation
        hull = getConvexHull(hull);

        // Reinsert the middle start point in the CCW hull at the correct place between left and right start
        let idxLeft = hull.findIndex(p => Math.abs(p.x - pStartLeft.x) < 1e-3 && Math.abs(p.z - pStartLeft.z) < 1e-3);
        let idxRight = hull.findIndex(p => Math.abs(p.x - pStartRight.x) < 1e-3 && Math.abs(p.z - pStartRight.z) < 1e-3);
        
        if (idxLeft !== -1 && idxRight !== -1) {
            if (idxRight === (idxLeft + 1) % hull.length) {
                hull.splice(idxRight, 0, pStartMid.clone());
            } else if (idxLeft === (idxRight + 1) % hull.length) {
                hull.splice(idxLeft, 0, pStartMid.clone());
            } else {
                hull.splice(Math.max(idxLeft, idxRight), 0, pStartMid.clone());
            }
        }

        // 4. Midpoint Perturbation
        let controlPoints = insertMidpoints(hull, config.radiusVariation, boxSize, rng);

        // 5. Fix sharp angles of control points (excluding locked start points)
        fixAngles(controlPoints, (80 * Math.PI) / 180, boxSize, 5);

        // Center track around zero
        centerTrack(controlPoints);

        // 6. Spline centripetal Catmull-Rom
        const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal');

        // 7. Regular spacing resampling (2 meters)
        const totalLength = curve.getLength();
        const spacing = 2.0;
        const sampleCount = Math.round(totalLength / spacing);
        
        let centerPoints = curve.getSpacedPoints(sampleCount);
        centerPoints.pop(); // Remove duplicate closed point at the end

        // 8. Compute borders
        let borders = computeTrackBorders(centerPoints, config.trackWidth);

        // 9. Validation
        let validation = validateTrack(
            centerPoints,
            borders.left,
            borders.right,
            config.trackWidth,
            difficulty,
            baseSeed + attempt,
            attempt
        );

        if (!validation.isValid && validation.reason === 'radius_too_small') {
            const relaxedCenterPoints = smoothTightRadii(
                centerPoints,
                Math.max(getMinRadiusThreshold(difficulty), config.trackWidth * 0.55),
                96
            );
            const relaxedBorders = computeTrackBorders(relaxedCenterPoints, config.trackWidth);
            const relaxedValidation = validateTrack(
                relaxedCenterPoints,
                relaxedBorders.left,
                relaxedBorders.right,
                config.trackWidth,
                difficulty,
                baseSeed + attempt,
                attempt
            );

            if (relaxedValidation.isValid || relaxedValidation.reason !== 'radius_too_small') {
                centerPoints = relaxedCenterPoints;
                borders = relaxedBorders;
                validation = relaxedValidation;
            }
        }

        if (validation.isValid) {
            // Find starting straight line of 40m with strict alignment
            let straightIdx = findStartingStraight(centerPoints, spacing, 40);
            if (straightIdx === -1) {
                straightIdx = findFallbackStartIndex(centerPoints);
                console.warn(`%c[ProceduralTrack] Attempt ${attempt}: Accepted %c- no strict 40m straight found, using lowest-Z start index`, 'color: #ffcc00; font-weight: bold;', 'color: inherit;');
            }

            if (straightIdx !== -1) {
                // Align arrays so index 0 is the starting line straight
                const finalCenter = rotateArray(centerPoints, straightIdx);
                const finalLeft = rotateArray(borders.left, straightIdx);
                const finalRight = rotateArray(borders.right, straightIdx);
                const finalCurve = new THREE.CatmullRomCurve3(finalCenter, true, 'centripetal');

                // Compute curvature and detect corners for Kerbs
                const nPoints = finalCenter.length;
                const leftKerbs = new Array(nPoints).fill(false);
                const rightKerbs = new Array(nPoints).fill(false);

                for (let i = 0; i < nPoints; i++) {
                    const prev = finalCenter[(i - 1 + nPoints) % nPoints];
                    const curr = finalCenter[i];
                    const next = finalCenter[(i + 1) % nPoints];

                    const v1 = new THREE.Vector3().subVectors(curr, prev).normalize();
                    const v2 = new THREE.Vector3().subVectors(next, curr).normalize();

                    const cross = v1.x * v2.z - v1.z * v2.x;
                    const dot = THREE.MathUtils.clamp(v1.dot(v2), -1, 1);
                    const angle = Math.acos(dot);

                    // Threshold curvature of 0.035 rad (~2m spacing) translates to ~57m radius
                    if (angle > 0.035) {
                        if (cross > 0) {
                            leftKerbs[i] = true; // left turn -> left inner curb
                        } else {
                            rightKerbs[i] = true; // right turn -> right inner curb
                        }
                    }
                }

                // Dilation pass to smooth kerb layout and avoid single point kerbs
                const finalLeftKerbs = new Array(nPoints).fill(false);
                const finalRightKerbs = new Array(nPoints).fill(false);
                for (let i = 0; i < nPoints; i++) {
                    if (leftKerbs[i] || leftKerbs[(i - 1 + nPoints) % nPoints] || leftKerbs[(i + 1) % nPoints]) {
                        finalLeftKerbs[i] = true;
                    }
                    if (rightKerbs[i] || rightKerbs[(i - 1 + nPoints) % nPoints] || rightKerbs[(i + 1) % nPoints]) {
                        finalRightKerbs[i] = true;
                    }
                }

                console.log(`%c[ProceduralTrack] Attempt ${attempt}: Success! %cLength: ${totalLength.toFixed(1)}m, Seed: ${baseSeed + attempt}, Difficulty Score: ${validation.qaReport.difficultyScore.toFixed(3)}`, 'color: #34c759; font-weight: bold;', 'color: inherit;');

                return {
                    centerPoints: finalCenter,
                    leftBorder: finalLeft,
                    rightBorder: finalRight,
                    startLineIndex: 0,
                    curve: finalCurve,
                    kerbs: {
                        left: finalLeftKerbs,
                        right: finalRightKerbs
                    },
                    qaReport: validation.qaReport
                };
            }
        } else {
            console.log(`%c[ProceduralTrack] Attempt ${attempt}: Rejected %c- ${validation.reason}`, 'color: #ff3b30; font-weight: bold;', 'color: inherit;');
        }

        attempt++;
    }

    console.error(`[ProceduralTrack] Failed to generate valid track in ${maxAttempts} attempts. Falling back to circular safety track.`);
    return generateCircularTrack(config);
}

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

    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
    const totalLength = curve.getLength();
    const spacing = 2.0;
    const sampleCount = Math.round(totalLength / spacing);
    
    const centerPoints = curve.getSpacedPoints(sampleCount);
    centerPoints.pop();

    const borders = computeTrackBorders(centerPoints, config.trackWidth);

    return {
        centerPoints: centerPoints,
        leftBorder: borders.left,
        rightBorder: borders.right,
        startLineIndex: 0,
        curve: curve,
        kerbs: {
            left: new Array(centerPoints.length).fill(false),
            right: new Array(centerPoints.length).fill(false)
        }
    };
}

export const defaultTrackConfig: TrackConfig = {
    numControlPoints: 10,
    baseRadius: 65,
    radiusVariation: 0.3,
    angleVariation: 0.25,
    trackWidth: 10,
    sampleCount: 250
};

function buildEdgeLineGeometry(
    borderPoints: THREE.Vector3[],
    centerPoints: THREE.Vector3[],
    lineWidth: number
): THREE.BufferGeometry {
    const vertices: number[] = [];
    const indices: number[] = [];
    const n = borderPoints.length;

    for (let i = 0; i < n; i++) {
        const border = borderPoints[i];
        const center = centerPoints[i];
        const inward = new THREE.Vector3().subVectors(center, border).normalize();
        const inner = border.clone().addScaledVector(inward, lineWidth);

        vertices.push(border.x, border.y + 0.035, border.z);
        vertices.push(inner.x, inner.y + 0.035, inner.z);
    }

    for (let i = 0; i < n; i++) {
        const nextI = (i + 1) % n;
        const outerA = i * 2;
        const innerA = i * 2 + 1;
        const outerB = nextI * 2;
        const innerB = nextI * 2 + 1;

        indices.push(outerA, outerB, innerA);
        indices.push(innerA, outerB, innerB);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

// --- Beautiful beveled 3D Kerbs Generator ---
function buildKerbGeometry(
    borderPoints: THREE.Vector3[],
    centerPoints: THREE.Vector3[],
    kerbFlags: boolean[]
): THREE.BufferGeometry | null {
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const n = borderPoints.length;

    let vertexIndex = 0;

    for (let i = 0; i < n; i++) {
        const nextI = (i + 1) % n;
        // Generate kerb segment if current or next index has corner flag
        if (!kerbFlags[i] && !kerbFlags[nextI]) continue;

        const p1 = borderPoints[i];
        const p2 = borderPoints[nextI];
        const c1 = centerPoints[i];
        const c2 = centerPoints[nextI];

        // Outward normal vector from road center
        const norm1 = new THREE.Vector3().subVectors(p1, c1).normalize();
        const norm2 = new THREE.Vector3().subVectors(p2, c2).normalize();

        // Beveled 3D profile:
        // A: Inside edge (at road border) raised slightly by 0.04m
        // B: Center crest (raised by 0.08m)
        // C: Outside tail (flat on grass, 0.01m elevation)
        const a1 = p1.clone().add(new THREE.Vector3(0, 0.04, 0));
        const b1 = p1.clone().addScaledVector(norm1, KERB_WIDTH_METERS * 0.45).add(new THREE.Vector3(0, 0.08, 0));
        const c_coord1 = p1.clone().addScaledVector(norm1, KERB_WIDTH_METERS).add(new THREE.Vector3(0, 0.01, 0));

        const a2 = p2.clone().add(new THREE.Vector3(0, 0.04, 0));
        const b2 = p2.clone().addScaledVector(norm2, KERB_WIDTH_METERS * 0.45).add(new THREE.Vector3(0, 0.08, 0));
        const c_coord2 = p2.clone().addScaledVector(norm2, KERB_WIDTH_METERS).add(new THREE.Vector3(0, 0.01, 0));

        vertices.push(a1.x, a1.y, a1.z); // vertexIndex
        vertices.push(b1.x, b1.y, b1.z); // vertexIndex + 1
        vertices.push(c_coord1.x, c_coord1.y, c_coord1.z); // vertexIndex + 2

        vertices.push(a2.x, a2.y, a2.z); // vertexIndex + 3
        vertices.push(b2.x, b2.y, b2.z); // vertexIndex + 4
        vertices.push(c_coord2.x, c_coord2.y, c_coord2.z); // vertexIndex + 5

        // Alternate stripe colors every 1.5 segments (around 3 meters length)
        const isRed = Math.floor(i / 1.5) % 2 === 0;
        const stripeColor = isRed ? [0.92, 0.12, 0.12] : [0.96, 0.96, 0.96]; // Vibrant red and crisp white

        for (let v = 0; v < 6; v++) {
            colors.push(stripeColor[0], stripeColor[1], stripeColor[2]);
        }

        // Inner polygon segment (A -> B)
        indices.push(vertexIndex + 0, vertexIndex + 3, vertexIndex + 1);
        indices.push(vertexIndex + 1, vertexIndex + 3, vertexIndex + 4);

        // Outer polygon segment (B -> C)
        indices.push(vertexIndex + 1, vertexIndex + 4, vertexIndex + 2);
        indices.push(vertexIndex + 2, vertexIndex + 4, vertexIndex + 5);

        vertexIndex += 6;
    }

    if (vertices.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

export function createTrackObject(trackData: TrackData): THREE.Group {
    const group = new THREE.Group();

    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    const n = trackData.centerPoints.length;

    for (let i = 0; i < n; i++) {
        const left = trackData.leftBorder[i];
        const right = trackData.rightBorder[i];

        vertices.push(left.x, left.y + 0.02, left.z);
        vertices.push(right.x, right.y + 0.02, right.z);

        const t = i / n;
        uvs.push(0, t);
        uvs.push(1, t);
    }

    for (let i = 0; i < n; i++) {
        const nextI = (i + 1) % n;
        const bl = i * 2;
        const br = i * 2 + 1;
        const tl = nextI * 2;
        const tr = nextI * 2 + 1;

        indices.push(bl, tl, br);
        indices.push(br, tl, tr);
    }

    const roadGeometry = new THREE.BufferGeometry();
    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    roadGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeometry.setIndex(indices);
    roadGeometry.computeVertexNormals();

    const roadMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222, // Sleek dark charcoal asphalt
        side: THREE.DoubleSide,
        roughness: 0.82,
        metalness: 0.1
    });

    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roadMesh.receiveShadow = true;
    group.add(roadMesh);

    // --- Build Raised 3D Kerbs if present in track metadata ---
    if (trackData.kerbs) {
        const leftKerbGeom = buildKerbGeometry(trackData.leftBorder, trackData.centerPoints, trackData.kerbs.left);
        if (leftKerbGeom) {
            const kerbMat = new THREE.MeshStandardMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
                roughness: 0.65,
                metalness: 0.1
            });
            const leftKerbMesh = new THREE.Mesh(leftKerbGeom, kerbMat);
            leftKerbMesh.castShadow = true;
            leftKerbMesh.receiveShadow = true;
            group.add(leftKerbMesh);
        }

        const rightKerbGeom = buildKerbGeometry(trackData.rightBorder, trackData.centerPoints, trackData.kerbs.right);
        if (rightKerbGeom) {
            const kerbMat = new THREE.MeshStandardMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
                roughness: 0.65,
                metalness: 0.1
            });
            const rightKerbMesh = new THREE.Mesh(rightKerbGeom, kerbMat);
            rightKerbMesh.castShadow = true;
            rightKerbMesh.receiveShadow = true;
            group.add(rightKerbMesh);
        }
    }

    const edgeLineMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        roughness: 0.55,
        metalness: 0.05
    });
    const centerMaterial = new THREE.LineBasicMaterial({ color: 0xaaaa00 }); // Slightly desaturated yellow
    const startMaterial = new THREE.LineBasicMaterial({ color: 0xff3b30 });  // iOS iOS-danger red

    const leftLineMesh = new THREE.Mesh(
        buildEdgeLineGeometry(trackData.leftBorder, trackData.centerPoints, TRACK_EDGE_LINE_WIDTH_METERS),
        edgeLineMaterial
    );
    leftLineMesh.receiveShadow = true;
    group.add(leftLineMesh);

    const rightLineMesh = new THREE.Mesh(
        buildEdgeLineGeometry(trackData.rightBorder, trackData.centerPoints, TRACK_EDGE_LINE_WIDTH_METERS),
        edgeLineMaterial
    );
    rightLineMesh.receiveShadow = true;
    group.add(rightLineMesh);

    const centerGeometry = new THREE.BufferGeometry();
    const centerPoints: number[] = [];
    for (let i = 0; i <= n; i++) {
        const p = trackData.centerPoints[i % n];
        centerPoints.push(p.x, p.y + 0.03, p.z);
    }
    centerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(centerPoints, 3));
    const centerLine = new THREE.Line(centerGeometry, centerMaterial);
    group.add(centerLine);

    // Thick start line at index 0 (which is in the middle of our flat straight line!)
    const startGeometry = new THREE.BufferGeometry();
    const startPoints: number[] = [];
    const idx = trackData.startLineIndex;
    const leftStart = trackData.leftBorder[idx];
    const rightStart = trackData.rightBorder[idx];
    startPoints.push(leftStart.x, leftStart.y + 0.04, leftStart.z);
    startPoints.push(rightStart.x, rightStart.y + 0.04, rightStart.z);
    startGeometry.setAttribute('position', new THREE.Float32BufferAttribute(startPoints, 3));
    const startLine = new THREE.Line(startGeometry, startMaterial);
    group.add(startLine);

    return group;
}
