import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { SimpleCar, SurfaceType } from '../../vehicles/SimpleCar';
import { VehicleSetup } from '../../vehicles/VehicleSetup';
import { generateTrack, defaultTrackConfig, createTrackObject, TrackData, TrackConfig, KERB_WIDTH_METERS } from '../ProceduralTrack';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import type { WorldOptions } from '../../main';

export function installBootstrap(World: any): void {
	World.prototype.setDebugInput = function(enabled: boolean): void {
			this.debugInput = enabled;
		};

	World.prototype.applyLaunchOptions = function(options: WorldOptions): void {
			if (options.proceduralConfig)
			{
				this.proceduralConfig = {
					...this.proceduralConfig,
					...options.proceduralConfig,
					sampleCount: options.proceduralConfig.sampleCount || this.proceduralConfig.sampleCount
				};
			}
			if (typeof options.proceduralSeed === 'number' && Number.isFinite(options.proceduralSeed))
			{
				this.proceduralSeed = Math.max(0, Math.floor(options.proceduralSeed));
			}
			if (options.proceduralDifficulty)
			{
				this.currentDifficulty = options.proceduralDifficulty;
			}
		};

	World.prototype.createGround = function(): void {
			// Create a large flat ground with a texture
			const groundSize = 500;

			// Ground geometry
			const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);

			// Create material and load texture from assets
			const groundMaterial = new THREE.MeshStandardMaterial({
				roughness: 0.8,
				metalness: 0.1
			});

			const loader = new THREE.TextureLoader();
			const textureUrl = 'textures/floors/Floor_Dark_1.png';
			loader.load(
				textureUrl,
				(tex) => {
					tex.wrapS = THREE.RepeatWrapping;
					tex.wrapT = THREE.RepeatWrapping;
					tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
					tex.repeat.set(groundSize / 10, groundSize / 10);
					// Use the loaded texture
					groundMaterial.map = tex;
					groundMaterial.needsUpdate = true;
				},
				undefined,
				(error) => {
					console.warn('Failed to load ground texture:', error, 'using fallback canvas texture.');
					// Fallback to canvas-generated texture when image fails to load
					const canvas = document.createElement('canvas');
					canvas.width = 512;
					canvas.height = 512;
					const ctx = canvas.getContext('2d')!;
					ctx.fillStyle = '#3a5f3a';
					ctx.fillRect(0, 0, 512, 512);
					ctx.strokeStyle = '#2d4a2d';
					ctx.lineWidth = 2;
					const gridSize = 32;
					for (let i = 0; i <= 512; i += gridSize) {
						ctx.beginPath();
						ctx.moveTo(i, 0);
						ctx.lineTo(i, 512);
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(0, i);
						ctx.lineTo(512, i);
						ctx.stroke();
					}
					const fallback = new THREE.CanvasTexture(canvas);
					fallback.wrapS = THREE.RepeatWrapping;
					fallback.wrapT = THREE.RepeatWrapping;
					fallback.repeat.set(groundSize / 10, groundSize / 10);
					groundMaterial.map = fallback;
					groundMaterial.needsUpdate = true;
				}
			);

			const ground = new THREE.Mesh(groundGeometry, groundMaterial);
			ground.rotation.x = -Math.PI / 2;
			ground.receiveShadow = true;
			this.scene.add(ground);
			this.ground = ground;
		};

	World.prototype.setupPhysics = function(): void {
			this.physicsWorld = new CANNON.World();
			this.physicsWorld.gravity.set(0, -9.81, 0);
			this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld);
			(this.physicsWorld.solver as CANNON.GSSolver).iterations = 10;
			this.physicsWorld.allowSleep = true;

			// Ground physics body
			const groundShape = new CANNON.Plane();
			const groundBody = new CANNON.Body({ mass: 0 });
			groundBody.addShape(groundShape);
			groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
			this.physicsWorld.addBody(groundBody);

			if (this.proceduralTrackData) this.rebuildProceduralKerbCollisions(this.proceduralTrackData);
		};

	World.prototype.loadCar = function(path: string): void {
			const loader = new GLTFLoader();
			
			loader.load(path, (gltf: any) => {
				
				// AUTOMATIC SETUP HERE
				VehicleSetup.prepareModel(gltf.scene);

				this.car = new SimpleCar(gltf);
				// Debug de la surface au sol
				this.car.setDebugSurface(false);
				this.car.setSurfaceSampler((x: number, z: number) => this.getSurfaceTypeAt(x, z));
				// Spawn slightly higher and ensure vehicle is awake and set up
				const spawnPos = this.getSpawnPosition();
				const spawnRot = this.getSpawnRotation();
				if (typeof this.car.reset === 'function') {
					this.car.reset(spawnPos.x, spawnPos.y, spawnPos.z);
					this.car.collision.quaternion.set(spawnRot.x, spawnRot.y, spawnRot.z, spawnRot.w);
					this.car.quaternion.copy(spawnRot);
				} else {
					this.car.setPosition(spawnPos.x, spawnPos.y, spawnPos.z);
					this.car.collision.quaternion.set(spawnRot.x, spawnRot.y, spawnRot.z, spawnRot.w);
					this.car.quaternion.copy(spawnRot);
				}
				this.car.addToWorld(this.scene, this.physicsWorld);
				
				console.log('Car loaded successfully!');
				console.log('Controls: Z/S = Accelerate/Reverse, Q/D = Steering, Space = Brake');
				console.log('Mouse drag to rotate camera');
			}, 
			(progress: any) => {
				console.log('Loading car...', (progress.loaded / progress.total * 100).toFixed(0) + '%');
			},
			(error: any) => {
				console.error('Error loading car:', error);
			});
		};

	World.prototype.loadTrack = function(path: string, yOffset: number = 0.01): void {
			const loader = new GLTFLoader();
			loader.load(path, (gltf: any) => {
				this.track = gltf.scene;
				// Ensure the track meshes receive and cast shadows
				this.track.traverse((child: any) => {
					if (child.isMesh) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});

				// Add it first, then compute its bbox and adjust vertical position so it sits on the ground
				this.scene.add(this.track);
				// Make sure matrixWorld is current
				this.track.updateMatrixWorld(true);
				const bbox = new THREE.Box3().setFromObject(this.track);
				const minY = bbox.min.y;
				// Shift so the lowest point is at yOffset
				this.track.position.y += (yOffset - minY);
				this.track.updateMatrixWorld(true);
				console.log('Track loaded from', path);
			}, (progress: any) => {
				// Optional: progress logging for loaders
				if (progress && progress.total) console.log('Loading track...', (progress.loaded / progress.total * 100).toFixed(0) + '%');
			}, (error: any) => {
				console.error('Error loading track:', error);
				if (this.currentLevelId !== 'procedural')
				{
					this.setLevel('procedural');
				}
			});
		};
}
