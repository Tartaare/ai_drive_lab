export type VehicleSetupRole =
    | 'wheel_fl'
    | 'wheel_fr'
    | 'wheel_rl'
    | 'wheel_rr'
    | 'steering_wheel'
    | 'collision';

export interface VehicleSetupRoleDefinition {
    id: VehicleSetupRole;
    label: string;
    shortLabel: string;
    description: string;
}

export interface VehicleSetupAssignment {
    role: VehicleSetupRole;
    nodeIds: string[];
}

export interface VehicleSetupConfig {
    vehicleId: string;
    assignments: Partial<Record<VehicleSetupRole, VehicleSetupAssignment>>;
    updatedAt: number;
}

export const VEHICLE_SETUP_ROLES: VehicleSetupRoleDefinition[] = [
    { id: 'wheel_fl', label: 'Front left wheel', shortLabel: 'FL wheel', description: 'Steering wheel, front axle, left side.' },
    { id: 'wheel_fr', label: 'Front right wheel', shortLabel: 'FR wheel', description: 'Steering wheel, front axle, right side.' },
    { id: 'wheel_rl', label: 'Rear left wheel', shortLabel: 'RL wheel', description: 'Driven wheel, rear axle, left side.' },
    { id: 'wheel_rr', label: 'Rear right wheel', shortLabel: 'RR wheel', description: 'Driven wheel, rear axle, right side.' },
    { id: 'steering_wheel', label: 'Steering wheel', shortLabel: 'Steering', description: 'Interior steering wheel animated by steering input.' },
    { id: 'collision', label: 'Chassis collision', shortLabel: 'Collision', description: 'Reference meshes used to build the invisible physics box.' }
];

export function isWheelSetupRole(role: VehicleSetupRole): boolean {
    return role === 'wheel_fl' || role === 'wheel_fr' || role === 'wheel_rl' || role === 'wheel_rr';
}

export function getWheelSetupMetadata(role: VehicleSetupRole): { steering: boolean; drive: 'fwd' | 'rwd' } {
    if (role === 'wheel_fl' || role === 'wheel_fr') return { steering: true, drive: 'fwd' };
    return { steering: false, drive: 'rwd' };
}
