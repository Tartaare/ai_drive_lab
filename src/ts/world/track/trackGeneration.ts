import * as THREE from 'three';
import { TrackConfig, TrackData } from './trackTypes';
import { SeededRandom, centerTrack, getConvexHull, pushApart, rotateArray } from './trackSpatial';
import { fixAngles, findFallbackStartIndex, findStartingStraight, insertMidpoints } from './trackControlPoints';
import { getMinRadiusThreshold, smoothTightRadii } from './trackCurvature';
import { computeTrackBorders } from './trackGeometry';
import { validateTrack } from './trackValidation';

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

