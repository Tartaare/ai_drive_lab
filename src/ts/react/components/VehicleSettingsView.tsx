import { useEffect, useRef, useState } from 'react';
import { VehicleDefinition, VehicleStatKey } from '../../ui/menu/catalog';
import { VehicleImportPanel } from './VehicleImportPanel';

interface VehicleSettingsViewProps {
    active: boolean;
    vehicle: VehicleDefinition;
    transitionLocked: boolean;
    onVehicleChange: (direction: -1 | 1) => void;
    onClose: () => void;
    onStatsSave: (vehicleId: string, overrides: Record<VehicleStatKey, number>) => Promise<void>;
    onImportPreview: (vehicle: VehicleDefinition, file: File) => void;
    onImportSave: (vehicle: VehicleDefinition, file: File) => Promise<void>;
    onImportDelete: (vehicle: VehicleDefinition) => Promise<void>;
}

export function VehicleSettingsView({ active, vehicle, transitionLocked, onVehicleChange, onClose, onStatsSave, onImportPreview, onImportSave, onImportDelete }: VehicleSettingsViewProps): JSX.Element {
    const backButtonRef = useRef<HTMLButtonElement | null>(null);
    const statKeys = Object.keys(vehicle.stats) as VehicleStatKey[];

    const buildDraft = (): Record<VehicleStatKey, number> =>
        Object.fromEntries(statKeys.map((k) => [k, vehicle.stats[k].value])) as Record<VehicleStatKey, number>;

    const [draft, setDraft] = useState<Record<VehicleStatKey, number>>(buildDraft);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    const statsKey = JSON.stringify(
        (Object.keys(vehicle.stats) as VehicleStatKey[]).map((k) => vehicle.stats[k].value)
    );

    useEffect(() => {
        setDraft(buildDraft());
        setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statsKey]);

    useEffect(() => {
        if (!active) return;
        backButtonRef.current?.focus();
    }, [active]);

    const handleSlider = (key: VehicleStatKey, raw: string): void => {
        setDraft((prev) => ({ ...prev, [key]: Number(raw) }));
        setDirty(true);
    };

    const handleCancel = (): void => {
        setDraft(buildDraft());
        setDirty(false);
    };

    const handleSave = async (): Promise<void> => {
        setSaving(true);
        await onStatsSave(vehicle.id, draft);
        setSaving(false);
        setDirty(false);
    };

    return (
        <div className={`vehicle-settings-view${active ? ' is-active' : ''}`} aria-hidden={!active} onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
        }}>
            <div className="vehicle-settings-back-row">
                <button
                    ref={backButtonRef}
                    className="vehicle-settings-back"
                    type="button"
                    aria-label="Retour au menu principal"
                    tabIndex={active ? 0 : -1}
                    onClick={onClose}
                >
                    Retour
                </button>
            </div>
            <section className="vehicle-settings-panel vehicle-settings-panel--drive" aria-labelledby="vehicle-settings-drive-title">
                <span className="showroom-kicker">Vehicle setup</span>
                <h2 id="vehicle-settings-drive-title">Drive mode</h2>
                <div className="vehicle-settings-panel__body" aria-hidden="true" />
            </section>
            <section className="vehicle-settings-panel vehicle-settings-panel--circuit" aria-labelledby="vehicle-settings-circuit-title">
                <span className="showroom-kicker">Garage import</span>
                <h2 id="vehicle-settings-circuit-title">3D Models</h2>
                <VehicleImportPanel active={active} vehicle={vehicle} onPreview={onImportPreview} onSave={onImportSave} onDelete={onImportDelete} />
            </section>
            <div className="vehicle-settings-mini-selector">
                <div className="vehicle-info__glass">
                    <div className="vehicle-selector">
                        <button className="vehicle-nav" type="button" aria-label="Véhicule précédent" disabled={transitionLocked} aria-disabled={transitionLocked} tabIndex={active ? 0 : -1} onClick={() => onVehicleChange(-1)}>‹</button>
                        <div className="vehicle-title"><h2>{vehicle.name}</h2></div>
                        <button className="vehicle-nav" type="button" aria-label="Véhicule suivant" disabled={transitionLocked} aria-disabled={transitionLocked} tabIndex={active ? 0 : -1} onClick={() => onVehicleChange(1)}>›</button>
                    </div>
                    <div className="vehicle-settings-stats__sliders">
                        {statKeys.map((key) => {
                            const stat = vehicle.stats[key];
                            const val = draft[key];
                            return (
                                <div className="stat-slider" key={key}>
                                    <span className="stat-slider__label">{stat.label}</span>
                                    <span className="stat-slider__value">{val}</span>
                                    <input
                                        className="stat-slider__input"
                                        type="range"
                                        min={1}
                                        max={stat.max}
                                        step={1}
                                        value={val}
                                        tabIndex={active ? 0 : -1}
                                        aria-label={stat.label}
                                        aria-valuemin={1}
                                        aria-valuemax={stat.max}
                                        aria-valuenow={val}
                                        onChange={(e) => handleSlider(key, e.target.value)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <div className="vehicle-settings-stats__actions">
                        <button
                            className="vehicle-settings-action vehicle-settings-action--cancel"
                            type="button"
                            disabled={!dirty || saving}
                            tabIndex={active ? 0 : -1}
                            onClick={handleCancel}
                        >
                            Annuler
                        </button>
                        <button
                            className="vehicle-settings-action vehicle-settings-action--save"
                            type="button"
                            disabled={!dirty || saving}
                            tabIndex={active ? 0 : -1}
                            onClick={handleSave}
                        >
                            {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
