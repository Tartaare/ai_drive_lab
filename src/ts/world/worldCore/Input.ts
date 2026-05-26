import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { SimpleCar, SurfaceType } from '../../vehicles/SimpleCar';
import { VehicleSetup } from '../../vehicles/VehicleSetup';
import { generateTrack, defaultTrackConfig, createTrackObject, TrackData, TrackConfig, KERB_WIDTH_METERS } from '../ProceduralTrack';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export function installInput(World: any): void {
	World.prototype.setupEventListeners = function(): void {
			// Keyboard
			document.addEventListener('keydown', this.handleKeyDown);
			document.addEventListener('keyup', this.handleKeyUp);

			window.addEventListener('blur', this.handleWindowBlur);

			document.addEventListener('visibilitychange', this.handleVisibilityChange);

			// Mouse for camera
			this.renderer.domElement.addEventListener('mousedown', (event) => {
				this.mouseDown = true;
				this.lastMouseX = event.clientX;
				this.lastMouseY = event.clientY;
			});

			document.addEventListener('mouseup', this.handleMouseUp);

			document.addEventListener('mousemove', this.handleMouseMove);

			// Mouse wheel for zoom
			this.renderer.domElement.addEventListener('wheel', (event) => {
				this.cameraRadius += event.deltaY * 0.01;
				this.cameraRadius = Math.max(2, Math.min(20, this.cameraRadius));
			});

			// Window resize
			window.addEventListener('resize', this.handleResize);
		};

	World.prototype.releaseCarActions = function(): void {
			if (!this.car) return;
			if (typeof (this.car as any).releaseAllActions === 'function') (this.car as any).releaseAllActions();
		};

	World.prototype.updateMouseCamera = function(event: MouseEvent): void {
			if (!this.mouseDown) return;
			const deltaX = event.clientX - this.lastMouseX;
			const deltaY = event.clientY - this.lastMouseY;

			this.cameraTheta -= deltaX * this.cameraSensitivity;
			this.cameraPhi += deltaY * this.cameraSensitivity;
			this.cameraPhi = Math.max(-60, Math.min(60, this.cameraPhi));

			this.lastMouseX = event.clientX;
			this.lastMouseY = event.clientY;
		};

	World.prototype.resizeRenderer = function(): void {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(window.innerWidth, window.innerHeight);
		};

	World.prototype.handleKeyboard = function(event: KeyboardEvent, pressed: boolean): void {
			if (this.isDisposed) return;

			// Global controls (work even si la voiture n'est pas encore prête)
			if (event.code === 'Escape' && pressed)
			{
				this.togglePause();
				event.preventDefault();
				return;
			}

			if (!this.car) return;

			// Prevent default browser actions
			if (['KeyZ', 'KeyQ', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'KeyL'].includes(event.code)) {
				event.preventDefault();
			}

			// Map keys to actions
			const actionMap: { [key: string]: string } = {
				'KeyZ': 'throttle',
				'KeyW': 'throttle',
				'KeyS': 'reverse',
				'KeyQ': 'left',
				'KeyA': 'left',
				'KeyD': 'right',
				'Space': 'brake'
			};

			const action = actionMap[event.code];
			if (action)
			{
				if (this.isPaused)
				{
					if (!pressed) this.car.triggerAction(action, false);
					return;
				}
				this.car.triggerAction(action, pressed);
			}

			// Transmission: toggle manual + paddle shifts
			if (pressed && !event.repeat)
			{
				if (event.code === 'KeyL')
				{
					if (this.isPaused) return;
					if (this.debugInput) console.log('[Input] KeyL toggle headlights');
					if (typeof (this.car as any).toggleHeadlights === 'function') (this.car as any).toggleHeadlights();
					if (this.dayNight) this.dayNight.notifyHeadlightsToggledByUser();
					event.preventDefault();
					return;
				}

				if (event.code === 'KeyM')
				{
					if (this.isPaused) return;
					if (this.debugInput) console.log('[Input] KeyM toggle transmission mode');
					if (typeof (this.car as any).toggleManualTransmission === 'function') (this.car as any).toggleManualTransmission();
					event.preventDefault();
					return;
				}

				if (event.code === 'ArrowUp')
				{
					if (this.isPaused) return;
					if (this.debugInput) console.log('[Input] ArrowUp shift up');
					if (typeof (this.car as any).manualShiftUp === 'function') (this.car as any).manualShiftUp();
					event.preventDefault();
					return;
				}

				if (event.code === 'ArrowDown')
				{
					if (this.isPaused) return;
					if (this.debugInput) console.log('[Input] ArrowDown shift down');
					if (typeof (this.car as any).manualShiftDown === 'function') (this.car as any).manualShiftDown();
					event.preventDefault();
					return;
				}
			}

			// Reset car with R key
			if (event.code === 'KeyR' && pressed) {
				const spawnPos = this.getSpawnPosition();
				const spawnRot = this.getSpawnRotation();
				if (this.car.reset) {
					this.car.reset(spawnPos.x, spawnPos.y, spawnPos.z);
					this.car.collision.quaternion.set(spawnRot.x, spawnRot.y, spawnRot.z, spawnRot.w);
					this.car.quaternion.copy(spawnRot);
				} else {
					this.car.setPosition(spawnPos.x, spawnPos.y, spawnPos.z);
					this.car.collision.velocity.set(0, 0, 0);
					this.car.collision.angularVelocity.set(0, 0, 0);
					this.car.collision.quaternion.set(spawnRot.x, spawnRot.y, spawnRot.z, spawnRot.w);
					this.car.quaternion.copy(spawnRot);
					if (typeof this.car.collision.wakeUp === 'function') this.car.collision.wakeUp();
				}

				// Ensure wheel transforms are refreshed
				if (this.car.rayCastVehicle) for (let i = 0; i < this.car.rayCastVehicle.wheelInfos.length; i++) (this.car.rayCastVehicle as any).updateWheelTransform(i);
			}
		};

	World.prototype.togglePause = function(): void {
			if (this.isDisposed) return;
			this.isPaused = !this.isPaused;
			if (this.isPaused && this.car && typeof (this.car as any).releaseAllActions === 'function') (this.car as any).releaseAllActions();
			if (this.onPauseChange) this.onPauseChange(this.isPaused);

			// Libère le pointer lock pour pouvoir utiliser la souris dans le menu de pause
			if (this.isPaused && document.pointerLockElement === this.renderer.domElement && document.exitPointerLock)
			{
				document.exitPointerLock();
			}
		};

	World.prototype.pause = function(): void {
			if (!this.isPaused) this.togglePause();
		};

	World.prototype.resume = function(): void {
			if (this.isPaused) this.togglePause();
		};

	World.prototype.dispose = function(): void {
			if (this.isDisposed) return;
			this.isDisposed = true;
			this.isPaused = false;
			if (this.onPauseChange) this.onPauseChange(false);

			document.removeEventListener('keydown', this.handleKeyDown);
			document.removeEventListener('keyup', this.handleKeyUp);
			window.removeEventListener('blur', this.handleWindowBlur);
			document.removeEventListener('visibilitychange', this.handleVisibilityChange);
			document.removeEventListener('mouseup', this.handleMouseUp);
			document.removeEventListener('mousemove', this.handleMouseMove);
			window.removeEventListener('resize', this.handleResize);

			if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentElement)
			{
				this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
			}
		};
}
