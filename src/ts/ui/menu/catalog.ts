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

const stat = (label: string, value: number): VehicleStat => ({
    label,
    value,
    unit: '',
    max: 100
});

export const VEHICLES: VehicleDefinition[] = [
    {
        id: 'car_blue_small',
        name: 'Apex S-12',
        modelPath: 'car_models/car_blue_small.glb',
        stats: {
            topSpeed: stat('Vitesse', 74),
            acceleration: stat('Accélération', 76),
            handling: stat('Maniabilité', 86),
            braking: stat('Freinage', 82),
            weight: stat('Légèreté', 88),
            grip: stat('Adhérence', 84)
        }
    },
    {
        id: 'car_orange',
        name: 'Apex R-40',
        modelPath: 'car_models/car_orange.glb',
        stats: {
            topSpeed: stat('Vitesse', 84),
            acceleration: stat('Accélération', 84),
            handling: stat('Maniabilité', 78),
            braking: stat('Freinage', 80),
            weight: stat('Légèreté', 76),
            grip: stat('Adhérence', 79)
        }
    },
    {
        id: 'car_red',
        name: 'Apex GT-7',
        modelPath: 'car_models/car_red.glb',
        stats: {
            topSpeed: stat('Vitesse', 91),
            acceleration: stat('Accélération', 88),
            handling: stat('Maniabilité', 73),
            braking: stat('Freinage', 76),
            weight: stat('Légèreté', 65),
            grip: stat('Adhérence', 77)
        }
    },
    {
        id: 'ferrari_testarossa_84',
        name: 'Testarossa 84',
        modelPath: 'car_models/ferrari_testarossa_84_low_poly.glb',
        stats: {
            topSpeed: stat('Vitesse', 86),
            acceleration: stat('Accélération', 66),
            handling: stat('Maniabilité', 68),
            braking: stat('Freinage', 70),
            weight: stat('Légèreté', 62),
            grip: stat('Adhérence', 72)
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
