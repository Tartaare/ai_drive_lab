import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getVehicleSetup, saveVehicleSetup } from '../../core/AppStorage';
import { VehicleDefinition, VehicleStatKey } from '../../ui/menu/catalog';
import {
    buildVehicleSetupInventory,
    detectVehicleSetupAssignments,
    resolveVehicleSetupConflicts,
    sanitizeVehicleSetupAssignments,
    VehicleSetupNode
} from '../../vehicles/vehicleSetupInventory';
import {
    VehicleSetupAssignment,
    VehicleSetupRole,
    VEHICLE_SETUP_ROLES
} from '../../vehicles/vehicleSetupTypes';

type AssignmentMap = Partial<Record<VehicleSetupRole, VehicleSetupAssignment>>;

interface VehicleSettingsViewProps {
    active: boolean;
    vehicle: VehicleDefinition;
    transitionLocked: boolean;
    onVehicleChange: (direction: -1 | 1) => void;
    onClose: () => void;
    onStatsSave: (vehicleId: string, overrides: Record<VehicleStatKey, number>) => void;
    onHighlightNodeIds: (nodeIds: string[]) => void;
}

export function VehicleSettingsView({ active, vehicle, transitionLocked, onVehicleChange, onClose, onStatsSave, onHighlightNodeIds }: VehicleSettingsViewProps): JSX.Element {
    const backButtonRef = useRef<HTMLButtonElement | null>(null);
    const statKeys = Object.keys(vehicle.stats) as VehicleStatKey[];
    const buildDraft = (): Record<VehicleStatKey, number> =>
        Object.fromEntries(statKeys.map((k) => [k, vehicle.stats[k].value])) as Record<VehicleStatKey, number>;
    const [draft, setDraft] = useState<Record<VehicleStatKey, number>>(buildDraft);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [nodes, setNodes] = useState<VehicleSetupNode[]>([]);
    const [assignments, setAssignments] = useState<AssignmentMap>({});
    const [setupDirty, setSetupDirty] = useState(false);
    const [setupSaving, setSetupSaving] = useState(false);
    const [setupStatus, setSetupStatus] = useState('Chargement du modèle...');
    const [openRole, setOpenRole] = useState<VehicleSetupRole | null>(null);

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

    useEffect(() => {
        if (!active) onHighlightNodeIds([]);
    }, [active, onHighlightNodeIds]);

    useEffect(() => {
        let cancelled = false;
        setNodes([]);
        setAssignments({});
        setSetupDirty(false);
        setOpenRole(null);
        if (!active) {
            setSetupStatus('');
            return () => {
                cancelled = true;
            };
        }
        setSetupStatus('Chargement du modèle...');
        const loader = new GLTFLoader();
        loader.load(vehicle.modelPath, async (gltf) => {
            if (cancelled) return;
            const inventory = buildVehicleSetupInventory(gltf.scene);
            const detected = detectVehicleSetupAssignments(inventory);
            const saved = await getVehicleSetup(vehicle.id);
            if (cancelled) return;
            const savedAssignments = saved
                ? sanitizeVehicleSetupAssignments(saved.assignments as AssignmentMap, inventory)
                : {};
            const nextAssignments = mergeAssignments(detected, savedAssignments);
            setNodes(inventory);
            setAssignments(nextAssignments);
            setSetupStatus(inventory.length === 0 ? 'Aucun mesh détecté dans ce modèle.' : `${inventory.length} nodes détectés`);
        }, undefined, () => {
            if (cancelled) return;
            setSetupStatus('Modèle indisponible : assignation impossible.');
        });
        return () => {
            cancelled = true;
        };
    }, [active, vehicle.id, vehicle.modelPath]);

    const conflicts = useMemo(() => resolveVehicleSetupConflicts(assignments, nodes), [assignments, nodes]);
    const conflictByRole = useMemo(() => {
        const map = new Map<VehicleSetupRole, string[]>();
        conflicts.forEach((conflict) => {
            const current = map.get(conflict.role) ?? [];
            current.push(`${conflict.meshName} déjà utilisé par ${roleLabel(conflict.otherRole)}`);
            map.set(conflict.role, current);
        });
        return map;
    }, [conflicts]);

    const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
    const selectableNodes = useMemo(() => nodes.filter((node) => node.id !== 'root'), [nodes]);

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

    const toggleNode = (role: VehicleSetupRole, nodeId: string): void => {
        setAssignments((current) => {
            const existing = current[role]?.nodeIds ?? [];
            const nodeIds = existing.includes(nodeId)
                ? existing.filter((id) => id !== nodeId)
                : [...existing, nodeId];
            return { ...current, [role]: { role, nodeIds } };
        });
        setSetupDirty(true);
    };

    const clearRole = (role: VehicleSetupRole): void => {
        setAssignments((current) => ({ ...current, [role]: { role, nodeIds: [] } }));
        setSetupDirty(true);
        onHighlightNodeIds([]);
    };

    const saveSetup = async (): Promise<void> => {
        if (conflicts.length > 0) return;
        setSetupSaving(true);
        await saveVehicleSetup({
            vehicleId: vehicle.id,
            assignments: assignments as Record<string, { role: string; nodeIds: string[] }>,
            updatedAt: Date.now()
        });
        setSetupSaving(false);
        setSetupDirty(false);
        setSetupStatus('Assignations enregistrées');
    };

    const highlightRole = useCallback((role: VehicleSetupRole): void => {
        onHighlightNodeIds(assignments[role]?.nodeIds ?? []);
    }, [assignments, onHighlightNodeIds]);

    return (
        <div className={`vehicle-settings-view${active ? ' is-active' : ''}`} aria-hidden={!active} onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
        }}>
            <div className="vehicle-settings-back-row">
                <button ref={backButtonRef} className="vehicle-settings-back" type="button" aria-label="Retour au menu principal" tabIndex={active ? 0 : -1} onClick={onClose}>Retour</button>
            </div>
            <section className="vehicle-settings-panel vehicle-settings-panel--drive" aria-labelledby="vehicle-settings-drive-title">
                <span className="showroom-kicker">Vehicle setup</span>
                <h2 id="vehicle-settings-drive-title">Detection map</h2>
                <div className="vehicle-setup-status" role="status" aria-live="polite">{setupStatus}</div>
                <div className="vehicle-setup-list">
                    {VEHICLE_SETUP_ROLES.map((role) => {
                        const selected = assignments[role.id]?.nodeIds ?? [];
                        const roleConflicts = conflictByRole.get(role.id) ?? [];
                        const expanded = openRole === role.id;
                        return (
                            <div className={`vehicle-setup-row${roleConflicts.length > 0 ? ' has-conflict' : ''}`} key={role.id} onMouseLeave={() => onHighlightNodeIds([])}>
                                <button
                                    className="vehicle-setup-role"
                                    type="button"
                                    aria-expanded={expanded}
                                    tabIndex={active ? 0 : -1}
                                    onClick={() => setOpenRole(expanded ? null : role.id)}
                                    onMouseEnter={() => highlightRole(role.id)}
                                    onFocus={() => highlightRole(role.id)}
                                >
                                    <span><strong>{role.shortLabel}</strong><small>{role.description}</small></span>
                                    <em>{summarizeSelection(selected, nodeById)}</em>
                                </button>
                                {expanded && (
                                    <div className="vehicle-setup-dropdown">
                                        <button className="vehicle-setup-clear" type="button" tabIndex={active ? 0 : -1} onClick={() => clearRole(role.id)}>Auto / aucun mesh</button>
                                        <div className="vehicle-setup-options">
                                            {selectableNodes.map((node) => (
                                                <label className="vehicle-setup-option" key={node.id} style={{ paddingLeft: `${0.65 + Math.min(node.depth, 5) * 0.45}rem` }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.includes(node.id)}
                                                        tabIndex={active ? 0 : -1}
                                                        onChange={() => toggleNode(role.id, node.id)}
                                                        onMouseEnter={() => onHighlightNodeIds([node.id])}
                                                        onFocus={() => onHighlightNodeIds([node.id])}
                                                    />
                                                    <span>{node.name}</span>
                                                    <small>{node.isMesh ? 'mesh' : `${node.meshNodeIds.length} meshes`}</small>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {roleConflicts.length > 0 && <div className="vehicle-setup-conflict">{roleConflicts[0]}</div>}
                            </div>
                        );
                    })}
                </div>
                <div className="vehicle-settings-stats__actions vehicle-setup-actions">
                    <button className="vehicle-settings-action vehicle-settings-action--cancel" type="button" disabled={!setupDirty || setupSaving} tabIndex={active ? 0 : -1} onClick={() => setOpenRole(null)}>Fermer</button>
                    <button className="vehicle-settings-action vehicle-settings-action--save" type="button" disabled={!setupDirty || setupSaving || conflicts.length > 0} tabIndex={active ? 0 : -1} onClick={saveSetup}>{setupSaving ? 'Enregistrement...' : 'Sauver mapping'}</button>
                </div>
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
                        <button className="vehicle-nav" type="button" aria-label="Véhicule suivant" disabled={transitionLocked} aria-disabled={transitionLocked} tabIndex={active ? 0 : -1} onClick={() => onVehicleChange(1)}>›</button>
                    </div>
                    <div className="vehicle-settings-stats__sliders">
                        {statKeys.map((key) => {
                            const stat = vehicle.stats[key];
                            const val = draft[key];
                            return <div className="stat-slider" key={key}><span className="stat-slider__label">{stat.label}</span><span className="stat-slider__value">{val}</span><input className="stat-slider__input" type="range" min={1} max={stat.max} step={1} value={val} tabIndex={active ? 0 : -1} aria-label={stat.label} aria-valuemin={1} aria-valuemax={stat.max} aria-valuenow={val} onChange={(e) => handleSlider(key, e.target.value)} /></div>;
                        })}
                    </div>
                    <div className="vehicle-settings-stats__actions">
                        <button className="vehicle-settings-action vehicle-settings-action--cancel" type="button" disabled={!dirty || saving} tabIndex={active ? 0 : -1} onClick={handleCancel}>Annuler</button>
                        <button className="vehicle-settings-action vehicle-settings-action--save" type="button" disabled={!dirty || saving} tabIndex={active ? 0 : -1} onClick={handleSave}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function mergeAssignments(autoAssignments: AssignmentMap, savedAssignments: AssignmentMap): AssignmentMap {
    const merged: AssignmentMap = {};
    VEHICLE_SETUP_ROLES.forEach((role) => {
        const saved = savedAssignments[role.id];
        merged[role.id] = saved && saved.nodeIds.length > 0 ? saved : autoAssignments[role.id] ?? { role: role.id, nodeIds: [] };
        if (role.id === 'collision' && saved) merged[role.id] = saved;
    });
    return merged;
}

function summarizeSelection(nodeIds: string[], nodeById: Map<string, VehicleSetupNode>): string {
    if (nodeIds.length === 0) return 'Auto';
    if (nodeIds.length === 1) return nodeById.get(nodeIds[0])?.name ?? '1 node';
    return `${nodeIds.length} nodes groupés`;
}

function roleLabel(role: VehicleSetupRole): string {
    return VEHICLE_SETUP_ROLES.find((item) => item.id === role)?.shortLabel ?? role;
}
