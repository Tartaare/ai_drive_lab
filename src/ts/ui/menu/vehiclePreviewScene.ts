import * as THREE from 'three';

export function createVehiclePreviewScene(
    scene: THREE.Scene,
    floorMaterial: THREE.MeshStandardMaterial,
    reflectionMaterial: THREE.MeshBasicMaterial
): void {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x080808, 1.25);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 4.4);
    key.position.set(4.6, 7, 5.8);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 22;
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff8a1f, 2.2);
    rim.position.set(-5, 3.2, -4.8);
    scene.add(rim);
    const soft = new THREE.PointLight(0xffffff, 1.4, 12);
    soft.position.set(0, 3.2, 3.8);
    scene.add(soft);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(6.8, 128), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const reflection = new THREE.Mesh(new THREE.CircleGeometry(3.8, 96), reflectionMaterial);
    reflection.rotation.x = -Math.PI / 2;
    reflection.position.y = 0.012;
    reflection.scale.z = 0.34;
    scene.add(reflection);
    const edge = new THREE.Mesh(
        new THREE.TorusGeometry(6.8, 0.018, 12, 160),
        new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.28 })
    );
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.018;
    scene.add(edge);
}

export function normalizeVehiclePreviewModel(model: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = 4.75 / Math.max(size.x, size.y, size.z, 1);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -box.min.y * scale + 0.04, -center.z * scale);
}

export function createVehicleFallbackModel(): THREE.Object3D {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0xf1f1f1, roughness: 0.34, metalness: 0.18 });
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.5, 1.24),
        material
    );
    body.position.y = 0.55;
    body.castShadow = true;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.62, 1.02), material);
    cabin.position.set(-0.16, 1.05, 0);
    cabin.castShadow = true;
    group.add(body);
    group.add(cabin);
    return group;
}
