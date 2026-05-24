import { useMemo } from 'react';
import { generateTrack, TrackConfig, TrackData } from '../../world/ProceduralTrack';

interface TrackMiniatureProps {
    config: TrackConfig;
    seed: number;
    difficulty: string;
}

// Cache global pour éviter les régénérations avec les mêmes paramètres
const trackCache = new Map<string, TrackData>();

function getCacheKey(config: TrackConfig, seed: number, difficulty: string): string {
    return `${seed}-${difficulty}-${config.numControlPoints}-${config.baseRadius}-${config.radiusVariation}-${config.angleVariation}-${config.trackWidth}`;
}

function getCachedTrack(config: TrackConfig, seed: number, difficulty: string): TrackData {
    const key = getCacheKey(config, seed, difficulty);
    if (trackCache.has(key)) {
        return trackCache.get(key)!;
    }
    const track = generateTrack({ ...config, seed, difficulty });
    trackCache.set(key, track);
    return track;
}

export function getProceduralLength(config: TrackConfig, seed: number, difficulty: string): number {
    const track = getCachedTrack(config, seed, difficulty);
    return track.qaReport ? track.qaReport.length : 0;
}

export function TrackMiniature({ config, seed, difficulty }: TrackMiniatureProps): JSX.Element {
    const track = useMemo(() => getCachedTrack(config, seed, difficulty), [config, seed, difficulty]);
    const points = track.centerPoints;

    if (points.length < 2) {
        return <div className="track-miniature track-miniature--empty">No track</div>;
    }

    const xs = points.map((p) => p.x);
    const zs = points.map((p) => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxZ - minZ, 1);
    const mapped = points.map((p) => ({
        x: 10 + ((p.x - minX) / width) * 80,
        y: 10 + ((p.z - minZ) / height) * 80
    }));
    const path = mapped.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
    const start = mapped[0];
    const next = mapped[Math.min(3, mapped.length - 1)];
    const dx = next.x - start.x;
    const dy = next.y - start.y;
    const length = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
    const normalX = (-dy / length) * 4.4;
    const normalY = (dx / length) * 4.4;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    return (
        <svg className="track-miniature" viewBox="0 0 100 100" role="img" aria-label="Miniature du circuit généré">
            <path className="track-miniature__grid" d="M20 8 V92 M40 8 V92 M60 8 V92 M80 8 V92 M8 20 H92 M8 40 H92 M8 60 H92 M8 80 H92" />
            <path className="track-miniature__halo" d={path} />
            <path className="track-miniature__line" d={path} />
            <line className="track-miniature__start" x1={(start.x - normalX).toFixed(2)} y1={(start.y - normalY).toFixed(2)} x2={(start.x + normalX).toFixed(2)} y2={(start.y + normalY).toFixed(2)} />
            <polygon className="track-miniature__direction" points="0,-3.2 6,0 0,3.2" transform={`translate(${next.x.toFixed(2)} ${next.y.toFixed(2)}) rotate(${angle.toFixed(2)})`} />
        </svg>
    );
}
