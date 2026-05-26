import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Component, MutableRefObject, ReactNode, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { VehicleDefinition } from '../../../ui/menu/catalog';
import { createVehicleNodeIndex } from '../../../vehicles/vehicleSetupInventory';
import { easeInOutCubic } from './slotState';
import { SWAP_DURATION_MS, VehicleSlot } from './types';
import { createNormalizedVehicle } from './vehicleModel';

interface SlotAnimationProps {
    slot: VehicleSlot;
    rotationYRef: MutableRefObject<number>;
    onDone: (vehicle: VehicleDefinition) => void;
}

function useSlotAnimation({ slot, rotationYRef, onDone }: SlotAnimationProps): {
    groupRef: MutableRefObject<THREE.Group | null>;
    modelRef: MutableRefObject<THREE.Group | null>;
} {
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

    return { groupRef, modelRef };
}

export function VehicleSlotMesh({ slot, rotationYRef, onReady, onDone, highlightedNodeIds = [], garageMode = false }: SlotAnimationProps & {
    onReady: () => void;
    highlightedNodeIds?: string[];
    garageMode?: boolean;
}): JSX.Element {
    const gltf = useGLTF(slot.vehicle.modelPath) as { scene: THREE.Object3D; animations: THREE.AnimationClip[] };
    const model = useMemo(() => createNormalizedVehicle(gltf.scene), [gltf.scene]);
    const { groupRef, modelRef } = useSlotAnimation({ slot, rotationYRef, onDone });
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

    useEffect(() => {
        if (!mixer || gltf.animations.length === 0) return;
        if (garageMode) {
            mixer.timeScale = 4;
            const onFinished = (): void => {
                mixer.timeScale = 1;
                mixer.stopAllAction();
            };
            mixer.addEventListener('finished', onFinished);
            Object.values(actions).forEach((action) => {
                if (!action) return;
                action.setLoop(THREE.LoopOnce, 1).clampWhenFinished = true;
            });
            return () => mixer.removeEventListener('finished', onFinished);
        } else {
            mixer.timeScale = 1;
            Object.values(actions).forEach((action) => {
                if (!action) return;
                action.setLoop(THREE.LoopRepeat, Infinity);
                if (!action.isRunning()) action.reset().play();
            });
        }
    }, [garageMode, actions, mixer, gltf.animations.length]);

    useFrame((_, delta) => {
        mixer?.update(delta);
    });

    useEffect(() => {
        const sourceRoot = model.children[0];
        if (!sourceRoot) return;
        const nodeIndex = createVehicleNodeIndex(sourceRoot);
        const isHighlighting = highlightedNodeIds.length > 0;

        const highlightedMeshIds = new Set<string>();
        if (isHighlighting) {
            highlightedNodeIds.forEach((nodeId) => {
                const node = nodeIndex.get(nodeId);
                node?.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) highlightedMeshIds.add(child.uuid);
                });
            });
        }

        sourceRoot.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat) => {
                const m = mat as THREE.MeshStandardMaterial;
                if (isHighlighting && !highlightedMeshIds.has(mesh.uuid)) {
                    m.transparent = true;
                    m.opacity = 0.1;
                } else {
                    m.transparent = false;
                    m.opacity = 1;
                }
                m.needsUpdate = true;
            });
        });

        return () => {
            sourceRoot.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                materials.forEach((mat) => {
                    const m = mat as THREE.MeshStandardMaterial;
                    m.transparent = false;
                    m.opacity = 1;
                    m.needsUpdate = true;
                });
            });
        };
    }, [highlightedNodeIds, model]);

    return (
        <group ref={groupRef}>
            <primitive ref={modelRef} object={model} />
            <VehicleHighlightBoxes model={model} highlightedNodeIds={highlightedNodeIds} rotationYRef={rotationYRef} />
        </group>
    );
}

function VehicleHighlightBoxes({ model, highlightedNodeIds, rotationYRef }: { model: THREE.Group; highlightedNodeIds: string[]; rotationYRef: MutableRefObject<number>; }): JSX.Element | null {
    const groupRef = useRef<THREE.Group | null>(null);
    const boxes = useMemo(() => {
        const sourceRoot = model.children[0];
        if (!sourceRoot || highlightedNodeIds.length === 0) return [];
        model.updateMatrixWorld(true);
        sourceRoot.updateMatrixWorld(true);
        const nodeIndex = createVehicleNodeIndex(sourceRoot);
        const inverse = model.matrixWorld.clone().invert();
        return highlightedNodeIds.flatMap((nodeId) => {
            const node = nodeIndex.get(nodeId);
            if (!node) return [];
            const worldBox = new THREE.Box3().setFromObject(node);
            if (worldBox.isEmpty()) return [];
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            worldBox.getCenter(center).applyMatrix4(inverse);
            worldBox.getSize(size);
            return [{ id: nodeId, center, size }];
        });
    }, [highlightedNodeIds, model]);

    useFrame(() => {
        if (groupRef.current) groupRef.current.rotation.y = rotationYRef.current;
    });

    if (boxes.length === 0) return null;
    return (
        <group ref={groupRef} renderOrder={8}>
            {boxes.map((box) => (
                <mesh key={box.id} position={box.center}>
                    <boxGeometry args={[Math.max(box.size.x, 0.02), Math.max(box.size.y, 0.02), Math.max(box.size.z, 0.02)]} />
                    <meshBasicMaterial color="#ff8a1f" wireframe transparent opacity={0.82} depthTest={false} />
                </mesh>
            ))}
        </group>
    );
}

export class VehicleSlotBoundary extends Component<{
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

function FallbackVehicleSlot(props: SlotAnimationProps): JSX.Element {
    const { groupRef, modelRef } = useSlotAnimation(props);

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
