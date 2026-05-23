import { TrackConfig, defaultTrackConfig } from '../../world/ProceduralTrack';

export type VehicleStatKey =
    | 'topSpeed'
    | 'acceleration'
    | 'handling'
    | 'braking'
    | 'weight'
    | 'grip';

export interface VehicleStat {
    label: string;
    value: number;
    unit: string;
    max: number;
}

export interface VehicleDefinition {
    id: string;
    name: string;
    modelPath: string;
    profile: string;
    stats: Record<VehicleStatKey, VehicleStat>;
}

export interface GameModeDefinition {
    id: 'free_roam' | 'time_trial' | 'ai';
    label: string;
    description: string;
    trackId: 'procedural' | 'grand_prix' | null;
    unavailableReason?: string;
}

export interface TrackDefinition {
    id: 'procedural' | 'grand_prix';
    label: string;
    levelId: 'procedural' | 'default';
    assetPath?: string;
    difficulty: string;
    unavailableReason?: string;
}

const stat = (label: string, value: number, unit: string, max: number): VehicleStat => ({
    label,
    value,
    unit,
    max
});

export const VEHICLES: VehicleDefinition[] = [
    {
        id: 'car_blue_small',
        name: 'Apex S-12',
        modelPath: 'car_models/car_blue_small.glb',
        profile: 'Compact response chassis',
        stats: {
            topSpeed: stat('Vitesse max', 238, 'km/h', 320),
            acceleration: stat('Accélération', 4.7, 's', 8),
            handling: stat('Maniabilité', 86, '', 100),
            braking: stat('Freinage', 82, '', 100),
            weight: stat('Poids', 1180, 'kg', 1800),
            grip: stat('Adhérence', 84, '', 100)
        }
    },
    {
        id: 'car_orange',
        name: 'Apex R-40',
        modelPath: 'car_models/car_orange.glb',
        profile: 'Balanced road prototype',
        stats: {
            topSpeed: stat('Vitesse max', 268, 'km/h', 320),
            acceleration: stat('Accélération', 4.1, 's', 8),
            handling: stat('Maniabilité', 78, '', 100),
            braking: stat('Freinage', 80, '', 100),
            weight: stat('Poids', 1340, 'kg', 1800),
            grip: stat('Adhérence', 79, '', 100)
        }
    },
    {
        id: 'car_red',
        name: 'Apex GT-7',
        modelPath: 'car_models/car_red.glb',
        profile: 'High-speed grand tourer',
        stats: {
            topSpeed: stat('Vitesse max', 292, 'km/h', 320),
            acceleration: stat('Accélération', 3.8, 's', 8),
            handling: stat('Maniabilité', 73, '', 100),
            braking: stat('Freinage', 76, '', 100),
            weight: stat('Poids', 1480, 'kg', 1800),
            grip: stat('Adhérence', 77, '', 100)
        }
    },
    {
        id: 'ferrari_testarossa_84',
        name: 'Testarossa 84',
        modelPath: 'car_models/ferrari_testarossa_84_low_poly.glb',
        profile: 'Classic low-poly icon',
        stats: {
            topSpeed: stat('Vitesse max', 276, 'km/h', 320),
            acceleration: stat('Accélération', 5.3, 's', 8),
            handling: stat('Maniabilité', 68, '', 100),
            braking: stat('Freinage', 70, '', 100),
            weight: stat('Poids', 1506, 'kg', 1800),
            grip: stat('Adhérence', 72, '', 100)
        }
    }
];

export const GAME_MODES: GameModeDefinition[] = [
    {
        id: 'free_roam',
        label: 'Free roam',
        description: 'Circuit procédural ouvert',
        trackId: 'procedural'
    },
    {
        id: 'time_trial',
        label: 'Contre la montre',
        description: 'Grand Prix chronométré',
        trackId: 'grand_prix'
    },
    {
        id: 'ai',
        label: 'AI',
        description: 'Module à venir',
        trackId: null,
        unavailableReason: 'Indisponible'
    }
];

export const TRACKS: TrackDefinition[] = [
    {
        id: 'procedural',
        label: 'Procedural loop',
        levelId: 'procedural',
        difficulty: 'Moyen'
    },
    {
        id: 'grand_prix',
        label: 'Grand Prix Circuit',
        levelId: 'default',
        assetPath: 'race_tracks/Cartoon_Track1.glb',
        difficulty: 'Standard',
        unavailableReason: 'Asset absent'
    }
];

export const DEFAULT_PROCEDURAL_CONFIG: TrackConfig = { ...defaultTrackConfig };
