import { MutableRefObject, ReactNode } from 'react';
import * as THREE from 'three';
import { SoftShadowsSource } from '../../../ui/SceneDebugPanel';
import { VehicleDefinition } from '../../../ui/menu/catalog';
import { ThemeName } from '../../types';

export interface ShowroomCameraConfig {
    radius: number;
    elevation: number;
    lookAtY: number;
    fov: number;
}

export interface VehicleSlot {
    key: string;
    vehicle: VehicleDefinition;
    role: 'active' | 'incoming' | 'outgoing';
    direction: -1 | 0 | 1;
}

export interface SceneRefs {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    floorMesh: THREE.Mesh | null;
    shadowPlane: THREE.Mesh | null;
    softShadows: SoftShadowsSource | null;
}

export interface ShowroomSceneProps {
    children: ReactNode;
    theme: ThemeName;
    debugOrbitRef: MutableRefObject<boolean>;
    rotationYRef: MutableRefObject<number>;
    cameraDistanceRef: MutableRefObject<number>;
    cameraAzimuthRef: MutableRefObject<number>;
    cameraElevationRef: MutableRefObject<number>;
    cameraHeightRef: MutableRefObject<number>;
    showroomCameraRef: MutableRefObject<ShowroomCameraConfig>;
    floorMeshRef: MutableRefObject<THREE.Mesh | null>;
    envPresetRef: MutableRefObject<string>;
    setEnvPresetRef: MutableRefObject<((preset: string) => void) | null>;
    setEnvEnabledRef: MutableRefObject<((enabled: boolean) => void) | null>;
    onShadowPlaneReady: (mesh: THREE.Mesh | null) => void;
    onSoftShadowsReady: (ss: SoftShadowsSource) => void;
}

export const SWAP_DURATION_MS = 400;
