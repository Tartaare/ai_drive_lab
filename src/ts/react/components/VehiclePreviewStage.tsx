import { MutableRefObject, useState } from 'react';
import { VehicleDefinition } from '../../ui/menu/catalog';
import { ThemeName } from '../types';
import { ShowroomVehicleCanvas, ShowroomVehicleHandle } from './ShowroomVehicleCanvas';

interface VehiclePreviewStageProps {
    vehicle: VehicleDefinition;
    adjacentVehicles: VehicleDefinition[];
    direction: -1 | 0 | 1;
    theme: ThemeName;
    highlightedNodeIds: string[];
    garageMode?: boolean;
    previewRef: MutableRefObject<ShowroomVehicleHandle | null>;
    onTransitionChange: (locked: boolean) => void;
}

export function VehiclePreviewStage({ vehicle, adjacentVehicles, direction, theme, highlightedNodeIds, garageMode, previewRef, onTransitionChange }: VehiclePreviewStageProps): JSX.Element {
    const [status, setStatus] = useState('');

    return (
        <div id="vehicle-preview-stage" className="vehicle-stage">
            <ShowroomVehicleCanvas
                ref={previewRef}
                vehicle={vehicle}
                adjacentVehicles={adjacentVehicles}
                direction={direction}
                theme={theme}
                highlightedNodeIds={highlightedNodeIds}
                garageMode={garageMode}
                onStatusChange={setStatus}
                onTransitionChange={onTransitionChange}
            />
            <div id="vehicle-preview-status" className="vehicle-stage__status" role="status" aria-live="polite">{status}</div>
        </div>
    );
}
