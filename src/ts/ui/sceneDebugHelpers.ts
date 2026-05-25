import * as THREE from 'three';

export function collectLights(scene: THREE.Scene): THREE.Light[]
{
	const results: THREE.Light[] = [];
	scene.traverse((child: THREE.Object3D) =>
	{
		if ((child as any).isLight) results.push(child as THREE.Light);
	});
	return results;
}

export function lightLabel(light: THREE.Light, index: number): string
{
	if ((light as any).isDirectionalLight) return 'Dir ' + index;
	if ((light as any).isPointLight) return 'Point ' + index;
	if ((light as any).isHemisphereLight) return 'Hemi ' + index;
	if ((light as any).isSpotLight) return 'Spot ' + index;
	if ((light as any).isAmbientLight) return 'Ambient ' + index;
	if ((light as any).isRectAreaLight) return 'RectArea ' + index;
	return 'Light ' + index;
}

export function findFirstShadowCasterAny(scene: THREE.Scene): THREE.Light | null
{
	let result: THREE.Light | null = null;
	scene.traverse((child: THREE.Object3D) =>
	{
		if (result) return;
		const light = child as THREE.Light;
		if ((light as any).isLight && (light as any).castShadow) result = light;
	});
	return result;
}
