import { PersistedTrackConfig, SavedCircuit } from '../../core/AppStorage';
import { TrackConfig } from '../../world/ProceduralTrack';
import { ProceduralParamKey } from '../types';

interface SettingsPanelProps {
    active: boolean;
    config: TrackConfig;
    difficulty: string;
    pending: boolean;
    favorites: SavedCircuit[];
    onClose: () => void;
    onRegenerate: () => void;
    onDifficultyChange: (difficulty: string) => void;
    onParameterChange: (key: ProceduralParamKey, value: number) => void;
    onSaveFavorite: () => void;
    onLoadFavorite: (config: PersistedTrackConfig) => void;
    onDeleteFavorite: (id: number) => void;
}

const MAX_FAVORITES = 10;

export function SettingsPanel(props: SettingsPanelProps): JSX.Element {
    return (
        <div id="settings-panel" className={`settings-panel${props.active ? ' active' : ''}`}>
            <div className="settings-header"><h3>TRACK CONFIGURATION</h3><button id="close-settings" className="close-btn" type="button" aria-label="Fermer la configuration de piste" onClick={props.onClose}>×</button></div>
            <button id="proc-regenerate" className="cyber-btn" type="button" disabled={props.pending} aria-busy={props.pending} onClick={props.onRegenerate}>GENERATE NEW TRACK</button>
            <div id="proc-generation-log" className="track-generation-log" role="status" aria-live="polite" hidden={!props.pending}>{props.pending ? 'Génération du circuit...' : ''}</div>
            <div className="slider-group slider-group--difficulty"><div className="slider-label"><span>DIFFICULTY PRESET</span></div><select id="proc-difficulty" className="cyber-select" value={props.difficulty} onChange={(event) => props.onDifficultyChange(event.target.value)}><option value="facile">EASY</option><option value="moyen">MEDIUM</option><option value="difficile">HARD</option><option value="expert">EXPERT</option><option value="vraiment_difficile">NIGHTMARE</option><option value="custom">CUSTOM (MANUAL)</option></select></div>
            <RangeControl label="COMPLEXITY" id="proc-numControlPoints" value={props.config.numControlPoints} min={6} max={20} step={1} onChange={(value) => props.onParameterChange('numControlPoints', value)} />
            <RangeControl label="SCALE" id="proc-baseRadius" value={props.config.baseRadius} min={30} max={150} step={1} onChange={(value) => props.onParameterChange('baseRadius', value)} />
            <RangeControl label="CHAOS" id="proc-radiusVariation" value={Math.round(props.config.radiusVariation * 100)} min={0} max={100} step={1} suffix="%" onChange={(value) => props.onParameterChange('radiusVariation', value / 100)} />
            <RangeControl label="TWIST" id="proc-angleVariation" value={Math.round(props.config.angleVariation * 100)} min={0} max={100} step={1} suffix="%" onChange={(value) => props.onParameterChange('angleVariation', value / 100)} />
            <RangeControl label="WIDTH" id="proc-trackWidth" value={props.config.trackWidth} min={5} max={30} step={1} onChange={(value) => props.onParameterChange('trackWidth', value)} />
            <div className="settings-section-divider" />
            <div className="slider-label fav-heading">SAVED CIRCUITS <span id="fav-count" className="fav-count">{props.favorites.length}/{MAX_FAVORITES}</span></div>
            <button id="fav-save-btn" className="cyber-btn fav-save-btn" type="button" disabled={props.favorites.length >= MAX_FAVORITES} onClick={props.onSaveFavorite}>★ SAVE THIS CIRCUIT</button>
            <div id="fav-list" className="fav-list" aria-live="polite">
                {props.favorites.length === 0 ? <div className="fav-empty">No saved circuits yet.</div> : props.favorites.map((item) => <div className="fav-item" key={item.id}><span className="fav-item__name">{item.name}</span><span className="fav-item__meta">{item.difficulty.toUpperCase()}</span><button className="fav-item__btn" type="button" onClick={() => props.onLoadFavorite(item.config)}>LOAD</button><button className="fav-item__btn fav-item__btn--delete" type="button" aria-label={`Supprimer ${item.name}`} onClick={() => item.id !== undefined && props.onDeleteFavorite(item.id)}>×</button></div>)}
            </div>
        </div>
    );
}

function RangeControl({ label, id, value, min, max, step, suffix = '', onChange }: { label: string; id: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void; }): JSX.Element {
    return <div className="slider-group"><div className="slider-label"><span>{label}</span> <span className="slider-value" id={`${id}-value`}>{value}{suffix}</span></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}
