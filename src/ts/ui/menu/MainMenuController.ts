import {
    GAME_MODES,
    TRACKS,
    VEHICLES,
    GameModeDefinition,
    TrackDefinition,
    VehicleDefinition
} from './catalog';
import { VehiclePreview } from './VehiclePreview';
import * as AppStorage from '../../core/AppStorage';
import { ProceduralTrackPreview } from './ProceduralTrackPreview';
import { createModeButton, renderVehicleStats } from './renderers';
import { TrackConfig } from '../../world/ProceduralTrack';
export interface MainMenuSelection {
    vehicleId: string;
    vehicleModelPath: string;
    modeId: string;
    trackId: string;
    levelId: string;
    isValid: boolean;
    procedural: {
        seed: number;
        difficulty: string;
        config: TrackConfig;
        lengthMeters: number;
    } | null;
}

export interface MainMenuControllerOptions {
    root: HTMLElement;
    getTheme: () => 'dark' | 'light';
    initialTrackConfig?: AppStorage.PersistedTrackConfig | null;
}

export class MainMenuController {
    private readonly root: HTMLElement;
    private readonly getTheme: () => 'dark' | 'light';
    private readonly preview: VehiclePreview;
    private readonly modeList: HTMLElement;
    private readonly vehicleName: HTMLElement;
    private readonly vehicleProfile: HTMLElement;
    private readonly statList: HTMLElement;
    private readonly trackPreview: HTMLElement;
    private readonly startBtn: HTMLButtonElement;
    private readonly hiddenLevelSelect: HTMLSelectElement | null;
    private readonly proceduralPreview: ProceduralTrackPreview;
    private vehicleIndex = 0;
    private modeId: GameModeDefinition['id'] = 'free_roam';
    private trackAvailability: { [id: string]: boolean } = { procedural: true, grand_prix: false };
    private renderedVehicleId = '';
    private previousVehicle: VehicleDefinition | null = null;

    constructor(options: MainMenuControllerOptions) {
        this.root = options.root;
        this.getTheme = options.getTheme;
        this.modeList = this.required('showroom-mode-list');
        this.vehicleName = this.required('showroom-vehicle-name');
        this.vehicleProfile = this.required('showroom-vehicle-profile');
        this.statList = this.required('showroom-vehicle-stats');
        this.trackPreview = this.required('showroom-track-preview');
        this.startBtn = this.required('start-game') as HTMLButtonElement;
        this.hiddenLevelSelect = document.getElementById('main-menu-level-select') as HTMLSelectElement | null;
        const stage = this.required('vehicle-preview-stage');
        const status = this.required('vehicle-preview-status');
        this.preview = new VehiclePreview(stage, status);
        this.proceduralPreview = new ProceduralTrackPreview(options.initialTrackConfig);
    }

    public async init(): Promise<void> {
        this.bindEvents();
        this.renderModes();
        this.restorePrefs();
        this.preview.setTheme(this.getTheme());
        await this.checkGrandPrixAvailability();
        this.render();
    }

    public getSelection(): MainMenuSelection {
        const vehicle = this.getVehicle();
        const mode = this.getMode();
        const track = mode.trackId ? this.getTrack(mode.trackId) : null;
        const isValid = !!track && this.isModeEnabled(mode);
        return {
            vehicleId: vehicle.id,
            vehicleModelPath: vehicle.modelPath,
            modeId: mode.id,
            trackId: track ? track.id : 'none',
            levelId: track ? track.levelId : 'procedural',
            isValid,
            procedural: track && track.id === 'procedural' ? this.proceduralPreview.getSelection() : null
        };
    }

    public updateTheme(): void {
        this.preview.setTheme(this.getTheme());
    }

    private bindEvents(): void {
        const prev = document.getElementById('vehicle-prev');
        const next = document.getElementById('vehicle-next');
        if (prev) prev.addEventListener('click', () => this.changeVehicle(-1));
        if (next) next.addEventListener('click', () => this.changeVehicle(1));
        document.addEventListener('apex-theme-change', () => this.updateTheme());
        this.trackPreview.addEventListener('click', async (event) => {
            const target = event.target as HTMLElement;
            if (!target || target.dataset.action !== 'new-track') return;
            target.setAttribute('aria-busy', 'true');
            await this.nextPaint();
            this.proceduralPreview.randomize();
            this.persistSelection();
            target.setAttribute('aria-busy', 'false');
            this.renderTrack();
        });
    }

    private restorePrefs(): void {
        AppStorage.getPrefs().then((prefs) => {
            if (!prefs) return;
            const vehicleIndex = VEHICLES.findIndex((vehicle) => vehicle.id === prefs.vehicleId);
            if (vehicleIndex >= 0) this.vehicleIndex = vehicleIndex;
            this.modeId = prefs.levelId === 'default' ? 'time_trial' : 'free_roam';
            if (!this.isModeEnabled(this.getMode())) this.modeId = 'free_roam';
            this.render();
        }).catch(() => undefined);
    }

