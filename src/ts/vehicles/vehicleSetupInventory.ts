import * as THREE from 'three';
import { VehicleSetupAssignment, VehicleSetupRole, VEHICLE_SETUP_ROLES } from './vehicleSetupTypes';

export interface VehicleSetupNode {
    id: string;
    name: string;
    type: string;
    depth: number;
    isMesh: boolean;
    meshNodeIds: string[];
    volume: number;
}

export interface VehicleSetupConflict {
    role: VehicleSetupRole;
    otherRole: VehicleSetupRole;
    nodeId: string;
    meshName: string;
}

type AssignmentMap = Partial<Record<VehicleSetupRole, VehicleSetupAssignment>>;

export function getVehicleNodeId(node: THREE.Object3D, root: THREE.Object3D): string {
    if (node === root) return 'root';
    const parts: string[] = [];
    let current: THREE.Object3D | null = node;
    while (current && current !== root) {
        const parent = current.parent;
        const index = parent ? parent.children.indexOf(current) : 0;
        parts.push(`${index}:${encodeURIComponent(current.name || current.type || 'Node')}`);
        current = parent;
    }
    return parts.reverse().join('/');
}

export function createVehicleNodeIndex(root: THREE.Object3D): Map<string, THREE.Object3D> {
    const index = new Map<string, THREE.Object3D>();
    root.traverse((node) => index.set(getVehicleNodeId(node, root), node));
    return index;
}

export function buildVehicleSetupInventory(root: THREE.Object3D): VehicleSetupNode[] {
    const meshIdsByNode = new Map<THREE.Object3D, string[]>();
    root.traverse((node) => {
        const meshIds: string[] = [];
        node.traverse((descendant) => {
            if ((descendant as THREE.Mesh).isMesh) meshIds.push(getVehicleNodeId(descendant, root));
        });
        meshIdsByNode.set(node, meshIds);
    });

    const nodes: VehicleSetupNode[] = [];
    root.traverse((node) => {
        const id = getVehicleNodeId(node, root);
        const box = new THREE.Box3().setFromObject(node);
        const size = new THREE.Vector3();
        box.getSize(size);
        nodes.push({
            id,
            name: node === root ? 'Full model' : node.name || node.type || 'Unnamed node',
            type: node.type,
            depth: getNodeDepth(node, root),
            isMesh: (node as THREE.Mesh).isMesh === true,
            meshNodeIds: meshIdsByNode.get(node) ?? [],
            volume: Math.max(0, size.x * size.y * size.z)
        });
    });
    return nodes.filter((node) => node.id === 'root' || node.meshNodeIds.length > 0);
}

export function detectVehicleSetupAssignments(nodes: VehicleSetupNode[]): AssignmentMap {
    const assignments: AssignmentMap = {};
    for (const role of VEHICLE_SETUP_ROLES) {
        if (role.id === 'collision') continue;
        const detected = nodes.find((node) => node.id !== 'root' && matchesRole(node.name, role.id));
        if (detected) assignments[role.id] = { role: role.id, nodeIds: [detected.id] };
    }
    return assignments;
}

export function resolveVehicleSetupConflicts(assignments: AssignmentMap, nodes: VehicleSetupNode[]): VehicleSetupConflict[] {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const ownersByMesh = new Map<string, VehicleSetupRole[]>();

    for (const role of VEHICLE_SETUP_ROLES.map((item) => item.id)) {
        const assignment = assignments[role];
        if (!assignment) continue;
        const meshIds = new Set<string>();
        assignment.nodeIds.forEach((nodeId) => {
            const node = nodeById.get(nodeId);
            if (!node) return;
            node.meshNodeIds.forEach((meshId) => meshIds.add(meshId));
        });
        meshIds.forEach((meshId) => {
            ownersByMesh.set(meshId, [...(ownersByMesh.get(meshId) ?? []), role]);
        });
    }

    const conflicts: VehicleSetupConflict[] = [];
    ownersByMesh.forEach((roles, meshId) => {
        const uniqueRoles = Array.from(new Set(roles));
        if (uniqueRoles.length < 2) return;
        for (const role of uniqueRoles) {
            uniqueRoles.filter((otherRole) => otherRole !== role).forEach((otherRole) => {
                conflicts.push({
                    role,
                    otherRole,
                    nodeId: meshId,
                    meshName: nodeById.get(meshId)?.name ?? meshId
                });
            });
        }
    });
    return conflicts;
}

export function sanitizeVehicleSetupAssignments(assignments: AssignmentMap, nodes: VehicleSetupNode[]): AssignmentMap {
    const validNodeIds = new Set(nodes.map((node) => node.id));
    const sanitized: AssignmentMap = {};
    for (const role of VEHICLE_SETUP_ROLES.map((item) => item.id)) {
        const assignment = assignments[role];
        if (!assignment) continue;
        const nodeIds = assignment.nodeIds.filter((nodeId) => validNodeIds.has(nodeId));
        sanitized[role] = { role, nodeIds };
    }
    return sanitized;
}

function getNodeDepth(node: THREE.Object3D, root: THREE.Object3D): number {
    let depth = 0;
    let current = node.parent;
    while (current && current !== root) {
        depth += 1;
        current = current.parent;
    }
    return node === root ? 0 : depth + 1;
}

function matchesRole(name: string, role: VehicleSetupRole): boolean {
    const value = name.toLowerCase().replace(/[\s-]+/g, '_');
    const isWheel = value.includes('wheel') || value.includes('tire') || value.includes('tyre') || value.includes('rim');
    if (role === 'steering_wheel') {
        return value.includes('steering') && value.includes('wheel') && !value.includes('front');
    }
    if (!isWheel) return false;
    if (role === 'wheel_fl') return value.includes('fl') || value.includes('front_left') || value.includes('left_front');
    if (role === 'wheel_fr') return value.includes('fr') || value.includes('front_right') || value.includes('right_front');
    if (role === 'wheel_rl') return value.includes('rl') || value.includes('rear_left') || value.includes('left_rear') || value.includes('back_left');
    if (role === 'wheel_rr') return value.includes('rr') || value.includes('rear_right') || value.includes('right_rear') || value.includes('back_right');
    return false;
}
