import { GameModeDefinition, VehicleDefinition, VehicleStatKey } from './catalog';

export function createModeButton(
    mode: GameModeDefinition,
    meta: string,
    isActive: boolean,
    isEnabled: boolean,
    onSelect: () => void
): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'showroom-mode';
    button.dataset.mode = mode.id;
    button.setAttribute('aria-pressed', String(isActive));
    button.disabled = !isEnabled;
    button.innerHTML =
        '<span class="showroom-mode__label">' + mode.label + '</span>' +
        '<span class="showroom-mode__meta">' + meta + '</span>';
    button.addEventListener('click', () => {
        if (!isEnabled) return;
        onSelect();
    });
    return button;
}

export function renderVehicleStats(container: HTMLElement, vehicle: VehicleDefinition, previous?: VehicleDefinition | null, shouldAnimateBars: boolean = false): void {
    container.innerHTML = '';
    Object.keys(vehicle.stats).forEach((key) => {
        const statKey = key as VehicleStatKey;
        const stat = vehicle.stats[statKey];
        const previousStat = previous ? previous.stats[statKey] : null;
        const delta = previousStat ? stat.value - previousStat.value : 0;
        const ratio = Math.min(stat.value / stat.max, 1);
        const deltaClass = delta > 0 ? ' vehicle-stat__delta--up' : delta < 0 ? ' vehicle-stat__delta--down' : '';
        const deltaText = delta > 0 ? '▲' : delta < 0 ? '▼' : '';
        const animatingClass = shouldAnimateBars ? ' vehicle-stat--animating' : '';
        const item = document.createElement('div');
        item.className = 'vehicle-stat' + animatingClass;
        const initialRatio = shouldAnimateBars && previousStat 
            ? Math.min(previousStat.value / previousStat.max, 1) 
            : ratio;
        
        // Initialize score with old value if animating, otherwise new value
        const initialScoreValue = shouldAnimateBars && previousStat ? previousStat.value : stat.value;
        const scoreDataAttr = shouldAnimateBars && previousStat ? ` data-old-value="${previousStat.value}" data-new-value="${stat.value}"` : '';
        
        item.innerHTML =
            '<span class="vehicle-stat__label">' + stat.label + '</span>' +
            '<div class="vehicle-stat__meter">' +
                '<span class="vehicle-stat__bar" style="--bar-ratio: ' + initialRatio.toFixed(3) + '"><span class="vehicle-stat__bar__fill"></span></span>' +
                '<span class="vehicle-stat__score"' + scoreDataAttr + '>' + initialScoreValue + '</span>' +
            '</div>' +
            '<span class="vehicle-stat__delta' + deltaClass + '" aria-hidden="true">' + deltaText + '</span>';
        container.appendChild(item);
        
        if (shouldAnimateBars) {
            const barElement = item.querySelector('.vehicle-stat__bar') as HTMLElement;
            requestAnimationFrame(() => {
                barElement.style.setProperty('--bar-ratio', ratio.toFixed(3));
            });
        }
    });
}
