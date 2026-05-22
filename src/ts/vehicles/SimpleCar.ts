import * as THREE from 'three';
import * as CANNON from 'cannon';
import { Wheel } from './Wheel';
import { KeyBinding } from '../core/KeyBinding';
import { SpringSimulator } from '../physics/spring_simulation/SpringSimulator';
import * as Utils from '../core/Utils';

export type SurfaceType = 'default' | 'asphalt' | 'grass' | 'dirt' | 'ice' | 'kerb';
export type TireCompound = 'street' | 'sport' | 'offroad';

export class SimpleCar extends THREE.Object3D {
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

	private updateWheelFrictionFromSurface(): void {
		const wheelInfos = this.rayCastVehicle.wheelInfos;
		for (let i = 0; i < wheelInfos.length; i++) {
			const wi: any = wheelInfos[i] as any;
			if (!wi || !wi.raycastResult || !wi.raycastResult.body || !wi.raycastResult.hasHit) continue;

			let surface: SurfaceType = 'default';
			if (this.surfaceSampler) {
				surface = this.surfaceSampler(wi.raycastResult.hitPointWorld.x, wi.raycastResult.hitPointWorld.z);
			}

			if (this.lastSurfaceByWheel[i] === surface && this.lastFrictionSlipByWheel[i] !== undefined) {
				continue;
			}

			const frictionSlip = this.computeFrictionSlip(surface);
			wheelInfos[i].frictionSlip = frictionSlip;
			if (this.debugSurface) {
				console.log(`[Surface] wheel=${i} surface=${surface} frictionSlip=${frictionSlip.toFixed(3)}`);
			}
			this.lastSurfaceByWheel[i] = surface;
			this.lastFrictionSlipByWheel[i] = frictionSlip;
		}
	}

