import * as THREE from 'three';
import { KERB_WIDTH_METERS } from './trackTypes';

export function buildKerbGeometry(
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

