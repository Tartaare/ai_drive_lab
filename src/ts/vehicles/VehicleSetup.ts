import * as THREE from 'three';
import {
    buildVehicleSetupInventory,
    createVehicleNodeIndex,
    detectVehicleSetupAssignments,
    sanitizeVehicleSetupAssignments
} from './vehicleSetupInventory';
import {
    getWheelSetupMetadata,
    isWheelSetupRole,
    VehicleSetupAssignment,
    VehicleSetupConfig,
    VehicleSetupRole,
    VEHICLE_SETUP_ROLES
} from './vehicleSetupTypes';

type AssignmentMap = Partial<Record<VehicleSetupRole, VehicleSetupAssignment>>;

export class VehicleSetup
{
    public static prepareModel(model: THREE.Object3D, config?: VehicleSetupConfig | null): void
    {
        clearGeneratedSetupData(model);
        const inventory = buildVehicleSetupInventory(model);
        const nodeIndex = createVehicleNodeIndex(model);
        const autoAssignments = detectVehicleSetupAssignments(inventory);
        const savedAssignments = config ? sanitizeVehicleSetupAssignments(config.assignments, inventory) : {};
        const assignments = mergeAssignments(autoAssignments, savedAssignments);

        createCollisionProxy(model, assignments.collision, nodeIndex);

        const wheelsFound: string[] = [];
        VEHICLE_SETUP_ROLES.filter((role) => isWheelSetupRole(role.id)).forEach((role) => {
            const assignment = assignments[role.id];
            const wheelObject = assignment ? buildWheelObject(model, role.id, assignment.nodeIds, nodeIndex) : null;
            if (!wheelObject) return;
            const radius = measureWheelRadius(wheelObject);
            const metadata = getWheelSetupMetadata(role.id);
            wheelObject.userData = {
                ...wheelObject.userData,
                data: 'wheel',
                drive: metadata.drive,
                steering: metadata.steering ? 'true' : 'false',
                radius
            };
            wheelsFound.push(`${role.shortLabel}: ${wheelObject.name || role.id} (r=${radius.toFixed(2)}m)`);
        });

        const steeringAssignment = assignments.steering_wheel;
        const steeringNode = steeringAssignment ? getFirstExistingNode(steeringAssignment.nodeIds, nodeIndex) : null;
        if (steeringNode) {
            steeringNode.userData = { ...steeringNode.userData, data: 'steering_wheel' };
            console.log(`Configured Steering Wheel: ${steeringNode.name || steeringNode.uuid}`);
        }

        if (wheelsFound.length === 0) {
            console.warn("No wheels configured. Ensure meshes are named like 'Wheel_FL', or assign them in Vehicle Settings.");
        } else {
            console.log(`Setup complete. ${wheelsFound.length} wheels configured.`, wheelsFound);
        }
    }
}

function mergeAssignments(autoAssignments: AssignmentMap, savedAssignments: AssignmentMap): AssignmentMap {
    const merged: AssignmentMap = {};
    VEHICLE_SETUP_ROLES.forEach((role) => {
        const saved = savedAssignments[role.id];
        merged[role.id] = saved && saved.nodeIds.length > 0 ? saved : autoAssignments[role.id];
        if (role.id === 'collision' && saved) merged[role.id] = saved;
    });
    return merged;
}

function clearGeneratedSetupData(model: THREE.Object3D): void {
    const generated: THREE.Object3D[] = [];
    model.traverse((child) => {
        if (child.userData?.apexGeneratedSetup === true) generated.push(child);
        if (child.userData?.data === 'wheel' || child.userData?.data === 'steering_wheel' || child.userData?.data === 'collision') {
            const { data, drive, steering, radius, shape, apexGeneratedSetup, ...rest } = child.userData;
            child.userData = rest;
        }
    });
    generated.forEach((child) => child.parent?.remove(child));
}

function createCollisionProxy(model: THREE.Object3D, assignment: VehicleSetupAssignment | undefined, nodeIndex: Map<string, THREE.Object3D>): void {
    const selectedNodes = assignment ? assignment.nodeIds.map((nodeId) => nodeIndex.get(nodeId)).filter(Boolean) as THREE.Object3D[] : [];
    const box = selectedNodes.length > 0 ? boxFromNodes(selectedNodes) : new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const collisionGeo = new THREE.BoxGeometry(2, 2, 2);
    const collisionMat = new THREE.MeshBasicMaterial({ visible: false, wireframe: true, color: 0xff0000 });
    const collisionMesh = new THREE.Mesh(collisionGeo, collisionMat);
    const targetSize = selectedNodes.length > 0
        ? new THREE.Vector3(Math.max(size.x, 0.1), Math.max(size.y, 0.1), Math.max(size.z, 0.1))
        : new THREE.Vector3(size.x * 0.8, size.y * 0.5, size.z * 0.9);

    collisionMesh.name = 'APEX_Generated_Collision';
    collisionMesh.scale.set(targetSize.x / 2, targetSize.y / 2, targetSize.z / 2);
    collisionMesh.position.copy(selectedNodes.length > 0 ? center : new THREE.Vector3(0, targetSize.y / 2 + 0.2, 0));
    collisionMesh.userData = {
        data: 'collision',
        shape: 'box',
        apexGeneratedSetup: true
    };
    model.add(collisionMesh);
}

function buildWheelObject(model: THREE.Object3D, role: VehicleSetupRole, nodeIds: string[], nodeIndex: Map<string, THREE.Object3D>): THREE.Object3D | null {
    const nodes = nodeIds.map((nodeId) => nodeIndex.get(nodeId)).filter(Boolean) as THREE.Object3D[];
    if (nodes.length === 0) return null;
    if (nodes.length === 1) return nodes[0];

    model.updateMatrixWorld(true);
    const box = boxFromNodes(nodes);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const group = new THREE.Group();
    group.name = `APEX_${role}_Group`;
    group.userData.apexGeneratedSetup = true;
    group.position.copy(center);
    model.add(group);
    group.updateMatrixWorld(true);
    nodes.forEach((node) => group.attach(node));
    return group;
}

function getFirstExistingNode(nodeIds: string[], nodeIndex: Map<string, THREE.Object3D>): THREE.Object3D | null {
    for (const nodeId of nodeIds) {
        const node = nodeIndex.get(nodeId);
        if (node) return node;
    }
    return null;
}

function measureWheelRadius(node: THREE.Object3D): number {
    const wheelBox = new THREE.Box3().setFromObject(node);
    const wheelSize = new THREE.Vector3();
    wheelBox.getSize(wheelSize);
    return Math.max(0.08, wheelSize.y / 2);
}

function boxFromNodes(nodes: THREE.Object3D[]): THREE.Box3 {
    const box = new THREE.Box3();
    nodes.forEach((node) => box.union(new THREE.Box3().setFromObject(node)));
    return box;
}