    private async checkGrandPrixAvailability(): Promise<void> {
        const grandPrix = this.getTrack('grand_prix');
        if (!grandPrix.assetPath || typeof fetch !== 'function') return;
        try {
            const response = await fetch(grandPrix.assetPath, { method: 'HEAD', cache: 'no-store' });
            this.trackAvailability.grand_prix = response.ok;
        } catch {
            this.trackAvailability.grand_prix = false;
        }
        if (!this.isModeEnabled(this.getMode())) this.modeId = 'free_roam';
    }

    private render(): void {
        const selection = this.getSelection();
        if (this.hiddenLevelSelect) this.hiddenLevelSelect.value = selection.levelId;
        this.startBtn.disabled = !selection.isValid;
        this.startBtn.setAttribute('aria-disabled', String(!selection.isValid));
        this.renderModes();
        this.renderVehicle(0);
        this.renderTrack();
    }

    private renderModes(): void {
        this.modeList.innerHTML = '';
        GAME_MODES.forEach((mode) => {
            const enabled = this.isModeEnabled(mode);
            this.modeList.appendChild(createModeButton(mode, this.getModeMeta(mode), mode.id === this.modeId, enabled, () => {
                this.modeId = mode.id;
                this.persistSelection();
                this.render();
            }));
        });
    }

    private renderVehicle(direction: -1 | 0 | 1): void {
        const vehicle = this.getVehicle();
        const comparisonVehicle = direction === 0 ? null : this.previousVehicle;
        this.vehicleName.textContent = vehicle.name;
        this.vehicleProfile.textContent = vehicle.profile;
        renderVehicleStats(this.statList, vehicle, comparisonVehicle);
        if (this.renderedVehicleId !== vehicle.id || direction !== 0) {
            this.renderedVehicleId = vehicle.id;
            this.preview.setVehicle(vehicle, direction);
        }
        this.previousVehicle = vehicle;
        this.preview.preload(this.getAdjacentVehicles());
    }

    private renderTrack(): void {
        const selection = this.getSelection();
        const track = this.getTrack(selection.trackId === 'grand_prix' ? 'grand_prix' : 'procedural');
        const isGrandPrixUnavailable = track.id === 'grand_prix' && !this.trackAvailability.grand_prix;
        this.trackPreview.classList.toggle('is-disabled', isGrandPrixUnavailable);
        if (track.id === 'procedural') {
            this.trackPreview.innerHTML = this.proceduralPreview.render(track);
            return;
        }
        this.trackPreview.innerHTML =
            '<div class="track-miniature track-miniature--empty">GP</div>' +
            '<div class="track-panel__body"><span class="track-panel__label">' + track.label + '</span>' +
            '<strong>Indisponible</strong><span>' + (track.unavailableReason || 'Asset absent') + '</span></div>';
    }

    private changeVehicle(direction: -1 | 1): void {
        this.vehicleIndex = (this.vehicleIndex + direction + VEHICLES.length) % VEHICLES.length;
        this.persistSelection();
        this.renderVehicle(direction);
    }

    private persistSelection(): void {
        const selection = this.getSelection();
        AppStorage.savePrefs({
            vehicleId: selection.vehicleId,
            levelId: selection.levelId,
            theme: this.getTheme()
        }).catch(() => undefined);
        if (selection.procedural) {
            AppStorage.saveTrackConfig({
                ...selection.procedural.config,
                difficulty: selection.procedural.difficulty,
                seed: selection.procedural.seed
            }).catch(() => undefined);
        }
    }

    private isModeEnabled(mode: GameModeDefinition): boolean {
        if (mode.unavailableReason || !mode.trackId) return false;
        return this.trackAvailability[mode.trackId] === true;
    }

    private getModeMeta(mode: GameModeDefinition): string {
        if (mode.unavailableReason) return mode.unavailableReason;
        if (mode.trackId === 'grand_prix' && !this.trackAvailability.grand_prix) return 'Asset absent';
        return mode.description;
    }

    private getVehicle(): VehicleDefinition {
        return VEHICLES[this.vehicleIndex] || VEHICLES[0];
    }

    private getAdjacentVehicles(): VehicleDefinition[] {
        const prev = (this.vehicleIndex - 1 + VEHICLES.length) % VEHICLES.length;
        const next = (this.vehicleIndex + 1) % VEHICLES.length;
        return [VEHICLES[prev], VEHICLES[next]];
    }

    private getMode(): GameModeDefinition {
        return GAME_MODES.find((mode) => mode.id === this.modeId) || GAME_MODES[0];
    }

    private getTrack(id: string): TrackDefinition {
        return TRACKS.find((track) => track.id === id) || TRACKS[0];
    }

    private nextPaint(): Promise<void> {
        return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }

    private required(id: string): HTMLElement {
        const element = document.getElementById(id);
        if (!element) throw new Error('Missing showroom element #' + id);
        return element;
    }
}
