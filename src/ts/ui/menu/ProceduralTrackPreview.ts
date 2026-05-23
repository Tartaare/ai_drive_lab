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
        const mapPoint = (p: { x: number; z: number }) => ({
            x: 10 + ((p.x - minX) / width) * 80,
            y: 10 + ((p.z - minZ) / height) * 80
        });
        const mapped = points.map(mapPoint);
        const path = mapped.map((p, index) => {
            return (index === 0 ? 'M ' : 'L ') + p.x.toFixed(2) + ' ' + p.y.toFixed(2);
        }).join(' ') + ' Z';
        const start = mapped[0];
        const next = mapped[Math.min(3, mapped.length - 1)];
        const dx = next.x - start.x;
        const dy = next.y - start.y;
        const length = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
        const normalX = (-dy / length) * 4.4;
        const normalY = (dx / length) * 4.4;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const grid = '<path class="track-miniature__grid" d="M20 8 V92 M40 8 V92 M60 8 V92 M80 8 V92 M8 20 H92 M8 40 H92 M8 60 H92 M8 80 H92"></path>';
        const startLine = '<line class="track-miniature__start" x1="' + (start.x - normalX).toFixed(2) + '" y1="' + (start.y - normalY).toFixed(2) + '" x2="' + (start.x + normalX).toFixed(2) + '" y2="' + (start.y + normalY).toFixed(2) + '"></line>';
        const direction = '<polygon class="track-miniature__direction" points="0,-3.2 6,0 0,3.2" transform="translate(' + next.x.toFixed(2) + ' ' + next.y.toFixed(2) + ') rotate(' + angle.toFixed(2) + ')"></polygon>';
        return '<svg class="track-miniature" viewBox="0 0 100 100" role="img" aria-label="Miniature du circuit généré">' +
            grid +
            '<path class="track-miniature__halo" d="' + path + '"></path>' +
            '<path class="track-miniature__line" d="' + path + '"></path>' +
            startLine +
            direction +
            '</svg>';
    }

    private randomSeed(): number {
        return Math.floor(Math.random() * 1000000);
    }
}
