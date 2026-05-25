import { useEffect, useRef } from 'react';
import { X } from './icons/X';
import { VehicleDefinition } from '../../ui/menu/catalog';

interface VehicleSettingsViewProps {
    active: boolean;
    vehicle: VehicleDefinition;
    transitionLocked: boolean;
    onVehicleChange: (direction: -1 | 1) => void;
    onClose: () => void;
}

export function VehicleSettingsView({ active, vehicle, transitionLocked, onVehicleChange, onClose }: VehicleSettingsViewProps): JSX.Element {
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!active) return;
        closeButtonRef.current?.focus();
    }, [active]);

    return (
        <div className={`vehicle-settings-view${active ? ' is-active' : ''}`} aria-hidden={!active} onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
        }}>
            <section className="vehicle-settings-panel vehicle-settings-panel--drive" aria-labelledby="vehicle-settings-drive-title">
                <span className="showroom-kicker">Vehicle setup</span>
                <div className="vehicle-settings-panel__header">
                    <h2 id="vehicle-settings-drive-title">Drive mode</h2>
                    <button ref={closeButtonRef} className="vehicle-settings-close" type="button" aria-label="Fermer les réglages du véhicule" tabIndex={active ? 0 : -1} onClick={onClose}>
                        <X size={18} strokeWidth={2} aria-hidden="true" />
                    </button>
                </div>
                <div className="vehicle-settings-panel__body" aria-hidden="true" />
            </section>
            <section className="vehicle-settings-panel vehicle-settings-panel--circuit" aria-labelledby="vehicle-settings-circuit-title">
                <span className="showroom-kicker">Vehicle setup</span>
                <h2 id="vehicle-settings-circuit-title">Circuit</h2>
                <div className="vehicle-settings-panel__body" aria-hidden="true" />
            </section>
            <div className="vehicle-settings-mini-selector">
                <div className="vehicle-info__glass">
                    <div className="vehicle-selector">
                        <button className="vehicle-nav" type="button" aria-label="Véhicule précédent" disabled={transitionLocked} aria-disabled={transitionLocked} tabIndex={active ? 0 : -1} onClick={() => onVehicleChange(-1)}>‹</button>
                        <div className="vehicle-title"><h2>{vehicle.name}</h2></div>
                        <div style={{ width: 42 }} />
                        <button className="vehicle-nav" type="button" aria-label="Véhicule suivant" disabled={transitionLocked} aria-disabled={transitionLocked} tabIndex={active ? 0 : -1} onClick={() => onVehicleChange(1)}>›</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
