import { MutableRefObject, useEffect } from 'react';
import { World } from '../../main';
import { AppPhase, RuntimeCar, TelemetryState } from '../types';

export const emptyTelemetry: TelemetryState = { speed: 0, gear: 'N', transmission: 'AUTO', rpm: 0, maxRpm: 8000 };

export function useDrivingTelemetry(
    phase: AppPhase,
    worldRef: MutableRefObject<World | null>,
    setTelemetry: (telemetry: TelemetryState) => void
): void {
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
    }, [phase, setTelemetry, worldRef]);
}
