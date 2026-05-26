import * as THREE from 'three';
import { collectLights, findFirstShadowCasterAny, lightLabel } from './sceneDebugHelpers';
export type { SceneDebugSource, SoftShadowsSource } from './sceneDebugTypes';
import type { SceneDebugSource, SoftShadowsSource } from './sceneDebugTypes';

// @ts-ignore — lil-gui ships CJS/UMD without ESM types
import GUI from 'lil-gui';

export class SceneDebugPanel
{
	private gui: GUI | null = null;
	private source: SceneDebugSource | null = null;
	private visible = false;
	private proxyState: Record<string, any> = {};

	public toggle(source?: SceneDebugSource): void
	{
		if (this.visible)
		{
			this.destroy();
			return;
		}
		if (source) this.source = source;
		if (!this.source) return;
		this.build();
	}

	public isVisible(): boolean
	{
		return this.visible;
	}

	public destroy(): void
	{
		if (this.gui)
		{
			this.gui.destroy();
			this.gui = null;
		}
		this.proxyState = {};
		this.visible = false;
	}

	public setTarget(source: SceneDebugSource): void
	{
		this.source = source;
		if (this.visible)
		{
			this.destroy();
			this.build();
		}
	}

	private build(): void
	{
		const s = this.source!;
		this.gui = new GUI({ title: 'SCENE DEBUG', width: 320 });
		this.gui.domElement.classList.add('apex-debug-gui');
		this.visible = true;

		this.buildRendererFolder(s);
		this.buildCameraFolder(s);
		if (s.showroomCamera) this.buildShowroomCameraFolder(s.showroomCamera, s);
		this.buildLightsFolder(s);
		if (s.dayNight) this.buildDayNightFolder(s);
		if (s.environmentPreset) this.buildEnvironmentFolder(s.environmentPreset);
		this.buildFogFolder(s);
		this.buildShadowFolder(s);
		if (s.softShadows) this.buildSoftShadowsFolder(s.softShadows);
		if (s.ground) this.buildFloorFolder(s.ground);
	}

	/* ── Renderer ─────────────────────────────── */
	private buildRendererFolder(s: SceneDebugSource): void
	{
		const f = this.gui!.addFolder('Renderer');
		f.add(s.renderer, 'toneMappingExposure', 0, 3, 0.01).name('Exposure');

		const tmOptions: Record<string, number> = {
			None: THREE.NoToneMapping,
			Linear: THREE.LinearToneMapping,
			Reinhard: THREE.ReinhardToneMapping,
			ACESFilmic: THREE.ACESFilmicToneMapping,
		};
		this.proxyState['toneMapping'] = s.renderer.toneMapping;
		f.add(this.proxyState, 'toneMapping', tmOptions).name('Tone Mapping').onChange((v: number) =>
		{
			s.renderer.toneMapping = v as THREE.ToneMapping;
			s.renderer.toneMappingExposure = s.renderer.toneMappingExposure;
		});

		f.add(s.renderer.shadowMap, 'enabled').name('Shadows');
		if ('useLegacyLights' in s.renderer) {
			f.add(s.renderer as any, 'useLegacyLights').name('Legacy Lights');
		}
		f.close();
	}

	/* ── Camera ───────────────────────────────── */
	private buildCameraFolder(s: SceneDebugSource): void
	{
		const f = this.gui!.addFolder('Camera (Orbit Debug)');
		f.add(s.camera, 'near', 0.01, 10, 0.01).name('Near Clip').onChange(() => s.camera.updateProjectionMatrix());
		f.add(s.camera, 'far', 10, 5000, 10).name('Far Clip').onChange(() => s.camera.updateProjectionMatrix());

		if (typeof s.cameraRadius === 'number') f.add(s as any, 'cameraRadius', 2, 30, 0.5).name('Follow Distance');
		if (typeof s.cameraPhi === 'number') f.add(s as any, 'cameraPhi', -60, 60, 1).name('Follow Elevation');
		if (typeof s.cameraSensitivity === 'number') f.add(s as any, 'cameraSensitivity', 0.05, 1, 0.01).name('Mouse Sensitivity');
		if (typeof s.cameraAzimuth === 'number') f.add(s as any, 'cameraAzimuth', -180, 180, 1).name('Azimuth (°)').listen();
		if (typeof s.cameraElevation === 'number') f.add(s as any, 'cameraElevation', -10, 80, 1).name('Elevation (°)').listen();
		if (typeof s.cameraDistance === 'number') f.add(s as any, 'cameraDistance', 5, 25, 0.5).name('Orbit Distance');
		if (typeof s.cameraHeight === 'number') f.add(s as any, 'cameraHeight', -2, 5, 0.05).name('Orbit Height');
		f.close();
	}

