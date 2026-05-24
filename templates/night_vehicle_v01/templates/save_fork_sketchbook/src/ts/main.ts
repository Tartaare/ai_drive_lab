import * as THREE from 'three';
import * as CANNON from 'cannon';
import { SimpleCar } from './vehicles/SimpleCar';
import { VehicleSetup } from './vehicles/VehicleSetup';
import { Sky } from './world/Sky';

// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class World
{
	// Three.js
	public renderer: THREE.WebGLRenderer;
	public camera: THREE.PerspectiveCamera;
	public scene: THREE.Scene;
	public sky: Sky;
	
	// Physics
	public physicsWorld: CANNON.World;
	public physicsFrameRate: number = 60;
	public physicsFrameTime: number = 1 / this.physicsFrameRate;
	public physicsMaxPrediction: number = this.physicsFrameRate;
	
	// Car
	public car: SimpleCar;
	private mixer: THREE.AnimationMixer;

	// Environment
	private ground: THREE.Mesh;
	private groundBody: CANNON.Body;

	// Camera follow
	public cameraTarget: THREE.Vector3 = new THREE.Vector3();
	public cameraRadius: number = 6;
	public cameraTheta: number = 0;
	public cameraPhi: number = 15;
	public cameraSensitivity: number = 0.3;
	
	// Time
	private clock: THREE.Clock;
	private renderDelta: number = 0;
	private logicDelta: number = 0;
	private requestDelta: number = 0;
	private sinceLastFrame: number = 0;

	// Input state
	private mouseDown: boolean = false;
	private lastMouseX: number = 0;
	private lastMouseY: number = 0;

	// Game state
	public isGameRunning: boolean = false;

	constructor(carModelPath: string)
	{
		// Renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		document.body.appendChild(this.renderer.domElement);

		// Scene
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

		// Camera
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		this.camera.position.set(0, 5, 10);
		this.camera.lookAt(0, 0, 0);

		// Lights (handled by Sky)
		this.sky = new Sky(this.scene);

		// Ground
		this.createGround();

		// Physics world
		this.setupPhysics();

		// Clock
		this.clock = new THREE.Clock();

		// Load car
		this.loadCar(carModelPath);

		// Event listeners
		this.setupEventListeners();

		// Start render loop
		this.animate();
	}

	private createGround(): void
	{
		// Create a large flat ground with grid texture
		const groundSize = 500;
		
		// Ground geometry
		const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
		
		// Create a canvas for the ground texture
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;
		
		// Fill with base color
		ctx.fillStyle = '#1a1a1a'; // Darker floor for garage feel
		ctx.fillRect(0, 0, 512, 512);
		
		// Draw grid
		ctx.strokeStyle = '#333';
		ctx.lineWidth = 2;
		const gridSize = 64;
		for (let i = 0; i <= 512; i += gridSize) {
			ctx.beginPath();
			ctx.moveTo(i, 0);
			ctx.lineTo(i, 512);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0, i);
			ctx.lineTo(512, i);
			ctx.stroke();
		}

		const texture = new THREE.CanvasTexture(canvas);
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(groundSize / 10, groundSize / 10);
		
		const groundMaterial = new THREE.MeshStandardMaterial({
			map: texture,
			roughness: 0.8,
			metalness: 0.2
		});
		
		this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
		this.ground.rotation.x = -Math.PI / 2;
		this.ground.receiveShadow = true;
		this.scene.add(this.ground);
	}

	private setupPhysics(): void
	{
		this.physicsWorld = new CANNON.World();
		this.physicsWorld.gravity.set(0, -9.81, 0);
		this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld);
		(this.physicsWorld.solver as CANNON.GSSolver).iterations = 10;
		this.physicsWorld.allowSleep = true;

		// Ground physics body
		const groundShape = new CANNON.Plane();
		this.groundBody = new CANNON.Body({ mass: 0 });
		this.groundBody.addShape(groundShape);
		this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
		this.physicsWorld.addBody(this.groundBody);
	}

	public async loadWorld(path: string): Promise<void> {
		const loader = new GLTFLoader();
		
		return new Promise((resolve, reject) => {
			loader.load(path, (gltf: any) => {
				// Remove default ground
				if (this.ground) this.scene.remove(this.ground);
				if (this.groundBody) this.physicsWorld.removeBody(this.groundBody);

				const model = gltf.scene;
				this.scene.add(model);

				// Physics for Track
				model.traverse((child: any) => {
					if (child.isMesh) {
						child.castShadow = true;
						child.receiveShadow = true;

						// Simple Trimesh collision for static track parts
						// Note: For complex tracks, simplified collision meshes are better
						const geometry = new THREE.Geometry().fromBufferGeometry(child.geometry);
						const vertices = geometry.vertices.map(v => new CANNON.Vec3(v.x, v.y, v.z));
						const faces = geometry.faces.map(f => [f.a, f.b, f.c]);
						
						// We need to apply scale/rotation/position
						// Simplification: assuming track is static and at 0,0,0 with scale 1
						// A better approach is usually to have invisible collider meshes in the GLB named "Collider"
						
						// For now, let's assume the visual mesh is the collider (expensive but works for low poly)
						const shape = new CANNON.Trimesh(
							vertices.reduce((acc, v) => acc.concat([v.x, v.y, v.z]), [] as number[]),
							faces.reduce((acc, f) => acc.concat(f), [] as number[])
						);

						const body = new CANNON.Body({ mass: 0 });
						body.addShape(shape);
						
						// Apply transforms
						const pos = new THREE.Vector3();
						const quat = new THREE.Quaternion();
						const scale = new THREE.Vector3();
						child.updateMatrixWorld();
						child.matrixWorld.decompose(pos, quat, scale);

						body.position.copy(pos as any);
						body.quaternion.copy(quat as any);
						// Trimesh doesn't support scale in CannonJS easily, assumes 1.1.1
						// Ideally apply scale to vertices before creating shape if needed

						this.physicsWorld.addBody(body);
					}
				});

				console.log('Track loaded successfully!');
				resolve();
			}, undefined, reject);
		});
	}

	public async loadCar(path: string): Promise<void>
	{
		// Remove existing car if any
		if (this.car) {
			this.car.removeFromWorld(this.scene, this.physicsWorld);
			this.car = undefined;
		}

		const loader = new GLTFLoader();
		
		return new Promise((resolve, reject) => {
			loader.load(path, (gltf: any) => {
				
				// AUTOMATIC SETUP HERE
				VehicleSetup.prepareModel(gltf.scene);
	
				this.car = new SimpleCar(gltf);
				this.car.setPosition(0, 2, 0); // Spawn slightly higher
				this.car.addToWorld(this.scene, this.physicsWorld);
				
				// Setup Animations if any (for Garage mode)
				if (gltf.animations && gltf.animations.length > 0) {
					this.mixer = new THREE.AnimationMixer(this.car.modelContainer);
					gltf.animations.forEach((clip: any) => {
						this.mixer.clipAction(clip).play();
					});
				} else {
					this.mixer = undefined;
				}

				console.log('Car loaded successfully!');
				resolve();
			}, 
			(progress: any) => {
				console.log('Loading car...', (progress.loaded / progress.total * 100).toFixed(0) + '%');
			},
			(error: any) => {
				console.error('Error loading car:', error);
				reject(error);
			});
		});
	}

	private setupEventListeners(): void
	{
		// Keyboard
		document.addEventListener('keydown', (event) => this.handleKeyboard(event, true));
		document.addEventListener('keyup', (event) => this.handleKeyboard(event, false));

		// Mouse for camera
		this.renderer.domElement.addEventListener('mousedown', (event) => {
			this.mouseDown = true;
			this.lastMouseX = event.clientX;
			this.lastMouseY = event.clientY;
		});

		document.addEventListener('mouseup', () => {
			this.mouseDown = false;
		});

		document.addEventListener('mousemove', (event) => {
			if (this.mouseDown) {
				const deltaX = event.clientX - this.lastMouseX;
				const deltaY = event.clientY - this.lastMouseY;
				
				this.cameraTheta -= deltaX * this.cameraSensitivity;
				this.cameraPhi += deltaY * this.cameraSensitivity;
				this.cameraPhi = Math.max(-60, Math.min(60, this.cameraPhi));
				
				this.lastMouseX = event.clientX;
				this.lastMouseY = event.clientY;
			}
		});

		// Mouse wheel for zoom
		this.renderer.domElement.addEventListener('wheel', (event) => {
			this.cameraRadius += event.deltaY * 0.01;
			this.cameraRadius = Math.max(2, Math.min(20, this.cameraRadius));
		});

		// Window resize
		window.addEventListener('resize', () => {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(window.innerWidth, window.innerHeight);
		});

		// Pointer lock for better controls
		this.renderer.domElement.addEventListener('click', () => {
			this.renderer.domElement.requestPointerLock();
		});

		document.addEventListener('pointerlockchange', () => {
			if (document.pointerLockElement === this.renderer.domElement) {
				document.addEventListener('mousemove', this.onPointerLockMouseMove);
			} else {
				document.removeEventListener('mousemove', this.onPointerLockMouseMove);
			}
		});
	}

	private onPointerLockMouseMove = (event: MouseEvent): void => {
		this.cameraTheta -= event.movementX * this.cameraSensitivity;
		this.cameraPhi += event.movementY * this.cameraSensitivity;
		this.cameraPhi = Math.max(-60, Math.min(60, this.cameraPhi));
	}

	private handleKeyboard(event: KeyboardEvent, pressed: boolean): void
	{
		if (!this.car) return;

		// Prevent default browser actions
		if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) {
			event.preventDefault();
		}

		// Map keys to actions
		const actionMap: { [key: string]: string } = {
			'KeyW': 'throttle',
			'KeyS': 'reverse',
			'KeyA': 'left',
			'KeyD': 'right',
			'Space': 'brake'
		};

		const action = actionMap[event.code];
		if (action) {
			this.car.triggerAction(action, pressed);
		}

		// Reset car with R key
		if (event.code === 'KeyR' && pressed) {
			this.car.setPosition(0, 2, 0);
			this.car.collision.velocity.set(0, 0, 0);
			this.car.collision.angularVelocity.set(0, 0, 0);
			this.car.collision.quaternion.set(0, 0, 0, 1);
		}
	}

	private updateCamera(): void
	{
		if (!this.car) return;

		// Update camera target to follow car
		this.cameraTarget.copy(this.car.position);
		this.cameraTarget.y += 1;

		// Calculate camera position in spherical coordinates
		const theta = THREE.MathUtils.degToRad(this.cameraTheta);
		const phi = THREE.MathUtils.degToRad(this.cameraPhi);

		this.camera.position.x = this.cameraTarget.x + this.cameraRadius * Math.sin(theta) * Math.cos(phi);
		this.camera.position.y = this.cameraTarget.y + this.cameraRadius * Math.sin(phi);
		this.camera.position.z = this.cameraTarget.z + this.cameraRadius * Math.cos(theta) * Math.cos(phi);

		this.camera.lookAt(this.cameraTarget);
	}

	private animate = (): void =>
	{
		requestAnimationFrame(this.animate);

		this.requestDelta = this.clock.getDelta();

		// Getting timeStep
		let timeStep = this.requestDelta;
		timeStep = Math.min(timeStep, 1 / 30); // min 30 fps

		if (this.isGameRunning) {
			// Physics update
			this.physicsWorld.step(this.physicsFrameTime, timeStep, 10);

			// Update car
			if (this.car) {
				this.car.update(timeStep);
			}

			// Update camera normal follow
			this.updateCamera();
		} else {
			// Menu mode: Rotate car slowly
			if (this.car) {
				const time = Date.now() * 0.0005;
				// Rotate car model container for visual effect only, not physics body
				// Actually SimpleCar links physics to visual, so we should just rotate the camera 
				// OR rotate the whole car if physics is paused.
				// Let's rotate the camera around a fixed point (studio style)
				
				this.camera.position.set(
					Math.sin(time) * 7,
					3, // Lower angle for "Garage" feel
					Math.cos(time) * 7
				);
				this.camera.lookAt(0, 1, 0);
				
				// Update animations
				if (this.mixer) {
					this.mixer.update(this.requestDelta);
				}
			}
		}

		// Update sky
		this.sky.update(this.camera);

		// Render
		this.renderer.render(this.scene, this.camera);
	}

	public startGame(): void {
		this.isGameRunning = true;
		
		// Stop garage animations
		if (this.mixer) {
			this.mixer.stopAllAction();
		}

		// Reset camera to follow position behind car
		this.cameraTheta = 0;
		this.cameraPhi = 15;
	}
}

// Export for external use
export { SimpleCar } from './vehicles/SimpleCar';
