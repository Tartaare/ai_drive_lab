import { MutableRefObject, useEffect, useRef } from 'react';
import { VehicleDefinition } from '../../ui/menu/catalog';
import { VehiclePreview } from '../../ui/menu/VehiclePreview';
import { ThemeName } from '../types';

interface VehiclePreviewStageProps {
    vehicle: VehicleDefinition;
    adjacentVehicles: VehicleDefinition[];
    direction: -1 | 0 | 1;
    theme: ThemeName;
    previewRef: MutableRefObject<VehiclePreview | null>;
    onTransitionChange: (locked: boolean) => void;
}

export function VehiclePreviewStage({ vehicle, adjacentVehicles, direction, theme, previewRef, onTransitionChange }: VehiclePreviewStageProps): JSX.Element {
    const stageRef = useRef<HTMLDivElement | null>(null);
    const statusRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!stageRef.current || !statusRef.current) return;
        const preview = new VehiclePreview(stageRef.current, statusRef.current);
        previewRef.current = preview;
        return () => {
            preview.dispose();
            previewRef.current = null;
        };
    }, [previewRef]);

    useEffect(() => {
        const preview = previewRef.current;
        if (!preview) return;
        preview.setTheme(theme);
    }, [previewRef, theme]);

    useEffect(() => {
        const preview = previewRef.current;
        if (!preview) return;
        onTransitionChange(direction !== 0);
        void preview.setVehicle(vehicle, direction).finally(() => onTransitionChange(false));
        preview.preload(adjacentVehicles);
    }, [adjacentVehicles, direction, onTransitionChange, previewRef, vehicle]);

    return (
        <div id="vehicle-preview-stage" className="vehicle-stage" ref={stageRef}>
            <div id="vehicle-preview-status" className="vehicle-stage__status" role="status" aria-live="polite" ref={statusRef} />
        </div>
    );
}
