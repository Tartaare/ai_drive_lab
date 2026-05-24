import { CSSProperties } from 'react';
import { TelemetryState } from '../types';

interface HudProps {
    telemetry: TelemetryState;
}

export function Hud({ telemetry }: HudProps): JSX.Element {
    const ratio = telemetry.maxRpm > 0 ? Math.min(Math.max(telemetry.rpm / telemetry.maxRpm, 0), 1) : 0;
    const dashOffset = 400 - ratio * 400;
    const rpmStyle = {
        strokeDasharray: '400',
        strokeDashoffset: String(dashOffset)
    } as CSSProperties;

    return (
        <>
            <div id="hud-cluster" className="hud-cluster">
                <div className="gauge-container">
                    <svg width="280" height="280" viewBox="0 0 240 240" aria-hidden="true">
                        <path className="rpm-circle-bg" d="M 60 180 A 85 85 0 1 1 180 180" strokeLinecap="round" />
                        <path className={`rpm-circle-fill${ratio > 0.9 ? ' redline' : ''}`} id="rpm-arc" d="M 60 180 A 85 85 0 1 1 180 180" style={rpmStyle} />
                    </svg>
                    <div id="transmission-mode" className="transmission-mode-badge">{telemetry.transmission}</div>
                    <div className="center-speed"><div className="center-speed-value" id="speed-value">{telemetry.speed}</div><div className="center-speed-unit">KM/H</div></div>
                    <div className="gear-indicator"><span id="gear-value">{telemetry.gear}</span><span className="gear-label">GEAR</span></div>
                </div>
                <div id="rpm-debug">RPM: {Math.round(telemetry.rpm)} / {Math.round(telemetry.maxRpm)}</div>
            </div>
            <div id="controls-hint" className="controls-hint">
                <div className="key-group"><div className="key-icon">Z</div><div className="key-icon">S</div><span className="key-desc">THROTTLE / BRAKE</span></div>
                <div className="key-group"><div className="key-icon">Q</div><div className="key-icon">D</div><span className="key-desc">STEER</span></div>
                <div className="key-group"><div className="key-icon key-icon--wide">SPACE</div><span className="key-desc">HANDBRAKE</span></div>
                <div className="key-group"><div className="key-icon">M</div><span className="key-desc">AUTO / MANUAL</span></div>
                <div className="key-group"><div className="key-icon">↑</div><div className="key-icon">↓</div><span className="key-desc">SHIFT</span></div>
                <div className="key-group"><div className="key-icon">R</div><span className="key-desc">RESET</span></div>
            </div>
        </>
    );
}