	/* ── Showroom Camera (normal mode) ────────── */
	private buildShowroomCameraFolder(
		cam: { radius: number; elevation: number; lookAtY: number; fov: number },
		s: SceneDebugSource
	): void
	{
		const f = this.gui!.addFolder('Showroom Camera');
		f.add(cam, 'fov', 10, 90, 1).name('FOV').onChange(() =>
		{
			s.camera.fov = cam.fov;
			s.camera.updateProjectionMatrix();
		});
		f.add(cam, 'radius', 4, 50, 0.5).name('Radius');
		f.add(cam, 'elevation', 0, 89, 0.5).name('Elevation (°)');
		f.add(cam, 'lookAtY', -2, 5, 0.05).name('Look At Y');
		f.open();
	}

	/* ── Lights (auto-discovered) ─────────────── */
	private buildLightsFolder(s: SceneDebugSource): void
	{
		const lights = collectLights(s.scene);
		if (lights.length === 0) return;
		const f = this.gui!.addFolder('Lights');

		lights.forEach((light, i) =>
		{
			const label = lightLabel(light, i);
			const sub = f.addFolder(label);
			const maxIntensity = (light as any).isRectAreaLight ? 50 : 10;
			sub.add(light, 'intensity', 0, maxIntensity, 0.1).name('Intensity');
			sub.addColor({ color: '#' + light.color.getHexString() }, 'color').name('Color').onChange((v: string) =>
			{
				light.color.set(v);
			});

			if ((light as any).isDirectionalLight || (light as any).isSpotLight)
			{
				sub.add(light, 'castShadow').name('Cast Shadow');
			}

			if ((light as any).isPointLight)
			{
				sub.add(light as THREE.PointLight, 'distance', 0, 100, 0.5).name('Distance');
				sub.add(light as THREE.PointLight, 'decay', 0, 5, 0.1).name('Decay');
			}

			if ((light as any).isRectAreaLight)
			{
				sub.add(light as THREE.RectAreaLight, 'width', 0.5, 20, 0.1).name('Width');
				sub.add(light as THREE.RectAreaLight, 'height', 0.5, 20, 0.1).name('Height');
			}

			sub.add(light.position, 'x', -20, 20, 0.1).name('Pos X');
			sub.add(light.position, 'y', -20, 20, 0.1).name('Pos Y');
			sub.add(light.position, 'z', -20, 20, 0.1).name('Pos Z');
			sub.close();
		});

		f.open();
	}

	/* ── Day/Night Cycle ──────────────────────── */
	private buildDayNightFolder(s: SceneDebugSource): void
	{
		const dn = s.dayNight!;
		const f = this.gui!.addFolder('Day / Night');
		this.proxyState['timeOfDay'] = dn.timeOfDayHours;
		this.proxyState['cycleSpeed'] = 0.02;

		f.add(this.proxyState, 'timeOfDay', 0, 24, 0.1).name('Time of Day (h)').onChange((v: number) =>
		{
			dn.setTimeOfDay(v);
		}).listen();

		f.add(this.proxyState, 'cycleSpeed', 0, 2, 0.01).name('Cycle Speed (h/s)').onChange((v: number) =>
		{
			dn.setHoursPerSecond(v);
		});
		f.open();
	}

	/* ── Fog ──────────────────────────────────── */
	private buildFogFolder(s: SceneDebugSource): void
	{
		const fog = s.scene.fog;
		if (!fog) return;
		const f = this.gui!.addFolder('Fog');
		if ((fog as THREE.FogExp2).density !== undefined)
		{
			f.add(fog as THREE.FogExp2, 'density', 0, 0.1, 0.001).name('Density');
		}
		else if ((fog as THREE.Fog).near !== undefined)
		{
			f.add(fog as THREE.Fog, 'near', 0, 50, 0.5).name('Near');
			f.add(fog as THREE.Fog, 'far', 1, 200, 1).name('Far');
		}
		f.addColor({ color: '#' + fog.color.getHexString() }, 'color').name('Color').onChange((v: string) =>
		{
			fog.color.set(v);
		});
		f.open();
	}

