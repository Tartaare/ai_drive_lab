import * as THREE from 'three';
import { QAReport, RejectionReason } from './trackTypes';
import { hasSelfIntersection, segmentsIntersect } from './trackSpatial';
import { analyzeCurvature, getMinRadiusThreshold } from './trackCurvature';

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
export function validateTrack(
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

