import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Wheel } from './Wheel';
import { KeyBinding } from '../core/KeyBinding';
import { SpringSimulator } from '../physics/spring_simulation/SpringSimulator';
import * as Utils from '../core/Utils';

export type SurfaceType = 'default' | 'asphalt' | 'grass' | 'dirt' | 'ice' | 'kerb';
export type TireCompound = 'street' | 'sport' | 'offroad';

export class SimpleCar extends THREE.Object3D {
	declare private updateWheelFrictionFromSurface: () => void;
	declare private computeFrictionSlip: (surface: SurfaceType) => number;
	declare public setSurfaceSampler: (sampler?: (x: number, z: number) => SurfaceType) => void;
	declare public setDebugSurface: (enabled: boolean) => void;
	declare public update: (timeStep: number) => void;
	declare public physicsPreStep: (body: CANNON.Body) => void;
	declare public shiftUp: () => void;
	declare public shiftDown: () => void;
	declare public toggleManualTransmission: () => void;
	declare public manualShiftUp: () => void;
	declare public manualShiftDown: () => void;
	declare private updateThrottle: (timeStep: number, target: number) => void;
	declare private getWheelRadius: () => number;
	declare private getAbsGearRatio: (gear: number) => number;
	declare private estimateCoupledEngineRpmForGear: (gear: number) => number;
	declare private updateEngineRpm: (timeStep: number, wheelCouplingSpeed: number) => void;
	declare private torqueCurveFactor: (rpm: number) => number;
	declare private computeEngineTorqueNm: (rpm: number, throttle: number) => number;
	declare private countDrivenWheels: () => number;
	declare private startShiftTo: (nextGear: number) => void;
	declare private requestManualGearChange: (delta: number) => void;
	declare private tryAutoShift: () => void;
	declare public onInputChange: () => void;
	declare public triggerAction: (actionName: string, value: boolean) => void;
	declare public releaseAllActions: () => void;
	declare public setPosition: (x: number, y: number, z: number) => void;
	declare public setSteeringValue: (val: number) => void;
	declare public applyEngineForce: (force: number) => void;
	declare public setBrake: (brakeForce: number, driveFilter?: string) => void;
	declare public addToWorld: (scene: THREE.Scene, physicsWorld: CANNON.World) => void;
	declare public reset: (x?: number, y?: number, z?: number) => void;
	declare public setDebugTransmission: (enabled: boolean) => void;
	declare public setHeadlightsEnabled: (enabled: boolean) => void;
	declare public toggleHeadlights: () => void;
	declare private readVehicleData: (gltf: any) => void;
	declare private readCarData: (gltf: any) => void;
	declare private initHeadlights: (model: THREE.Object3D) => void;

	public drive: string = 'awd';
	public actions: { [action: string]: KeyBinding; } = {};
	public rayCastVehicle: CANNON.RaycastVehicle;
	public wheels: Wheel[] = [];
	public collision: CANNON.Body;
	public materials: THREE.Material[] = [];
	public tireCompound: TireCompound = 'street';

	private _speed: number = 0;
	private steeringWheel: THREE.Object3D;
	private airSpinTimer: number = 0;
	private steeringSimulator: SpringSimulator;
	private gear: number = 0;
	private shiftTimer: number = 0;
	private timeToShift: number = 0.22;
	private shiftCooldownTimer: number = 0;
	private pendingGear: number | null = null;
	private engineRpm: number = 950;
	private throttleSmoothed: number = 0;
	private maxRpm: number = 8000;
	private idleRpm: number = 900;
	private peakTorqueNm: number = 60;
	private maxEngineBrakeTorqueNm: number = 18;
	private drivelineEfficiency: number = 0.92;
	private rpmResponseTime: number = 0.16;
	private throttleRiseRate: number = 7.5;
	private throttleFallRate: number = 3.5;
	private wheelCouplingSpeed: number = 3.5;
	private gearRatios: number[] = [3.6, 2.19, 1.41, 1.0, 0.83, 0.72];
	private reverseRatio: number = 3.3;
	private finalDrive: number = 3.42;
	private upshiftRpm: number = 6800;
	private downshiftRpm: number = 2200;
	private kickdownRpm: number = 2600;
	private shiftCooldown: number = 0.32;
	private aeroDragCoefficient: number = 0.12;
	private canTiltForwards: boolean = false;
	private modelContainer: THREE.Group;
	private baseFrictionSlip: number = 0.8;
	private surfaceSampler?: (x: number, z: number) => SurfaceType;
	private lastSurfaceByWheel: Array<SurfaceType | undefined> = [];
	private lastFrictionSlipByWheel: Array<number | undefined> = [];
	private debugSurface: boolean = false;
	private reverseBrakeActive: boolean = false;
	private manualTransmission: boolean = false;
	private debugTransmission: boolean = false;
	private headlightsOn: boolean = false;
	private headlightsLeft?: THREE.SpotLight;
	private headlightsRight?: THREE.SpotLight;
	private headlightsLeftTarget?: THREE.Object3D;
	private headlightsRightTarget?: THREE.Object3D;
	private headlightsIntensity: number = 6;

