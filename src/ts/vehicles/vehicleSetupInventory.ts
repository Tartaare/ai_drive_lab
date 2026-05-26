import * as THREE from 'three';
import { VehicleSetupAssignment, VehicleSetupRole, VEHICLE_SETUP_ROLES, isWheelSetupRole } from './vehicleSetupTypes';

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
    const candidates = nodes.filter((n) => n.id !== 'root');

    const wheelRoles: VehicleSetupRole[] = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'];

    for (const role of VEHICLE_SETUP_ROLES) {
        if (role.id === 'collision') continue;

        if (isWheelSetupRole(role.id)) {
            const scored = candidates
                .map((n) => ({ node: n, score: scoreWheelMatch(n.name, role.id) }))
                .filter((e) => e.score > 0)
                .sort((a, b) => b.score - a.score);

            if (scored.length === 0) continue;

            const best = scored[0].node;
            const nodeIds = [best.id];

            const companion = findWheelCompanion(best, scored[0].score, candidates, role.id, nodeIds);
            if (companion) nodeIds.push(companion.id);

            assignments[role.id] = { role: role.id, nodeIds };
        } else {
            const detected = candidates.find((n) => matchesRole(n.name, role.id));
            if (detected) assignments[role.id] = { role: role.id, nodeIds: [detected.id] };
        }
    }

    const assigned = resolveWheelConflicts(assignments, wheelRoles, candidates);
    wheelRoles.forEach((r) => { if (assigned[r]) assignments[r] = assigned[r]; });

    return assignments;
}

function findWheelCompanion(
    primary: VehicleSetupNode,
    primaryScore: number,
    candidates: VehicleSetupNode[],
    role: VehicleSetupRole,
    excludeIds: string[]
): VehicleSetupNode | null {
    const primaryNorm = normalizeName(primary.name);
    const isTire = primaryNorm.includes('tire') || primaryNorm.includes('tyre');
    const isWheel = primaryNorm.includes('wheel') || primaryNorm.includes('rim');

    return candidates.find((n) => {
        if (excludeIds.includes(n.id)) return false;
        const score = scoreWheelMatch(n.name, role);
        if (score <= 0) return false;
        const norm = normalizeName(n.name);
        const companionIsTire = norm.includes('tire') || norm.includes('tyre');
        const companionIsWheel = norm.includes('wheel') || norm.includes('rim');
        return (isTire && companionIsWheel) || (isWheel && companionIsTire);
    }) ?? null;
}

function resolveWheelConflicts(
    assignments: AssignmentMap,
    wheelRoles: VehicleSetupRole[],
    candidates: VehicleSetupNode[]
): AssignmentMap {
    const nodeUsage = new Map<string, VehicleSetupRole[]>();
    for (const role of wheelRoles) {
        const a = assignments[role];
        if (!a) continue;
        a.nodeIds.forEach((id) => {
            nodeUsage.set(id, [...(nodeUsage.get(id) ?? []), role]);
        });
    }

    const conflicts = new Set<string>();
    nodeUsage.forEach((roles, id) => { if (roles.length > 1) conflicts.add(id); });
    if (conflicts.size === 0) return assignments;

    const resolved: AssignmentMap = { ...assignments };
    for (const role of wheelRoles) {
        const a = resolved[role];
        if (!a) continue;
        const hasConflict = a.nodeIds.some((id) => conflicts.has(id));
        if (!hasConflict) continue;

        const fallback = candidates
            .filter((n) => !a.nodeIds.includes(n.id))
            .map((n) => ({ node: n, score: scoreWheelMatch(n.name, role) }))
            .filter((e) => e.score > 0 && !nodeUsedByOtherRole(n_id(e.node), role, resolved, wheelRoles))
            .sort((a, b) => b.score - a.score)[0];

        if (fallback) {
            resolved[role] = { role, nodeIds: [fallback.node.id] };
        }
    }
    return resolved;
}

function n_id(n: VehicleSetupNode): string { return n.id; }

function nodeUsedByOtherRole(nodeId: string, excludeRole: VehicleSetupRole, assignments: AssignmentMap, roles: VehicleSetupRole[]): boolean {
    return roles.filter((r) => r !== excludeRole).some((r) => assignments[r]?.nodeIds.includes(nodeId));
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

function normalizeName(name: string): string {
    return name.toLowerCase().replace(/[\s\-\.]+/g, '_').replace(/_+/g, '_');
}

function matchesRole(name: string, role: VehicleSetupRole): boolean {
    return role === 'steering_wheel' && scoreSteeringMatch(normalizeName(name)) > 0;
}

function scoreSteeringMatch(v: string): number {
    if (v.includes('steering') && (v.includes('wheel') || v.includes('volant'))) return 10;
    if (v === 'steering' || v === 'volant') return 6;
    return 0;
}

function scoreWheelMatch(name: string, role: VehicleSetupRole): number {
    const v = normalizeName(name);
    const isTireType = v.includes('tire') || v.includes('tyre');
    const isWheelType = v.includes('wheel') || v.includes('rim') || v.includes('roue');
    const isWheelPart = isTireType || isWheelType;

    if (!isWheelPart) return 0;
    if (v.includes('steering') || v.includes('volant')) return 0;

    const isFront = v.includes('front') || v.includes('avant') || /\bfw?\b/.test(v) || /_front/.test(v) || /front_/.test(v);
    const isRear  = v.includes('rear') || v.includes('back') || v.includes('arriere') || /_rear/.test(v) || /_back/.test(v) || /rear_/.test(v) || /back_/.test(v);
    const isLeft  = v.includes('left') || v.includes('gauche') || /_left/.test(v) || /left_/.test(v);
    const isRight = v.includes('right') || v.includes('droit') || /_right/.test(v) || /right_/.test(v);

    const abbrFl = /_fl(\b|_|\d|$)/.test(v) || /^fl(\b|_|\d)/.test(v) || v === 'fl';
    const abbrFr = /_fr(\b|_|\d|$)/.test(v) || /^fr(\b|_|\d)/.test(v) || v === 'fr';
    const abbrRl = /_rl(\b|_|\d|$)/.test(v) || /^rl(\b|_|\d)/.test(v) || v === 'rl';
    const abbrRr = /_rr(\b|_|\d|$)/.test(v) || /^rr(\b|_|\d)/.test(v) || v === 'rr';

    const hasFl = abbrFl || (isFront && isLeft && !isRight);
    const hasFr = abbrFr || (isFront && isRight && !isLeft);
    const hasRl = abbrRl || (isRear && isLeft && !isRight);
    const hasRr = abbrRr || (isRear && isRight && !isLeft);

    const baseScore = isTireType ? 5 : 7;

    if (role === 'wheel_fl') return hasFl ? baseScore + 3 : 0;
    if (role === 'wheel_fr') return hasFr ? baseScore + 3 : 0;
    if (role === 'wheel_rl') return hasRl ? baseScore + 3 : 0;
    if (role === 'wheel_rr') return hasRr ? baseScore + 3 : 0;
    return 0;
}
