import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Wheel } from '../Wheel';
import * as Utils from '../../core/Utils';

export function installSetup(SimpleCar: any): void {
	SimpleCar.prototype.setDebugTransmission = function(enabled: boolean): void {
			this.debugTransmission = enabled;
		};

	SimpleCar.prototype.setHeadlightsEnabled = function(enabled: boolean): void {
			this.headlightsOn = enabled;
			const intensity = enabled ? this.headlightsIntensity : 0;
			if (this.headlightsLeft) this.headlightsLeft.intensity = intensity;
			if (this.headlightsRight) this.headlightsRight.intensity = intensity;
		};

	SimpleCar.prototype.toggleHeadlights = function(): void {
			this.setHeadlightsEnabled(!this.headlightsOn);
		};

	SimpleCar.prototype.readVehicleData = function(gltf: any): void {
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
		};

	SimpleCar.prototype.readCarData = function(gltf: any): void {
			gltf.scene.traverse((child: THREE.Object3D) => {
				if (child.hasOwnProperty('userData')) {
					if (child.userData.hasOwnProperty('data')) {
						if (child.userData.data === 'steering_wheel') {
							this.steeringWheel = child;
						}
					}
				}
			});
		};

	SimpleCar.prototype.initHeadlights = function(model: THREE.Object3D): void {
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
		};
}