	get speed(): number {
		return this._speed;
	}
	get currentGear(): number {
		return this.gear;
	}

	get currentRpm(): number {
		return this.engineRpm;
	}

	get redlineRpm(): number {
		return this.maxRpm;
	}

	get isManualTransmission(): boolean {
		return this.manualTransmission;
	}

	constructor(gltf: any) {
		super();

		// Handling setup - exact same as Sketchbook
		const handlingSetup: any = {
			radius: 0.25,
			suspensionStiffness: 20,
			suspensionRestLength: 0.35,
			maxSuspensionTravel: 1,
			frictionSlip: 0.8,
			dampingRelaxation: 2,
			dampingCompression: 2,
			rollInfluence: 0.8,
			chassisConnectionPointLocal: new CANNON.Vec3(),
			axleLocal: new CANNON.Vec3(-1, 0, 0),
			directionLocal: new CANNON.Vec3(0, -1, 0)
		};

		// Physics material
		let mat = new CANNON.Material('Car');

		// Collision body
		this.collision = new CANNON.Body({ mass: 60 });
		this.collision.material = mat;

		// Read GLTF data
		this.readVehicleData(gltf);
		this.readCarData(gltf);

		// Model container
		this.modelContainer = new THREE.Group();
		this.add(this.modelContainer);
		this.modelContainer.add(gltf.scene);
		this.initHeadlights(gltf.scene);

		// Raycast vehicle component
		this.rayCastVehicle = new CANNON.RaycastVehicle({
			chassisBody: this.collision,
			indexUpAxis: 1,
			indexRightAxis: 0,
			indexForwardAxis: 2
		});

		this.baseFrictionSlip = handlingSetup.frictionSlip;

		// Add wheels to raycast vehicle
		this.wheels.forEach((wheel) => {
			handlingSetup.chassisConnectionPointLocal.set(wheel.position.x, wheel.position.y + 0.2, wheel.position.z);

			// Use wheel radius if available, otherwise fallback to default
			const wheelOptions = { ...handlingSetup };
			if (wheel.radius) {
				wheelOptions.radius = wheel.radius;
			}

			const index = this.rayCastVehicle.addWheel(wheelOptions);
			wheel.rayCastWheelInfoIndex = index;
		});

		this.lastSurfaceByWheel = new Array(this.rayCastVehicle.wheelInfos.length);
		this.lastFrictionSlipByWheel = new Array(this.rayCastVehicle.wheelInfos.length);

		// physicsPreStep is called explicitly from the main animation loop before world.step()

		// Actions / Controls
		this.actions = {
			'throttle': new KeyBinding('KeyZ', 'KeyW'),
			'reverse': new KeyBinding('KeyS'),
			'brake': new KeyBinding('Space'),
			'left': new KeyBinding('KeyQ', 'KeyA'),
			'right': new KeyBinding('KeyD'),
		};

		// Steering simulator
		this.steeringSimulator = new SpringSimulator(60, 10, 0.6);
	}

	public get isHeadlightsOn(): boolean {
		return this.headlightsOn;
	}

}

import { installSurface } from './simpleCar/Surface';
import { installRuntime } from './simpleCar/Runtime';
import { installTransmission } from './simpleCar/Transmission';
import { installControls } from './simpleCar/Controls';
import { installSetup } from './simpleCar/Setup';
installSurface(SimpleCar);
installRuntime(SimpleCar);
installTransmission(SimpleCar);
installControls(SimpleCar);
installSetup(SimpleCar);


