import * as THREE from 'three';
import * as CANNON from 'cannon';

export function threeVector(vec: CANNON.Vec3): THREE.Vector3
{
	return new THREE.Vector3(vec.x, vec.y, vec.z);
}

export function cannonVector(vec: THREE.Vector3): CANNON.Vec3
{
	return new CANNON.Vec3(vec.x, vec.y, vec.z);
}

export function threeQuat(quat: CANNON.Quaternion): THREE.Quaternion
{
	return new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
}

export function cannonQuat(quat: THREE.Quaternion): CANNON.Quaternion
{
	return new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w);
}

/**
 * Finds an angle between two vectors
 */
export function getAngleBetweenVectors(v1: THREE.Vector3, v2: THREE.Vector3, dotTreshold: number = 0.0005): number
{
	let angle: number;
	let dot = v1.dot(v2);

	// If dot is close to 1, we'll round angle to zero
	if (dot > 1 - dotTreshold)
	{
		angle = 0;
	}
	else
	{
		// Dot too close to -1
		if (dot < -1 + dotTreshold)
		{
			angle = Math.PI;
		}
		else
		{
			// Get angle difference in radians
			angle = Math.acos(dot);
		}
	}

	return angle;
}

/**
 * Finds an angle between two vectors with a sign relative to normal vector
 */
export function getSignedAngleBetweenVectors(v1: THREE.Vector3, v2: THREE.Vector3, normal: THREE.Vector3 = new THREE.Vector3(0, 1, 0), dotTreshold: number = 0.0005): number
{
	let angle = getAngleBetweenVectors(v1, v2, dotTreshold);

	// Get vector pointing up or down
	let cross = new THREE.Vector3().crossVectors(v1, v2);
	// Compare cross with normal to find out direction
	if (normal.dot(cross) < 0)
	{
		angle = -angle;
	}

	return angle;
}

export function setupMeshProperties(child: any): void
{
	child.castShadow = true;
	child.receiveShadow = true;

	if (child.material.map !== null)
	{
		let mat = new THREE.MeshPhongMaterial();
		mat.shininess = 0;
		mat.name = child.material.name;
		mat.map = child.material.map;
		mat.map.anisotropy = 4;
		mat.aoMap = child.material.aoMap;
		mat.transparent = child.material.transparent;
		child.material = mat;
	}
}

