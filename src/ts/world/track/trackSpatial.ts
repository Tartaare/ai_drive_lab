import * as THREE from 'three';

export class SeededRandom {
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

export function segmentsIntersect(
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

export function hasSelfIntersection(points: THREE.Vector3[]): boolean {
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

export function getConvexHull(points: THREE.Vector3[]): THREE.Vector3[] {
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
export function pushApart(points: THREE.Vector3[], minDist: number, baseRadius: number, iterations: number = 10): void {
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
export function centerTrack(points: THREE.Vector3[]): void {
    const center = new THREE.Vector3(0, 0, 0);
    for (const p of points) {
        center.add(p);
    }
    center.divideScalar(points.length);
    for (const p of points) {
        p.sub(center);
    }
}

export function rotateArray<T>(arr: T[], count: number): T[] {
    const n = arr.length;
    const shift = (count % n + n) % n;
    return [...arr.slice(shift), ...arr.slice(0, shift)];
}

// --- Lock Detection Helper ---
export function isPointLocked(p: THREE.Vector3, baseRadius: number): boolean {
    return Math.abs(p.z - (-baseRadius * 0.85)) < 1e-3 && Math.abs(p.x) <= baseRadius * 0.45 + 1e-3;
}


