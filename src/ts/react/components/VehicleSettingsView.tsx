import { X } from './icons/X';

interface VehicleSettingsViewProps {
    active: boolean;
    onClose: () => void;
}

export function VehicleSettingsView({ active, onClose }: VehicleSettingsViewProps): JSX.Element {
    return (
        <div className={`vehicle-settings-view${active ? ' is-active' : ''}`} aria-hidden={!active}>
            <section className="vehicle-settings-panel vehicle-settings-panel--drive" aria-labelledby="vehicle-settings-drive-title">
                <span className="showroom-kicker">Vehicle setup</span>
                <div className="vehicle-settings-panel__header">
                    <h2 id="vehicle-settings-drive-title">Drive mode</h2>
                    <button className="vehicle-settings-close" type="button" aria-label="Fermer les réglages du véhicule" tabIndex={active ? 0 : -1} onClick={onClose}>
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
        </div>
    );
}
