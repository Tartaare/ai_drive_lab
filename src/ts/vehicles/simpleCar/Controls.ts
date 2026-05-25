import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Wheel } from '../Wheel';
import * as Utils from '../../core/Utils';

export function installControls(SimpleCar: any): void {
	SimpleCar.prototype.onInputChange = function(): void {
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
		};

	SimpleCar.prototype.triggerAction = function(actionName: string, value: boolean): void {
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
		};

	SimpleCar.prototype.releaseAllActions = function(): void {
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
		};

	SimpleCar.prototype.setPosition = function(x: number, y: number, z: number): void {
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
		};

	SimpleCar.prototype.setSteeringValue = function(val: number): void {
			this.wheels.forEach((wheel) => {
				if (wheel.steering) this.rayCastVehicle.setSteeringValue(val, wheel.rayCastWheelInfoIndex);
			});
		};

	SimpleCar.prototype.applyEngineForce = function(force: number): void {
			this.wheels.forEach((wheel) => {
				if (this.drive === wheel.drive || this.drive === 'awd') {
					this.rayCastVehicle.applyEngineForce(force, wheel.rayCastWheelInfoIndex);
				}
			});
		};

	SimpleCar.prototype.setBrake = function(brakeForce: number, driveFilter?: string): void {
			this.wheels.forEach((wheel) => {
				if (driveFilter === undefined || driveFilter === wheel.drive) {
					this.rayCastVehicle.setBrake(brakeForce, wheel.rayCastWheelInfoIndex);
				}
			});
		};

	SimpleCar.prototype.addToWorld = function(scene: THREE.Scene, physicsWorld: CANNON.World): void {
			scene.add(this);
			this.rayCastVehicle.addToWorld(physicsWorld);
	
			this.wheels.forEach((wheel) => {
				scene.add(wheel.wheelObject);
			});
	
			// Ensure body is awake after being added to world
			if (typeof this.collision.wakeUp === 'function') this.collision.wakeUp();
		};

	SimpleCar.prototype.reset = function(x: number = 0, y: number = 2, z: number = 0): void {
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
		};
}
