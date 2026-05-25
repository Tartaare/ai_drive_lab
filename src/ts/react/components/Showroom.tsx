import { MutableRefObject, useMemo, useState } from 'react';
import { GAME_MODES, TRACKS, VEHICLES, GameModeDefinition, VehicleDefinition, VehicleStatKey } from '../../ui/menu/catalog';
import { TrackConfig } from '../../world/ProceduralTrack';
import { ThemeName } from '../types';
import { getProceduralLength, TrackMiniature } from './TrackMiniature';
import { VehiclePreviewStage } from './VehiclePreviewStage';
import { AnimatedNumber } from './AnimatedNumber';
import { AnimatedStatBar } from './AnimatedStatBar';
import { ShowroomVehicleHandle } from './ShowroomVehicleCanvas';
import { VehicleSettingsView } from './VehicleSettingsView';
import { Wrench } from './icons/Wrench';

interface ShowroomProps {
    theme: ThemeName;
    vehicleIndex: number;
    modeId: GameModeDefinition['id'];
    vehicleDirection: -1 | 0 | 1;
    transitionLocked: boolean;
    trackAvailability: Record<string, boolean>;
    proceduralConfig: TrackConfig;
    proceduralSeed: number;
    proceduralDifficulty: string;
    previewRef: MutableRefObject<ShowroomVehicleHandle | null>;
    onThemeToggle: () => void;
    onModeSelect: (modeId: GameModeDefinition['id']) => void;
    onVehicleChange: (direction: -1 | 1) => void;
    onNewTrack: () => void;
    onStart: () => void;
    onTransitionChange: (locked: boolean) => void;
}

export function Showroom(props: ShowroomProps): JSX.Element {
    const [vehicleSettingsOpen, setVehicleSettingsOpen] = useState(false);
    const vehicle = VEHICLES[props.vehicleIndex] || VEHICLES[0];
    const previousIndex = (props.vehicleIndex - props.vehicleDirection + VEHICLES.length) % VEHICLES.length;
    const previousVehicle = props.vehicleDirection === 0 ? null : VEHICLES[previousIndex];
    const mode = GAME_MODES.find((item) => item.id === props.modeId) || GAME_MODES[0];
    const track = mode.trackId ? TRACKS.find((item) => item.id === mode.trackId) || TRACKS[0] : null;
    const isValid = !!track && isModeEnabled(mode, props.trackAvailability);
    const adjacentVehicles = useMemo(() => {
        const prev = (props.vehicleIndex - 1 + VEHICLES.length) % VEHICLES.length;
        const next = (props.vehicleIndex + 1) % VEHICLES.length;
        return [VEHICLES[prev], VEHICLES[next]];
    }, [props.vehicleIndex]);
    const proceduralLength = useMemo(() => Math.round(getProceduralLength(props.proceduralConfig, props.proceduralSeed, props.proceduralDifficulty)), [props.proceduralConfig, props.proceduralSeed, props.proceduralDifficulty]);
    const isLight = props.theme === 'light';

    return (
        <div id="main-menu" className={`menu-overlay${vehicleSettingsOpen ? ' is-vehicle-settings' : ''}`}>
            <div className="showroom-brand" aria-label="APEX Physics Driving Simulation" aria-hidden={vehicleSettingsOpen}>
                <span className="showroom-brand__mark">APEX</span>
                <span className="showroom-brand__line">Physics Driving Simulation</span>
            </div>
            <button id="theme-toggle" className="theme-toggle" type="button" aria-label={isLight ? 'Activer le thème sombre' : 'Activer le thème clair'} aria-pressed={isLight} tabIndex={vehicleSettingsOpen ? -1 : 0} onClick={props.onThemeToggle}>
                <span className="theme-toggle__track" aria-hidden="true"><span className="theme-toggle__orb"><span className="theme-toggle__icon theme-toggle__icon--sun">☀</span><span className="theme-toggle__icon theme-toggle__icon--moon">☾</span></span></span>
            </button>
            <select id="main-menu-level-select" hidden aria-hidden="true" tabIndex={-1} value={track ? track.levelId : 'procedural'} onChange={() => undefined}>
                <option value="default">GRAND PRIX CIRCUIT</option>
                <option value="procedural">INFINITE PROCEDURAL</option>
            </select>
            <div className={`showroom-shell${vehicleSettingsOpen ? ' is-configuring-vehicle' : ''}`}>
                <section className="showroom-modes" aria-labelledby="showroom-modes-title" aria-hidden={vehicleSettingsOpen}>
                    <span className="showroom-kicker">Drive mode</span>
                    <h2 id="showroom-modes-title">Session</h2>
                    <div id="showroom-mode-list" className="showroom-mode-list">
                        {GAME_MODES.map((item) => <ModeButton key={item.id} mode={item} active={item.id === props.modeId} enabled={isModeEnabled(item, props.trackAvailability)} availability={props.trackAvailability} tabIndex={vehicleSettingsOpen ? -1 : 0} onClick={() => props.onModeSelect(item.id)} />)}
                    </div>
                </section>
                <section className="showroom-vehicle" aria-labelledby="showroom-vehicle-name">
                    <VehiclePreviewStage vehicle={vehicle} adjacentVehicles={adjacentVehicles} direction={props.vehicleDirection} theme={props.theme} previewRef={props.previewRef} onTransitionChange={props.onTransitionChange} />
                    <div className="vehicle-info" aria-hidden={vehicleSettingsOpen}>
                        <div className="vehicle-info__glass">
                            <div className="vehicle-selector">
                                <button id="vehicle-prev" className="vehicle-nav" type="button" aria-label="Véhicule précédent" disabled={props.transitionLocked} aria-disabled={props.transitionLocked} tabIndex={vehicleSettingsOpen ? -1 : 0} onClick={() => props.onVehicleChange(-1)}>‹</button>
                                <div className="vehicle-title"><h2 id="showroom-vehicle-name">{vehicle.name}</h2></div>
                                <button className="vehicle-settings-trigger" type="button" aria-label="Ouvrir les réglages du véhicule" aria-pressed={vehicleSettingsOpen} tabIndex={vehicleSettingsOpen ? -1 : 0} onClick={() => setVehicleSettingsOpen(true)}>
                                    <Wrench size={18} strokeWidth={2.1} aria-hidden="true" />
                                </button>
                                <button id="vehicle-next" className="vehicle-nav" type="button" aria-label="Véhicule suivant" disabled={props.transitionLocked} aria-disabled={props.transitionLocked} tabIndex={vehicleSettingsOpen ? -1 : 0} onClick={() => props.onVehicleChange(1)}>›</button>
                            </div>
                            <div id="showroom-vehicle-stats" className="vehicle-stats" aria-label="Caractéristiques véhicule" aria-hidden={vehicleSettingsOpen}>
                                <VehicleStats vehicle={vehicle} previousVehicle={previousVehicle} />
                            </div>
                        </div>
                        <button id="start-game" className="cyber-btn showroom-start showroom-start--ready" type="button" disabled={!isValid || vehicleSettingsOpen} aria-disabled={!isValid || vehicleSettingsOpen} aria-hidden={vehicleSettingsOpen} tabIndex={vehicleSettingsOpen ? -1 : 0} onClick={props.onStart}>START ENGINE <span aria-hidden="true">›</span></button>
                    </div>
                </section>
                <section className="showroom-track" aria-labelledby="showroom-track-title" aria-hidden={vehicleSettingsOpen}>
                    <span className="showroom-kicker">Circuit</span>
                    <h2 id="showroom-track-title">Track preview</h2>
                    <div id="showroom-track-preview" className={`track-panel${track && track.id === 'grand_prix' && !props.trackAvailability.grand_prix ? ' is-disabled' : ''}`} aria-live="polite">
                        {track && track.id === 'procedural' ? <><TrackMiniature config={props.proceduralConfig} seed={props.proceduralSeed} difficulty={props.proceduralDifficulty} /><div className="track-panel__body"><span className="track-panel__label">{track.label}</span><strong>{proceduralLength} m</strong><span>Difficulté {props.proceduralDifficulty.toUpperCase()}</span><span>Seed {props.proceduralSeed}</span></div><button className="track-new-btn" type="button" tabIndex={vehicleSettingsOpen ? -1 : 0} onClick={props.onNewTrack}>New Track</button></> : <><div className="track-miniature track-miniature--empty">GP</div><div className="track-panel__body"><span className="track-panel__label">{track ? track.label : 'No track'}</span><strong>Indisponible</strong><span>{track ? track.unavailableReason || 'Asset absent' : 'Mode indisponible'}</span></div></>}
                    </div>
                </section>
                <VehicleSettingsView active={vehicleSettingsOpen} onClose={() => setVehicleSettingsOpen(false)} />
            </div>
        </div>
    );
}

