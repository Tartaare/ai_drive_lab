import * as THREE from 'three';
import * as CANNON from 'cannon';
import { Wheel } from './Wheel';
import { KeyBinding } from '../core/KeyBinding';
import { SpringSimulator } from '../physics/spring_simulation/SpringSimulator';
import * as Utils from '../core/Utils';

export class SimpleCar extends THREE.Object3D
{
	public drive: string = 'awd';
	public actions: { [action: string]: KeyBinding; } = {};
	public rayCastVehicle: CANNON.RaycastVehicle;
	public wheels: Wheel[] = [];
	public collision: CANNON.Body;
	public materials: THREE.Material[] = [];
	
	private _speed: number = 0;
	private steeringWheel: THREE.Object3D;
	private airSpinTimer: number = 0;
	private steeringSimulator: SpringSimulator;
	private gear: number = 1;
	private shiftTimer: number = 0;
	private timeToShift: number = 0.2;
	private canTiltForwards: boolean = false;
	private modelContainer: THREE.Group;

	get speed(): number {
		return this._speed;
	}

	constructor(gltf: any)
	{
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
		let mat = new CANNON.Material('Mat');
		mat.friction = 0.01;

		// Collision body
		this.collision = new CANNON.Body({ mass: 50 });
		this.collision.material = mat;

		// Read GLTF data
		this.readVehicleData(gltf);
		this.readCarData(gltf);

		// Model container
		this.modelContainer = new THREE.Group();
		this.add(this.modelContainer);
		this.modelContainer.add(gltf.scene);

		// Raycast vehicle component
		this.rayCastVehicle = new CANNON.RaycastVehicle({
			chassisBody: this.collision,
			indexUpAxis: 1,
			indexRightAxis: 0,
			indexForwardAxis: 2
		});

		// Add wheels to raycast vehicle
		this.wheels.forEach((wheel) =>
		{
			handlingSetup.chassisConnectionPointLocal.set(wheel.position.x, wheel.position.y + 0.2, wheel.position.z);
			
			// Use wheel radius if available, otherwise fallback to default
			const wheelOptions = { ...handlingSetup };
			if (wheel.radius) {
				wheelOptions.radius = wheel.radius;
			}

			const index = this.rayCastVehicle.addWheel(wheelOptions);
			wheel.rayCastWheelInfoIndex = index;
		});

		// Set up physics preStep callback
		this.collision.preStep = (body: CANNON.Body) => { this.physicsPreStep(body); };

		// Actions / Controls
		this.actions = {
			'throttle': new KeyBinding('KeyW'),
			'reverse': new KeyBinding('KeyS'),
			'brake': new KeyBinding('Space'),
			'left': new KeyBinding('KeyA'),
			'right': new KeyBinding('KeyD'),
		};

		// Steering simulator
		this.steeringSimulator = new SpringSimulator(60, 10, 0.6);
	}

	public update(timeStep: number): void
	{
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
		for (let i = 0; i < this.rayCastVehicle.wheelInfos.length; i++)
		{
			this.rayCastVehicle.updateWheelTransform(i);
			let transform = this.rayCastVehicle.wheelInfos[i].worldTransform;

			let wheelObject = this.wheels[i].wheelObject;
			wheelObject.position.copy(Utils.threeVector(transform.position));
			wheelObject.quaternion.copy(Utils.threeQuat(transform.quaternion));
		}

		this.updateMatrixWorld();

		const tiresHaveContact = this.rayCastVehicle.numWheelsOnGround > 0;

		// Air spin
		if (!tiresHaveContact)
		{
			this.airSpinTimer += timeStep;
			if (!this.actions.throttle.isPressed) this.canTiltForwards = true;
		}
		else
		{
			this.canTiltForwards = false;
			this.airSpinTimer = 0;
		}

		// Engine
		const engineForce = 500;
		const maxGears = 5;
		const gearsMaxSpeeds: { [key: string]: number } = {
			'R': -4,
			'0': 0,
			'1': 5,
			'2': 9,
			'3': 13,
			'4': 17,
			'5': 22,
		};

		if (this.shiftTimer > 0)
		{
			this.shiftTimer -= timeStep;
			if (this.shiftTimer < 0) this.shiftTimer = 0;
		}
		else
		{
			// Transmission 
			if (this.actions.reverse.isPressed)
			{
				const powerFactor = (gearsMaxSpeeds['R'] - this.speed) / Math.abs(gearsMaxSpeeds['R']);
				const force = (engineForce / this.gear) * (Math.abs(powerFactor) ** 1);

				this.applyEngineForce(force);
			}
			else
			{
				const powerFactor = (gearsMaxSpeeds[this.gear.toString()] - this.speed) / (gearsMaxSpeeds[this.gear.toString()] - gearsMaxSpeeds[(this.gear - 1).toString()]);

				if (powerFactor < 0.1 && this.gear < maxGears) this.shiftUp();
				else if (this.gear > 1 && powerFactor > 1.2) this.shiftDown();
				else if (this.actions.throttle.isPressed)
				{
					const force = (engineForce / this.gear) * (powerFactor ** 1);
					this.applyEngineForce(-force);
				}
			}
		}

		// Steering
		this.steeringSimulator.simulate(timeStep);
		this.setSteeringValue(this.steeringSimulator.position);
		if (this.steeringWheel !== undefined) this.steeringWheel.rotation.z = -this.steeringSimulator.position * 2;

		// Reset car if flipped
		if (this.rayCastVehicle.numWheelsOnGround < 3 && Math.abs(this.collision.velocity.length()) < 0.5)	
		{	
			this.collision.quaternion.copy(this.collision.initQuaternion);	
		}
	}

