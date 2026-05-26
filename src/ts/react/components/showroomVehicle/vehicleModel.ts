import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export function createNormalizedVehicle(source: THREE.Object3D): THREE.Group {
    const cloned = SkeletonUtils.clone(source);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const length = Math.max(size.z, 0.001);
    const width = Math.max(size.x, 0.001);
    const height = Math.max(size.y, 0.001);
    const footprintScale = Math.min(3.4 / length, 1.65 / width);
    const heightScale = 1.25 / height;
    const scale = THREE.MathUtils.clamp(footprintScale * 0.82 + heightScale * 0.18, 0.2, 6);
    cloned.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(cloned);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);
    cloned.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);
    cloned.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    });

    const group = new THREE.Group();
    group.add(cloned);
    return group;
}