function ModeButton({ mode, active, enabled, availability, tabIndex, onClick }: { mode: GameModeDefinition; active: boolean; enabled: boolean; availability: Record<string, boolean>; tabIndex: number; onClick: () => void; }): JSX.Element {
    const meta = mode.unavailableReason || (mode.trackId === 'grand_prix' && !availability.grand_prix ? 'Asset absent' : mode.description);
    return <button className="showroom-mode" type="button" aria-pressed={active} disabled={!enabled} tabIndex={tabIndex} onClick={onClick}><span className="showroom-mode__label">{mode.label}</span><span className="showroom-mode__meta">{meta}</span></button>;
}

function VehicleStats({ vehicle, previousVehicle }: { vehicle: VehicleDefinition; previousVehicle: VehicleDefinition | null; }): JSX.Element {
    return <>{(Object.keys(vehicle.stats) as VehicleStatKey[]).map((key) => {
        const stat = vehicle.stats[key];
        const previous = previousVehicle ? previousVehicle.stats[key] : null;
        const delta = previous ? stat.value - previous.value : 0;
        const deltaClass = delta > 0 ? ' vehicle-stat__delta--up' : delta < 0 ? ' vehicle-stat__delta--down' : '';
        return <div className="vehicle-stat" key={key}>
            <span className="vehicle-stat__label">{stat.label}</span>
            <div className="vehicle-stat__meter">
                <AnimatedStatBar 
                    value={stat.value} 
                    maxValue={stat.max} 
                />
                <AnimatedNumber 
                    value={stat.value} 
                    className="vehicle-stat__score"
                />
            </div>
            <span className={`vehicle-stat__delta${deltaClass}`} aria-hidden="true">
                {delta > 0 ? '▲' : delta < 0 ? '▼' : ''}
            </span>
        </div>;
    })}</>;
}

function isModeEnabled(mode: GameModeDefinition, availability: Record<string, boolean>): boolean {
    if (mode.unavailableReason || !mode.trackId) return false;
    return availability[mode.trackId] === true;
}