	public shiftUp(): void
	{
		this.gear++;
		this.shiftTimer = this.timeToShift;
		this.applyEngineForce(0);
	}

	public shiftDown(): void
	{
		this.gear--;
		this.shiftTimer = this.timeToShift;
		this.applyEngineForce(0);
	}

	public physicsPreStep(body: CANNON.Body): void
	{
		// Constants
		const quat = Utils.threeQuat(body.quaternion);
		const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
		const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
		const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);

		// Measure speed
		this._speed = this.collision.velocity.dot(Utils.cannonVector(forward));

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
		velocity.normalize();
		let driftCorrection = Utils.getSignedAngleBetweenVectors(Utils.threeVector(velocity), forward);

		const maxSteerVal = 0.8;
		let speedFactor = THREE.MathUtils.clamp(this.speed * 0.3, 1, Number.MAX_VALUE);

		if (this.actions.right.isPressed)
		{
			let steering = Math.min(-maxSteerVal / speedFactor, -driftCorrection);
			this.steeringSimulator.target = THREE.MathUtils.clamp(steering, -maxSteerVal, maxSteerVal);
		}
		else if (this.actions.left.isPressed)
		{
			let steering = Math.max(maxSteerVal / speedFactor, -driftCorrection);
			this.steeringSimulator.target = THREE.MathUtils.clamp(steering, -maxSteerVal, maxSteerVal);
		}
		else this.steeringSimulator.target = 0;
	}

	public onInputChange(): void
	{
		const brakeForce = 1000000;

		if (this.actions.throttle.justReleased || this.actions.reverse.justReleased)
		{
			this.applyEngineForce(0);
		}
		if (this.actions.brake.justPressed)
		{
			this.setBrake(brakeForce, 'rwd');
		}
		if (this.actions.brake.justReleased)
		{
			this.setBrake(0, 'rwd');
		}
	}

	public triggerAction(actionName: string, value: boolean): void
	{
		let action = this.actions[actionName];

		if (action.isPressed !== value)
		{
			action.isPressed = value;

			action.justPressed = false;
			action.justReleased = false;

			if (value) action.justPressed = true;
			else action.justReleased = true;

			this.onInputChange();

			action.justPressed = false;
			action.justReleased = false;
		}
	}

	public setPosition(x: number, y: number, z: number): void
	{
		this.collision.position.x = x;
		this.collision.position.y = y;
		this.collision.position.z = z;
	}

	public setSteeringValue(val: number): void
	{
		this.wheels.forEach((wheel) =>
		{
			if (wheel.steering) this.rayCastVehicle.setSteeringValue(val, wheel.rayCastWheelInfoIndex);
		});
	}

	public applyEngineForce(force: number): void
	{
		this.wheels.forEach((wheel) =>
		{
			if (this.drive === wheel.drive || this.drive === 'awd')
			{
				this.rayCastVehicle.applyEngineForce(force, wheel.rayCastWheelInfoIndex);
			}
		});
	}

	public setBrake(brakeForce: number, driveFilter?: string): void
	{
		this.wheels.forEach((wheel) =>
		{
			if (driveFilter === undefined || driveFilter === wheel.drive)
			{
				this.rayCastVehicle.setBrake(brakeForce, wheel.rayCastWheelInfoIndex);
			}
		});
	}

	public addToWorld(scene: THREE.Scene, physicsWorld: CANNON.World): void
	{
		scene.add(this);
		this.rayCastVehicle.addToWorld(physicsWorld);

		this.wheels.forEach((wheel) =>
		{
			scene.add(wheel.wheelObject);
		});
	}

	public removeFromWorld(scene: THREE.Scene, physicsWorld: CANNON.World): void
	{
		scene.remove(this);
		// Remove items from scene
		scene.remove(this.modelContainer);
		this.wheels.forEach((wheel) => {
			scene.remove(wheel.wheelObject);
		});

		// Remove from physics
		this.rayCastVehicle.removeFromWorld(physicsWorld);
		physicsWorld.removeBody(this.collision);
	}

	private readVehicleData(gltf: any): void
	{
		gltf.scene.traverse((child: any) => {

			if (child.isMesh)
			{
				Utils.setupMeshProperties(child);

				if (child.material !== undefined)
				{
					this.materials.push(child.material);
				}
			}

			if (child.hasOwnProperty('userData'))
			{
				if (child.userData.hasOwnProperty('data'))
				{
					if (child.userData.data === 'wheel')
					{
						this.wheels.push(new Wheel(child));
					}
					if (child.userData.data === 'collision')
					{
						if (child.userData.shape === 'box')
						{
							child.visible = false;

							let phys = new CANNON.Box(new CANNON.Vec3(child.scale.x, child.scale.y, child.scale.z));
							this.collision.addShape(phys, new CANNON.Vec3(child.position.x, child.position.y, child.position.z));
						}
						else if (child.userData.shape === 'sphere')
						{
							child.visible = false;

							let phys = new CANNON.Sphere(child.scale.x);
							this.collision.addShape(phys, new CANNON.Vec3(child.position.x, child.position.y, child.position.z));
						}
					}
				}
			}
		});

		if (this.collision.shapes.length === 0)
		{
			console.warn('Vehicle has no collision data.');
		}
		else
		{
			this.collision.updateMassProperties();
			console.log('Vehicle collision setup complete. Mass:', this.collision.mass, 'Shapes:', this.collision.shapes.length);
		}
	}

	private readCarData(gltf: any): void
	{
		gltf.scene.traverse((child: THREE.Object3D) => {
			if (child.hasOwnProperty('userData'))
			{
				if (child.userData.hasOwnProperty('data'))
				{
					if (child.userData.data === 'steering_wheel')
					{
						this.steeringWheel = child;
					}
				}
			}
		});
	}
}

