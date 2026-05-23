import { GameModeDefinition, VehicleDefinition } from './catalog';

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

export function renderVehicleStats(container: HTMLElement, vehicle: VehicleDefinition): void {
    container.innerHTML = '';
    Object.keys(vehicle.stats).forEach((key) => {
        const stat = vehicle.stats[key as keyof VehicleDefinition['stats']];
        const ratio = key === 'acceleration' || key === 'weight'
            ? 1 - Math.min(stat.value / stat.max, 1)
            : Math.min(stat.value / stat.max, 1);
        const item = document.createElement('div');
        item.className = 'vehicle-stat';
        item.innerHTML =
            '<span class="vehicle-stat__label">' + stat.label + '</span>' +
            '<span class="vehicle-stat__value">' + stat.value + stat.unit + '</span>' +
            '<span class="vehicle-stat__bar"><span style="transform:scaleX(' + ratio.toFixed(3) + ')"></span></span>';
        container.appendChild(item);
    });
}
