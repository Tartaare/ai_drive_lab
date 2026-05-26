import { ImportedVehicleRecord } from '../core/AppStorage';
import { VehicleDefinition, VehicleStat, VehicleStatKey } from '../ui/menu/catalog';

const stat = (label: string, value: number): VehicleStat => ({
    label,
    value,
    unit: '',
    max: 100
});

export const IMPORTED_VEHICLE_STATS: Record<VehicleStatKey, VehicleStat> = {
    topSpeed: stat('Vitesse', 72),
    acceleration: stat('Accélération', 72),
    handling: stat('Maniabilité', 72),
    braking: stat('Freinage', 72),
    weight: stat('Légèreté', 72),
    grip: stat('Adhérence', 72)
};

export function createImportedVehicleDefinition(record: ImportedVehicleRecord, modelPath: string): VehicleDefinition {
    return {
        id: record.id,
        name: record.name,
        modelPath,
        stats: IMPORTED_VEHICLE_STATS,
        source: 'imported',
        fileName: record.fileName,
        saved: true
    };
}

export function createDraftVehicleDefinition(file: File, modelPath: string): VehicleDefinition {
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Imported vehicle';
    const id = `imported-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
    return {
        id,
        name: baseName.slice(0, 42),
        modelPath,
        stats: IMPORTED_VEHICLE_STATS,
        source: 'imported',
        fileName: file.name,
        saved: false
    };
}
