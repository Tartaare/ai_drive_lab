import * as THREE from 'three';
import * as CANNON from 'cannon';
import { SimpleCar, SurfaceType } from './vehicles/SimpleCar';
import { VehicleSetup } from './vehicles/VehicleSetup';
import { Sky } from './world/Sky';
import { DayNightCycle } from './world/DayNightCycle';
import { generateTrack, defaultTrackConfig, createTrackObject, TrackData, TrackConfig } from './world/ProceduralTrack';

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
	public dayNight: DayNightCycle;
	// Track
	public track?: THREE.Object3D;
	private currentLevelId: string = 'default';
	private proceduralTrackData?: TrackData;
	private proceduralConfig: TrackConfig = { ...defaultTrackConfig };
	private proceduralSeed: number = Math.floor(Math.random() * 1000000);
	
	// Physics
	public physicsWorld: CANNON.World;
	public physicsFrameRate: number = 60;
	public physicsFrameTime: number = 1 / this.physicsFrameRate;
	public physicsMaxPrediction: number = this.physicsFrameRate;
	
	// Car
	public car: SimpleCar;
	
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

	// State
	private isPaused: boolean = false;
	private isDisposed: boolean = false;
	private debugInput: boolean = false;

	// Input state
	private mouseDown: boolean = false;
	private lastMouseX: number = 0;
	private lastMouseY: number = 0;

	constructor(carModelPath: string, levelId: string = 'default')
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

		const now = new Date();
		const startTimeHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
		const start = new Date(now.getFullYear(), 0, 0);
		const diff = now.getTime() - start.getTime();
		const oneDay = 1000 * 60 * 60 * 24;
		const dayOfYear = Math.floor(diff / oneDay);
		this.dayNight = new DayNightCycle(this.scene, this.renderer, this.sky, {
			latitudeDeg: 46.0,
			dayOfYear,
			startTimeHours,
			hoursPerSecond: 0.02
		});

		try
		{
			const params = new URLSearchParams(window.location.search);
			const dnDebug = params.get('dnDebug');
			if (dnDebug === '1' || dnDebug === 'true')
			{
				this.dayNight.setDebugEnabled(true);
				const dnLog = params.get('dnLog');
				if (dnLog)
				{
					const interval = Number(dnLog);
					if (Number.isFinite(interval) && interval > 0) this.dayNight.setDebugLogIntervalSeconds(interval);
				}
				console.log('[DayNight] debug enabled');
			}
		}
		catch {
			// ignore
		}

		// Ground
		this.createGround();

		// Track / level initial
		this.setLevel(levelId);

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

	public setDebugInput(enabled: boolean): void
	{
		this.debugInput = enabled;
	}

	private createGround(): void
	{
		// Create a large flat ground with a texture
		const groundSize = 500;

		// Ground geometry
		const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);

		// Create material and load texture from assets
		const groundMaterial = new THREE.MeshStandardMaterial({
			roughness: 0.8,
			metalness: 0.1
		});

		const loader = new THREE.TextureLoader();
		const textureUrl = 'textures/floors/Floor_Dark_1.png';
		loader.load(
			textureUrl,
			(tex) => {
				tex.wrapS = THREE.RepeatWrapping;
				tex.wrapT = THREE.RepeatWrapping;
				tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
				tex.repeat.set(groundSize / 10, groundSize / 10);
				// Use the loaded texture
				groundMaterial.map = tex;
				groundMaterial.needsUpdate = true;
			},
			undefined,
			(error) => {
				console.warn('Failed to load ground texture:', error, 'using fallback canvas texture.');
				// Fallback to canvas-generated texture when image fails to load
				const canvas = document.createElement('canvas');
				canvas.width = 512;
				canvas.height = 512;
				const ctx = canvas.getContext('2d')!;
				ctx.fillStyle = '#3a5f3a';
				ctx.fillRect(0, 0, 512, 512);
				ctx.strokeStyle = '#2d4a2d';
				ctx.lineWidth = 2;
				const gridSize = 32;
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
				const fallback = new THREE.CanvasTexture(canvas);
				fallback.wrapS = THREE.RepeatWrapping;
				fallback.wrapT = THREE.RepeatWrapping;
				fallback.repeat.set(groundSize / 10, groundSize / 10);
				groundMaterial.map = fallback;
				groundMaterial.needsUpdate = true;
			}
		);

		const ground = new THREE.Mesh(groundGeometry, groundMaterial);
		ground.rotation.x = -Math.PI / 2;
		ground.receiveShadow = true;
		this.scene.add(ground);
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
		const groundBody = new CANNON.Body({ mass: 0 });
		groundBody.addShape(groundShape);
		groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
		this.physicsWorld.addBody(groundBody);
	}

	private loadCar(path: string): void
	{
		const loader = new GLTFLoader();
		
		loader.load(path, (gltf: any) => {
			
			// AUTOMATIC SETUP HERE
			VehicleSetup.prepareModel(gltf.scene);

			this.car = new SimpleCar(gltf);
			// Debug de la surface au sol
			this.car.setDebugSurface(false);
			this.car.setSurfaceSampler((x: number, z: number) => this.getSurfaceTypeAt(x, z));
			// Spawn slightly higher and ensure vehicle is awake and set up
			const spawnPos = this.getSpawnPosition();
			if (typeof this.car.reset === 'function') this.car.reset(spawnPos.x, spawnPos.y, spawnPos.z);
			else this.car.setPosition(spawnPos.x, spawnPos.y, spawnPos.z);
			this.car.addToWorld(this.scene, this.physicsWorld);
			
			console.log('Car loaded successfully!');
			console.log('Controls: Z/S = Accelerate/Reverse, Q/D = Steering, Space = Brake');
			console.log('Mouse drag to rotate camera');
		}, 
		(progress: any) => {
			console.log('Loading car...', (progress.loaded / progress.total * 100).toFixed(0) + '%');
		},
		(error: any) => {
			console.error('Error loading car:', error);
		});
	}

	private getSurfaceTypeAt(x: number, z: number): SurfaceType
	{
		if (this.currentLevelId === 'procedural' && this.proceduralTrackData)
		{
			const centerPoints = this.proceduralTrackData.centerPoints;
			let minDistSq = Number.POSITIVE_INFINITY;

			for (let i = 0; i < centerPoints.length; i++)
			{
				const p = centerPoints[i];
				const dx = x - p.x;
				const dz = z - p.z;
				const d2 = dx * dx + dz * dz;
				if (d2 < minDistSq) minDistSq = d2;
			}

			const trackHalfWidth = (this.proceduralConfig.trackWidth ?? defaultTrackConfig.trackWidth) * 0.5;
			const dist = Math.sqrt(minDistSq);

			if (dist <= trackHalfWidth) return 'asphalt';
			if (dist <= trackHalfWidth + 2.0) return 'dirt';
			return 'grass';
		}

		return 'grass';
	}

	private loadTrack(path: string, yOffset: number = 0.01): void
	{
		const loader = new GLTFLoader();
		loader.load(path, (gltf: any) => {
			this.track = gltf.scene;
			// Ensure the track meshes receive and cast shadows
			this.track.traverse((child: any) => {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});

			// Add it first, then compute its bbox and adjust vertical position so it sits on the ground
			this.scene.add(this.track);
			// Make sure matrixWorld is current
			this.track.updateMatrixWorld(true);
			const bbox = new THREE.Box3().setFromObject(this.track);
			const minY = bbox.min.y;
			// Shift so the lowest point is at yOffset
			this.track.position.y += (yOffset - minY);
			this.track.updateMatrixWorld(true);
			console.log('Track loaded from', path);
		}, (progress: any) => {
			// Optional: progress logging for loaders
			if (progress && progress.total) console.log('Loading track...', (progress.loaded / progress.total * 100).toFixed(0) + '%');
		}, (error: any) => {
			console.error('Error loading track:', error);
			if (this.currentLevelId !== 'procedural')
			{
				this.setLevel('procedural');
			}
		});
	}

	public setLevel(levelId: string): void
	{
		this.currentLevelId = levelId;

		if (this.track)
		{
			this.scene.remove(this.track);
			this.track = undefined;
		}

		if (levelId === 'procedural')
		{
			this.buildProceduralTrack();
		}
		else
		{
			// Circuit par défaut (GLB existant)
			this.proceduralTrackData = undefined;
			this.loadTrack('race_tracks/Cartoon_Track1.glb');
		}
	}

	private buildProceduralTrack(): void
	{
		if (this.track)
		{
			this.scene.remove(this.track);
			this.track = undefined;
		}

		const config: TrackConfig = { ...this.proceduralConfig, seed: this.proceduralSeed };
		const trackData = generateTrack(config);
		this.proceduralTrackData = trackData;
		const trackObject = createTrackObject(trackData);
		this.track = trackObject;
		this.scene.add(trackObject);
	}

	public regenerateProceduralTrack(): void
	{
		if (this.currentLevelId !== 'procedural')
		{
			this.setLevel('procedural');
			return;
		}

		this.buildProceduralTrack();
	}

	public setProceduralParameter(
		key: 'numControlPoints' | 'baseRadius' | 'radiusVariation' | 'angleVariation' | 'trackWidth',
		value: number
	): void
	{
		if (!this.proceduralConfig)
		{
			this.proceduralConfig = { ...defaultTrackConfig };
		}

		switch (key)
		{
			case 'numControlPoints':
				this.proceduralConfig.numControlPoints = Math.max(6, Math.min(20, Math.round(value)));
				break;
			case 'baseRadius':
				this.proceduralConfig.baseRadius = Math.max(30, Math.min(150, value));
				break;
			case 'radiusVariation':
				this.proceduralConfig.radiusVariation = Math.max(0, Math.min(1, value));
				break;
			case 'angleVariation':
				this.proceduralConfig.angleVariation = Math.max(0, Math.min(1, value));
				break;
			case 'trackWidth':
				this.proceduralConfig.trackWidth = Math.max(5, Math.min(30, value));
				break;
		}

		if (this.currentLevelId === 'procedural')
		{
			this.buildProceduralTrack();
		}
	}

	public randomizeProceduralSeed(): void
	{
		this.proceduralSeed = Math.floor(Math.random() * 1000000);
		if (this.currentLevelId === 'procedural')
		{
			this.buildProceduralTrack();
		}
	}

	public getProceduralConfig(): {
		numControlPoints: number;
		baseRadius: number;
		radiusVariation: number;
		angleVariation: number;
		trackWidth: number;
	}
	{
		return {
			numControlPoints: this.proceduralConfig.numControlPoints,
			baseRadius: this.proceduralConfig.baseRadius,
			radiusVariation: this.proceduralConfig.radiusVariation,
			angleVariation: this.proceduralConfig.angleVariation,
			trackWidth: this.proceduralConfig.trackWidth
		};
	}

	private getSpawnPosition(): THREE.Vector3
	{
		if (this.currentLevelId === 'procedural' && this.proceduralTrackData)
		{
			const index = this.proceduralTrackData.startLineIndex || 0;
			const center = this.proceduralTrackData.centerPoints[index];
			// Légère élévation pour éviter les collisions visuelles avec la route
			return new THREE.Vector3(center.x, center.y + 1, center.z);
		}

		// Position par défaut (ancien comportement)
		return new THREE.Vector3(0, 2, 0);
	}

	private setupEventListeners(): void
	{
		// Keyboard
		document.addEventListener('keydown', (event) => this.handleKeyboard(event, true));
		document.addEventListener('keyup', (event) => this.handleKeyboard(event, false));

		window.addEventListener('blur', () => {
			if (!this.car) return;
			if (typeof (this.car as any).releaseAllActions === 'function') (this.car as any).releaseAllActions();
		});

		document.addEventListener('visibilitychange', () => {
			if (!this.car) return;
			if (!document.hidden) return;
			if (typeof (this.car as any).releaseAllActions === 'function') (this.car as any).releaseAllActions();
		});

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
	}

	private handleKeyboard(event: KeyboardEvent, pressed: boolean): void
	{
		if (this.isDisposed) return;

		// Global controls (work even si la voiture n'est pas encore prête)
		if (event.code === 'Escape' && pressed)
		{
			this.togglePause();
			event.preventDefault();
			return;
		}

		if (!this.car) return;

		// Prevent default browser actions
		if (['KeyZ', 'KeyQ', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'KeyL'].includes(event.code)) {
			event.preventDefault();
		}

		// Map keys to actions
		const actionMap: { [key: string]: string } = {
			'KeyZ': 'throttle',
			'KeyW': 'throttle',
			'KeyS': 'reverse',
			'KeyQ': 'left',
			'KeyA': 'left',
			'KeyD': 'right',
			'Space': 'brake'
		};

		const action = actionMap[event.code];
		if (action)
		{
			if (this.isPaused)
			{
				if (!pressed) this.car.triggerAction(action, false);
				return;
			}
			this.car.triggerAction(action, pressed);
		}

		// Transmission: toggle manual + paddle shifts
		if (pressed && !event.repeat)
		{
			if (event.code === 'KeyL')
			{
				if (this.isPaused) return;
				if (this.debugInput) console.log('[Input] KeyL toggle headlights');
				if (typeof (this.car as any).toggleHeadlights === 'function') (this.car as any).toggleHeadlights();
				if (this.dayNight) this.dayNight.notifyHeadlightsToggledByUser();
				event.preventDefault();
				return;
			}

			if (event.code === 'KeyM')
			{
				if (this.isPaused) return;
				if (this.debugInput) console.log('[Input] KeyM toggle transmission mode');
				if (typeof (this.car as any).toggleManualTransmission === 'function') (this.car as any).toggleManualTransmission();
				event.preventDefault();
				return;
			}

			if (event.code === 'ArrowUp')
			{
				if (this.isPaused) return;
				if (this.debugInput) console.log('[Input] ArrowUp shift up');
				if (typeof (this.car as any).manualShiftUp === 'function') (this.car as any).manualShiftUp();
				event.preventDefault();
				return;
			}

			if (event.code === 'ArrowDown')
			{
				if (this.isPaused) return;
				if (this.debugInput) console.log('[Input] ArrowDown shift down');
				if (typeof (this.car as any).manualShiftDown === 'function') (this.car as any).manualShiftDown();
				event.preventDefault();
				return;
			}
		}

		// Reset car with R key
		if (event.code === 'KeyR' && pressed) {
			const spawnPos = this.getSpawnPosition();
			if (this.car.reset) {
				this.car.reset(spawnPos.x, spawnPos.y, spawnPos.z);
			} else {
				this.car.setPosition(spawnPos.x, spawnPos.y, spawnPos.z);
				this.car.collision.velocity.set(0, 0, 0);
				this.car.collision.angularVelocity.set(0, 0, 0);
				this.car.collision.quaternion.set(0, 0, 0, 1);
				if (typeof this.car.collision.wakeUp === 'function') this.car.collision.wakeUp();
			}

			// Ensure wheel transforms are refreshed
			if (this.car.rayCastVehicle) for (let i = 0; i < this.car.rayCastVehicle.wheelInfos.length; i++) (this.car.rayCastVehicle as any).updateWheelTransform(i);
		}
	}

	public togglePause(): void
	{
		if (this.isDisposed) return;
		this.isPaused = !this.isPaused;
		if (this.isPaused && this.car && typeof (this.car as any).releaseAllActions === 'function') (this.car as any).releaseAllActions();

		const pauseOverlay = document.getElementById('pause-overlay');
		if (pauseOverlay)
		{
			if (this.isPaused)
			{
				pauseOverlay.classList.add('visible');
			}
			else
			{
				pauseOverlay.classList.remove('visible');
			}
		}

		// Libère le pointer lock pour pouvoir utiliser la souris dans le menu de pause
		if (this.isPaused && document.pointerLockElement === this.renderer.domElement && document.exitPointerLock)
		{
			document.exitPointerLock();
		}
	}

	public pause(): void
	{
		if (!this.isPaused) this.togglePause();
	}

	public resume(): void
	{
		if (this.isPaused) this.togglePause();
	}

	public dispose(): void
	{
		if (this.isDisposed) return;
		this.isDisposed = true;
		this.isPaused = false;

		const pauseOverlay = document.getElementById('pause-overlay');
		if (pauseOverlay)
		{
			pauseOverlay.classList.remove('visible');
		}

		if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentElement)
		{
			this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
		}
	}

	private updateCamera(): void
	{
		if (!this.car) return;

		// Update camera target to follow car position
		this.cameraTarget.copy(this.car.position);
		this.cameraTarget.y += 1;

		// Compute car forward direction and place camera behind the car
		const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.car.quaternion);
		const carYaw = Math.atan2(forward.x, forward.z); // yaw angle in world space

		// cameraTheta / cameraPhi are treated as offsets (degrees) around the car
		const theta = carYaw + Math.PI + THREE.MathUtils.degToRad(this.cameraTheta);
		const phi = THREE.MathUtils.degToRad(this.cameraPhi);

		// Desired camera position in world space (ideal chase camera)
		const desiredPosition = new THREE.Vector3(
			this.cameraTarget.x + this.cameraRadius * Math.sin(theta) * Math.cos(phi),
			this.cameraTarget.y + this.cameraRadius * Math.sin(phi),
			this.cameraTarget.z + this.cameraRadius * Math.cos(theta) * Math.cos(phi)
		);

		// Smoothly interpolate current camera position towards desired position
		// Fixed smoothing factor for now; can be tuned if needed
		const smoothing = 0.2;
		this.camera.position.lerp(desiredPosition, smoothing);

		this.camera.lookAt(this.cameraTarget);
	}

	private animate = (): void =>
	{
		if (this.isDisposed) return;
		requestAnimationFrame(this.animate);

		this.requestDelta = this.clock.getDelta();

		// Getting timeStep
		let timeStep = this.requestDelta;
		timeStep = Math.min(timeStep, 1 / 30); // min 30 fps

		if (!this.isPaused)
		{
			// Physics update
			this.physicsWorld.step(this.physicsFrameTime, timeStep, 10);

			// Update car
			if (this.car) {
				this.car.update(timeStep);
			}
		}

		if (this.dayNight) this.dayNight.update(timeStep, this.camera, this.car);

		// Update sky
		this.sky.update(this.camera);

		// Update camera
		this.updateCamera();

		// Render
		this.renderer.render(this.scene, this.camera);
	}
}

// Export for external use
export { SimpleCar } from './vehicles/SimpleCar';
