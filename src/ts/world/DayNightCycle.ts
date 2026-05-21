import * as THREE from 'three';
import { Sky } from './Sky';
import { SimpleCar } from '../vehicles/SimpleCar';

export type DayNightCycleOptions = {
	latitudeDeg?: number;
	dayOfYear?: number;
	startTimeHours?: number;
	hoursPerSecond?: number;
};

export class DayNightCycle
{
	private scene: THREE.Scene;
	private renderer: THREE.WebGLRenderer;
	private sky: Sky;
	private moonLight: THREE.DirectionalLight;
	private moonDistance: number = 60;
	private debugEnabled: boolean = false;
	private debugLogEverySeconds: number = 1.0;
	private debugLogTimer: number = 0;
	private lastAltDegRaw: number | null = null;
	private lastHeadlightsAutoState: boolean | null = null;

	private latitudeRad: number;
	private dayOfYear: number;
	private timeHours: number;
	private hoursPerSecond: number;

	private headlightsAuto: boolean = true;
	private headlightsUserOverride: boolean = false;
	private lastAutoHeadlightsOn: boolean | null = null;

	constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, sky: Sky, options: DayNightCycleOptions = {})
	{
		this.scene = scene;
		this.renderer = renderer;
		this.sky = sky;

		this.latitudeRad = THREE.MathUtils.degToRad(options.latitudeDeg ?? 46.0);
		this.dayOfYear = options.dayOfYear ?? 172;
		this.timeHours = this.normalizeHours(options.startTimeHours ?? 14.0);
		this.hoursPerSecond = options.hoursPerSecond ?? 1;

		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

		this.moonLight = new THREE.DirectionalLight(0x9fb7ff, 0);
		this.moonLight.position.set(0, 30, 0);
		this.moonLight.castShadow = false;
		this.scene.add(this.moonLight);
		this.scene.add(this.moonLight.target);

		if (!this.scene.fog)
		{
			this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.00075);
		}

		this.apply(undefined, undefined);
	}

	public get timeOfDayHours(): number
	{
		return this.timeHours;
	}

	public setTimeOfDay(hours: number): void
	{
		this.timeHours = this.normalizeHours(hours);
		this.apply(undefined, undefined);
	}

	public setHoursPerSecond(value: number): void
	{
		this.hoursPerSecond = Math.max(0, value);
	}

	public setHeadlightsAutoEnabled(enabled: boolean): void
	{
		this.headlightsAuto = enabled;
		if (!enabled) this.headlightsUserOverride = true;
	}

	public setDebugEnabled(enabled: boolean): void
	{
		this.debugEnabled = enabled;
	}

	public setDebugLogIntervalSeconds(seconds: number): void
	{
		this.debugLogEverySeconds = Math.max(0.1, seconds);
	}

	public notifyHeadlightsToggledByUser(): void
	{
		this.headlightsUserOverride = true;
	}

	public update(deltaSeconds: number, camera?: THREE.Camera, car?: SimpleCar): void
	{
		if (deltaSeconds > 0 && this.hoursPerSecond > 0)
		{
			this.timeHours = this.normalizeHours(this.timeHours + deltaSeconds * this.hoursPerSecond);
		}

		if (this.debugEnabled) this.debugLogTimer += Math.max(0, deltaSeconds);

		this.apply(camera, car);
	}

	private apply(camera?: THREE.Camera, car?: SimpleCar): void
	{
		const sun = this.computeSunDirection(this.timeHours);
		const altRad = Math.asin(THREE.MathUtils.clamp(sun.y, -1, 1));
		const altDegRaw = THREE.MathUtils.radToDeg(altRad);
		const azRad = Math.atan2(sun.x, sun.z);
		const altDegForSky = THREE.MathUtils.clamp(altDegRaw, 0, 90);

		this.sky.theta = THREE.MathUtils.radToDeg(azRad);
		this.sky.phi = altDegForSky;

		const daylight = THREE.MathUtils.smoothstep(altDegRaw, -6, 10);
		const twilight = THREE.MathUtils.clamp(1 - Math.abs(altDegRaw) / 10, 0, 1);

		const sunIntensity = (0.02 + 1.6 * daylight) * (0.55 + 0.45 * Math.max(0, sun.y));
		this.sky.sunLight.intensity = sunIntensity;

		const sunWarm = 1 - THREE.MathUtils.clamp((altDegRaw - 2) / 18, 0, 1);
		const sunColor = new THREE.Color(0xffffff).lerp(new THREE.Color(0xffb06b), sunWarm * twilight);
		this.sky.sunLight.color.copy(sunColor);

		const moonDir = sun.clone().multiplyScalar(-1);
		if (moonDir.y < 0) moonDir.y = -moonDir.y * 0.6;
		moonDir.normalize();
		if (camera)
		{
			this.moonLight.position.set(
				camera.position.x + moonDir.x * this.moonDistance,
				camera.position.y + moonDir.y * this.moonDistance,
				camera.position.z + moonDir.z * this.moonDistance
			);
			this.moonLight.target.position.copy(camera.position);
		}
		else
		{
			this.moonLight.position.set(moonDir.x * this.moonDistance, moonDir.y * this.moonDistance, moonDir.z * this.moonDistance);
			this.moonLight.target.position.set(0, 0, 0);
		}
		this.moonLight.target.updateMatrixWorld();
		this.moonLight.intensity = 0.25 * (1 - daylight);

		const hemiMin = 0.03 + 0.25 * daylight;
		const hemiMax = 0.12 + 1.0 * daylight;
		this.sky.setHemiIntensityRange(hemiMin, hemiMax);
		const skyCol = new THREE.Color(0x0a1330).lerp(new THREE.Color(0xb3e5ff), daylight);
		const groundCol = new THREE.Color(0x030308).lerp(new THREE.Color(0x4b5b3a), daylight);
		this.sky.setHemiColors(skyCol, groundCol);

		const bg = new THREE.Color(0x060815).lerp(new THREE.Color(0x87CEEB), daylight);
		this.scene.background = bg;
		if (this.scene.fog && (this.scene.fog as any).color)
		{
			(this.scene.fog as any).color.copy(bg);
			if ((this.scene.fog as any).density !== undefined)
			{
				(this.scene.fog as any).density = 0.00055 + (1 - daylight) * 0.00035;
			}
		}

		this.renderer.toneMappingExposure = 0.7 + 0.45 * daylight;

		this.debugTransitions(altDegRaw);
		this.debugThrottled(altDegRaw, daylight, sunIntensity);

		if (this.headlightsAuto && car)
		{
			const shouldOn = daylight < 0.22;
			if (this.lastAutoHeadlightsOn === null) this.lastAutoHeadlightsOn = shouldOn;
			if (this.lastAutoHeadlightsOn !== shouldOn)
			{
				this.lastAutoHeadlightsOn = shouldOn;
				this.headlightsUserOverride = false;
			}

			if (!this.headlightsUserOverride && typeof (car as any).setHeadlightsEnabled === 'function')
			{
				(car as any).setHeadlightsEnabled(shouldOn);
			}

			if (this.debugEnabled && this.lastHeadlightsAutoState !== shouldOn)
			{
				this.lastHeadlightsAutoState = shouldOn;
				console.log(`[DayNight] autoHeadlights=${shouldOn ? 'ON' : 'OFF'} override=${this.headlightsUserOverride}`);
			}
		}
	}

	private debugTransitions(altDegRaw: number): void
	{
		if (!this.debugEnabled) return;
		if (this.lastAltDegRaw === null)
		{
			this.lastAltDegRaw = altDegRaw;
			return;
		}

		if (this.lastAltDegRaw < 0 && altDegRaw >= 0) console.log(`[DayNight] sunrise alt=${altDegRaw.toFixed(2)}°`);
		if (this.lastAltDegRaw >= 0 && altDegRaw < 0) console.log(`[DayNight] sunset alt=${altDegRaw.toFixed(2)}°`);
		this.lastAltDegRaw = altDegRaw;
	}

	private debugThrottled(altDegRaw: number, daylight: number, sunIntensity: number): void
	{
		if (!this.debugEnabled) return;
		if (this.debugLogTimer < this.debugLogEverySeconds) return;
		this.debugLogTimer = 0;
		console.log(
			`[DayNight] t=${this.timeHours.toFixed(2)}h alt=${altDegRaw.toFixed(1)}° daylight=${daylight.toFixed(2)} ` +
			`sunI=${sunIntensity.toFixed(2)} moonI=${this.moonLight.intensity.toFixed(2)} exp=${this.renderer.toneMappingExposure.toFixed(2)}`
		);
	}

	private computeSunDirection(timeHours: number): THREE.Vector3
	{
		const declDeg = 23.44 * Math.sin((2 * Math.PI * (284 + this.dayOfYear)) / 365);
		const decl = THREE.MathUtils.degToRad(declDeg);
		const hourAngle = THREE.MathUtils.degToRad(15 * (timeHours - 12));

		const sinAlt = Math.sin(this.latitudeRad) * Math.sin(decl) + Math.cos(this.latitudeRad) * Math.cos(decl) * Math.cos(hourAngle);
		const alt = Math.asin(THREE.MathUtils.clamp(sinAlt, -1, 1));

		const az = Math.atan2(
			Math.sin(hourAngle),
			Math.cos(hourAngle) * Math.sin(this.latitudeRad) - Math.tan(decl) * Math.cos(this.latitudeRad)
		);

		const cosAlt = Math.cos(alt);
		const x = Math.sin(az) * cosAlt;
		const y = Math.sin(alt);
		const z = Math.cos(az) * cosAlt;

		return new THREE.Vector3(x, y, z).normalize();
	}

	private normalizeHours(hours: number): number
	{
		let h = hours % 24;
		if (h < 0) h += 24;
		return h;
	}
}
