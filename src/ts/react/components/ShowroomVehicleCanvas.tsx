import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { ForwardedRef, forwardRef, Suspense, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { SceneDebugSource, SoftShadowsSource } from '../../ui/SceneDebugPanel';
import { VehicleDefinition } from '../../ui/menu/catalog';
import { ThemeName } from '../types';
import { ShowroomScene } from './showroomVehicle/ShowroomScene';
import { createSlot } from './showroomVehicle/slotState';
import { SceneRefs, ShowroomCameraConfig, VehicleSlot } from './showroomVehicle/types';
import { useReducedMotion, useShowroomVehicleControls } from './showroomVehicle/useShowroomVehicleControls';
import { VehicleSlotBoundary, VehicleSlotMesh } from './showroomVehicle/VehicleSlotMesh';

export interface ShowroomVehicleHandle {
    getSceneRefs(): SceneDebugSource;
    setDebugOrbitMode(enabled: boolean): void;
    setTheme(theme: ThemeName): void;
}

interface ShowroomVehicleCanvasProps {
    vehicle: VehicleDefinition;
    adjacentVehicles: VehicleDefinition[];
    direction: -1 | 0 | 1;
    theme: ThemeName;
    highlightedNodeIds: string[];
    garageMode?: boolean;
    onStatusChange: (message: string) => void;
    onTransitionChange: (locked: boolean) => void;
}

export const ShowroomVehicleCanvas = forwardRef<ShowroomVehicleHandle, ShowroomVehicleCanvasProps>(
    function ShowroomVehicleCanvas({ garageMode = false, ...props }: ShowroomVehicleCanvasProps, ref: ForwardedRef<ShowroomVehicleHandle>): JSX.Element {
        const [slots, setSlots] = useState<VehicleSlot[]>(() => [createSlot(props.vehicle, 'active', 0)]);
        const activeVehicleRef = useRef(props.vehicle);
        const sceneRefsRef = useRef<SceneRefs | null>(null);
        const floorMeshRef = useRef<THREE.Mesh | null>(null);
        const softShadowsRef = useRef<SoftShadowsSource | null>(null);
        const envPresetRef = useRef('city');
        const setEnvPresetRef = useRef<((preset: string) => void) | null>(null);
        const setEnvEnabledRef = useRef<((enabled: boolean) => void) | null>(null);
        const debugOrbitRef = useRef(false);
        const rotationYRef = useRef(0);
        const cameraDistanceRef = useRef(1);
        const cameraAzimuthRef = useRef(0);
        const cameraElevationRef = useRef(16);
        const cameraHeightRef = useRef(-0.74);
        const showroomCameraRef = useRef<ShowroomCameraConfig>({ radius: 20, elevation: 16, lookAtY: 0.1, fov: 15 });
        const reduceMotion = useReducedMotion();
        const containerRef = useRef<HTMLDivElement>(null);
        const controls = useShowroomVehicleControls({
            containerRef,
            debugOrbitRef,
            rotationYRef,
            cameraDistanceRef,
            cameraAzimuthRef,
            cameraElevationRef
        });

        const handleSoftShadowsReady = useCallback((ss: SoftShadowsSource) => {
            softShadowsRef.current = ss;
            if (sceneRefsRef.current) sceneRefsRef.current.softShadows = ss;
        }, []);

        const handleShadowPlaneReady = useCallback((mesh: THREE.Mesh | null) => {
            if (sceneRefsRef.current) sceneRefsRef.current.shadowPlane = mesh;
        }, []);

        useImperativeHandle(ref, () => ({
            getSceneRefs: () => {
                if (!sceneRefsRef.current) throw new Error('Showroom vehicle scene is not ready');
                const refs = sceneRefsRef.current;
                return {
                    renderer: refs.renderer,
                    scene: refs.scene,
                    camera: refs.camera,
                    ground: floorMeshRef.current ?? undefined,
                    shadowPlane: refs.shadowPlane ?? undefined,
                    softShadows: refs.softShadows ?? undefined,
                    environmentPreset: {
                        get current() { return envPresetRef.current; },
                        onChange: (preset: string) => { setEnvPresetRef.current?.(preset); },
                        onToggle: (enabled: boolean) => { setEnvEnabledRef.current?.(enabled); },
                    },
                    get cameraAzimuth() { return cameraAzimuthRef.current; },
                    set cameraAzimuth(value: number) { cameraAzimuthRef.current = value; },
                    get cameraElevation() { return cameraElevationRef.current; },
                    set cameraElevation(value: number) { cameraElevationRef.current = THREE.MathUtils.clamp(value, -10, 80); },
                    get cameraDistance() { return cameraDistanceRef.current * 11.5; },
                    set cameraDistance(value: number) { cameraDistanceRef.current = THREE.MathUtils.clamp(value / 11.5, 0.86, 2.05); },
                    get cameraHeight() { return cameraHeightRef.current; },
                    set cameraHeight(value: number) { cameraHeightRef.current = value; },
                    get showroomCamera() { return showroomCameraRef.current; }
                };
            },
            setDebugOrbitMode: (enabled: boolean) => {
                debugOrbitRef.current = enabled;
            },
            setTheme: () => undefined
        }), []);

        useEffect(() => {
            useGLTF.preload(props.vehicle.modelPath);
            props.adjacentVehicles.forEach((vehicle) => useGLTF.preload(vehicle.modelPath));
        }, [props.adjacentVehicles, props.vehicle.modelPath]);

        useEffect(() => {
            if (activeVehicleRef.current.id === props.vehicle.id) {
                props.onStatusChange('');
                props.onTransitionChange(false);
                return;
            }

            const outgoing = activeVehicleRef.current;
            const shouldAnimate = props.direction !== 0 && !reduceMotion;
            props.onStatusChange('');
            props.onTransitionChange(shouldAnimate);
            setSlots(shouldAnimate
                ? [createSlot(outgoing, 'outgoing', props.direction), createSlot(props.vehicle, 'incoming', props.direction)]
                : [createSlot(props.vehicle, 'active', 0)]
            );
            if (!shouldAnimate) {
                activeVehicleRef.current = props.vehicle;
                props.onTransitionChange(false);
            }
        }, [props.direction, props.onStatusChange, props.onTransitionChange, props.vehicle, reduceMotion]);

        const finishIncoming = (vehicle: VehicleDefinition): void => {
            activeVehicleRef.current = vehicle;
            setSlots((prev) => {
                const incoming = prev.find((slot) => slot.role === 'incoming' && slot.vehicle.id === vehicle.id);
                return incoming ? [{ ...incoming, role: 'active', direction: 0 }] : [createSlot(vehicle, 'active', 0)];
            });
            props.onTransitionChange(false);
        };

        return (
            <div ref={containerRef} className="vehicle-stage__r3f" role="application" tabIndex={0} aria-label="Prévisualisation 3D du véhicule" onPointerDown={controls.handlePointerDown} onPointerMove={controls.handlePointerMove} onPointerUp={controls.handlePointerUp} onPointerCancel={controls.handlePointerUp} onKeyDown={controls.handleKeyDown}>
                <Canvas
                    className="vehicle-stage__canvas"
                    dpr={[1, 1.5]}
                    shadows="soft"
                    camera={{ position: [0, showroomCameraRef.current.radius * Math.sin(THREE.MathUtils.degToRad(showroomCameraRef.current.elevation)), showroomCameraRef.current.radius * Math.cos(THREE.MathUtils.degToRad(showroomCameraRef.current.elevation))], fov: showroomCameraRef.current.fov, near: 0.1, far: 100 }}
                    gl={{ alpha: false, antialias: true }}
                    onCreated={({ gl, scene, camera }) => {
                        sceneRefsRef.current = { renderer: gl, scene, camera: camera as THREE.PerspectiveCamera, floorMesh: null, shadowPlane: null, softShadows: softShadowsRef.current };
                    }}
                >
                    <ShowroomScene theme={props.theme} debugOrbitRef={debugOrbitRef} rotationYRef={rotationYRef} cameraDistanceRef={cameraDistanceRef} cameraAzimuthRef={cameraAzimuthRef} cameraElevationRef={cameraElevationRef} cameraHeightRef={cameraHeightRef} showroomCameraRef={showroomCameraRef} floorMeshRef={floorMeshRef} envPresetRef={envPresetRef} setEnvPresetRef={setEnvPresetRef} setEnvEnabledRef={setEnvEnabledRef} onShadowPlaneReady={handleShadowPlaneReady} onSoftShadowsReady={handleSoftShadowsReady}>
                        {slots.map((slot) => (
                            <Suspense key={slot.key} fallback={null}>
                                <VehicleSlotBoundary slot={slot} rotationYRef={rotationYRef} onDone={finishIncoming} onError={() => props.onStatusChange('Modèle indisponible')}>
                                    <VehicleSlotMesh slot={slot} rotationYRef={rotationYRef} highlightedNodeIds={slot.role === 'active' ? props.highlightedNodeIds : []} garageMode={garageMode} onReady={() => props.onStatusChange('')} onDone={finishIncoming} />
                                </VehicleSlotBoundary>
                            </Suspense>
                        ))}
                    </ShowroomScene>
                </Canvas>
            </div>
        );
    }
);
