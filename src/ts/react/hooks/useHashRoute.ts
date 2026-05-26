import { useCallback, useEffect, useState } from 'react';

export type MenuRoute = 'showroom' | 'garage';

const VALID_ROUTES: ReadonlySet<string> = new Set<MenuRoute>(['showroom', 'garage']);

function parseHash(): MenuRoute {
    const fragment = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    return VALID_ROUTES.has(fragment) ? (fragment as MenuRoute) : 'showroom';
}

export function useHashRoute(): [MenuRoute, (route: MenuRoute) => void] {
    const [route, setRoute] = useState<MenuRoute>(parseHash);

    useEffect(() => {
        const onHashChange = (): void => setRoute(parseHash());
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const navigate = useCallback((next: MenuRoute): void => {
        const fragment = next === 'showroom' ? '#/' : `#/${next}`;
        if (window.location.hash !== fragment) {
            window.location.hash = fragment;
        }
    }, []);

    return [route, navigate];
}
