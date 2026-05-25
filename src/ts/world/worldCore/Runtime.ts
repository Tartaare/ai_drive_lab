import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { SimpleCar, SurfaceType } from '../../vehicles/SimpleCar';
import { VehicleSetup } from '../../vehicles/VehicleSetup';
import { generateTrack, defaultTrackConfig, createTrackObject, TrackData, TrackConfig, KERB_WIDTH_METERS } from '../ProceduralTrack';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export function installRuntime(World: any): void {
	World.prototype.updateCamera = function(): void {
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
		};

	World.prototype.animate = function(): void {
			if (this.isDisposed) return;
			requestAnimationFrame(() => this.animate());

			this.requestDelta = this.clock.getDelta();

			// Getting timeStep
			let timeStep = this.requestDelta;
			timeStep = Math.min(timeStep, 1 / 30); // min 30 fps

			if (!this.isPaused)
			{
				// Physics update — preStep must be called manually (cannon-es removed Body.preStep)
				if (this.car) this.car.physicsPreStep(this.car.collision);
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
		};
}
