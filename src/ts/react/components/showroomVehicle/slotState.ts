import { VehicleDefinition } from '../../../ui/menu/catalog';
import { VehicleSlot } from './types';

export function createSlot(vehicle: VehicleDefinition, role: VehicleSlot['role'], direction: -1 | 0 | 1): VehicleSlot {
    return {
        key: `${vehicle.id}-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        vehicle,
        role,
        direction
    };
}

export function easeInOutCubic(progress: number): number {
    return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}
