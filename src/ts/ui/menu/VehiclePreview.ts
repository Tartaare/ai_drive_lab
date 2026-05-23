import * as THREE from 'three';
import { VehicleDefinition } from './catalog';

// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export type VehiclePreviewState = 'idle' | 'loading' | 'ready' | 'error';

export class VehiclePreview {
    private readonly container: HTMLElement;
    private readonly status: HTMLElement;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly floorMaterial: THREE.MeshStandardMaterial;
    private readonly loader = new GLTFLoader();
    private readonly preloadedPaths: { [path: string]: boolean } = {};
    private vehicleRoot: THREE.Object3D | null = null;
    private mixer: THREE.AnimationMixer | null = null;
    private animationFrame = 0;
    private loadToken = 0;
    private rotationY = 0;
    private dragStartX = 0;
    private dragStartRotation = 0;
    private isDragging = false;
    private lastTime = performance.now();

    constructor(container: HTMLElement, status: HTMLElement) {
        this.container = container;
        this.status = status;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.domElement.className = 'vehicle-stage__canvas';
        this.renderer.domElement.setAttribute('aria-label', 'Prévisualisation 3D du véhicule');
        this.container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        this.camera.position.set(4.8, 2.4, 6.2);
        this.camera.lookAt(0, 0.7, 0);

        this.floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x171717,
            roughness: 0.18,
            metalness: 0.35,
            transparent: true,
            opacity: 0.74
        });
        this.createSceneBase();
        this.bindEvents();
        this.resize();
        this.animate();
    }

    public setTheme(theme: 'dark' | 'light'): void {
        this.floorMaterial.color.set(theme === 'light' ? 0xd9ddd5 : 0x171717);
        this.floorMaterial.emissive = new THREE.Color(theme === 'light' ? 0x181a16 : 0x030303);
        this.floorMaterial.emissiveIntensity = theme === 'light' ? 0.025 : 0.08;
    }

    public setVehicle(vehicle: VehicleDefinition, direction: -1 | 0 | 1): void {
        const token = ++this.loadToken;
        this.setState('loading', 'Chargement du modèle');
        this.clearVehicle();

        this.loader.load(vehicle.modelPath, (gltf: any) => {
            if (token !== this.loadToken) return;
            const model = gltf.scene as THREE.Object3D;
            this.prepareModel(model);
            model.position.x = direction * 2.2;
            model.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            this.scene.add(model);
            this.vehicleRoot = model;
            this.rotationY = 0;

            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(model);
                this.mixer.clipAction(gltf.animations[0]).play();
            }

            requestAnimationFrame(() => {
                if (this.vehicleRoot) this.vehicleRoot.position.x = 0;
            });
            this.setState('ready', '');
        }, undefined, () => {
            if (token !== this.loadToken) return;
            this.showFallback();
            this.setState('error', 'Modèle indisponible');
        });
    }

    public preload(vehicles: VehicleDefinition[]): void {
        vehicles.forEach((vehicle) => {
            if (this.preloadedPaths[vehicle.modelPath]) return;
            this.preloadedPaths[vehicle.modelPath] = true;
            this.loader.load(vehicle.modelPath, () => undefined, undefined, () => undefined);
        });
    }

    public dispose(): void {
        cancelAnimationFrame(this.animationFrame);
        this.clearVehicle();
        this.renderer.dispose();
        if (this.renderer.domElement.parentElement) {
            this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }
    }

    private createSceneBase(): void {
        const hemi = new THREE.HemisphereLight(0xffffff, 0x080808, 1.6);
        this.scene.add(hemi);
        const key = new THREE.DirectionalLight(0xffffff, 3.2);
        key.position.set(3, 6, 5);
        key.castShadow = true;
        this.scene.add(key);

        const floor = new THREE.Mesh(new THREE.CircleGeometry(3.6, 96), this.floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    private prepareModel(model: THREE.Object3D): void {
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const scale = 3.6 / Math.max(size.x, size.y, size.z, 1);
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -box.min.y * scale + 0.04, -center.z * scale);
    }

    private showFallback(): void {
        const group = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 0.52, 1.15),
            new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.32, metalness: 0.2 })
        );
        body.position.y = 0.55;
        group.add(body);
        this.scene.add(group);
        this.vehicleRoot = group;
    }

    private clearVehicle(): void {
        if (this.mixer) this.mixer.stopAllAction();
        this.mixer = null;
        if (!this.vehicleRoot) return;
        this.scene.remove(this.vehicleRoot);
        this.vehicleRoot.traverse((child: any) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach((mat: any) => mat.dispose());
                else child.material.dispose();
            }
        });
        this.vehicleRoot = null;
    }

    private bindEvents(): void {
        this.renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
            this.isDragging = true;
            this.dragStartX = event.clientX;
            this.dragStartRotation = this.rotationY;
            this.renderer.domElement.setPointerCapture(event.pointerId);
        });
        this.renderer.domElement.addEventListener('pointermove', (event: PointerEvent) => {
            if (!this.isDragging) return;
            this.rotationY = this.dragStartRotation + (event.clientX - this.dragStartX) * 0.012;
        });
        this.renderer.domElement.addEventListener('pointerup', () => {
            this.isDragging = false;
        });
        window.addEventListener('resize', () => this.resize());
    }

    private resize(): void {
        const width = Math.max(280, this.container.clientWidth);
        const height = Math.max(260, this.container.clientHeight);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    private animate = (): void => {
        this.animationFrame = requestAnimationFrame(this.animate);
        const now = performance.now();
        const delta = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        if (!this.isDragging) this.rotationY += delta * 0.32;
        if (this.vehicleRoot) {
            this.vehicleRoot.rotation.y = this.rotationY;
            this.vehicleRoot.position.x += (0 - this.vehicleRoot.position.x) * 0.16;
        }
        if (this.mixer) this.mixer.update(delta);
        this.renderer.render(this.scene, this.camera);
    };

    private setState(state: VehiclePreviewState, message: string): void {
        this.container.dataset.state = state;
        this.status.textContent = message;
    }
}
