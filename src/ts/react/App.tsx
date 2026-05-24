import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GAME_MODES, TRACKS, VEHICLES, DEFAULT_PROCEDURAL_CONFIG, GameModeDefinition } from '../ui/menu/catalog';
import { SceneDebugPanel } from '../ui/SceneDebugPanel';
import { VehiclePreview } from '../ui/menu/VehiclePreview';
import { World } from '../main';
import { TrackConfig } from '../world/ProceduralTrack';
import * as AppStorage from '../core/AppStorage';
import { Hud } from './components/Hud';
import { SettingsPanel } from './components/SettingsPanel';
import { Showroom } from './components/Showroom';
import { getProceduralLength } from './components/TrackMiniature';
import { AppPhase, MainMenuSelection, ProceduralParamKey, RuntimeCar, TelemetryState, ThemeName } from './types';

const emptyTelemetry: TelemetryState = { speed: 0, gear: 'N', transmission: 'AUTO', rpm: 0, maxRpm: 8000 };

export function App(): JSX.Element {
    const [phase, setPhase] = useState<AppPhase>('loading');
    const [theme, setThemeState] = useState<ThemeName>(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    const [vehicleIndex, setVehicleIndex] = useState(0);
    const [previousVehicleDirection, setPreviousVehicleDirection] = useState<-1 | 0 | 1>(0);
    const [modeId, setModeId] = useState<GameModeDefinition['id']>('free_roam');
    const [trackAvailability, setTrackAvailability] = useState<Record<string, boolean>>({ procedural: true, grand_prix: false });
    const [proceduralConfig, setProceduralConfig] = useState<TrackConfig>({ ...DEFAULT_PROCEDURAL_CONFIG });
    const [proceduralSeed, setProceduralSeed] = useState(() => Math.floor(Math.random() * 1000000));
    const [proceduralDifficulty, setProceduralDifficulty] = useState('moyen');
    const [transitionLocked, setTransitionLocked] = useState(false);
    const [paused, setPaused] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [generationPending, setGenerationPending] = useState(false);
    const [favorites, setFavorites] = useState<AppStorage.SavedCircuit[]>([]);
    const [telemetry, setTelemetry] = useState<TelemetryState>(emptyTelemetry);

    const worldRef = useRef<World | null>(null);
    const previewRef = useRef<VehiclePreview | null>(null);
    const debugPanelRef = useRef(new SceneDebugPanel());
    const sessionStartRef = useRef(0);
    const activeSelectionRef = useRef<MainMenuSelection | null>(null);
    const persistTimerRef = useRef<number | null>(null);

    const selection = useMemo<MainMenuSelection>(() => {
        const vehicle = VEHICLES[vehicleIndex] || VEHICLES[0];
        const mode = GAME_MODES.find((item) => item.id === modeId) || GAME_MODES[0];
        const track = mode.trackId ? TRACKS.find((item) => item.id === mode.trackId) || TRACKS[0] : null;
        const isValid = !!track && !mode.unavailableReason && !!mode.trackId && trackAvailability[mode.trackId] === true;
        // Éviter la génération de circuit pendant le chargement initial
        const lengthMeters = phase === 'loading' ? 0 : getProceduralLength(proceduralConfig, proceduralSeed, proceduralDifficulty);
        return {
            vehicleId: vehicle.id,
            vehicleModelPath: vehicle.modelPath,
            modeId: mode.id,
            trackId: track ? track.id : 'none',
            levelId: track ? track.levelId : 'procedural',
            isValid,
            procedural: track && track.id === 'procedural' ? { seed: proceduralSeed, difficulty: proceduralDifficulty, config: proceduralConfig, lengthMeters } : null
        };
    }, [modeId, phase, proceduralConfig, proceduralDifficulty, proceduralSeed, trackAvailability, vehicleIndex]);

    const loadFavorites = useCallback(() => {
        void AppStorage.getFavorites().then(setFavorites).catch(() => setFavorites([]));
    }, []);

    const persistTrackConfig = useCallback((config: TrackConfig, difficulty: string, seed: number) => {
        if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = window.setTimeout(() => {
            void AppStorage.saveTrackConfig({
                difficulty,
                numControlPoints: config.numControlPoints,
                baseRadius: config.baseRadius,
                radiusVariation: config.radiusVariation,
                angleVariation: config.angleVariation,
                trackWidth: config.trackWidth,
                seed
            });
        }, 300);
    }, []);

    const applyTheme = useCallback((nextTheme: ThemeName) => {
        document.documentElement.dataset.theme = nextTheme;
        try {
            window.localStorage.setItem('apex-theme', nextTheme);
        } catch {
            undefined;
        }
        previewRef.current?.setTheme(nextTheme);
        setThemeState(nextTheme);
    }, []);

    const setTheme = useCallback((nextTheme: ThemeName) => {
        applyTheme(nextTheme);
        void AppStorage.savePrefs({ vehicleId: selection.vehicleId, levelId: selection.levelId, theme: nextTheme }).catch(() => undefined);
    }, [applyTheme, selection.levelId, selection.vehicleId]);

    useEffect(() => {
        let cancelled = false;
        async function hydrate(): Promise<void> {
            const [prefs, trackConfig] = await Promise.all([AppStorage.getPrefs(), AppStorage.getTrackConfig()]);
            let nextMode: GameModeDefinition['id'] = 'free_roam';
            if (trackConfig && !cancelled) {
                setProceduralConfig({ ...DEFAULT_PROCEDURAL_CONFIG, ...trackConfig });
                setProceduralSeed(Number.isFinite(trackConfig.seed) ? trackConfig.seed : Math.floor(Math.random() * 1000000));
                setProceduralDifficulty(trackConfig.difficulty || 'moyen');
            }
            if (prefs && !cancelled) {
                const storedVehicleIndex = VEHICLES.findIndex((vehicle) => vehicle.id === prefs.vehicleId);
                if (storedVehicleIndex >= 0) {
                    console.info('[APEX][VehicleMenu] hydrate vehicle preference', {
                        vehicleId: prefs.vehicleId,
                        vehicleIndex: storedVehicleIndex
                    });
                    setVehicleIndex(storedVehicleIndex);
                }
                nextMode = prefs.levelId === 'default' ? 'time_trial' : 'free_roam';
                applyTheme(prefs.theme === 'light' ? 'light' : 'dark');
            }
            const grandPrix = TRACKS.find((track) => track.id === 'grand_prix');
            let grandPrixAvailable = false;
            if (grandPrix && grandPrix.assetPath && typeof fetch === 'function') {
                grandPrixAvailable = await fetch(grandPrix.assetPath, { method: 'HEAD', cache: 'no-store' }).then((response) => response.ok).catch(() => false);
            }
            if (!cancelled) {
                setTrackAvailability({ procedural: true, grand_prix: grandPrixAvailable });
                setModeId(nextMode === 'time_trial' && !grandPrixAvailable ? 'free_roam' : nextMode);
                loadFavorites();
                setPhase('menu');
            }
        }
        void hydrate();
        return () => {
            cancelled = true;
        };
    }, [applyTheme, loadFavorites]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'F3') return;
            event.preventDefault();
            const panel = debugPanelRef.current;
            const wasVisible = panel.isVisible();
            const world = worldRef.current;
            if (world) {
                panel.toggle(world);
                return;
            }
            const preview = previewRef.current;
            if (!preview) return;
            panel.toggle(preview.getSceneRefs());
            preview.setDebugOrbitMode(!wasVisible);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (phase !== 'driving') return;
        const timer = window.setInterval(() => {
            const car = (worldRef.current as unknown as { car?: RuntimeCar } | null)?.car;
            if (!car) return;
            const currentGear = car.currentGear || 0;
            const gear = currentGear <= -1 ? 'R' : currentGear === 0 ? 'N' : String(currentGear);
            setTelemetry({
                speed: Math.abs(Math.round((car.speed || 0) * 3.6)),
                gear,
                transmission: car.isManualTransmission ? 'MAN' : 'AUTO',
                rpm: car.currentRpm || 0,
                maxRpm: car.redlineRpm || 8000
            });
        }, 50);
        return () => window.clearInterval(timer);
    }, [phase]);

    useEffect(() => () => {
        if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
        debugPanelRef.current.destroy();
        worldRef.current?.dispose();
    }, []);

    const startGame = useCallback(() => {
        if (!selection.isValid || phase === 'driving') return;
        debugPanelRef.current.destroy();
        previewRef.current?.setDebugOrbitMode(false);
        worldRef.current?.dispose();
        worldRef.current = new World(selection.vehicleModelPath, selection.levelId, selection.procedural ? {
            proceduralSeed: selection.procedural.seed,
            proceduralDifficulty: selection.procedural.difficulty,
            proceduralConfig: selection.procedural.config,
            onPauseChange: setPaused
        } : { onPauseChange: setPaused });
        sessionStartRef.current = Date.now();
        activeSelectionRef.current = selection;
        setPaused(false);
        setSettingsOpen(false);
        setTelemetry(emptyTelemetry);
        setPhase('driving');
        void AppStorage.savePrefs({ vehicleId: selection.vehicleId, levelId: selection.levelId, theme }).catch(() => undefined);
    }, [phase, selection, theme]);

    const stopGame = useCallback(() => {
        const activeSelection = activeSelectionRef.current || selection;
        const world = worldRef.current;
        if (world) {
            const durationMs = sessionStartRef.current ? Date.now() - sessionStartRef.current : 0;
            void AppStorage.saveSession({ circuitId: activeSelection.trackId, vehicleId: activeSelection.vehicleId, durationMs, bestLapMs: null, date: Date.now() }).catch(() => undefined);
            const config = world.getProceduralConfig ? world.getProceduralConfig() : proceduralConfig;
            const difficulty = world.getProceduralDifficulty ? world.getProceduralDifficulty() : proceduralDifficulty;
            const seed = world.getProceduralSeed ? world.getProceduralSeed() : proceduralSeed;
            void AppStorage.saveTrackConfig({ ...config, difficulty, seed }).catch(() => undefined);
            world.dispose();
        }
        debugPanelRef.current.destroy();
        previewRef.current?.setDebugOrbitMode(false);
        worldRef.current = null;
        activeSelectionRef.current = null;
        setPaused(false);
        setSettingsOpen(false);
        setTelemetry(emptyTelemetry);
        setPhase('menu');
    }, [proceduralConfig, proceduralDifficulty, proceduralSeed, selection]);

    const changeVehicle = useCallback((direction: -1 | 1) => {
        if (transitionLocked) return;
        console.info('[APEX][VehicleMenu] vehicle change requested', { direction, fromIndex: vehicleIndex });
        setPreviousVehicleDirection(direction);
        setVehicleIndex((index) => {
            const nextIndex = (index + direction + VEHICLES.length) % VEHICLES.length;
            const nextVehicle = VEHICLES[nextIndex] || VEHICLES[0];
            console.info('[APEX][VehicleMenu] vehicle index committed', {
                direction,
                fromIndex: index,
                toIndex: nextIndex,
                vehicleId: nextVehicle.id
            });
            void AppStorage.savePrefs({ vehicleId: nextVehicle.id, levelId: selection.levelId, theme }).catch(() => undefined);
            return nextIndex;
        });
    }, [selection.levelId, theme, transitionLocked, vehicleIndex]);

    const handleVehicleTransitionChange = useCallback((locked: boolean) => {
        setTransitionLocked(locked);
        if (!locked) setPreviousVehicleDirection(0);
        console.info('[APEX][VehicleMenu] vehicle transition lock changed', { locked });
    }, []);

    const randomizeMenuTrack = useCallback(() => {
        const seed = Math.floor(Math.random() * 1000000);
        setProceduralSeed(seed);
        persistTrackConfig(proceduralConfig, proceduralDifficulty, seed);
    }, [persistTrackConfig, proceduralConfig, proceduralDifficulty]);

    const syncConfigFromWorld = useCallback(() => {
        const world = worldRef.current;
        if (!world || !world.getProceduralConfig) return;
        setProceduralConfig({ ...DEFAULT_PROCEDURAL_CONFIG, ...world.getProceduralConfig() });
        if (world.getProceduralDifficulty) setProceduralDifficulty(world.getProceduralDifficulty());
        if (world.getProceduralSeed) setProceduralSeed(world.getProceduralSeed());
    }, []);

    const regenerateTrack = useCallback(async () => {
        const world = worldRef.current;
        if (!world || !world.randomizeProceduralSeed || generationPending) return;
        setGenerationPending(true);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        world.randomizeProceduralSeed();
        syncConfigFromWorld();
        setGenerationPending(false);
    }, [generationPending, syncConfigFromWorld]);

    const changeDifficulty = useCallback((difficulty: string) => {
        setProceduralDifficulty(difficulty);
        const world = worldRef.current;
        if (world && world.setProceduralDifficulty) {
            world.setProceduralDifficulty(difficulty);
            syncConfigFromWorld();
            const config = world.getProceduralConfig();
            const seed = world.getProceduralSeed();
            persistTrackConfig({ ...DEFAULT_PROCEDURAL_CONFIG, ...config }, difficulty, seed);
            return;
        }
        persistTrackConfig(proceduralConfig, difficulty, proceduralSeed);
    }, [persistTrackConfig, proceduralConfig, proceduralSeed, syncConfigFromWorld]);

    const changeParameter = useCallback((key: ProceduralParamKey, value: number) => {
        const nextConfig = { ...proceduralConfig, [key]: value };
        setProceduralConfig(nextConfig);
        if (proceduralDifficulty !== 'custom') setProceduralDifficulty('custom');
        const world = worldRef.current;
        if (world && world.setProceduralParameter) {
            world.setProceduralParameter(key, value);
            if (world.getProceduralDifficulty && world.getProceduralDifficulty() !== 'custom') world.setProceduralDifficulty('custom');
            syncConfigFromWorld();
            persistTrackConfig({ ...DEFAULT_PROCEDURAL_CONFIG, ...world.getProceduralConfig() }, world.getProceduralDifficulty(), world.getProceduralSeed());
            return;
        }
        persistTrackConfig(nextConfig, 'custom', proceduralSeed);
    }, [persistTrackConfig, proceduralConfig, proceduralDifficulty, proceduralSeed, syncConfigFromWorld]);

    const saveFavorite = useCallback(() => {
        const world = worldRef.current;
        const config = world && world.getProceduralConfig ? { ...DEFAULT_PROCEDURAL_CONFIG, ...world.getProceduralConfig() } : proceduralConfig;
        const difficulty = world && world.getProceduralDifficulty ? world.getProceduralDifficulty() : proceduralDifficulty;
        const seed = world && world.getProceduralSeed ? world.getProceduralSeed() : proceduralSeed;
        const name = `CIRCUIT #${favorites.length + 1} — ${difficulty.toUpperCase()}`;
        void AppStorage.saveCircuit({ name, seed, difficulty, config: { ...config, difficulty, seed }, createdAt: Date.now() }).then(loadFavorites).catch(() => undefined);
    }, [favorites.length, loadFavorites, proceduralConfig, proceduralDifficulty, proceduralSeed]);

    const loadFavorite = useCallback((savedConfig: AppStorage.PersistedTrackConfig) => {
        const nextConfig = { ...DEFAULT_PROCEDURAL_CONFIG, ...savedConfig };
        setProceduralConfig(nextConfig);
        setProceduralDifficulty(savedConfig.difficulty);
        setProceduralSeed(savedConfig.seed);
        const world = worldRef.current;
        if (world) {
            world.setProceduralDifficulty(savedConfig.difficulty);
            world.setProceduralParameter('numControlPoints', savedConfig.numControlPoints);
            world.setProceduralParameter('baseRadius', savedConfig.baseRadius);
            world.setProceduralParameter('radiusVariation', savedConfig.radiusVariation);
            world.setProceduralParameter('angleVariation', savedConfig.angleVariation);
            world.setProceduralParameter('trackWidth', savedConfig.trackWidth);
            world.setProceduralSeed(savedConfig.seed);
        }
        persistTrackConfig(nextConfig, savedConfig.difficulty, savedConfig.seed);
    }, [persistTrackConfig]);

    const deleteFavorite = useCallback((id: number) => {
        void AppStorage.deleteCircuit(id).then(loadFavorites).catch(() => undefined);
    }, [loadFavorites]);

    const showSettings = phase === 'driving' && activeSelectionRef.current?.levelId === 'procedural';

    return (
        <>
            <div id="game-container" />
            <div className="ui-layer" id="ui-layer">
                {phase === 'loading' && <div id="loading" className="loader-overlay"><h3>INITIALIZING ENGINE</h3><div className="loader-bar"><div className="loader-progress" /></div></div>}
                {phase === 'menu' && <Showroom theme={theme} vehicleIndex={vehicleIndex} modeId={modeId} vehicleDirection={previousVehicleDirection} transitionLocked={transitionLocked} trackAvailability={trackAvailability} proceduralConfig={proceduralConfig} proceduralSeed={proceduralSeed} proceduralDifficulty={proceduralDifficulty} previewRef={previewRef} onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} onModeSelect={setModeId} onVehicleChange={changeVehicle} onNewTrack={randomizeMenuTrack} onStart={startGame} onTransitionChange={handleVehicleTransitionChange} />}
                {phase === 'driving' && <><button id="toggle-settings" className={`settings-toggle${showSettings ? '' : ' hidden'}`} type="button" aria-label="Ouvrir la configuration de piste" onClick={() => setSettingsOpen((open) => !open)}>⚙</button><Hud telemetry={telemetry} /><div id="pause-overlay" className={`menu-overlay${paused ? '' : ' hidden'}`}><h1>PAUSED</h1><div className="menu-grid"><button id="resume-game" className="cyber-btn" type="button" onClick={() => worldRef.current?.resume()}>RESUME</button><button id="back-to-menu" className="cyber-btn cyber-btn--danger" type="button" onClick={stopGame}>ABORT SESSION</button></div></div>{showSettings && <SettingsPanel active={settingsOpen} config={proceduralConfig} difficulty={proceduralDifficulty} pending={generationPending} favorites={favorites} onClose={() => setSettingsOpen(false)} onRegenerate={regenerateTrack} onDifficultyChange={changeDifficulty} onParameterChange={changeParameter} onSaveFavorite={saveFavorite} onLoadFavorite={loadFavorite} onDeleteFavorite={deleteFavorite} />}</>}
            </div>
        </>
    );
}
