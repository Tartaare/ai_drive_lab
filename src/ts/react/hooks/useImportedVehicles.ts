import { useCallback, useEffect, useRef, useState } from 'react';
import * as AppStorage from '../../core/AppStorage';
import { VehicleDefinition } from '../../ui/menu/catalog';
import { createImportedVehicleDefinition } from '../vehicleImport';

export function useImportedVehicles(): {
    importedVehicles: VehicleDefinition[];
    draftVehicle: VehicleDefinition | null;
    loadImportedVehicles: () => Promise<VehicleDefinition[]>;
    previewImportedVehicle: (vehicle: VehicleDefinition) => void;
    saveImportedVehicle: (vehicle: VehicleDefinition, file: File) => Promise<VehicleDefinition>;
    deleteImportedVehicle: (vehicle: VehicleDefinition) => Promise<void>;
} {
    const [importedVehicles, setImportedVehicles] = useState<VehicleDefinition[]>([]);
    const [draftVehicle, setDraftVehicle] = useState<VehicleDefinition | null>(null);
    const objectUrlsRef = useRef<Map<string, string>>(new Map());

    const revokeUrl = useCallback((vehicleId: string): void => {
        const url = objectUrlsRef.current.get(vehicleId);
        if (!url) return;
        URL.revokeObjectURL(url);
        objectUrlsRef.current.delete(vehicleId);
    }, []);

    const loadImportedVehicles = useCallback(async (): Promise<VehicleDefinition[]> => {
        const records = await AppStorage.getImportedVehicles();
        const vehicles = records.map((record) => {
            revokeUrl(record.id);
            const objectUrl = URL.createObjectURL(record.blob);
            objectUrlsRef.current.set(record.id, objectUrl);
            return createImportedVehicleDefinition(record, objectUrl);
        });
        setImportedVehicles(vehicles);
        return vehicles;
    }, [revokeUrl]);

    const previewImportedVehicle = useCallback((vehicle: VehicleDefinition): void => {
        setDraftVehicle((previous) => {
            if (previous && previous.id !== vehicle.id && previous.saved === false) revokeUrl(previous.id);
            objectUrlsRef.current.set(vehicle.id, vehicle.modelPath);
            return vehicle;
        });
    }, [revokeUrl]);

    const saveImportedVehicle = useCallback(async (vehicle: VehicleDefinition, file: File): Promise<VehicleDefinition> => {
        const record: AppStorage.ImportedVehicleRecord = {
            id: vehicle.id,
            name: vehicle.name,
            fileName: file.name,
            mimeType: file.type || 'model/gltf-binary',
            size: file.size,
            blob: file,
            createdAt: Date.now()
        };
        await AppStorage.saveImportedVehicle(record);
        const saved = createImportedVehicleDefinition(record, vehicle.modelPath);
        setImportedVehicles((current) => [...current.filter((item) => item.id !== saved.id), saved]);
        setDraftVehicle((current) => current?.id === vehicle.id ? null : current);
        return saved;
    }, []);

    const deleteImportedVehicle = useCallback(async (vehicle: VehicleDefinition): Promise<void> => {
        await AppStorage.deleteImportedVehicle(vehicle.id);
        revokeUrl(vehicle.id);
        setImportedVehicles((current) => current.filter((item) => item.id !== vehicle.id));
        setDraftVehicle((current) => current?.id === vehicle.id ? null : current);
    }, [revokeUrl]);

    useEffect(() => () => {
        objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrlsRef.current.clear();
    }, []);

    return { importedVehicles, draftVehicle, loadImportedVehicles, previewImportedVehicle, saveImportedVehicle, deleteImportedVehicle };
}
