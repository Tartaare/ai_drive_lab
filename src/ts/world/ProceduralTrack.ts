import * as THREE from 'three';

export interface TrackConfig {
    numControlPoints: number;
    baseRadius: number;
    radiusVariation: number;
    angleVariation: number;
    trackWidth: number;
    sampleCount: number;
    seed?: number;
}

export interface TrackData {
    centerPoints: THREE.Vector3[];
    leftBorder: THREE.Vector3[];
    rightBorder: THREE.Vector3[];
    startLineIndex: number;
    curve: THREE.CatmullRomCurve3;
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

function generateControlPoints(config: TrackConfig, rng: SeededRandom): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const angleStep = (Math.PI * 2) / config.numControlPoints;

    for (let i = 0; i < config.numControlPoints; i++) {
        const baseAngle = i * angleStep;
        const angleOffset = rng.range(-1, 1) * config.angleVariation * angleStep * 0.4;
        const angle = baseAngle + angleOffset;

        const radiusOffset = rng.range(-1, 1) * config.radiusVariation * config.baseRadius;
        const radius = config.baseRadius + radiusOffset;

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        points.push(new THREE.Vector3(x, 0, z));
    }

    return points;
}

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
    const maxAttempts = 50;
    let attempt = 0;
    const baseSeed = config.seed !== undefined ? config.seed : Math.floor(Math.random() * 1000000);

    while (attempt < maxAttempts) {
        const rng = new SeededRandom(baseSeed + attempt);

        const controlPoints = generateControlPoints(config, rng);
        const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.5);

        const centerPoints = curve.getPoints(config.sampleCount);
        centerPoints.pop();

        if (!hasSelfIntersection(centerPoints)) {
            const borders = computeTrackBorders(centerPoints, config.trackWidth);

            if (!hasSelfIntersection(borders.left) && !hasSelfIntersection(borders.right)) {
                return {
                    centerPoints: centerPoints,
                    leftBorder: borders.left,
                    rightBorder: borders.right,
                    startLineIndex: 0,
                    curve: curve
                };
            }
        }

        attempt++;
    }

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

    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
    const centerPoints = curve.getPoints(config.sampleCount);
    centerPoints.pop();

    const borders = computeTrackBorders(centerPoints, config.trackWidth);

    return {
        centerPoints: centerPoints,
        leftBorder: borders.left,
        rightBorder: borders.right,
        startLineIndex: 0,
        curve: curve
    };
}

export const defaultTrackConfig: TrackConfig = {
    numControlPoints: 12,
    baseRadius: 50,
    radiusVariation: 0.4,
    angleVariation: 0.3,
    trackWidth: 10,
    sampleCount: 200
};

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
        color: 0x333333,
        side: THREE.DoubleSide,
        roughness: 0.8
    });

    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roadMesh.receiveShadow = true;
    group.add(roadMesh);

    const borderMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const centerMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const startMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });

    const leftBorderGeometry = new THREE.BufferGeometry();
    const leftBorderPoints: number[] = [];
    for (let i = 0; i <= n; i++) {
        const p = trackData.leftBorder[i % n];
        leftBorderPoints.push(p.x, p.y + 0.05, p.z);
    }
    leftBorderGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leftBorderPoints, 3));
    const leftLine = new THREE.Line(leftBorderGeometry, borderMaterial);
    group.add(leftLine);

    const rightBorderGeometry = new THREE.BufferGeometry();
    const rightBorderPoints: number[] = [];
    for (let i = 0; i <= n; i++) {
        const p = trackData.rightBorder[i % n];
        rightBorderPoints.push(p.x, p.y + 0.05, p.z);
    }
    rightBorderGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rightBorderPoints, 3));
    const rightLine = new THREE.Line(rightBorderGeometry, borderMaterial);
    group.add(rightLine);

    const centerGeometry = new THREE.BufferGeometry();
    const centerPoints: number[] = [];
    for (let i = 0; i <= n; i++) {
        const p = trackData.centerPoints[i % n];
        centerPoints.push(p.x, p.y + 0.03, p.z);
    }
    centerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(centerPoints, 3));
    const centerLine = new THREE.Line(centerGeometry, centerMaterial);
    group.add(centerLine);

    const startGeometry = new THREE.BufferGeometry();
    const startPoints: number[] = [];
    const idx = trackData.startLineIndex;
    const leftStart = trackData.leftBorder[idx];
    const rightStart = trackData.rightBorder[idx];
    startPoints.push(leftStart.x, leftStart.y + 0.06, leftStart.z);
    startPoints.push(rightStart.x, rightStart.y + 0.06, rightStart.z);
    startGeometry.setAttribute('position', new THREE.Float32BufferAttribute(startPoints, 3));
    const startLine = new THREE.Line(startGeometry, startMaterial);
    group.add(startLine);

    return group;
}
