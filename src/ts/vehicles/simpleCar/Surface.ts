import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Wheel } from '../Wheel';
import * as Utils from '../../core/Utils';
import type { SurfaceType, TireCompound } from '../SimpleCar';

export function installSurface(SimpleCar: any): void {
	SimpleCar.prototype.updateWheelFrictionFromSurface = function(): void {
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
		};

	SimpleCar.prototype.computeFrictionSlip = function(surface: SurfaceType): number {
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
		};

	SimpleCar.prototype.setSurfaceSampler = function(sampler?: (x: number, z: number) => SurfaceType): void {
			this.surfaceSampler = sampler;
			for (let i = 0; i < this.lastSurfaceByWheel.length; i++) {
				this.lastSurfaceByWheel[i] = undefined;
				this.lastFrictionSlipByWheel[i] = undefined;
			}
		};

	SimpleCar.prototype.setDebugSurface = function(enabled: boolean): void {
			this.debugSurface = enabled;
		};
}