	private computeFrictionSlip(surface: SurfaceType): number {
		const compoundFactor: Record<TireCompound, number> = {
			street: 1.0,
			sport: 1.12,
			offroad: 0.95
		};

		const surfaceFactor: Record<SurfaceType, number> = {
			default: 1.0,
			asphalt: 1.0,
			grass: 0.55,
			dirt: 0.75,
			ice: 0.2,
			kerb: 0.92
		};

		const base = this.baseFrictionSlip * (compoundFactor[this.tireCompound] ?? 1.0);
		const raw = base * (surfaceFactor[surface] ?? 1.0);
		return THREE.MathUtils.clamp(raw, 0.05, 2.0);
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

	public setDebugTransmission(enabled: boolean): void {
		this.debugTransmission = enabled;
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

		// Set up physics preStep callback
		this.collision.preStep = (body: CANNON.Body) => { this.physicsPreStep(body); };

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

	public setHeadlightsEnabled(enabled: boolean): void {
		this.headlightsOn = enabled;
		const intensity = enabled ? this.headlightsIntensity : 0;
		if (this.headlightsLeft) this.headlightsLeft.intensity = intensity;
		if (this.headlightsRight) this.headlightsRight.intensity = intensity;
	}

	public toggleHeadlights(): void {
		this.setHeadlightsEnabled(!this.headlightsOn);
	}

	public setSurfaceSampler(sampler?: (x: number, z: number) => SurfaceType): void {
		this.surfaceSampler = sampler;
		for (let i = 0; i < this.lastSurfaceByWheel.length; i++) {
			this.lastSurfaceByWheel[i] = undefined;
			this.lastFrictionSlipByWheel[i] = undefined;
		}
	}

	public setDebugSurface(enabled: boolean): void {
		this.debugSurface = enabled;
	}

	public update(timeStep: number): void {
		const brakeForce = 3000;
		const reverseBrakeSpeedThreshold = 0.5;
		const stopSpeedThreshold = 0.25;
		const engineBrakeFadeSpeed = 0.4;

		// Update position from physics
		this.position.set(
			this.collision.interpolatedPosition.x,
			this.collision.interpolatedPosition.y,
			this.collision.interpolatedPosition.z
		);

		this.quaternion.set(
			this.collision.interpolatedQuaternion.x,
			this.collision.interpolatedQuaternion.y,
			this.collision.interpolatedQuaternion.z,
			this.collision.interpolatedQuaternion.w
		);

		// Update wheel transforms
		for (let i = 0; i < this.rayCastVehicle.wheelInfos.length; i++) {
			this.rayCastVehicle.updateWheelTransform(i);
			let transform = this.rayCastVehicle.wheelInfos[i].worldTransform;

			let wheelObject = this.wheels[i].wheelObject;
			wheelObject.position.copy(Utils.threeVector(transform.position));
			wheelObject.quaternion.copy(Utils.threeQuat(transform.quaternion));
		}

		this.updateWheelFrictionFromSurface();

		this.updateMatrixWorld();

		const tiresHaveContact = this.rayCastVehicle.numWheelsOnGround > 0;

		// Air spin
		if (!tiresHaveContact) {
			this.airSpinTimer += timeStep;
			if (!this.actions.throttle.isPressed) this.canTiltForwards = true;
		}
		else {
			this.canTiltForwards = false;
			this.airSpinTimer = 0;
		}

		const maxGears = this.gearRatios.length;
		const absSpeed = Math.abs(this.speed);

		// Reverse key behavior: brake on 4 wheels when moving forward, reverse only near stop
		if (this.actions.reverse.isPressed && this.speed > reverseBrakeSpeedThreshold) {
			if (!this.reverseBrakeActive) {
				this.reverseBrakeActive = true;
				if (this.debugTransmission) console.log('[Transmission] reverseBrakeActive=true');
			}
			this.applyEngineForce(0);
			this.setBrake(brakeForce);
		}
		else {
			if (this.reverseBrakeActive) {
				this.reverseBrakeActive = false;
				if (this.debugTransmission) console.log('[Transmission] reverseBrakeActive=false');
				this.setBrake(0);
			}
		}

		// Gear state management (R / N / 1..max)
		if (!this.manualTransmission) {
			if (this.actions.reverse.isPressed && !this.reverseBrakeActive && absSpeed < reverseBrakeSpeedThreshold) {
				if (this.gear >= 0) this.gear = -1;
			}
			else if (this.actions.throttle.isPressed && this.gear <= 0) {
				this.gear = 1;
			}
			// Sinon, reste en neutral (gear 0) jusqu'à ce que le joueur appuie sur throttle ou reverse
		}

		const throttleTarget = (this.gear < 0)
			? ((this.actions.reverse.isPressed && !this.reverseBrakeActive) ? 1 : 0)
			: (this.actions.throttle.isPressed ? 1 : 0);
		this.updateThrottle(timeStep, throttleTarget);

		if (this.shiftCooldownTimer > 0) {
			this.shiftCooldownTimer -= timeStep;
			if (this.shiftCooldownTimer < 0) this.shiftCooldownTimer = 0;
		}

		if (this.shiftTimer > 0) {
			this.shiftTimer -= timeStep;
			if (this.shiftTimer < 0) this.shiftTimer = 0;
			if (this.pendingGear !== null && this.shiftTimer <= this.timeToShift * 0.5) {
				this.gear = this.pendingGear;
				this.pendingGear = null;
			}
		}

		this.updateEngineRpm(timeStep, this.wheelCouplingSpeed);
		if (!this.manualTransmission) this.tryAutoShift();

		const drivenWheelCount = Math.max(1, this.countDrivenWheels());
		const wheelRadius = this.getWheelRadius();

		let engineTorqueNm = 0;
		if (!this.reverseBrakeActive && this.gear !== 0) {
			engineTorqueNm = this.computeEngineTorqueNm(this.engineRpm, this.throttleSmoothed);
			if (this.shiftTimer > 0) {
				const p = 1 - (this.shiftTimer / this.timeToShift);
				const x = THREE.MathUtils.clamp((p - 0.5) / 0.5, 0, 1);
				const torqueScale = x * x * (3 - 2 * x);
				engineTorqueNm *= torqueScale;
			}

			if (engineTorqueNm < 0) {
				const f = THREE.MathUtils.clamp(absSpeed / engineBrakeFadeSpeed, 0, 1);
				engineTorqueNm *= f;
			}
		}

		if (this.reverseBrakeActive || this.gear === 0) {
			this.applyEngineForce(0);
		}
		else {
			const absGearRatio = this.getAbsGearRatio(this.gear);
			const wheelForceTotal = (engineTorqueNm * absGearRatio * this.finalDrive * this.drivelineEfficiency) / Math.max(0.001, wheelRadius);
			const driveSign = (this.gear < 0) ? 1 : -1;
			let perWheelForce = 0;
			if (engineTorqueNm >= 0) {
				perWheelForce = driveSign * (wheelForceTotal / drivenWheelCount);
			}
			else {
				const gearDir = (this.gear < 0) ? -1 : 1;
				const sameDirAsGear = (this.speed * gearDir) > 0;
				const engineBrakeSign = driveSign * (sameDirAsGear ? -1 : 1);
				perWheelForce = engineBrakeSign * (Math.abs(wheelForceTotal) / drivenWheelCount);
			}

			this.applyEngineForce(perWheelForce);
		}

		// Steering
		if (!this.actions.right.isPressed && !this.actions.left.isPressed) {
			this.steeringSimulator.target = 0;
		}
		this.steeringSimulator.simulate(timeStep);
		this.setSteeringValue(this.steeringSimulator.position);
		if (this.steeringWheel !== undefined) this.steeringWheel.rotation.z = -this.steeringSimulator.position * 2;

		// Reset car if flipped
		if (this.rayCastVehicle.numWheelsOnGround < 3 && Math.abs(this.collision.velocity.length()) < 0.5) {
			this.collision.quaternion.copy(this.collision.initQuaternion);
		}
	}

	public shiftUp(): void {
		if (this.gear < 1) return;
		this.startShiftTo(Math.min(this.gear + 1, this.gearRatios.length));
	}

	public shiftDown(): void {
		if (this.gear <= 1) return;
		this.startShiftTo(Math.max(1, this.gear - 1));
	}

	public toggleManualTransmission(): void {
		this.manualTransmission = !this.manualTransmission;
		if (this.debugTransmission) console.log(`[Transmission] mode=${this.manualTransmission ? 'MANUAL' : 'AUTO'} gear=${this.gear}`);
		if (typeof this.collision.wakeUp === 'function') this.collision.wakeUp();
	}

	public manualShiftUp(): void {
		if (!this.manualTransmission) return;
		this.requestManualGearChange(1);
	}

	public manualShiftDown(): void {
		if (!this.manualTransmission) return;
		this.requestManualGearChange(-1);
	}

	public physicsPreStep(body: CANNON.Body): void {
		// Constants
		const quat = Utils.threeQuat(body.quaternion);
		const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
		const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
		const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);

		// Measure speed
		this._speed = this.collision.velocity.dot(Utils.cannonVector(forward));

		const vForward = this._speed;
		const dragScalar = -this.aeroDragCoefficient * vForward * Math.abs(vForward);
		if (Number.isFinite(dragScalar) && Math.abs(dragScalar) > 0) {
			const dragVec = Utils.cannonVector(forward.clone().multiplyScalar(dragScalar));
			body.force.vadd(dragVec, body.force);
		}

		// Air spin
		let airSpinInfluence = THREE.MathUtils.clamp(this.airSpinTimer / 2, 0, 1);
		airSpinInfluence *= THREE.MathUtils.clamp(this.speed, 0, 1);

		const flipSpeedFactor = THREE.MathUtils.clamp(1 - this.speed, 0, 1);
		const upFactor = (up.dot(new THREE.Vector3(0, -1, 0)) / 2) + 0.5;
		const flipOverInfluence = flipSpeedFactor * upFactor * 3;

		const maxAirSpinMagnitude = 2.0;
		const airSpinAcceleration = 0.15;
		const angVel = this.collision.angularVelocity;

		const spinVectorForward = Utils.cannonVector(forward.clone());
		const spinVectorRight = Utils.cannonVector(right.clone());

		const effectiveSpinVectorForward = Utils.cannonVector(forward.clone().multiplyScalar(airSpinAcceleration * (airSpinInfluence + flipOverInfluence)));
		const effectiveSpinVectorRight = Utils.cannonVector(right.clone().multiplyScalar(airSpinAcceleration * (airSpinInfluence)));

		// Right
		if (this.actions.right.isPressed && !this.actions.left.isPressed) {
			if (angVel.dot(spinVectorForward) < maxAirSpinMagnitude) {
				angVel.vadd(effectiveSpinVectorForward, angVel);
			}
		} else
			// Left
			if (this.actions.left.isPressed && !this.actions.right.isPressed) {
				if (angVel.dot(spinVectorForward) > -maxAirSpinMagnitude) {
					angVel.vsub(effectiveSpinVectorForward, angVel);
				}
			}

		// Forwards
		if (this.canTiltForwards && this.actions.throttle.isPressed && !this.actions.reverse.isPressed) {
			if (angVel.dot(spinVectorRight) < maxAirSpinMagnitude) {
				angVel.vadd(effectiveSpinVectorRight, angVel);
			}
		} else
			// Backwards
			if (this.actions.reverse.isPressed && !this.actions.throttle.isPressed) {
				if (angVel.dot(spinVectorRight) > -maxAirSpinMagnitude) {
					angVel.vsub(effectiveSpinVectorRight, angVel);
				}
			}

		// Steering
		const velocity = new CANNON.Vec3().copy(this.collision.velocity);
		const velLen = velocity.length();
		let driftCorrection = 0;
		if (Number.isFinite(velLen) && velLen > 1e-5) {
			velocity.scale(1 / velLen, velocity);
			driftCorrection = Utils.getSignedAngleBetweenVectors(Utils.threeVector(velocity), forward);
			if (!Number.isFinite(driftCorrection)) driftCorrection = 0;
		}

		const maxSteerVal = 0.8;
		let speedFactor = THREE.MathUtils.clamp(this.speed * 0.3, 1, Number.MAX_VALUE);

		if (this.actions.right.isPressed) {
			let steering = Math.min(-maxSteerVal / speedFactor, -driftCorrection);
			this.steeringSimulator.target = THREE.MathUtils.clamp(steering, -maxSteerVal, maxSteerVal);
		}
		else if (this.actions.left.isPressed) {
			let steering = Math.max(maxSteerVal / speedFactor, -driftCorrection);
			this.steeringSimulator.target = THREE.MathUtils.clamp(steering, -maxSteerVal, maxSteerVal);
		}
		else this.steeringSimulator.target = 0;

		// Apply physical vibrations when driving on kerbs (Priority 8)
		let onKerb = false;
		for (let i = 0; i < this.lastSurfaceByWheel.length; i++) {
			if (this.lastSurfaceByWheel[i] === 'kerb') {
				onKerb = true;
				break;
			}
		}

		if (onKerb) {
			const time = performance.now() * 0.001; // Time in seconds
			const speedMagnitude = Math.abs(this._speed);
			if (speedMagnitude > 1.0) {
				const vibrationFreq = 35; // High frequency in Hz
				const vibrationAmp = 15.0 * Math.min(speedMagnitude * 0.1, 1.5); // Amplitude proportional to speed, capped
				const forceY = Math.sin(time * Math.PI * 2 * vibrationFreq) * vibrationAmp;
				const vibrationForce = Utils.cannonVector(new THREE.Vector3(0, forceY, 0));
				body.force.vadd(vibrationForce, body.force);
			}
		}
	}

	private updateThrottle(timeStep: number, target: number): void {
		const t = THREE.MathUtils.clamp(target, 0, 1);
		const rate = (t > this.throttleSmoothed) ? this.throttleRiseRate : this.throttleFallRate;
		const maxDelta = rate * timeStep;
		this.throttleSmoothed = THREE.MathUtils.clamp(
			this.throttleSmoothed + THREE.MathUtils.clamp(t - this.throttleSmoothed, -maxDelta, maxDelta),
			0,
			1
		);
	}

	private getWheelRadius(): number {
		const wi: any = (this.rayCastVehicle && this.rayCastVehicle.wheelInfos && this.rayCastVehicle.wheelInfos[0])
			? (this.rayCastVehicle.wheelInfos[0] as any)
			: undefined;
		const r = wi && Number.isFinite(wi.radius) ? wi.radius : 0.25;
		return Math.max(0.05, r);
	}

	private getAbsGearRatio(gear: number): number {
		if (gear < 0) return this.reverseRatio;
		if (gear === 0) return 0;
		const idx = THREE.MathUtils.clamp(gear - 1, 0, this.gearRatios.length - 1);
		return this.gearRatios[idx];
	}

	private estimateCoupledEngineRpmForGear(gear: number): number {
		if (gear === 0) return this.idleRpm;
		const wheelRadius = this.getWheelRadius();
		const absSpeed = Math.abs(this.speed);
		const coupled = absSpeed / wheelRadius;
		const wheelRpm = coupled * (60 / (2 * Math.PI));
		const coupledEngineRpm = wheelRpm * this.getAbsGearRatio(gear) * this.finalDrive;
		return Math.max(0, coupledEngineRpm);
	}

	private updateEngineRpm(timeStep: number, wheelCouplingSpeed: number): void {
		const wheelRadius = this.getWheelRadius();
		const absSpeed = Math.abs(this.speed);
		const coupled = (this.gear !== 0) ? (absSpeed / wheelRadius) : 0;
		const wheelRpm = coupled * (60 / (2 * Math.PI));
		const coupledEngineRpm = wheelRpm * this.getAbsGearRatio(this.gear) * this.finalDrive;
		const freeRevTarget = this.idleRpm + this.throttleSmoothed * (this.maxRpm - this.idleRpm);
		let target = freeRevTarget;
		if (this.gear !== 0) {
			let coupling = THREE.MathUtils.clamp(absSpeed / wheelCouplingSpeed, 0, 1);
			if (this.gear > 0 && this.throttleSmoothed > 0.05) {
				const absGearRatio = this.getAbsGearRatio(this.gear);
				const maxRatio = this.gearRatios[0] ?? absGearRatio;
				const minRatio = this.gearRatios[this.gearRatios.length - 1] ?? absGearRatio;
				const ratioRange = Math.max(1e-6, maxRatio - minRatio);
				const longGearFactor = THREE.MathUtils.clamp((maxRatio - absGearRatio) / ratioRange, 0, 1);
				const lugStartRpm = 1500;
				const lugFactor = THREE.MathUtils.clamp((lugStartRpm - coupledEngineRpm) / Math.max(1, lugStartRpm - this.idleRpm), 0, 1);
				const boost = lugFactor * longGearFactor * THREE.MathUtils.clamp(0.35 + this.throttleSmoothed * 0.65, 0, 1);
				coupling = THREE.MathUtils.clamp(coupling + boost, 0, 1);
			}
			target = THREE.MathUtils.lerp(freeRevTarget, coupledEngineRpm, coupling);
		}
		target = THREE.MathUtils.clamp(target, this.idleRpm, this.maxRpm);

		const alpha = 1 - Math.exp(-timeStep / Math.max(0.01, this.rpmResponseTime));
		this.engineRpm = this.engineRpm + (target - this.engineRpm) * alpha;
		this.engineRpm = THREE.MathUtils.clamp(this.engineRpm, 0, this.maxRpm);
	}

	private torqueCurveFactor(rpm: number): number {
		const pts: Array<[number, number]> = [
			[900, 0.35],
			[1500, 0.55],
			[2500, 0.75],
			[3800, 1.0],
			[5200, 0.95],
			[6500, 0.82],
			[7300, 0.65],
			[8000, 0.0]
		];

		const r = THREE.MathUtils.clamp(rpm, pts[0][0], pts[pts.length - 1][0]);
		for (let i = 0; i < pts.length - 1; i++) {
			const a = pts[i];
			const b = pts[i + 1];
			if (r >= a[0] && r <= b[0]) {
				const t = (r - a[0]) / Math.max(1e-6, (b[0] - a[0]));
				return THREE.MathUtils.lerp(a[1], b[1], t);
			}
		}
		return pts[pts.length - 1][1];
	}

	private computeEngineTorqueNm(rpm: number, throttle: number): number {
		const t = THREE.MathUtils.clamp(throttle, 0, 1);
		const r = THREE.MathUtils.clamp(rpm, 0, this.maxRpm);

		// Limiteur de régime (fuel cut)
		if (rpm > this.maxRpm) {
			// Coupure d'injection au-delà de la zone rouge
			return -this.maxEngineBrakeTorqueNm * 0.3;
		}

		const base = this.peakTorqueNm * this.torqueCurveFactor(r);
		let drive = base * t;
		if (this.gear > 2 && t > 0.05) {
			const lugStartRpm = 1500;
			if (r < lugStartRpm) {
				const lugScale = THREE.MathUtils.clamp((r - this.idleRpm) / Math.max(1, lugStartRpm - this.idleRpm), 0, 1);
				drive *= lugScale;
			}
		}
		const brake = -this.maxEngineBrakeTorqueNm * (1 - t) * THREE.MathUtils.clamp(r / this.maxRpm, 0, 1);

		// Au point mort: pas de transmission de couple
		if (this.gear === 0) return 0;

		return drive + brake;
	}

	private countDrivenWheels(): number {
		let count = 0;
		for (let i = 0; i < this.wheels.length; i++) {
			const w = this.wheels[i];
			if (this.drive === 'awd' || this.drive === w.drive) count++;
		}
		return count;
	}

	private startShiftTo(nextGear: number): void {
		if (this.shiftTimer > 0) return;
		if (this.shiftCooldownTimer > 0) return;
		if (this.gear <= 0) return;
		if (nextGear === this.gear) return;
		if (nextGear < 1 || nextGear > this.gearRatios.length) return;
		if (this.debugTransmission) console.log(`[Transmission] shift ${this.gear} -> ${nextGear}`);
		this.pendingGear = nextGear;
		this.shiftTimer = this.timeToShift;
		this.shiftCooldownTimer = this.shiftCooldown;
		this.applyEngineForce(0);
	}

	private requestManualGearChange(delta: number): void {
		if (this.shiftTimer > 0) return;
		if (this.shiftCooldownTimer > 0) return;

		const reverseBrakeSpeedThreshold = 0.5;
		const absSpeed = Math.abs(this.speed);
		const maxGears = this.gearRatios.length;
		const current = this.gear;
		let next = current + delta;
		next = THREE.MathUtils.clamp(next, -1, maxGears);
		if (next === current) return;

		// Block engaging reverse unless near stop
		if (next < 0) {
			if (absSpeed > reverseBrakeSpeedThreshold) {
				if (this.debugTransmission) console.log(`[Transmission] block shift to R (absSpeed=${absSpeed.toFixed(2)})`);
				return;
			}
			this.pendingGear = null;
			this.shiftTimer = 0;
			this.gear = -1;
			if (this.debugTransmission) console.log('[Transmission] gear=R');
			this.applyEngineForce(0);
			this.shiftCooldownTimer = this.shiftCooldown * 0.5;
			if (typeof this.collision.wakeUp === 'function') this.collision.wakeUp();
			return;
		}

		// Neutral
		if (next === 0) {
			this.pendingGear = null;
			this.shiftTimer = 0;
			this.gear = 0;
			if (this.debugTransmission) console.log('[Transmission] gear=N');
			this.applyEngineForce(0);
			this.shiftCooldownTimer = this.shiftCooldown * 0.35;
			if (typeof this.collision.wakeUp === 'function') this.collision.wakeUp();
			return;
		}

		// Forward gear 1..max
		if (current >= 1) {
			// Block over-revving downshift
			if (delta < 0 && next >= 1 && next < current) {
				const predictedRpm = this.estimateCoupledEngineRpmForGear(next);
				if (predictedRpm > this.maxRpm * 1.02) {
					if (this.debugTransmission) console.log(`[Transmission] block downshift ${current} -> ${next} (predRpm=${Math.round(predictedRpm)} max=${Math.round(this.maxRpm)})`);
					return;
				}
				// Rev matching (blip) pour downshift
				if (predictedRpm > this.engineRpm) {
					this.engineRpm = Math.min(predictedRpm * 1.08, this.maxRpm * 0.98);
					if (this.debugTransmission) console.log(`[Transmission] rev-match blip to ${Math.round(this.engineRpm)} RPM`);
				}
			}
			this.startShiftTo(next);
			return;
		}

		this.pendingGear = null;
		this.shiftTimer = 0;
		this.gear = next;
		if (this.debugTransmission) console.log(`[Transmission] gear=${this.gear}`);
		this.applyEngineForce(0);
		this.shiftCooldownTimer = this.shiftCooldown * 0.35;
		if (typeof this.collision.wakeUp === 'function') this.collision.wakeUp();
	}

	private tryAutoShift(): void {
		if (this.gear <= 0) return;
		if (this.gear > this.gearRatios.length) return;
		if (this.shiftTimer > 0) return;
		if (this.shiftCooldownTimer > 0) return;

		const blockUpshift = this.reverseBrakeActive;

		if (!blockUpshift && this.gear < this.gearRatios.length && this.engineRpm > this.upshiftRpm) {
			this.startShiftTo(this.gear + 1);
			return;
		}

		if (this.gear > 1) {
			if (!blockUpshift && this.throttleSmoothed > 0.85 && this.engineRpm < this.kickdownRpm) {
				this.startShiftTo(this.gear - 1);
				return;
			}
			if (this.engineRpm < this.downshiftRpm) {
				this.startShiftTo(this.gear - 1);
				return;
			}
		}
	}

	public onInputChange(): void {
		const brakeForce = 3000;

		// La logique reverse-brake est maintenant gérée uniquement dans update()
		// Ici, on ne gère que les changements d'état basiques

		if (this.actions.throttle.justReleased || this.actions.reverse.justReleased) {
			this.applyEngineForce(0);
		}

		// Touche brake normale (frein arrière uniquement)
		if (this.actions.brake.justPressed) {
			this.setBrake(brakeForce, 'rwd');
		}
		if (this.actions.brake.justReleased) {
			this.setBrake(0, 'rwd');
		}
	}

	public triggerAction(actionName: string, value: boolean): void {
		let action = this.actions[actionName];

		if (action.isPressed !== value) {
			action.isPressed = value;

			action.justPressed = false;
			action.justReleased = false;

			if (value) action.justPressed = true;
			else action.justReleased = true;

			this.onInputChange();

			// Ensure the body is awake if player presses controls
			if (typeof this.collision.wakeUp === 'function') this.collision.wakeUp();

			action.justPressed = false;
			action.justReleased = false;
		}
	}

	public releaseAllActions(): void {
		for (const key in this.actions) {
			this.actions[key].isPressed = false;
			this.actions[key].justPressed = false;
			this.actions[key].justReleased = false;
		}

		this.reverseBrakeActive = false;
		this.applyEngineForce(0);
		this.setBrake(0);
		this.setBrake(0, 'rwd');
		this.setBrake(0, 'fwd');
		this.steeringSimulator.target = 0;
	}

	public setPosition(x: number, y: number, z: number): void {
		this.collision.position.x = x;
		this.collision.position.y = y;
		this.collision.position.z = z;

		// Ensure visual object is at same position immediately
		this.position.set(x, y, z);

		// Update previous/interpolated positions so there isn't a jump and to keep physics consistent
		if ((this.collision as any).previousPosition) (this.collision as any).previousPosition.copy(this.collision.position);
		if ((this.collision as any).interpolatedPosition) (this.collision as any).interpolatedPosition.copy(this.collision.position);

		// Wake up the body so physics runs immediately
		if (typeof this.collision.wakeUp === 'function') {
			this.collision.wakeUp();
		}
	}

	public setSteeringValue(val: number): void {
		this.wheels.forEach((wheel) => {
			if (wheel.steering) this.rayCastVehicle.setSteeringValue(val, wheel.rayCastWheelInfoIndex);
		});
	}

	public applyEngineForce(force: number): void {
		this.wheels.forEach((wheel) => {
			if (this.drive === wheel.drive || this.drive === 'awd') {
				this.rayCastVehicle.applyEngineForce(force, wheel.rayCastWheelInfoIndex);
			}
		});
	}

	public setBrake(brakeForce: number, driveFilter?: string): void {
		this.wheels.forEach((wheel) => {
			if (driveFilter === undefined || driveFilter === wheel.drive) {
				this.rayCastVehicle.setBrake(brakeForce, wheel.rayCastWheelInfoIndex);
			}
		});
	}

	public addToWorld(scene: THREE.Scene, physicsWorld: CANNON.World): void {
		scene.add(this);
		this.rayCastVehicle.addToWorld(physicsWorld);

		this.wheels.forEach((wheel) => {
			scene.add(wheel.wheelObject);
		});

		// Ensure body is awake after being added to world
		if (typeof this.collision.wakeUp === 'function') this.collision.wakeUp();
	}

	public reset(x: number = 0, y: number = 2, z: number = 0): void {
		this.setPosition(x, y, z);
		this.collision.velocity.set(0, 0, 0);
		this.collision.angularVelocity.set(0, 0, 0);
		this.collision.quaternion.set(0, 0, 0, 1);
		if ((this.collision as any).previousPosition) (this.collision as any).previousPosition.copy(this.collision.position);
		if ((this.collision as any).interpolatedPosition) (this.collision as any).interpolatedPosition.copy(this.collision.position);
		if (typeof this.collision.wakeUp === 'function') this.collision.wakeUp();

		try { this.setBrake(0); } catch (e) { }
		try { this.applyEngineForce(0); } catch (e) { }

		// Reset transmission state
		this.gear = 0; // Neutral
		this.pendingGear = null;
		this.shiftTimer = 0;
		this.shiftCooldownTimer = 0;
		this.throttleSmoothed = 0;
		this.engineRpm = this.idleRpm;
		this.reverseBrakeActive = false;

		// Reset all input states
		if (this.actions) {
			Object.keys(this.actions).forEach((k) => {
				const a = this.actions[k];
				a.isPressed = false;
				a.justPressed = false;
				a.justReleased = false;
			});
		}

		// Refresh wheel transforms
		if (this.rayCastVehicle) {
			for (let i = 0; i < this.rayCastVehicle.wheelInfos.length; i++) {
				try { this.rayCastVehicle.updateWheelTransform(i); } catch (e) { }
			}
		}
	}

	private readVehicleData(gltf: any): void {
		gltf.scene.traverse((child: any) => {

			if (child.isMesh) {
				Utils.setupMeshProperties(child);

				if (child.material !== undefined) {
					this.materials.push(child.material);
				}
			}

			if (child.hasOwnProperty('userData')) {
				if (child.userData.hasOwnProperty('data')) {
					if (child.userData.data === 'wheel') {
						this.wheels.push(new Wheel(child));
					}
					if (child.userData.data === 'collision') {
						if (child.userData.shape === 'box') {
							child.visible = false;

							let phys = new CANNON.Box(new CANNON.Vec3(child.scale.x, child.scale.y, child.scale.z));
							this.collision.addShape(phys, new CANNON.Vec3(child.position.x, child.position.y, child.position.z));
						}
						else if (child.userData.shape === 'sphere') {
							child.visible = false;

							let phys = new CANNON.Sphere(child.scale.x);
							this.collision.addShape(phys, new CANNON.Vec3(child.position.x, child.position.y, child.position.z));
						}
					}
				}
			}
		});

		if (this.collision.shapes.length === 0) {
			console.warn('Vehicle has no collision data.');
		}
		else {
			this.collision.updateMassProperties();
			console.log('Vehicle collision setup complete. Mass:', this.collision.mass, 'Shapes:', this.collision.shapes.length);
		}
	}

	private readCarData(gltf: any): void {
		gltf.scene.traverse((child: THREE.Object3D) => {
			if (child.hasOwnProperty('userData')) {
				if (child.userData.hasOwnProperty('data')) {
					if (child.userData.data === 'steering_wheel') {
						this.steeringWheel = child;
					}
				}
			}
		});
	}

	private initHeadlights(model: THREE.Object3D): void {
		const bbox = new THREE.Box3().setFromObject(model);
		if (!Number.isFinite(bbox.min.x) || !Number.isFinite(bbox.max.x)) return;

		const size = new THREE.Vector3();
		bbox.getSize(size);
		if (size.lengthSq() <= 1e-6) return;

		const halfWidth = Math.max(0.15, size.x * 0.25);
		const frontZ = bbox.max.z - size.z * 0.03;
		const y = bbox.min.y + size.y * 0.35;
		const targetZ = frontZ + Math.max(5, size.z * 1.8);

		this.headlightsLeftTarget = new THREE.Object3D();
		this.headlightsLeftTarget.position.set(-halfWidth, y - 0.05, targetZ);
		this.modelContainer.add(this.headlightsLeftTarget);

		this.headlightsRightTarget = new THREE.Object3D();
		this.headlightsRightTarget.position.set(halfWidth, y - 0.05, targetZ);
		this.modelContainer.add(this.headlightsRightTarget);

		this.headlightsLeft = new THREE.SpotLight(0xffffff, 0);
		this.headlightsLeft.position.set(-halfWidth, y, frontZ);
		this.headlightsLeft.angle = 0.8;
		this.headlightsLeft.penumbra = 1;
		this.headlightsLeft.decay = 1;
		this.headlightsLeft.distance = Math.max(20, size.z * 4);
		this.headlightsLeft.castShadow = true;
		this.headlightsLeft.target = this.headlightsLeftTarget;
		this.modelContainer.add(this.headlightsLeft);

		this.headlightsRight = new THREE.SpotLight(0xffffff, 0);
		this.headlightsRight.position.set(halfWidth, y, frontZ);
		this.headlightsRight.angle = 0.8;
		this.headlightsRight.penumbra = 1;
		this.headlightsRight.decay = 1;
		this.headlightsRight.distance = Math.max(20, size.z * 4);
		this.headlightsRight.castShadow = true;
		this.headlightsRight.target = this.headlightsRightTarget;
		this.modelContainer.add(this.headlightsRight);
	}
}

