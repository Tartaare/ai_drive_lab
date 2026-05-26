import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Wheel } from '../Wheel';
import * as Utils from '../../core/Utils';

export function installTransmission(SimpleCar: any): void {
	SimpleCar.prototype.shiftUp = function(): void {
			if (this.gear < 1) return;
			this.startShiftTo(Math.min(this.gear + 1, this.gearRatios.length));
		};

	SimpleCar.prototype.shiftDown = function(): void {
			if (this.gear <= 1) return;
			this.startShiftTo(Math.max(1, this.gear - 1));
		};

	SimpleCar.prototype.toggleManualTransmission = function(): void {
			this.manualTransmission = !this.manualTransmission;
			if (this.debugTransmission) console.log(`[Transmission] mode=${this.manualTransmission ? 'MANUAL' : 'AUTO'} gear=${this.gear}`);
			if (typeof this.collision.wakeUp === 'function') this.collision.wakeUp();
		};

	SimpleCar.prototype.manualShiftUp = function(): void {
			if (!this.manualTransmission) return;
			this.requestManualGearChange(1);
		};

	SimpleCar.prototype.manualShiftDown = function(): void {
			if (!this.manualTransmission) return;
			this.requestManualGearChange(-1);
		};

	SimpleCar.prototype.updateThrottle = function(timeStep: number, target: number): void {
			const t = THREE.MathUtils.clamp(target, 0, 1);
			const rate = (t > this.throttleSmoothed) ? this.throttleRiseRate : this.throttleFallRate;
			const maxDelta = rate * timeStep;
			this.throttleSmoothed = THREE.MathUtils.clamp(
				this.throttleSmoothed + THREE.MathUtils.clamp(t - this.throttleSmoothed, -maxDelta, maxDelta),
				0,
				1
			);
		};

	SimpleCar.prototype.getWheelRadius = function(): number {
			const wi: any = (this.rayCastVehicle && this.rayCastVehicle.wheelInfos && this.rayCastVehicle.wheelInfos[0])
				? (this.rayCastVehicle.wheelInfos[0] as any)
				: undefined;
			const r = wi && Number.isFinite(wi.radius) ? wi.radius : 0.25;
			return Math.max(0.05, r);
		};

	SimpleCar.prototype.getAbsGearRatio = function(gear: number): number {
			if (gear < 0) return this.reverseRatio;
			if (gear === 0) return 0;
			const idx = THREE.MathUtils.clamp(gear - 1, 0, this.gearRatios.length - 1);
			return this.gearRatios[idx];
		};

	SimpleCar.prototype.estimateCoupledEngineRpmForGear = function(gear: number): number {
			if (gear === 0) return this.idleRpm;
			const wheelRadius = this.getWheelRadius();
			const absSpeed = Math.abs(this.speed);
			const coupled = absSpeed / wheelRadius;
			const wheelRpm = coupled * (60 / (2 * Math.PI));
			const coupledEngineRpm = wheelRpm * this.getAbsGearRatio(gear) * this.finalDrive;
			return Math.max(0, coupledEngineRpm);
		};

	SimpleCar.prototype.updateEngineRpm = function(timeStep: number, wheelCouplingSpeed: number): void {
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
		};

	SimpleCar.prototype.torqueCurveFactor = function(rpm: number): number {
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
		};

	SimpleCar.prototype.computeEngineTorqueNm = function(rpm: number, throttle: number): number {
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
		};

	SimpleCar.prototype.countDrivenWheels = function(): number {
			let count = 0;
			for (let i = 0; i < this.wheels.length; i++) {
				const w = this.wheels[i];
				if (this.drive === 'awd' || this.drive === w.drive) count++;
			}
			return count;
		};

	SimpleCar.prototype.startShiftTo = function(nextGear: number): void {
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
		};

	SimpleCar.prototype.requestManualGearChange = function(delta: number): void {
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
		};

	SimpleCar.prototype.tryAutoShift = function(): void {
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
		};
}
