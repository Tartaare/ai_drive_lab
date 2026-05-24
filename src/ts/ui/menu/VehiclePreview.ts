import * as THREE from 'three';
import { VehicleDefinition } from './catalog';

// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-ignore
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils';
// @ts-ignore
import { Reflector } from 'three/examples/jsm/objects/Reflector';

export type VehiclePreviewState = 'idle' | 'loading' | 'ready' | 'error';
export type VehiclePreviewLoadState = 'ready' | 'error' | 'stale';
type SwapDirection = -1 | 1;

interface VehicleSceneNode {
    root: THREE.Object3D;
    mixer: THREE.AnimationMixer | null;
    radius: number;
}

interface VehicleSwapTransition {
    startTime: number;
    durationMs: number;
    direction: SwapDirection;
    offscreenDistance: number;
    outgoing: VehicleSceneNode | null;
    incoming: VehicleSceneNode;
    complete: (state: VehiclePreviewLoadState) => void;
    state: VehiclePreviewLoadState;
}

interface CachedVehicleModel {
    scene: THREE.Object3D;
    animations: any[];
}

export class VehiclePreview {
    private static readonly CAMERA_DISTANCE_MIN = 0.86;
    private static readonly CAMERA_DISTANCE_MAX = 2.05;
    private static readonly CAMERA_DISTANCE_STEP = 0.1;
    private static readonly TARGET_FOOTPRINT_LENGTH = 3.4;
    private static readonly TARGET_FOOTPRINT_WIDTH = 1.65;
    private static readonly TARGET_HEIGHT = 1.25;
    private readonly container: HTMLElement;
    private readonly status: HTMLElement;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private reflector!: any;
    private readonly loader = new GLTFLoader();
    private readonly modelCache: { [path: string]: Promise<CachedVehicleModel> } = {};
    private static readonly SWAP_DURATION_MS = 520;
    private readonly screenRight = new THREE.Vector3();
    private readonly tempAbsRight = new THREE.Vector3();
    private readonly tempBox = new THREE.Box3();
    private readonly tempCenter = new THREE.Vector3();
    private readonly tempSize = new THREE.Vector3();
    private readonly tempCameraSpaceCenter = new THREE.Vector3();
    private activeVehicle: VehicleSceneNode | null = null;
    private transition: VehicleSwapTransition | null = null;
    private animationFrame = 0;
    private loadToken = 0;
    private rotationY = 0;
    private dragStartX = 0;
    private dragStartRotation = 0;
    private isDragging = false;
    private isPointerOver = false;
    private lastTime = performance.now();
    private cameraDistance = 1.22;
    private readonly reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    constructor(container: HTMLElement, status: HTMLElement) {
        this.container = container;
        this.status = status;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.domElement.className = 'vehicle-stage__canvas';
        this.renderer.domElement.setAttribute('aria-label', 'Prévisualisation 3D du véhicule');
        this.renderer.domElement.tabIndex = 0;
        this.container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        this.applyCameraDistance();


        this.createSceneBase();
        this.bindEvents();
        this.resize();
        this.animate();
    }

    public setTheme(theme: 'dark' | 'light'): void {
        const bg = theme === 'light' ? 0xe8e8e8 : 0x111111;
        (this.scene.background as THREE.Color).set(bg);
        this.reflector.material.uniforms['color'].value.set(bg);
    }

    public isTransitioning(): boolean {
        return this.transition !== null;
    }

    public setVehicle(vehicle: VehicleDefinition, direction: -1 | 0 | 1): Promise<VehiclePreviewLoadState> {
        const token = ++this.loadToken;
        const shouldAnimateSwap = direction !== 0 && this.activeVehicle !== null && !this.reduceMotionQuery.matches;
        this.setState(shouldAnimateSwap ? 'ready' : 'loading', '');
        return new Promise((resolve) => {
            this.loadModel(vehicle.modelPath).then((cached) => {
                if (token !== this.loadToken) {
                    resolve('stale');
                    return;
                }
                const incoming = this.createSceneNode(this.cloneModelScene(cached.scene), cached.animations);
                this.mountIncomingVehicle(incoming, direction, resolve, 'ready');
            }).catch(() => {
                if (token !== this.loadToken) {
                    resolve('stale');
                    return;
                }
                const fallback = this.createFallbackNode();
                this.mountIncomingVehicle(fallback, direction, resolve, 'error');
                this.setState('error', 'Modèle indisponible');
            });
        });
    }

