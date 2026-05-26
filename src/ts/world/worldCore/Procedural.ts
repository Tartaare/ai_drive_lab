import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { SimpleCar, SurfaceType } from '../../vehicles/SimpleCar';
import { VehicleSetup } from '../../vehicles/VehicleSetup';
import { generateTrack, defaultTrackConfig, createTrackObject, TrackData, TrackConfig, KERB_WIDTH_METERS } from '../ProceduralTrack';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export function installProcedural(World: any): void {
	World.prototype.setLevel = function(levelId: string): void {
			this.currentLevelId = levelId;
			this.clearProceduralKerbCollisions();

			if (this.track)
			{
				this.scene.remove(this.track);
				this.track = undefined;
			}

			if (levelId === 'procedural')
			{
				this.buildProceduralTrack();
			}
			else
			{
				// Circuit par défaut (GLB existant)
				this.proceduralTrackData = undefined;
				this.loadTrack('race_tracks/Cartoon_Track1.glb');
			}
		};

	World.prototype.buildProceduralTrack = function(): void {
			if (this.track)
			{
				this.scene.remove(this.track);
				this.track = undefined;
			}

			const config: TrackConfig = {
				...this.proceduralConfig,
				seed: this.proceduralSeed,
				difficulty: this.currentDifficulty
			};
			const trackData = generateTrack(config);
			this.proceduralTrackData = trackData;
			const trackObject = createTrackObject(trackData);
			this.track = trackObject;
			this.scene.add(trackObject);
			this.rebuildProceduralKerbCollisions(trackData);
		};

	World.prototype.clearProceduralKerbCollisions = function(): void {
			if (!this.physicsWorld || this.proceduralKerbBodies.length === 0) {
				this.proceduralKerbBodies = [];
				return;
			}

			for (const body of this.proceduralKerbBodies) {
				this.physicsWorld.removeBody(body);
			}
			this.proceduralKerbBodies = [];
		};

	World.prototype.rebuildProceduralKerbCollisions = function(trackData: TrackData): void {
			this.clearProceduralKerbCollisions();
			if (!this.physicsWorld || !trackData.kerbs) return;

			const leftBody = this.createKerbCollisionBody(trackData.leftBorder, trackData.centerPoints, trackData.kerbs.left);
			const rightBody = this.createKerbCollisionBody(trackData.rightBorder, trackData.centerPoints, trackData.kerbs.right);

			for (const body of [leftBody, rightBody]) {
				if (!body) continue;
				this.physicsWorld.addBody(body);
				this.proceduralKerbBodies.push(body);
			}
		};

	World.prototype.createKerbCollisionBody = function(borderPoints: THREE.Vector3[], centerPoints: THREE.Vector3[], kerbFlags: boolean[]): CANNON.Body | null {
			const vertices: number[] = [];
			const indices: number[] = [];
			const n = borderPoints.length;
			let vertexIndex = 0;

			for (let i = 0; i < n; i++) {
				const nextI = (i + 1) % n;
				if (!kerbFlags[i] && !kerbFlags[nextI]) continue;

				const p1 = borderPoints[i];
				const p2 = borderPoints[nextI];
				const c1 = centerPoints[i];
				const c2 = centerPoints[nextI];
				const norm1 = new THREE.Vector3().subVectors(p1, c1).normalize();
				const norm2 = new THREE.Vector3().subVectors(p2, c2).normalize();

				const a1 = p1.clone().add(new THREE.Vector3(0, 0.04, 0));
				const b1 = p1.clone().addScaledVector(norm1, KERB_WIDTH_METERS * 0.45).add(new THREE.Vector3(0, 0.08, 0));
				const cTail1 = p1.clone().addScaledVector(norm1, KERB_WIDTH_METERS).add(new THREE.Vector3(0, 0.01, 0));
				const a2 = p2.clone().add(new THREE.Vector3(0, 0.04, 0));
				const b2 = p2.clone().addScaledVector(norm2, KERB_WIDTH_METERS * 0.45).add(new THREE.Vector3(0, 0.08, 0));
				const cTail2 = p2.clone().addScaledVector(norm2, KERB_WIDTH_METERS).add(new THREE.Vector3(0, 0.01, 0));

				vertices.push(a1.x, a1.y, a1.z, b1.x, b1.y, b1.z, cTail1.x, cTail1.y, cTail1.z);
				vertices.push(a2.x, a2.y, a2.z, b2.x, b2.y, b2.z, cTail2.x, cTail2.y, cTail2.z);
				indices.push(vertexIndex + 0, vertexIndex + 3, vertexIndex + 1);
				indices.push(vertexIndex + 1, vertexIndex + 3, vertexIndex + 4);
				indices.push(vertexIndex + 1, vertexIndex + 4, vertexIndex + 2);
				indices.push(vertexIndex + 2, vertexIndex + 4, vertexIndex + 5);
				vertexIndex += 6;
			}

			if (vertices.length === 0) return null;

			const shape = new (CANNON as any).Trimesh(vertices, indices);
			const body = new CANNON.Body({ mass: 0 });
			body.addShape(shape);
			return body;
		};

	World.prototype.regenerateProceduralTrack = function(): void {
			if (this.currentLevelId !== 'procedural')
			{
				this.setLevel('procedural');
				return;
			}

			this.buildProceduralTrack();
		};

	World.prototype.setProceduralParameter = function(key: 'numControlPoints' | 'baseRadius' | 'radiusVariation' | 'angleVariation' | 'trackWidth', value: number): void {
			if (!this.proceduralConfig)
			{
				this.proceduralConfig = { ...defaultTrackConfig };
			}

			switch (key)
			{
				case 'numControlPoints':
					this.proceduralConfig.numControlPoints = Math.max(6, Math.min(20, Math.round(value)));
					break;
				case 'baseRadius':
					this.proceduralConfig.baseRadius = Math.max(30, Math.min(150, value));
					break;
				case 'radiusVariation':
					this.proceduralConfig.radiusVariation = Math.max(0, Math.min(1, value));
					break;
				case 'angleVariation':
					this.proceduralConfig.angleVariation = Math.max(0, Math.min(1, value));
					break;
				case 'trackWidth':
					this.proceduralConfig.trackWidth = Math.max(5, Math.min(30, value));
					break;
			}

			if (this.currentLevelId === 'procedural')
			{
				this.buildProceduralTrack();
			}
		};

	World.prototype.randomizeProceduralSeed = function(): void {
			this.proceduralSeed = Math.floor(Math.random() * 1000000);
			if (this.currentLevelId === 'procedural')
			{
				this.buildProceduralTrack();
			}
		};

	World.prototype.setProceduralSeed = function(seed: number): void {
			if (!Number.isFinite(seed)) return;
			this.proceduralSeed = Math.max(0, Math.floor(seed));
			if (this.currentLevelId === 'procedural')
			{
				this.buildProceduralTrack();
			}
		};

	World.prototype.setProceduralDifficulty = function(difficulty: string): void {
			this.currentDifficulty = difficulty;
			switch (difficulty)
			{
				case 'facile':
					this.proceduralConfig.numControlPoints = 8;
					this.proceduralConfig.baseRadius = 50;
					this.proceduralConfig.radiusVariation = 0.15;
					this.proceduralConfig.angleVariation = 0.1;
					this.proceduralConfig.trackWidth = 14;
					break;
				case 'moyen':
					this.proceduralConfig.numControlPoints = 10;
					this.proceduralConfig.baseRadius = 65;
					this.proceduralConfig.radiusVariation = 0.30;
					this.proceduralConfig.angleVariation = 0.25;
					this.proceduralConfig.trackWidth = 10;
					break;
				case 'difficile':
					this.proceduralConfig.numControlPoints = 12;
					this.proceduralConfig.baseRadius = 80;
					this.proceduralConfig.radiusVariation = 0.40;
					this.proceduralConfig.angleVariation = 0.35;
					this.proceduralConfig.trackWidth = 8.5;
					break;
				case 'expert':
					this.proceduralConfig.numControlPoints = 14;
					this.proceduralConfig.baseRadius = 95;
					this.proceduralConfig.radiusVariation = 0.50;
					this.proceduralConfig.angleVariation = 0.45;
					this.proceduralConfig.trackWidth = 7.5;
					break;
				case 'vraiment_difficile':
					this.proceduralConfig.numControlPoints = 16;
					this.proceduralConfig.baseRadius = 110;
					this.proceduralConfig.radiusVariation = 0.60;
					this.proceduralConfig.angleVariation = 0.55;
					this.proceduralConfig.trackWidth = 6.5;
					break;
			}

			if (this.currentLevelId === 'procedural')
			{
				this.buildProceduralTrack();
			}
		};

	World.prototype.getProceduralDifficulty = function(): string {
			return this.currentDifficulty;
		};

	World.prototype.getProceduralSeed = function(): number {
			return this.proceduralSeed;
		};

	World.prototype.getProceduralTrackSummary = function(): { lengthMeters: number; difficulty: string; seed: number } {
			return {
				lengthMeters: this.proceduralTrackData && this.proceduralTrackData.qaReport ? this.proceduralTrackData.qaReport.length : 0,
				difficulty: this.currentDifficulty,
				seed: this.proceduralSeed
			};
		};

	World.prototype.getProceduralConfig = function(): { numControlPoints: number; baseRadius: number; radiusVariation: number; angleVariation: number; trackWidth: number; } {
			return {
				numControlPoints: this.proceduralConfig.numControlPoints,
				baseRadius: this.proceduralConfig.baseRadius,
				radiusVariation: this.proceduralConfig.radiusVariation,
				angleVariation: this.proceduralConfig.angleVariation,
				trackWidth: this.proceduralConfig.trackWidth
			};
		};
}
