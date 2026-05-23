import * as THREE from 'three';

export const KERB_WIDTH_METERS = 0.8;
export const TRACK_EDGE_LINE_WIDTH_METERS = 0.18;

export type RejectionReason =
    | 'too_short'
    | 'too_long'
    | 'centerline_intersection'
    | 'border_intersection'
    | 'track_clearance_too_low'
    | 'radius_too_small'
    | 'curvature_too_abrupt'
    | 'invalid_start_straight'
    | 'invalid_surface_offset'
    | 'difficulty_out_of_range';

export interface QAReport {
    seed: number;
    attempt: number;
    accepted: boolean;
    rejectionReason: RejectionReason | null;
    length: number;
    minRadius: number;
    maxCurvature: number;
    avgCurvature: number;
    straightCount: number;
    longestStraight: number;
    turnCount: number;
    minTrackClearance: number;
    difficultyScore: number;
    hasValidStartStraight: boolean;
    selfIntersections: number;
}

export interface TrackConfig {
    numControlPoints: number;
    baseRadius: number;
    radiusVariation: number;
    angleVariation: number;
    trackWidth: number;
    sampleCount: number;
    seed?: number;
    difficulty?: string;
}

export interface TrackData {
    centerPoints: THREE.Vector3[];
    leftBorder: THREE.Vector3[];
    rightBorder: THREE.Vector3[];
    startLineIndex: number;
    curve: THREE.CatmullRomCurve3;
    kerbs?: {
        left: boolean[];
        right: boolean[];
    };
    qaReport?: QAReport;
}

export const defaultTrackConfig: TrackConfig = {
    numControlPoints: 10,
    baseRadius: 65,
    radiusVariation: 0.3,
    angleVariation: 0.25,
    trackWidth: 10,
    sampleCount: 250
};
