import { useState, useMemo, useCallback } from 'react';
import { Scene } from './components/Scene';
import { generateTrack, defaultTrackConfig } from './utils/trackGenerator';
import type { TrackConfig } from './utils/trackGenerator';
import './App.css';

function App() {
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));
  const [config, setConfig] = useState<TrackConfig>({
    ...defaultTrackConfig,
    seed
  });

  const trackData = useMemo(() => {
    return generateTrack({ ...config, seed });
  }, [config, seed]);

  const regenerate = useCallback(() => {
    setSeed(Math.floor(Math.random() * 1000000));
  }, []);

  const updateConfig = useCallback((key: keyof TrackConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="app">
      <Scene trackData={trackData} />
      
      <div className="controls">
        <h2>Générateur de Circuit</h2>
        
        <button className="regenerate-btn" onClick={regenerate}>
          🔄 Nouveau Circuit
        </button>

        <div className="control-group">
          <label>Seed: {seed}</label>
        </div>

        <div className="control-group">
          <label>Points de contrôle: {config.numControlPoints}</label>
          <input
            type="range"
            min="6"
            max="20"
            value={config.numControlPoints}
            onChange={(e) => updateConfig('numControlPoints', parseInt(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label>Rayon: {config.baseRadius}</label>
          <input
            type="range"
            min="30"
            max="100"
            value={config.baseRadius}
            onChange={(e) => updateConfig('baseRadius', parseInt(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label>Variation rayon: {(config.radiusVariation * 100).toFixed(0)}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={config.radiusVariation * 100}
            onChange={(e) => updateConfig('radiusVariation', parseInt(e.target.value) / 100)}
          />
        </div>

        <div className="control-group">
          <label>Variation angle: {(config.angleVariation * 100).toFixed(0)}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={config.angleVariation * 100}
            onChange={(e) => updateConfig('angleVariation', parseInt(e.target.value) / 100)}
          />
        </div>

        <div className="control-group">
          <label>Largeur route: {config.trackWidth}</label>
          <input
            type="range"
            min="5"
            max="20"
            value={config.trackWidth}
            onChange={(e) => updateConfig('trackWidth', parseInt(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
