import { Environment, OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CuboidCollider, CylinderCollider, Physics, RigidBody, useBeforePhysicsStep } from '@react-three/rapier';
import { useControls as useLeva } from 'leva';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Quaternion, Vector3, type Vector3Tuple } from 'three';
import { LampPost } from './components/lamp-post';
import { TrafficCone } from './components/traffic-cone';
import { Vehicle, type VehicleRef } from './components/vehicle';
import { AFTER_RAPIER_UPDATE, RAPIER_UPDATE_PRIORITY } from './constants';
import { useControls } from './hooks/use-controls';
import { CircuitTrack } from './components/circuit-track';
import { defaultTrackConfig, generateTrack, type TrackData } from './lib/track-generator';

export type SketchMap = 'default' | 'infinite' | 'circuit';

export type SketchProps = {
    map?: SketchMap;
    paused?: boolean;
    onPauseChange?: (paused: boolean) => void;
};

const cameraIdealOffset = new Vector3();
const cameraIdealLookAt = new Vector3();
const chassisTranslation = new Vector3();
const chassisRotation = new Quaternion();

const Game = ({ map, paused, onPauseChange }: { map: SketchMap; paused: boolean; onPauseChange?: (paused: boolean) => void }) => {
    const raycastVehicle = useRef<VehicleRef>(null);
    const [vehicleInstance, setVehicleInstance] = useState(0);

    const camera = useThree((state) => state.camera);
    const currentCameraPosition = useRef(new Vector3(15, 15, 0));
    const currentCameraLookAt = useRef(new Vector3());

    const controls = useControls();

    const trackData = useMemo<TrackData | null>(() => {
        if (map !== 'circuit') {
            return null;
        }
        return generateTrack(defaultTrackConfig);
    }, [map]);

    const vehicleStart = useMemo<{ position: Vector3Tuple; rotation: Vector3Tuple }>(() => {
        if (!trackData) {
            return {
                position: [0, 5, 0],
                rotation: [0, -Math.PI / 2, 0],
            };
        }

        const startIndex = trackData.startLineIndex;
        const points = trackData.centerPoints;
        const current = points[startIndex];
        const next = points[(startIndex + 1) % points.length];
        const direction = new Vector3().subVectors(next, current).normalize();
        const yaw = Math.atan2(direction.z, direction.x);

        return {
            position: [current.x, 1, current.z],
            rotation: [0, yaw - Math.PI / 2, 0],
        };
    }, [trackData]);

    const { cameraMode } = useLeva('camera', {
        cameraMode: {
            value: 'drive',
            options: ['drive', 'orbit'],
        },
    });

    const { maxForce, maxSteer, maxBrake } = useLeva('controls', {
        maxForce: 30,
        maxSteer: 10,
        maxBrake: 2,
    });

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === 'r' || event.key === 'R') {
                setVehicleInstance((current) => current + 1);
            }

            if (event.key === 'Escape') {
                if (onPauseChange) {
                    onPauseChange(true);
                }
            }
        };

        window.addEventListener('keydown', handleKeydown);

        return () => {
            window.removeEventListener('keydown', handleKeydown);
        };
    }, [onPauseChange]);

    useBeforePhysicsStep((world) => {
        if (paused) {
            return;
        }
        if (!raycastVehicle.current || !raycastVehicle.current.rapierRaycastVehicle.current) {
            return;
        }

        const {
            wheels,
            rapierRaycastVehicle: { current: vehicle },
            setBraking,
        } = raycastVehicle.current;

        // update wheels from controls
        let engineForce = 0;
        let steering = 0;

        if (controls.current.forward) {
            engineForce += maxForce;
        }
        if (controls.current.backward) {
            engineForce -= maxForce;
        }

        if (controls.current.left) {
            steering += maxSteer;
        }
        if (controls.current.right) {
            steering -= maxSteer;
        }

        const brakeForce = controls.current.brake ? maxBrake : 0;

        for (let i = 0; i < vehicle.wheels.length; i++) {
            vehicle.setBrakeValue(brakeForce, i);
        }

        // steer front wheels
        vehicle.setSteeringValue(steering, 0);
        vehicle.setSteeringValue(steering, 1);

        // apply engine force to back wheels
        vehicle.applyEngineForce(engineForce, 2);
        vehicle.applyEngineForce(engineForce, 3);

        // update the vehicle
        vehicle.update(world.timestep);

        // update the wheels
        for (let i = 0; i < vehicle.wheels.length; i++) {
            const wheelObject = wheels[i].object.current;
            if (!wheelObject) continue;

            const wheelState = vehicle.wheels[i].state;
            wheelObject.position.copy(wheelState.worldTransform.position);
            wheelObject.quaternion.copy(wheelState.worldTransform.quaternion);
        }

        // update brake lights
        setBraking(brakeForce > 0);
    });

    useFrame((_, delta) => {
        if (cameraMode !== 'drive') return;

        const chassis = raycastVehicle.current?.chassisRigidBody;
        if (!chassis?.current) return;

        chassisRotation.copy(chassis.current.rotation() as Quaternion);
        chassisTranslation.copy(chassis.current.translation() as Vector3);

        const t = 1.0 - Math.pow(0.01, delta);

        cameraIdealOffset.set(-10, 3, 0);
        cameraIdealOffset.applyQuaternion(chassisRotation);
        cameraIdealOffset.add(chassisTranslation);

        if (cameraIdealOffset.y < 0) {
            cameraIdealOffset.y = 0.5;
        }

        cameraIdealLookAt.set(0, 1, 0);
        cameraIdealLookAt.applyQuaternion(chassisRotation);
        cameraIdealLookAt.add(chassisTranslation);

        currentCameraPosition.current.lerp(cameraIdealOffset, t);
        currentCameraLookAt.current.lerp(cameraIdealLookAt, t);

        camera.position.copy(currentCameraPosition.current);
        camera.lookAt(currentCameraLookAt.current);
    }, AFTER_RAPIER_UPDATE);

    return (
        <>
            <Vehicle key={vehicleInstance} ref={raycastVehicle} position={vehicleStart.position} rotation={vehicleStart.rotation} />

            {map === 'default' && (
                <>
                    <LampPost position={[10, 0, 0]} />
                    <LampPost position={[-10, 0, 25]} rotation-y={Math.PI} />
                    <LampPost position={[10, 0, 50]} />
                    <LampPost position={[-10, 0, 75]} rotation-y={Math.PI} />
                    <LampPost position={[10, 0, 100]} />

                    <TrafficCone position={[4, 1, 6]} />
                    <TrafficCone position={[2, 1, 8]} />
                    <TrafficCone position={[4, 1, 10]} />

                    <TrafficCone position={[-4, 1, 16]} />
                    <TrafficCone position={[-2, 1, 18]} />
                    <TrafficCone position={[-4, 1, 20]} />

                    <RigidBody type="fixed">
                        <mesh rotation-x={-0.3} position={[0, -1, 30]}>
                            <boxGeometry args={[10, 1, 10]} />
                            <meshStandardMaterial color="orange" />
                        </mesh>
                    </RigidBody>

                    <group position={[0, 0, 50]}>
                        {Array.from({ length: 6 }).map((_, idx) => (
                            <RigidBody
                                key={String(idx)}
                                colliders={false}
                                type="fixed"
                                mass={10}
                                rotation={[0, 0, Math.PI / 2]}
                                position={[idx % 2 === 0 ? -0.8 : 0.8, -0.42, idx * 1.5]}
                            >
                                <CylinderCollider args={[1, 0.5]} />
                                <mesh>
                                    <cylinderGeometry args={[0.5, 0.5, 2]} />
                                    <meshStandardMaterial color="orange" />
                                </mesh>
                            </RigidBody>
                        ))}
                    </group>

                    {Array.from({ length: 6 }).map((_, idx) => (
                        <RigidBody key={String(idx)} colliders="cuboid" mass={0.2}>
                            <mesh position={[0, 2 + idx * 2.5, 70]}>
                                <boxGeometry args={[2, 1, 2]} />
                                <meshStandardMaterial color="orange" />
                            </mesh>
                        </RigidBody>
                    ))}

                    <RigidBody type="fixed" position-z={75} position-y={-5} colliders={false} friction={1}>
                        <CuboidCollider args={[120, 5, 120]} />
                        <mesh receiveShadow>
                            <boxGeometry args={[240, 10, 240]} />
                            <meshStandardMaterial color="#303030" />
                        </mesh>
                    </RigidBody>

                    <mesh position={[0, 0.02, 50]} rotation-x={-Math.PI / 2} receiveShadow>
                        <planeGeometry args={[15, 150]} />
                        <meshStandardMaterial color="#222" depthWrite={false} />
                    </mesh>
                </>
            )}

            {map === 'circuit' && (
                <>
                    <RigidBody type="fixed" position-y={-5} colliders={false} friction={1}>
                        <CuboidCollider args={[200, 5, 200]} />
                        <mesh receiveShadow>
                            <boxGeometry args={[400, 10, 400]} />
                            <meshStandardMaterial color="#303030" />
                        </mesh>
                    </RigidBody>

                    {trackData && (
                        <group>
                            <CircuitTrack trackData={trackData} showCenterLine />
                        </group>
                    )}
                </>
            )}

            {map === 'infinite' && (
                <>
                    <RigidBody type="fixed" position-y={-5} colliders={false} friction={1}>
                        <CuboidCollider args={[500, 5, 500]} />
                        <mesh receiveShadow>
                            <boxGeometry args={[1000, 10, 1000]} />
                            <meshStandardMaterial color="#303030" />
                        </mesh>
                    </RigidBody>
                </>
            )}

            <hemisphereLight intensity={0.75} />
            <ambientLight intensity={0.3} />
            <Environment preset="night" />

            <Stars />

            {cameraMode === 'orbit' && <OrbitControls />}
        </>
    );
}

export function Sketch({ map = 'default', paused = false, onPauseChange }: SketchProps) {
    const { debug } = useLeva('physics', {
        debug: false,
    });

    return (
        <>
            <Canvas camera={{ fov: 60, position: [0, 30, -20] }} shadows>
                <color attach="background" args={['#000']} />

                <Physics
                    gravity={[0, -9.81, 0]}
                    updatePriority={RAPIER_UPDATE_PRIORITY}
                    timeStep="vary"
                    debug={debug}
                    paused={paused}
                >
                    <Game map={map} paused={paused} onPauseChange={onPauseChange} />
                </Physics>
            </Canvas>

            <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', pointerEvents: 'none' }}>
                * utiliser ZQSD pour conduire, espace pour freiner
            </div>
        </>
    );
}
