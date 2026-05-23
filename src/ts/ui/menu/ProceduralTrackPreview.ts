import { TrackConfig, TrackData, generateTrack } from '../../world/ProceduralTrack';
import { DEFAULT_PROCEDURAL_CONFIG, TrackDefinition } from './catalog';
import * as AppStorage from '../../core/AppStorage';

export interface ProceduralSelection {
    seed: number;
    difficulty: string;
    config: TrackConfig;
    lengthMeters: number;
}

export class ProceduralTrackPreview {
    private config: TrackConfig;
    private seed: number;
    private difficulty: string;
    private track: TrackData | null = null;

    constructor(initial?: AppStorage.PersistedTrackConfig | null) {
        this.config = {
            ...DEFAULT_PROCEDURAL_CONFIG,
            ...(initial ? {
                numControlPoints: initial.numControlPoints,
                baseRadius: initial.baseRadius,
                radiusVariation: initial.radiusVariation,
                angleVariation: initial.angleVariation,
                trackWidth: initial.trackWidth
            } : {})
        };
        this.seed = initial && Number.isFinite(initial.seed) ? initial.seed : this.randomSeed();
        this.difficulty = initial && initial.difficulty ? initial.difficulty : 'moyen';
        this.refresh();
    }

    public randomize(): void {
        this.seed = this.randomSeed();
        this.refresh();
    }

    public getSelection(): ProceduralSelection {
        return {
            seed: this.seed,
            difficulty: this.difficulty,
            config: { ...this.config },
            lengthMeters: this.getLength()
        };
    }

    public render(track: TrackDefinition): string {
        const length = Math.round(this.getLength());
        return this.buildSvg() +
            '<div class="track-panel__body"><span class="track-panel__label">' + track.label + '</span>' +
            '<strong>' + length + ' m</strong><span>Difficulté ' + this.difficulty.toUpperCase() + '</span>' +
            '<span>Seed ' + this.seed + '</span></div>' +
            '<button class="track-new-btn" type="button" data-action="new-track">New Track</button>';
    }

    private refresh(): void {
        this.track = generateTrack({
            ...this.config,
            seed: this.seed,
            difficulty: this.difficulty
        });
    }

    private getLength(): number {
        return this.track && this.track.qaReport ? this.track.qaReport.length : 0;
    }

    private buildSvg(): string {
        const points = this.track ? this.track.centerPoints : [];
        if (points.length < 2) return '<div class="track-miniature track-miniature--empty">No track</div>';
        const xs = points.map((p) => p.x);
        const zs = points.map((p) => p.z);
        const minX = Math.min.apply(Math, xs);
        const maxX = Math.max.apply(Math, xs);
        const minZ = Math.min.apply(Math, zs);
        const maxZ = Math.max.apply(Math, zs);
        const width = Math.max(maxX - minX, 1);
        const height = Math.max(maxZ - minZ, 1);
        const path = points.map((p, index) => {
            const x = 10 + ((p.x - minX) / width) * 80;
            const y = 10 + ((p.z - minZ) / height) * 80;
            return (index === 0 ? 'M ' : 'L ') + x.toFixed(2) + ' ' + y.toFixed(2);
        }).join(' ') + ' Z';
        return '<svg class="track-miniature" viewBox="0 0 100 100" role="img" aria-label="Miniature du circuit généré">' +
            '<path class="track-miniature__line" d="' + path + '"></path></svg>';
    }

    private randomSeed(): number {
        return Math.floor(Math.random() * 1000000);
    }
}
