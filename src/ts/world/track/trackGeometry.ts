import * as THREE from 'three';
import { TRACK_EDGE_LINE_WIDTH_METERS, TrackData } from './trackTypes';
import { buildKerbGeometry } from './trackKerbs';

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

