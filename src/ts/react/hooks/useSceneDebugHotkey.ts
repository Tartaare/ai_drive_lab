import { MutableRefObject, useEffect } from 'react';
import { World } from '../../main';
import { SceneDebugPanel } from '../../ui/SceneDebugPanel';
import { ShowroomVehicleHandle } from '../components/ShowroomVehicleCanvas';

export function useSceneDebugHotkey(
    debugPanelRef: MutableRefObject<SceneDebugPanel>,
    worldRef: MutableRefObject<World | null>,
    previewRef: MutableRefObject<ShowroomVehicleHandle | null>
): void {
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
    }, [debugPanelRef, previewRef, worldRef]);
}
