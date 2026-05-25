import * as THREE from 'three';

export interface SoftShadowsSource {
	opacity: number;
	alphaTest: number;
	colorBlend: number;
	reset(): void;
}

export interface SceneDebugSource
{
	renderer: THREE.WebGLRenderer;
	camera: THREE.PerspectiveCamera;
	scene: THREE.Scene;
	ground?: THREE.Mesh;
	shadowPlane?: THREE.Mesh;
	softShadows?: SoftShadowsSource;
	environmentPreset?: { current: string; onChange(preset: string): void; onToggle(enabled: boolean): void };
	sky?: {
		sunLight: THREE.DirectionalLight;
		sunPosition: THREE.Vector3;
		theta: number;
		phi: number;
	};
	dayNight?: {
		timeOfDayHours: number;
		setTimeOfDay(h: number): void;
		setHoursPerSecond(v: number): void;
	};
	cameraRadius?: number;
	cameraPhi?: number;
	cameraSensitivity?: number;
	cameraAzimuth?: number;
	cameraElevation?: number;
	cameraDistance?: number;
	cameraHeight?: number;
	showroomCamera?: { radius: number; elevation: number; lookAtY: number; fov: number };
}
