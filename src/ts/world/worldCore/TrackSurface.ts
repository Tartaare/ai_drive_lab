import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { SimpleCar, SurfaceType } from '../../vehicles/SimpleCar';
import { VehicleSetup } from '../../vehicles/VehicleSetup';
import { generateTrack, defaultTrackConfig, createTrackObject, TrackData, TrackConfig, KERB_WIDTH_METERS } from '../ProceduralTrack';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export function installTrackSurface(World: any): void {
	World.prototype.getSurfaceTypeAt = function(x: number, z: number): SurfaceType {
			if (this.currentLevelId === 'procedural' && this.proceduralTrackData)
			{
				const centerPoints = this.proceduralTrackData.centerPoints;
				let minDistSq = Number.POSITIVE_INFINITY;
				let nearestIdx = 0;

				for (let i = 0; i < centerPoints.length; i++)
				{
					const p = centerPoints[i];
					const dx = x - p.x;
					const dz = z - p.z;
					const d2 = dx * dx + dz * dz;
					if (d2 < minDistSq) {
						minDistSq = d2;
						nearestIdx = i;
					}
				}

				const trackWidth = this.proceduralConfig.trackWidth ?? defaultTrackConfig.trackWidth;
				const trackHalfWidth = trackWidth * 0.5;
				const dist = Math.sqrt(minDistSq);

				// Check if on a corner Kerb (vibreur)
				if (this.proceduralTrackData.kerbs && dist >= trackHalfWidth - 0.2 && dist <= trackHalfWidth + 0.8)
				{
					const p = centerPoints[nearestIdx];
					const prev = centerPoints[(nearestIdx - 1 + centerPoints.length) % centerPoints.length];
					const next = centerPoints[(nearestIdx + 1) % centerPoints.length];
					
					const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
					// CCW left normal points to left border
					const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
					
					const toPoint = new THREE.Vector3(x - p.x, 0, z - p.z);
					const isLeft = toPoint.dot(normal) > 0;

					if (isLeft && this.proceduralTrackData.kerbs.left[nearestIdx])
					{
						return 'kerb';
					}
					if (!isLeft && this.proceduralTrackData.kerbs.right[nearestIdx])
					{
						return 'kerb';
					}
				}

				if (dist <= trackHalfWidth) return 'asphalt';
				if (dist <= trackHalfWidth + 2.0) return 'dirt';
				return 'grass';
			}

			return 'grass';
		};

	World.prototype.getSpawnPosition = function(): THREE.Vector3 {
			if (this.currentLevelId === 'procedural' && this.proceduralTrackData)
			{
				const index = this.proceduralTrackData.startLineIndex || 0;
				const center = this.proceduralTrackData.centerPoints[index];
				// Légère élévation pour éviter les collisions visuelles avec la route
				return new THREE.Vector3(center.x, center.y + 1, center.z);
			}

			// Position par défaut (ancien comportement)
			return new THREE.Vector3(0, 2, 0);
		};

	World.prototype.getSpawnRotation = function(): THREE.Quaternion {
			if (this.currentLevelId === 'procedural' && this.proceduralTrackData)
			{
				const index = this.proceduralTrackData.startLineIndex || 0;
				const centerPoints = this.proceduralTrackData.centerPoints;
				const p1 = centerPoints[index];
				const p2 = centerPoints[(index + 1) % centerPoints.length];
				const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();

				// yaw angle around Y axis
				const yaw = Math.atan2(tangent.x, tangent.z);
				return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
			}
			return new THREE.Quaternion(0, 0, 0, 1);
		};
}