    public preload(vehicles: VehicleDefinition[]): void {
        vehicles.forEach((vehicle) => {
            void this.loadModel(vehicle.modelPath).catch(() => undefined);
        });
    }

    public dispose(): void {
        cancelAnimationFrame(this.animationFrame);
        this.abortTransition();
        this.clearActiveVehicle();
        this.renderer.dispose();
        if (this.renderer.domElement.parentElement) {
            this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }
    }

    private createSceneBase(): void {
        this.scene.background = new THREE.Color(0x111111);

        // Softbox éclairage studio : enveloppant, sans rim colorée
        const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 2.2);
        this.scene.add(hemi);
        const key = new THREE.DirectionalLight(0xffffff, 2.8);
        key.position.set(3, 8, 4);
        key.castShadow = true;
        key.shadow.mapSize.width = 2048;
        key.shadow.mapSize.height = 2048;
        this.scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 1.2);
        fill.position.set(-4, 5, -3);
        this.scene.add(fill);
        const top = new THREE.DirectionalLight(0xffffff, 0.8);
        top.position.set(0, 10, 0);
        this.scene.add(top);

        // Sol plan large — même couleur que le fond → fondu infinity cove
        this.reflector = new Reflector(new THREE.PlaneGeometry(60, 60), {
            clipBias: 0.003,
            textureWidth: 1024,
            textureHeight: 1024,
            color: new THREE.Color(0x111111),
            multisample: 4
        });
        this.reflector.rotation.x = -Math.PI / 2;
        this.scene.add(this.reflector);
    }

    private createSceneNode(model: THREE.Object3D, animations: any[]): VehicleSceneNode {
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const length = Math.max(size.z, 0.001);
        const width = Math.max(size.x, 0.001);
        const height = Math.max(size.y, 0.001);
        const footprintScale = Math.min(
            VehiclePreview.TARGET_FOOTPRINT_LENGTH / length,
            VehiclePreview.TARGET_FOOTPRINT_WIDTH / width
        );
        const heightScale = VehiclePreview.TARGET_HEIGHT / height;
        const scale = THREE.MathUtils.clamp(footprintScale * 0.82 + heightScale * 0.18, 0.2, 6);
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -box.min.y * scale + 0.04, -center.z * scale);
        model.traverse((child: any) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        const root = new THREE.Group();
        root.add(model);
        const sphere = new THREE.Sphere();
        new THREE.Box3().setFromObject(root).getBoundingSphere(sphere);
        let mixer: THREE.AnimationMixer | null = null;
        if (animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            mixer.clipAction(animations[0]).play();
        }
        return { root, mixer, radius: Math.max(sphere.radius, 0.1) };
    }

    private createFallbackNode(): VehicleSceneNode {
        const group = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 0.52, 1.15),
            new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.32, metalness: 0.2 })
        );
        body.position.y = 0.55;
        group.add(body);
        return { root: group, mixer: null, radius: 1.55 };
    }

    private mountIncomingVehicle(
        incoming: VehicleSceneNode,
        direction: -1 | 0 | 1,
        complete: (state: VehiclePreviewLoadState) => void,
        state: VehiclePreviewLoadState
    ): void {
        this.abortTransition();
        const outgoing = this.activeVehicle;
        incoming.root.rotation.y = this.rotationY;
        this.scene.add(incoming.root);
        if (direction === 0 || !outgoing || this.reduceMotionQuery.matches) {
            if (outgoing) this.disposeSceneNode(outgoing);
            incoming.root.position.set(0, 0, 0);
            this.activeVehicle = incoming;
            this.setState('ready', '');
            complete(state);
            return;
        }
        this.activeVehicle = null;
        outgoing.root.position.set(0, 0, 0);
        outgoing.root.rotation.y = this.rotationY;
        const offscreenDistance = Math.max(
            this.getSwapOffscreenDistance(outgoing),
            this.getSwapOffscreenDistance(incoming)
        );
        this.setNodeSwapOffset(incoming.root, this.getOppositeDirection(direction), offscreenDistance);
        this.transition = {
            startTime: performance.now(),
            durationMs: VehiclePreview.SWAP_DURATION_MS,
            direction,
            offscreenDistance,
            outgoing,
            incoming,
            complete,
            state
        };
        this.container.classList.add('is-swapping');
        this.setState('ready', '');
    }

    private clearActiveVehicle(): void {
        if (!this.activeVehicle) return;
        this.disposeSceneNode(this.activeVehicle);
        this.activeVehicle = null;
    }

    private abortTransition(): void {
        if (!this.transition) return;
        if (this.transition.outgoing) this.disposeSceneNode(this.transition.outgoing);
        this.disposeSceneNode(this.transition.incoming);
        this.transition = null;
        this.container.classList.remove('is-swapping');
    }

    private disposeLoadedSceneNode(node: VehicleSceneNode): void {
        node.root.traverse((child: any) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach((mat: any) => mat.dispose());
                else child.material.dispose();
            }
        });
    }

    private disposeSceneNode(node: VehicleSceneNode): void {
        if (node.mixer) node.mixer.stopAllAction();
        this.scene.remove(node.root);
        this.disposeLoadedSceneNode(node);
    }

    private updateTransition(now: number): void {
        if (!this.transition) return;
        const progress = THREE.MathUtils.clamp(
            (now - this.transition.startTime) / this.transition.durationMs,
            0,
            1
        );
        const eased = this.easeSwap(progress);
        if (this.transition.outgoing) {
            this.setNodeSwapOffset(
                this.transition.outgoing.root,
                this.transition.direction,
                THREE.MathUtils.lerp(0, this.transition.offscreenDistance, eased)
            );
        }
        this.setNodeSwapOffset(
            this.transition.incoming.root,
            this.getOppositeDirection(this.transition.direction),
            THREE.MathUtils.lerp(this.transition.offscreenDistance, 0, eased)
        );
        if (progress < 1) return;
        if (this.transition.outgoing) this.disposeSceneNode(this.transition.outgoing);
        this.transition.incoming.root.position.set(0, 0, 0);
        this.activeVehicle = this.transition.incoming;
        const complete = this.transition.complete;
        const state = this.transition.state;
        this.transition = null;
        this.container.classList.remove('is-swapping');
        complete(state);
    }

    private easeSwap(progress: number): number {
        return progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    }

    private setNodeSwapOffset(root: THREE.Object3D, direction: SwapDirection, distance: number): void {
        this.getScreenRightVector();
        root.position.copy(this.screenRight).multiplyScalar(direction * distance);
    }

    private getOppositeDirection(direction: SwapDirection): SwapDirection {
        return direction === 1 ? -1 : 1;
    }

    private getSwapOffscreenDistance(node: VehicleSceneNode): number {
        this.getScreenRightVector();
        node.root.updateWorldMatrix(true, true);
        this.tempBox.setFromObject(node.root);
        this.tempBox.getCenter(this.tempCenter);
        this.tempCameraSpaceCenter.copy(this.tempCenter);
        this.camera.worldToLocal(this.tempCameraSpaceCenter);
        const depth = Math.max(Math.abs(this.tempCameraSpaceCenter.z), this.camera.near + 0.001);
        const halfViewportHeight = Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * depth;
        const halfViewportWidth = halfViewportHeight * this.camera.aspect;
        this.tempBox.getSize(this.tempSize);
        this.tempAbsRight.set(
            Math.abs(this.screenRight.x),
            Math.abs(this.screenRight.y),
            Math.abs(this.screenRight.z)
        );
        const projectedHalfWidth = this.tempSize.dot(this.tempAbsRight) * 0.5;
        return halfViewportWidth + Math.max(node.radius, projectedHalfWidth) + 0.12;
    }

    private getScreenRightVector(): THREE.Vector3 {
        this.camera.getWorldDirection(this.screenRight);
        this.screenRight.cross(this.camera.up).normalize();
        return this.screenRight;
    }

    private loadModel(modelPath: string): Promise<CachedVehicleModel> {
        if (!this.modelCache[modelPath]) {
            this.modelCache[modelPath] = new Promise<CachedVehicleModel>((resolve, reject) => {
                this.loader.load(modelPath, (gltf: any) => {
                    resolve({
                        scene: gltf.scene as THREE.Object3D,
                        animations: (gltf.animations || []) as any[]
                    });
                }, undefined, reject);
            }).catch((error) => {
                delete this.modelCache[modelPath];
                throw error;
            });
        }
        return this.modelCache[modelPath];
    }

    private cloneModelScene(scene: THREE.Object3D): THREE.Object3D {
        if (SkeletonUtils && typeof SkeletonUtils.clone === 'function') {
            return SkeletonUtils.clone(scene) as THREE.Object3D;
        }
        return scene.clone(true);
    }

    private forEachVisibleVehicle(callback: (node: VehicleSceneNode) => void): void {
        if (this.transition) {
            if (this.transition.outgoing) callback(this.transition.outgoing);
            callback(this.transition.incoming);
            return;
        }
        if (this.activeVehicle) callback(this.activeVehicle);
    }

    private bindEvents(): void {
        this.renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
            this.isDragging = true;
            this.dragStartX = event.clientX;
            this.dragStartRotation = this.rotationY;
            this.renderer.domElement.focus();
            this.renderer.domElement.setPointerCapture(event.pointerId);
        });
        this.renderer.domElement.addEventListener('pointerenter', () => {
            this.isPointerOver = true;
        });
        this.renderer.domElement.addEventListener('pointerleave', () => {
            this.isPointerOver = false;
        });
        this.renderer.domElement.addEventListener('pointermove', (event: PointerEvent) => {
            if (!this.isDragging) return;
            this.rotationY = this.dragStartRotation + (event.clientX - this.dragStartX) * 0.012;
        });
        this.renderer.domElement.addEventListener('pointerup', () => {
            this.isDragging = false;
        });
        this.renderer.domElement.addEventListener('wheel', (event: WheelEvent) => {
            this.handleZoomInput(event.deltaY > 0 ? 1 : -1, event);
        }, { passive: false });
        this.renderer.domElement.addEventListener('keydown', (event: KeyboardEvent) => {
            this.handleKeyZoom(event);
        });
        window.addEventListener('keydown', (event: KeyboardEvent) => {
            if (!this.isPointerOver && document.activeElement !== this.renderer.domElement) return;
            this.handleKeyZoom(event);
        });
        window.addEventListener('resize', () => this.resize());
    }

    private setCameraDistance(next: number): void {
        this.cameraDistance = THREE.MathUtils.clamp(
            next,
            VehiclePreview.CAMERA_DISTANCE_MIN,
            VehiclePreview.CAMERA_DISTANCE_MAX
        );
        this.applyCameraDistance();
    }

    private applyCameraDistance(): void {
        this.camera.position.set(11.4 * this.cameraDistance, 3.45 * this.cameraDistance, 1.6 * this.cameraDistance);
        this.camera.lookAt(0, 0.74, 0);
    }

    private handleZoomInput(direction: -1 | 1, event?: Event): void {
        if (event) event.preventDefault();
        this.setCameraDistance(
            this.cameraDistance + direction * VehiclePreview.CAMERA_DISTANCE_STEP
        );
    }

    private handleKeyZoom(event: KeyboardEvent): void {
        if (event.key === '+' || event.key === '=' || event.key === 'NumpadAdd' || event.key === 'PageUp') {
            this.handleZoomInput(-1, event);
        } else if (event.key === '-' || event.key === '_' || event.key === 'NumpadSubtract' || event.key === 'PageDown') {
            this.handleZoomInput(1, event);
        }
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
        this.updateTransition(now);
        this.forEachVisibleVehicle((node) => {
            node.root.rotation.y = this.rotationY;
            if (node.mixer) node.mixer.update(delta);
        });
        this.renderer.render(this.scene, this.camera);
    };

    private setState(state: VehiclePreviewState, message: string): void {
        this.container.dataset.state = state;
        this.status.textContent = message;
    }
}
