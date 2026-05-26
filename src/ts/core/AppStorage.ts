// @ts-ignore
import { openDB } from 'idb';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserPrefs {
    vehicleId: string;
    levelId: string;
    theme: 'dark' | 'light';
}

export interface PersistedTrackConfig {
    difficulty: string;
    numControlPoints: number;
    baseRadius: number;
    radiusVariation: number;
    angleVariation: number;
    trackWidth: number;
    seed: number;
}

export interface SavedCircuit {
    id?: number;
    name: string;
    seed: number;
    config: PersistedTrackConfig;
    difficulty: string;
    createdAt: number;
}

export type VehicleStatsOverride = Record<string, number>;

export interface VehicleSetupRecord {
    vehicleId: string;
    assignments: Record<string, { role: string; nodeIds: string[] }>;
    updatedAt: number;
}

// ─── Sessions ──────────────────────────────────────────────────────────────────

export interface Session {
    id?: number;
    circuitId: string;
    vehicleId: string;
    durationMs: number;
    bestLapMs: number | null;
    date: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DB_NAME = 'apex-racing-db';
const DB_VERSION = 4;
const MAX_SESSIONS = 50;
const MAX_FAVORITES = 10;

const STORE_PREFS = 'user-prefs';
const STORE_TRACK = 'track-config';
const STORE_CIRCUITS = 'saved-circuits';
const STORE_SESSIONS = 'sessions';
const STORE_VEHICLE_STATS = 'vehicle-stats';
const STORE_VEHICLE_SETUP = 'vehicle-setup-assignments';

const SINGLETON_KEY = 'singleton';

// ─── DB instance (lazy) ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

async function getDB(): Promise<any> {
    if (_db) return _db;
    try {
        _db = await openDB(DB_NAME, DB_VERSION, {
            upgrade(db: any) {
                if (!db.objectStoreNames.contains(STORE_PREFS)) {
                    db.createObjectStore(STORE_PREFS);
                }
                if (!db.objectStoreNames.contains(STORE_TRACK)) {
                    db.createObjectStore(STORE_TRACK);
                }
                if (!db.objectStoreNames.contains(STORE_CIRCUITS)) {
                    db.createObjectStore(STORE_CIRCUITS, { autoIncrement: true, keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
                    db.createObjectStore(STORE_SESSIONS, { autoIncrement: true, keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_VEHICLE_STATS)) {
                    db.createObjectStore(STORE_VEHICLE_STATS);
                }
                if (!db.objectStoreNames.contains(STORE_VEHICLE_SETUP)) {
                    db.createObjectStore(STORE_VEHICLE_SETUP, { keyPath: 'vehicleId' });
                }
            },
        });
    } catch {
        _db = null;
    }
    return _db;
}

// ─── User Prefs ───────────────────────────────────────────────────────────────

export async function getPrefs(): Promise<UserPrefs | null> {
    const db = await getDB();
    if (!db) return null;
    try {
        return (await db.get(STORE_PREFS, SINGLETON_KEY)) ?? null;
    } catch {
        return null;
    }
}

export async function savePrefs(prefs: UserPrefs): Promise<void> {
    const db = await getDB();
    if (!db) return;
    try {
        await db.put(STORE_PREFS, prefs, SINGLETON_KEY);
    } catch { /* silently degrade */ }
}

// ─── Track Config ─────────────────────────────────────────────────────────────

export async function getTrackConfig(): Promise<PersistedTrackConfig | null> {
    const db = await getDB();
    if (!db) return null;
    try {
        return (await db.get(STORE_TRACK, SINGLETON_KEY)) ?? null;
    } catch {
        return null;
    }
}

export async function saveTrackConfig(cfg: PersistedTrackConfig): Promise<void> {
    const db = await getDB();
    if (!db) return;
    try {
        await db.put(STORE_TRACK, cfg, SINGLETON_KEY);
    } catch { /* silently degrade */ }
}

// ─── Saved Circuits ───────────────────────────────────────────────────────────

export async function getFavorites(): Promise<SavedCircuit[]> {
    const db = await getDB();
    if (!db) return [];
    try {
        return (await db.getAll(STORE_CIRCUITS)) ?? [];
    } catch {
        return [];
    }
}

export async function saveCircuit(circuit: Omit<SavedCircuit, 'id'>): Promise<number | null> {
    const db = await getDB();
    if (!db) return null;
    try {
        const all: SavedCircuit[] = await db.getAll(STORE_CIRCUITS);
        if (all.length >= MAX_FAVORITES) return null;
        const id = await db.add(STORE_CIRCUITS, { ...circuit });
        return id as number;
    } catch {
        return null;
    }
}

export async function deleteCircuit(id: number): Promise<void> {
    const db = await getDB();
    if (!db) return;
    try {
        await db.delete(STORE_CIRCUITS, id);
    } catch { /* silently degrade */ }
}

// ─── Vehicle Stats Overrides ──────────────────────────────────────────────────

export async function getVehicleStats(vehicleId: string): Promise<VehicleStatsOverride | null> {
    const db = await getDB();
    if (!db) return null;
    try {
        return (await db.get(STORE_VEHICLE_STATS, vehicleId)) ?? null;
    } catch {
        return null;
    }
}

export async function saveVehicleStats(vehicleId: string, overrides: VehicleStatsOverride): Promise<void> {
    const db = await getDB();
    if (!db) return;
    try {
        await db.put(STORE_VEHICLE_STATS, overrides, vehicleId);
    } catch { /* silently degrade */ }
}

// ─── Vehicle Setup Assignments ────────────────────────────────────────────────

export async function getVehicleSetup(vehicleId: string): Promise<VehicleSetupRecord | null> {
    const db = await getDB();
    if (!db) return null;
    try {
        return (await db.get(STORE_VEHICLE_SETUP, vehicleId)) ?? null;
    } catch {
        return null;
    }
}

export async function saveVehicleSetup(record: VehicleSetupRecord): Promise<void> {
    const db = await getDB();
    if (!db) return;
    try {
        await db.put(STORE_VEHICLE_SETUP, record);
    } catch { /* silently degrade */ }
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function saveSession(session: Omit<Session, 'id'>): Promise<void> {
    const db = await getDB();
    if (!db) return;
    try {
        await db.add(STORE_SESSIONS, { ...session });
        const all: Session[] = await db.getAll(STORE_SESSIONS);
        if (all.length > MAX_SESSIONS) {
            const sorted = all.sort((a, b) => a.date - b.date);
            const toDelete = sorted.slice(0, all.length - MAX_SESSIONS);
            for (const s of toDelete) {
                if (s.id !== undefined) await db.delete(STORE_SESSIONS, s.id);
            }
        }
    } catch { /* silently degrade */ }
}

export async function getBestTime(circuitId: string): Promise<number | null> {
    const db = await getDB();
    if (!db) return null;
    try {
        const all: Session[] = await db.getAll(STORE_SESSIONS);
        const laps = all
            .filter(s => s.circuitId === circuitId && s.bestLapMs !== null)
            .map(s => s.bestLapMs as number);
        return laps.length > 0 ? Math.min(...laps) : null;
    } catch {
        return null;
    }
}

export async function getRecentSessions(limit: number = 10): Promise<Session[]> {
    const db = await getDB();
    if (!db) return [];
    try {
        const all: Session[] = await db.getAll(STORE_SESSIONS);
        return all.sort((a, b) => b.date - a.date).slice(0, limit);
    } catch {
        return [];
    }
}
