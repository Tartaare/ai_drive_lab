import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, MeshReflectorMaterial, useAnimations, useGLTF } from '@react-three/drei';
import { Component, forwardRef, MutableRefObject, ReactNode, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { SceneDebugSource, SoftShadowsSource } from '../../ui/SceneDebugPanel';
import { VehicleDefinition } from '../../ui/menu/catalog';
import { ThemeName } from '../types';

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
    onStatusChange: (message: string) => void;
    onTransitionChange: (locked: boolean) => void;
}

interface VehicleSlot {
    key: string;
    vehicle: VehicleDefinition;
    role: 'active' | 'incoming' | 'outgoing';
    direction: -1 | 0 | 1;
}

interface SceneRefs {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    floorMesh: THREE.Mesh | null;
    shadowPlane: THREE.Mesh | null;
    softShadows: SoftShadowsSource | null;
}

// Couleurs de fond / sol
const BG_DARK = '#414141';
const BG_LIGHT = '#c4c4c4';
const FLOOR_DARK = '#383838';
const FLOOR_LIGHT = '#919191';
const SWAP_DURATION_MS = 400;
const STUDIO_PANEL_SIZE: [number, number] = [5.8, 2.1];

export const ShowroomVehicleCanvas = forwardRef<ShowroomVehicleHandle, ShowroomVehicleCanvasProps>(
    function ShowroomVehicleCanvas(props, ref): JSX.Element {
        const [slots, setSlots] = useState<VehicleSlot[]>(() => [createSlot(props.vehicle, 'active', 0)]);
        const activeVehicleRef = useRef(props.vehicle);
        const sceneRefsRef = useRef<SceneRefs | null>(null);
        const floorMeshRef = useRef<THREE.Mesh | null>(null);
        const shadowPlaneRef = useRef<THREE.Mesh | null>(null);
        const softShadowsRef = useRef<SoftShadowsSource | null>(null);

        const handleSoftShadowsReady = useCallback((ss: SoftShadowsSource) => {
            softShadowsRef.current = ss;
            if (sceneRefsRef.current) sceneRefsRef.current.softShadows = ss;
        }, []);
        const handleShadowPlaneReady = useCallback((mesh: THREE.Mesh | null) => {
            shadowPlaneRef.current = mesh;
            if (sceneRefsRef.current) sceneRefsRef.current.shadowPlane = mesh;
        }, []);
        const envPresetRef = useRef('city');
        const setEnvPresetRef = useRef<((preset: string) => void) | null>(null);
        const setEnvEnabledRef = useRef<((enabled: boolean) => void) | null>(null);
        const debugOrbitRef = useRef(false);
        const rotationYRef = useRef(0);
        const cameraDistanceRef = useRef(1);
        const cameraAzimuthRef = useRef(0);
        const cameraElevationRef = useRef(16);
        const cameraHeightRef = useRef(-0.74);
        const dragRef = useRef({ active: false, x: 0, y: 0, rotation: 0, elevation: 16, azimuth: 0 });

        // Showroom camera configuration (normal mode - non-debug)
        const showroomCameraRef = useRef({
            radius: 20,        // Distance sphérique de la caméra au point cible
            elevation: 16,     // Angle vertical en degrés (0 = horizon, 90 = zénith)
            lookAtY: 0.1,        // Target Y position (where camera looks)
            fov: 15            // Field of view
        });
        const reduceMotion = useReducedMotion();
        const containerRef = useRef<HTMLDivElement>(null);

        // Attach wheel listener with passive: false to allow preventDefault
        useEffect(() => {
            const container = containerRef.current;
            if (!container) return;
            
            const wheelHandler = (event: WheelEvent): void => {
                event.preventDefault();
                const direction = event.deltaY > 0 ? 1 : -1;
                cameraDistanceRef.current = THREE.MathUtils.clamp(cameraDistanceRef.current + direction * 0.13, 0.85, 1.2);
            };
            
            container.addEventListener('wheel', wheelHandler, { passive: false });
            return () => container.removeEventListener('wheel', wheelHandler);
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
                    // Showroom camera configuration (normal mode)
                    get showroomCamera() { return showroomCameraRef.current; }
                };
            },
            setDebugOrbitMode: (enabled: boolean) => {
                debugOrbitRef.current = enabled;
            },
            setShowroomCamera: (config: Partial<{ radius: number; elevation: number; lookAtY: number; fov: number }>) => {
                const cam = showroomCameraRef.current;
                if (config.radius !== undefined) cam.radius = config.radius;
                if (config.elevation !== undefined) cam.elevation = config.elevation;
                if (config.lookAtY !== undefined) cam.lookAtY = config.lookAtY;
                if (config.fov !== undefined) {
                    cam.fov = THREE.MathUtils.clamp(config.fov, 10, 120);
                    if (sceneRefsRef.current) {
                        sceneRefsRef.current.camera.fov = cam.fov;
                        sceneRefsRef.current.camera.updateProjectionMatrix();
                    }
                }
            },
            getShowroomCamera: () => ({ ...showroomCameraRef.current }),
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
                ? [
                    createSlot(outgoing, 'outgoing', props.direction),
                    createSlot(props.vehicle, 'incoming', props.direction)
                ]
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
                const incoming = prev.find((s) => s.role === 'incoming' && s.vehicle.id === vehicle.id);
                if (incoming) return [{ ...incoming, role: 'active', direction: 0 }];
                return [createSlot(vehicle, 'active', 0)];
            });
            props.onTransitionChange(false);
        };

        const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
            dragRef.current = {
                active: true,
                x: event.clientX,
                y: event.clientY,
                rotation: rotationYRef.current,
                elevation: cameraElevationRef.current,
                azimuth: cameraAzimuthRef.current
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.focus();
        };

        const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
            if (!dragRef.current.active) return;
            const dx = event.clientX - dragRef.current.x;
            const dy = event.clientY - dragRef.current.y;
            if (debugOrbitRef.current) {
                cameraAzimuthRef.current = dragRef.current.azimuth + dx * 0.4;
                cameraElevationRef.current = THREE.MathUtils.clamp(dragRef.current.elevation - dy * 0.3, -10, 80);
                return;
            }
            rotationYRef.current = dragRef.current.rotation + dx * 0.012;
        };

        const handlePointerUp = (): void => {
            dragRef.current.active = false;
        };

        const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
            if (event.key === '+' || event.key === '=' || event.key === 'NumpadAdd' || event.key === 'PageUp') {
                event.preventDefault();
                cameraDistanceRef.current = THREE.MathUtils.clamp(cameraDistanceRef.current - 0.1, 0.86, 2.05);
            }
            if (event.key === '-' || event.key === '_' || event.key === 'NumpadSubtract' || event.key === 'PageDown') {
                event.preventDefault();
                cameraDistanceRef.current = THREE.MathUtils.clamp(cameraDistanceRef.current + 0.1, 0.86, 2.05);
            }
        };

        return (
            <div
                ref={containerRef}
                className="vehicle-stage__r3f"
                role="application"
                tabIndex={0}
                aria-label="Prévisualisation 3D du véhicule"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onKeyDown={handleKeyDown}
            >
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
                                    <VehicleSlotMesh slot={slot} rotationYRef={rotationYRef} onReady={() => props.onStatusChange('')} onDone={finishIncoming} />
                                </VehicleSlotBoundary>
                            </Suspense>
                        ))}
                    </ShowroomScene>
                </Canvas>
            </div>
        );
    }
);

