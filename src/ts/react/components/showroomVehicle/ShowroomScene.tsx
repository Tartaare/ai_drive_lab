import { Environment, MeshReflectorMaterial } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { ThemeName } from '../../types';
import { ShowroomSceneProps } from './types';

const BG_DARK = '#414141';
const BG_LIGHT = '#c4c4c4';
const FLOOR_DARK = '#383838';
const FLOOR_LIGHT = '#919191';
const STUDIO_PANEL_SIZE: [number, number] = [5.8, 2.1];

export function ShowroomScene(props: ShowroomSceneProps): JSX.Element {
    const { camera } = useThree();
    const bg = props.theme === 'light' ? BG_LIGHT : BG_DARK;
    const floor = props.theme === 'light' ? FLOOR_LIGHT : FLOOR_DARK;
    const isLight = props.theme === 'light';
    const [envPreset, setEnvPreset] = useState(props.envPresetRef.current);
    const [envEnabled, setEnvEnabled] = useState(true);
    props.envPresetRef.current = envPreset;
    props.setEnvPresetRef.current = setEnvPreset;
    props.setEnvEnabledRef.current = setEnvEnabled;

    useEffect(() => {
        props.onSoftShadowsReady({
            get opacity() { return 1; },
            set opacity(_v: number) { undefined; },
            get alphaTest() { return 0.5; },
            set alphaTest(_v: number) { undefined; },
            get colorBlend() { return 1; },
            set colorBlend(_v: number) { undefined; },
            reset: () => undefined,
        });
    }, [props]);

    useFrame((_, delta) => {
        if (!props.debugOrbitRef.current && !document.pointerLockElement) props.rotationYRef.current += delta * 0.32;
        const perspectiveCamera = camera as THREE.PerspectiveCamera;
        if (props.debugOrbitRef.current) {
            const azRad = THREE.MathUtils.degToRad(props.cameraAzimuthRef.current);
            const elRad = THREE.MathUtils.degToRad(props.cameraElevationRef.current);
            const dist = 11.5 * props.cameraDistanceRef.current;
            const y = dist * Math.sin(elRad);
            const horiz = dist * Math.cos(elRad);
            perspectiveCamera.position.set(horiz * Math.sin(azRad), Math.max(y, 0.3), horiz * Math.cos(azRad));
            perspectiveCamera.lookAt(0, props.cameraHeightRef.current, 0);
            return;
        }

        const cam = props.showroomCameraRef.current;
        const elRad = THREE.MathUtils.degToRad(cam.elevation);
        const dist = cam.radius * props.cameraDistanceRef.current;
        perspectiveCamera.position.set(0, dist * Math.sin(elRad), dist * Math.cos(elRad));
        perspectiveCamera.lookAt(0, cam.lookAtY, 0);
    });

    return (
        <>
            <color attach="background" args={[bg]} />
            <fog attach="fog" args={[bg, 22, 32]} />
            {envEnabled && <Environment preset={envPreset as any} />}
            <StudioLighting />
            {props.children}
            <ShadowLight theme={props.theme} onReady={props.onShadowPlaneReady} />
            <mesh ref={(m) => { props.floorMeshRef.current = m; }} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
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

function StudioLighting(): JSX.Element {
    useEffect(() => {
        RectAreaLightUniformsLib.init();
    }, []);

    return (
        <>
            <rectAreaLight intensity={5.5} width={STUDIO_PANEL_SIZE[0]} height={STUDIO_PANEL_SIZE[1]} position={[0, 4.2, 1.2]} rotation={[-Math.PI / 2, 0, 0]} />
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

function ShadowLight({ onReady }: { theme: ThemeName; onReady: (mesh: THREE.Mesh | null) => void }): JSX.Element {
    return (
        <>
            <spotLight castShadow position={[4, 9, -6]} angle={0.38} penumbra={0.85} intensity={Math.PI * 2.8} decay={2} shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-near={0.5} shadow-camera-far={30} shadow-bias={-0.0003} shadow-normalBias={0.04} />
            <mesh ref={onReady} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
                <planeGeometry args={[24, 24]} />
                <shadowMaterial transparent opacity={0.035} />
            </mesh>
        </>
    );
}
