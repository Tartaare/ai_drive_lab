import { TrackConfig } from '../world/ProceduralTrack';

export type ThemeName = 'dark' | 'light';
export type AppPhase = 'loading' | 'menu' | 'driving';

export interface TelemetryState {
    speed: number;
    gear: string;
    transmission: 'AUTO' | 'MAN';
    rpm: number;
    maxRpm: number;
}

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

export type ProceduralParamKey = 'numControlPoints' | 'baseRadius' | 'radiusVariation' | 'angleVariation' | 'trackWidth';

export interface RuntimeCar {
    speed: number;
    currentGear: number;
    currentRpm: number;
    redlineRpm: number;
    isManualTransmission?: boolean;
}
