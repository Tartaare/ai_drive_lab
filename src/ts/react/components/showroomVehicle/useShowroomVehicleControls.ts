import { RefObject, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ControlRefs {
    containerRef: RefObject<HTMLDivElement>;
    debugOrbitRef: React.MutableRefObject<boolean>;
    rotationYRef: React.MutableRefObject<number>;
    cameraDistanceRef: React.MutableRefObject<number>;
    cameraAzimuthRef: React.MutableRefObject<number>;
    cameraElevationRef: React.MutableRefObject<number>;
}

export function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = (): void => setReduced(query.matches);
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return reduced;
}

export function useShowroomVehicleControls({
    containerRef,
    debugOrbitRef,
    rotationYRef,
    cameraDistanceRef,
    cameraAzimuthRef,
    cameraElevationRef
}: ControlRefs): {
    handlePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    handlePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
    handlePointerUp: () => void;
    handleKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
} {
    const dragRef = useRef({ active: false, x: 0, y: 0, rotation: 0, elevation: 16, azimuth: 0 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const wheelHandler = (event: WheelEvent): void => {
            event.preventDefault();
            const direction = event.deltaY > 0 ? 1 : -1;
            cameraDistanceRef.current = THREE.MathUtils.clamp(cameraDistanceRef.current + direction * 0.13, 0.85, 1.2);
        };

        container.addEventListener('wheel', wheelHandler, { passive: false });
        return () => container.removeEventListener('wheel', wheelHandler);
    }, [cameraDistanceRef, containerRef]);

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
        dragRef.current = {
            active: true,
            x: event.clientX,
            y: event.clientY,
            rotation: rotationYRef.current,
            elevation: cameraElevationRef.current,
            azimuth: cameraAzimuthRef.current
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus();
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (!dragRef.current.active) return;
        const dx = event.clientX - dragRef.current.x;
        const dy = event.clientY - dragRef.current.y;
        if (debugOrbitRef.current) {
            cameraAzimuthRef.current = dragRef.current.azimuth + dx * 0.4;
            cameraElevationRef.current = THREE.MathUtils.clamp(dragRef.current.elevation - dy * 0.3, -10, 80);
            return;
        }
        rotationYRef.current = dragRef.current.rotation + dx * 0.012;
    };

    const handlePointerUp = (): void => {
        dragRef.current.active = false;
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === '+' || event.key === '=' || event.key === 'NumpadAdd' || event.key === 'PageUp') {
            event.preventDefault();
            cameraDistanceRef.current = THREE.MathUtils.clamp(cameraDistanceRef.current - 0.1, 0.86, 2.05);
        }
        if (event.key === '-' || event.key === '_' || event.key === 'NumpadSubtract' || event.key === 'PageDown') {
            event.preventDefault();
            cameraDistanceRef.current = THREE.MathUtils.clamp(cameraDistanceRef.current + 0.1, 0.86, 2.05);
        }
    };

    return { handlePointerDown, handlePointerMove, handlePointerUp, handleKeyDown };
}