	/* ── Shadow Camera ────────────────────────── */
	private buildShadowFolder(s: SceneDebugSource): void
	{
		const light = findFirstShadowCasterAny(s.scene);
		if (!light) return;
		const shadowLight = light as THREE.SpotLight | THREE.DirectionalLight;
		const shadow = shadowLight.shadow;
		const cam = shadow.camera;
		const f = this.gui!.addFolder('Shadows');

		if ((light as any).isSpotLight)
		{
			const spot = light as THREE.SpotLight;
			f.add(spot, 'angle', 0.05, Math.PI / 2, 0.01).name('Angle');
			f.add(spot, 'penumbra', 0, 1, 0.01).name('Penumbra (douceur)');
			f.add(spot, 'intensity', 0, Math.PI * 8, 0.1).name('Intensity');
		}

		if ((light as any).isDirectionalLight)
		{
			const orthoCam = cam as THREE.OrthographicCamera;
			this.proxyState['shadowSize'] = orthoCam.right;
			f.add(this.proxyState, 'shadowSize', 10, 200, 5).name('Ortho Size').onChange((v: number) =>
			{
				orthoCam.left = -v;
				orthoCam.right = v;
				orthoCam.top = v;
				orthoCam.bottom = -v;
				orthoCam.updateProjectionMatrix();
			});
		}

		f.add(cam, 'near', 0.1, 50, 0.1).name('Cam Near').onChange(() => cam.updateProjectionMatrix());
		f.add(cam, 'far', 5, 200, 1).name('Cam Far').onChange(() => cam.updateProjectionMatrix());
		f.add(shadow, 'bias', -0.01, 0.01, 0.0001).name('Bias');
		f.add(shadow, 'normalBias', 0, 0.5, 0.005).name('Normal Bias');

		if (s.shadowPlane)
		{
			const mat = s.shadowPlane.material as THREE.ShadowMaterial;
			f.add(mat, 'opacity', 0, 1, 0.01).name('Shadow Opacity');
		}

		f.open();
	}

	/* ── Soft Shadows (AccumulativeShadows) ──── */
	private buildSoftShadowsFolder(ss: SoftShadowsSource): void
	{
		const f = this.gui!.addFolder('Soft Shadows');
		f.add(ss, 'opacity', 0, 3, 0.01).name('Opacity');
		f.add(ss, 'alphaTest', 0, 1, 0.01).name('Alpha Test');
		f.add(ss, 'colorBlend', 0, 10, 0.1).name('Color Blend');
		f.add({ reset: () => ss.reset() }, 'reset').name('Reset');
		f.open();
	}

	/* ── Floor ───────────────────────────────── */
	private buildFloorFolder(ground: THREE.Mesh): void
	{
		const mat = ground.material as any;
		if (!mat) return;
		const f = this.gui!.addFolder('Sol');
		f.add(ground, 'visible').name('Visible');
		const posProxy = { y: ground.position.y };
		f.add(posProxy, 'y', -5, 5, 0.01).name('Position Y').onChange((v: number) =>
		{
			ground.position.y = v;
		});
		if (mat.color)
		{
			f.addColor({ color: '#' + mat.color.getHexString() }, 'color').name('Couleur').onChange((v: string) =>
			{
				mat.color.set(v);
			});
		}
		if (typeof mat.roughness === 'number') f.add(mat, 'roughness', 0, 1, 0.01).name('Rugosité');
		if (typeof mat.metalness === 'number') f.add(mat, 'metalness', 0, 1, 0.01).name('Métal');
		if (typeof mat.mixStrength === 'number') f.add(mat, 'mixStrength', 0, 30, 0.5).name('Reflet Intensité');
		if (typeof mat.mixBlur === 'number') f.add(mat, 'mixBlur', 0, 10, 0.1).name('Reflet Blur');
		if (typeof mat.mirror === 'number') f.add(mat, 'mirror', 0, 1, 0.01).name('Mirror');
		f.close();
	}

	/* ── Environment ─────────────────────────── */
	private buildEnvironmentFolder(env: { current: string; onChange(preset: string): void; onToggle(enabled: boolean): void }): void
	{
		const PRESETS = ['apartment', 'city', 'dawn', 'forest', 'lobby', 'night', 'park', 'studio', 'sunset', 'warehouse'];
		const f = this.gui!.addFolder('Environment');
		const proxy = { enabled: true, preset: env.current };
		f.add(proxy, 'enabled').name('On/Off').onChange((v: boolean) =>
		{
			env.onToggle(v);
		});
		f.add(proxy, 'preset', PRESETS).name('Preset').onChange((v: string) =>
		{
			env.onChange(v);
		});
		f.open();
	}
}
