import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { SimpleCar, SurfaceType } from './vehicles/SimpleCar';
import { VehicleSetup } from './vehicles/VehicleSetup';
import { VehicleSetupConfig } from './vehicles/vehicleSetupTypes';
import { Sky } from './world/Sky';
import { DayNightCycle } from './world/DayNightCycle';
import { generateTrack, defaultTrackConfig, createTrackObject, TrackData, TrackConfig, KERB_WIDTH_METERS } from './world/ProceduralTrack';

// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export interface WorldOptions
{
	proceduralSeed?: number;
	proceduralDifficulty?: string;
	proceduralConfig?: Partial<TrackConfig>;
	vehicleSetupConfig?: VehicleSetupConfig | null;
	onPauseChange?: (isPaused: boolean) => void;
}

export class World
{
	declare public setDebugInput: (enabled: boolean) => void;
	declare private applyLaunchOptions: (options: WorldOptions) => void;
	declare private createGround: () => void;
	declare private setupPhysics: () => void;
	declare private loadCar: (path: string) => void;
	declare private loadTrack: (path: string, yOffset?: number) => void;
	declare private getSurfaceTypeAt: (x: number, z: number) => SurfaceType;
	declare private getSpawnPosition: () => THREE.Vector3;
	declare private getSpawnRotation: () => THREE.Quaternion;
	declare public setLevel: (levelId: string) => void;
	declare private buildProceduralTrack: () => void;
	declare private clearProceduralKerbCollisions: () => void;
	declare private rebuildProceduralKerbCollisions: (trackData: TrackData) => void;
	declare private createKerbCollisionBody: (borderPoints: THREE.Vector3[], centerPoints: THREE.Vector3[], kerbFlags: boolean[]) => CANNON.Body | null;
	declare public regenerateProceduralTrack: () => void;
	declare public setProceduralParameter: (key: 'numControlPoints' | 'baseRadius' | 'radiusVariation' | 'angleVariation' | 'trackWidth', value: number) => void;
	declare public randomizeProceduralSeed: () => void;
	declare public setProceduralSeed: (seed: number) => void;
	declare public setProceduralDifficulty: (difficulty: string) => void;
	declare public getProceduralDifficulty: () => string;
	declare public getProceduralSeed: () => number;
	declare public getProceduralTrackSummary: () => { lengthMeters: number; difficulty: string; seed: number };
	declare public getProceduralConfig: () => { numControlPoints: number; baseRadius: number; radiusVariation: number; angleVariation: number; trackWidth: number };
	declare private setupEventListeners: () => void;
	declare private releaseCarActions: () => void;
	declare private updateMouseCamera: (event: MouseEvent) => void;
	declare private resizeRenderer: () => void;
	declare private handleKeyboard: (event: KeyboardEvent, pressed: boolean) => void;
	declare public togglePause: () => void;
	declare public pause: () => void;
	declare public resume: () => void;
	declare public dispose: () => void;
	declare private updateCamera: () => void;
	declare private animate: () => void;

	// Three.js
	public renderer: THREE.WebGLRenderer;
	public camera: THREE.PerspectiveCamera;
	public scene: THREE.Scene;
	public sky: Sky;
	public dayNight: DayNightCycle;
	// Track
	public ground?: THREE.Mesh;
	public track?: THREE.Object3D;
	private currentLevelId: string = 'default';
	private proceduralTrackData?: TrackData;
	private proceduralConfig: TrackConfig = { ...defaultTrackConfig };
	private proceduralSeed: number = Math.floor(Math.random() * 1000000);
	private currentDifficulty: string = 'moyen';
	private proceduralKerbBodies: CANNON.Body[] = [];
	
	// Physics
	public physicsWorld!: CANNON.World;
	public physicsFrameRate: number = 60;
	public physicsFrameTime: number = 1 / this.physicsFrameRate;
	public physicsMaxPrediction: number = this.physicsFrameRate;
	
	// Car
	public car!: SimpleCar;
	
	// Camera follow
	public cameraTarget: THREE.Vector3 = new THREE.Vector3();
	public cameraRadius: number = 6;
	public cameraTheta: number = 0;
	public cameraPhi: number = 15;
	public cameraSensitivity: number = 0.3;
	
	// Time
	private clock: THREE.Clock;
	private requestDelta: number = 0;

	// State
	private isPaused: boolean = false;
	private isDisposed: boolean = false;
	private debugInput: boolean = false;
	private onPauseChange?: (isPaused: boolean) => void;
	private vehicleSetupConfig?: VehicleSetupConfig | null;

	// Input state
	private mouseDown: boolean = false;
	private lastMouseX: number = 0;
	private lastMouseY: number = 0;
	private readonly handleKeyDown = (event: KeyboardEvent) => this.handleKeyboard(event, true);
	private readonly handleKeyUp = (event: KeyboardEvent) => this.handleKeyboard(event, false);
	private readonly handleWindowBlur = () => this.releaseCarActions();
	private readonly handleVisibilityChange = () => {
		if (!document.hidden) return;
		this.releaseCarActions();
	};
	private readonly handleMouseUp = () => {
		this.mouseDown = false;
	};
	private readonly handleMouseMove = (event: MouseEvent) => this.updateMouseCamera(event);
	private readonly handleResize = () => this.resizeRenderer();

	constructor(carModelPath: string, levelId: string = 'default', options: WorldOptions = {})
	{
		this.onPauseChange = options.onPauseChange;
		this.vehicleSetupConfig = options.vehicleSetupConfig ?? null;

		// Renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		const mount = document.getElementById('game-container') || document.body;
		mount.appendChild(this.renderer.domElement);

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

		this.applyLaunchOptions(options);

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


}

import { installBootstrap } from './world/worldCore/Bootstrap';
import { installTrackSurface } from './world/worldCore/TrackSurface';
import { installProcedural } from './world/worldCore/Procedural';
import { installInput } from './world/worldCore/Input';
import { installRuntime } from './world/worldCore/Runtime';
installBootstrap(World);
installTrackSurface(World);
installProcedural(World);
installInput(World);
installRuntime(World);

