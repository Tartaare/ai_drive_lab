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

export function renderVehicleStats(container: HTMLElement, vehicle: VehicleDefinition, previous?: VehicleDefinition | null): void {
    container.innerHTML = '';
    Object.keys(vehicle.stats).forEach((key) => {
        const statKey = key as VehicleStatKey;
        const stat = vehicle.stats[statKey];
        const previousStat = previous ? previous.stats[statKey] : null;
        const delta = previousStat ? stat.value - previousStat.value : 0;
        const ratio = Math.min(stat.value / stat.max, 1);
        const deltaClass = delta > 0 ? ' vehicle-stat__delta--up' : delta < 0 ? ' vehicle-stat__delta--down' : '';
        const deltaText = delta > 0 ? '▲' : delta < 0 ? '▼' : '';
        const item = document.createElement('div');
        item.className = 'vehicle-stat';
        item.innerHTML =
            '<span class="vehicle-stat__label">' + stat.label + '</span>' +
            '<div class="vehicle-stat__meter">' +
                '<span class="vehicle-stat__bar"><span style="transform:scaleX(' + ratio.toFixed(3) + ')"></span></span>' +
                '<span class="vehicle-stat__score">' + stat.value + '</span>' +
            '</div>' +
            '<span class="vehicle-stat__delta' + deltaClass + '" aria-hidden="true">' + deltaText + '</span>';
        container.appendChild(item);
    });
}
