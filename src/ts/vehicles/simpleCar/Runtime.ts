import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Wheel } from '../Wheel';
import * as Utils from '../../core/Utils';

export function installRuntime(SimpleCar: any): void {
	SimpleCar.prototype.update = function(timeStep: number): void {
			const brakeForce = 3000;
			const reverseBrakeSpeedThreshold = 0.5;
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
		};

	SimpleCar.prototype.physicsPreStep = function(body: CANNON.Body): void {
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
		};
}