function ShowroomScene({ children, theme, debugOrbitRef, rotationYRef, cameraDistanceRef, cameraAzimuthRef, cameraElevationRef, cameraHeightRef, showroomCameraRef, floorMeshRef, envPresetRef, setEnvPresetRef, setEnvEnabledRef, onShadowPlaneReady, onSoftShadowsReady }: {
    children: ReactNode;
    theme: ThemeName;
    debugOrbitRef: MutableRefObject<boolean>;
    rotationYRef: MutableRefObject<number>;
    cameraDistanceRef: MutableRefObject<number>;
    cameraAzimuthRef: MutableRefObject<number>;
    cameraElevationRef: MutableRefObject<number>;
    cameraHeightRef: MutableRefObject<number>;
    showroomCameraRef: MutableRefObject<{ radius: number; elevation: number; lookAtY: number; fov: number }>;
    floorMeshRef: MutableRefObject<THREE.Mesh | null>;
    envPresetRef: MutableRefObject<string>;
    setEnvPresetRef: MutableRefObject<((preset: string) => void) | null>;
    setEnvEnabledRef: MutableRefObject<((enabled: boolean) => void) | null>;
    onShadowPlaneReady: (mesh: THREE.Mesh | null) => void;
    onSoftShadowsReady: (ss: SoftShadowsSource) => void;
}): JSX.Element {
    const { camera } = useThree();
    const bg = theme === 'light' ? BG_LIGHT : BG_DARK;
    const floor = theme === 'light' ? FLOOR_LIGHT : FLOOR_DARK;
    const isLight = theme === 'light';
    const [envPreset, setEnvPreset] = useState(envPresetRef.current);
    const [envEnabled, setEnvEnabled] = useState(true);
    envPresetRef.current = envPreset;
    setEnvPresetRef.current = setEnvPreset;
    setEnvEnabledRef.current = setEnvEnabled;
    useEffect(() => {
        onSoftShadowsReady({
            get opacity() { return 1; },
            set opacity(_v: number) { /* no-op: soft shadow map */ },
            get alphaTest() { return 0.5; },
            set alphaTest(_v: number) { /* no-op */ },
            get colorBlend() { return 1; },
            set colorBlend(_v: number) { /* no-op */ },
            reset: () => undefined,
        });
    }, [onSoftShadowsReady]);

    useFrame((_, delta) => {
        if (!debugOrbitRef.current && !document.pointerLockElement) rotationYRef.current += delta * 0.32;
        const perspectiveCamera = camera as THREE.PerspectiveCamera;
        if (debugOrbitRef.current) {
            const azRad = THREE.MathUtils.degToRad(cameraAzimuthRef.current);
            const elRad = THREE.MathUtils.degToRad(cameraElevationRef.current);
            const dist = 11.5 * cameraDistanceRef.current;
            const y = dist * Math.sin(elRad);
            const horiz = dist * Math.cos(elRad);
            perspectiveCamera.position.set(horiz * Math.sin(azRad), Math.max(y, 0.3), horiz * Math.cos(azRad));
            perspectiveCamera.lookAt(0, cameraHeightRef.current, 0);
            return;
        }
        // Normal showroom mode - use configurable camera settings
        const cam = showroomCameraRef.current;
        const elRad = THREE.MathUtils.degToRad(cam.elevation);
        const dist = cam.radius * cameraDistanceRef.current;
        const horiz = dist * Math.cos(elRad);
        const vert = dist * Math.sin(elRad);
        perspectiveCamera.position.set(0, vert, horiz);
        perspectiveCamera.lookAt(0, cam.lookAtY, 0);
    });

    return (
        <>
            <color attach="background" args={[bg]} />
            <fog attach="fog" args={[bg, 22, 32]} />
            {envEnabled && <Environment preset={envPreset as any} />}
            <StudioLighting />
            <StudioBox />
            {children}
            <ShadowLight theme={theme} onReady={onShadowPlaneReady} />
            <mesh ref={(m) => { floorMeshRef.current = m; }} position={[0, 0.0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[50, 50]} />
                <MeshReflectorMaterial
                    blur={[400, 100]}
                    resolution={1024}
                    mixBlur={isLight ? 8 : 4}
                    mixStrength={isLight ? 4 : 10}
                    depthScale={1}
                    minDepthThreshold={0.85}
                    mirror={0}
                    color={floor}
                    metalness={0}
                    roughness={isLight ? 0.98 : 0.88}
                />
            </mesh>
        </>
    );
}

function StudioBox(): JSX.Element {
    return <group />;
}

function StudioLighting(): JSX.Element {
    useEffect(() => {
        RectAreaLightUniformsLib.init();
    }, []);

    return (
        <>
            <rectAreaLight
                intensity={5.5}
                width={STUDIO_PANEL_SIZE[0]}
                height={STUDIO_PANEL_SIZE[1]}
                position={[0, 4.2, 1.2]}
                rotation={[-Math.PI / 2, 0, 0]}
            />
            <group position={[0, 4.05, 1.2]}>
                <mesh>
                    <boxGeometry args={[6.2, 0.28, 2.5]} />
                    <meshStandardMaterial color="#0e0e10" roughness={0.6} metalness={0.1} />
                </mesh>
                <mesh position={[0, -0.141, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <planeGeometry args={STUDIO_PANEL_SIZE} />
                    <meshBasicMaterial color="#f6f4ef" toneMapped={false} />
                </mesh>
            </group>
        </>
    );
}

function ShadowLight({ theme, onReady }: { theme: ThemeName; onReady: (mesh: THREE.Mesh | null) => void }): JSX.Element {
    const opacity = 0.035;
    return (
        <>
            <spotLight
                castShadow
                position={[4, 9, -6]}
                angle={0.38}
                penumbra={0.85}
                intensity={Math.PI * 2.8}
                decay={2}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-near={0.5}
                shadow-camera-far={30}
                shadow-bias={-0.0003}
                shadow-normalBias={0.04}
            />
            <mesh ref={onReady} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
                <planeGeometry args={[24, 24]} />
                <shadowMaterial transparent opacity={opacity} />
            </mesh>
        </>
    );
}

function VehicleSlotMesh({ slot, rotationYRef, onReady, onDone }: {
    slot: VehicleSlot;
    rotationYRef: MutableRefObject<number>;
    onReady: () => void;
    onDone: (vehicle: VehicleDefinition) => void;
}): JSX.Element {
    const groupRef = useRef<THREE.Group | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    const startRef = useRef<number | null>(null);
    const doneRef = useRef(false);
    const gltf = useGLTF(slot.vehicle.modelPath) as { scene: THREE.Object3D; animations: THREE.AnimationClip[] };
    const model = useMemo(() => createNormalizedVehicle(gltf.scene), [gltf.scene]);
    const { viewport } = useThree();
    const offscreen = Math.max(4.2, viewport.width * 0.5 + 2.2);
    const { actions, mixer } = useAnimations(gltf.animations, modelRef);

    useEffect(() => {
        onReady();
    }, [onReady]);

    useEffect(() => {
        if (!mixer) return;
        if (slot.role === 'active' && gltf.animations.length > 0) {
            Object.values(actions).forEach((action) => {
                if (!action) return;
                action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
            });
        } else {
            Object.values(actions).forEach((action) => action?.stop());
        }
    }, [slot.role, actions, mixer, gltf.animations.length]);

    useFrame(({ clock }, delta) => {
        if (!groupRef.current || !modelRef.current) return;
        mixer?.update(delta);
        modelRef.current.rotation.y = rotationYRef.current;
        if (slot.role === 'active') {
            groupRef.current.position.x = 0;
            return;
        }
        if (startRef.current === null) startRef.current = clock.elapsedTime * 1000;
        const progress = THREE.MathUtils.clamp((clock.elapsedTime * 1000 - startRef.current) / SWAP_DURATION_MS, 0, 1);
        const eased = easeInOutCubic(progress);
        const direction = slot.direction === 0 ? 1 : slot.direction;
        groupRef.current.position.x = slot.role === 'incoming'
            ? THREE.MathUtils.lerp(-direction * offscreen, 0, eased)
            : THREE.MathUtils.lerp(0, direction * offscreen, eased);
        if (progress < 1 || doneRef.current || slot.role !== 'incoming') return;
        doneRef.current = true;
        onDone(slot.vehicle);
    });

    return (
        <group ref={groupRef}>
            <primitive ref={modelRef} object={model} />
        </group>
    );
}

class VehicleSlotBoundary extends Component<{
    slot: VehicleSlot;
    rotationYRef: MutableRefObject<number>;
    onDone: (vehicle: VehicleDefinition) => void;
    onError: () => void;
    children: ReactNode;
}, { failed: boolean; }> {
    public state = { failed: false };

    public static getDerivedStateFromError(): { failed: boolean } {
        return { failed: true };
    }

    public componentDidCatch(): void {
        this.props.onError();
    }

    public componentDidUpdate(previousProps: { slot: VehicleSlot }): void {
        if (previousProps.slot.vehicle.id !== this.props.slot.vehicle.id && this.state.failed) {
            this.setState({ failed: false });
        }
    }

    public render(): ReactNode {
        if (this.state.failed) {
            return <FallbackVehicleSlot slot={this.props.slot} rotationYRef={this.props.rotationYRef} onDone={this.props.onDone} />;
        }
        return this.props.children;
    }
}

function FallbackVehicleSlot({ slot, rotationYRef, onDone }: {
    slot: VehicleSlot;
    rotationYRef: MutableRefObject<number>;
    onDone: (vehicle: VehicleDefinition) => void;
}): JSX.Element {
    const groupRef = useRef<THREE.Group | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    const startRef = useRef<number | null>(null);
    const doneRef = useRef(false);
    const { viewport } = useThree();
    const offscreen = Math.max(4.2, viewport.width * 0.5 + 2.2);

    useFrame(({ clock }) => {
        if (!groupRef.current || !modelRef.current) return;
        modelRef.current.rotation.y = rotationYRef.current;
        if (slot.role === 'active') {
            groupRef.current.position.x = 0;
            return;
        }
        if (startRef.current === null) startRef.current = clock.elapsedTime * 1000;
        const progress = THREE.MathUtils.clamp((clock.elapsedTime * 1000 - startRef.current) / SWAP_DURATION_MS, 0, 1);
        const eased = easeInOutCubic(progress);
        const direction = slot.direction === 0 ? 1 : slot.direction;
        groupRef.current.position.x = slot.role === 'incoming'
            ? THREE.MathUtils.lerp(-direction * offscreen, 0, eased)
            : THREE.MathUtils.lerp(0, direction * offscreen, eased);
        if (progress < 1 || doneRef.current || slot.role !== 'incoming') return;
        doneRef.current = true;
        onDone(slot.vehicle);
    });

    return (
        <group ref={groupRef}>
            <group ref={modelRef}>
            <mesh castShadow receiveShadow position={[0, 0.42, 0]}>
                <boxGeometry args={[2.8, 0.52, 1.15]} />
                <meshStandardMaterial color="#eeeeee" roughness={0.32} metalness={0.2} />
            </mesh>
            </group>
        </group>
    );
}

function createNormalizedVehicle(source: THREE.Object3D): THREE.Group {
    const cloned = SkeletonUtils.clone(source);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const length = Math.max(size.z, 0.001);
    const width = Math.max(size.x, 0.001);
    const height = Math.max(size.y, 0.001);
    const footprintScale = Math.min(3.4 / length, 1.65 / width);
    const heightScale = 1.25 / height;
    const scale = THREE.MathUtils.clamp(footprintScale * 0.82 + heightScale * 0.18, 0.2, 6);
    cloned.scale.setScalar(scale);
    // Recalcul de la AABB après scale pour centrage XZ et snap-to-floor précis
    const scaledBox = new THREE.Box3().setFromObject(cloned);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);
    cloned.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);
    cloned.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    });
    const group = new THREE.Group();
    group.add(cloned);
    return group;
}

function createSlot(vehicle: VehicleDefinition, role: VehicleSlot['role'], direction: -1 | 0 | 1): VehicleSlot {
    return {
        key: `${vehicle.id}-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        vehicle,
        role,
        direction
    };
}

function easeInOutCubic(progress: number): number {
    return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = (): void => setReduced(query.matches);
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return reduced;
}
