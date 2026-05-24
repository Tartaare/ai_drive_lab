import * as THREE from 'three';
import { GlossyShowroomFloor } from './menu/GlossyShowroomFloor';

// @ts-ignore — lil-gui ships UMD, Webpack 4 resolves it fine
import GUI from 'lil-gui';

export interface SceneDebugSource
{
	renderer: THREE.WebGLRenderer;
	camera: THREE.PerspectiveCamera;
	scene: THREE.Scene;
	sky?: {
		sunLight: THREE.DirectionalLight;
		sunPosition: THREE.Vector3;
		theta: number;
		phi: number;
	};
	dayNight?: {
		timeOfDayHours: number;
		setTimeOfDay(h: number): void;
		setHoursPerSecond(v: number): void;
	};
	cameraRadius?: number;
	cameraPhi?: number;
	cameraSensitivity?: number;
	cameraAzimuth?: number;
	cameraElevation?: number;
	cameraDistance?: number;
	cameraHeight?: number;
	showroomFloor?: GlossyShowroomFloor;
}

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
		this.buildLightsFolder(s);
		if (s.dayNight) this.buildDayNightFolder(s);
		this.buildFogFolder(s);
		this.buildFloorFolder(s);
		this.buildShadowFolder(s);
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
		if ('physicallyCorrectLights' in s.renderer) {
			f.add(s.renderer as any, 'physicallyCorrectLights').name('Physical Lights');
		}
		f.close();
	}

	/* ── Camera ───────────────────────────────── */
	private buildCameraFolder(s: SceneDebugSource): void
	{
		const f = this.gui!.addFolder('Camera');
		f.add(s.camera, 'fov', 10, 120, 1).name('FOV').onChange(() => s.camera.updateProjectionMatrix());
		f.add(s.camera, 'near', 0.01, 10, 0.01).name('Near Clip').onChange(() => s.camera.updateProjectionMatrix());
		f.add(s.camera, 'far', 10, 5000, 10).name('Far Clip').onChange(() => s.camera.updateProjectionMatrix());

		if (typeof s.cameraRadius === 'number') f.add(s as any, 'cameraRadius', 2, 30, 0.5).name('Follow Distance');
		if (typeof s.cameraPhi === 'number') f.add(s as any, 'cameraPhi', -60, 60, 1).name('Follow Elevation');
		if (typeof s.cameraSensitivity === 'number') f.add(s as any, 'cameraSensitivity', 0.05, 1, 0.01).name('Mouse Sensitivity');
		if (typeof s.cameraAzimuth === 'number') f.add(s as any, 'cameraAzimuth', -180, 180, 1).name('Azimuth (°)').listen();
		if (typeof s.cameraElevation === 'number') f.add(s as any, 'cameraElevation', -10, 80, 1).name('Elevation (°)').listen();
		if (typeof s.cameraDistance === 'number') f.add(s as any, 'cameraDistance', 5, 25, 0.5).name('Distance');
		if (typeof s.cameraHeight === 'number') f.add(s as any, 'cameraHeight', -2, 5, 0.05).name('Height');
		f.close();
	}

	/* ── Lights (auto-discovered) ─────────────── */
	private buildLightsFolder(s: SceneDebugSource): void
	{
		const lights = this.collectLights(s.scene);
		if (lights.length === 0) return;
		const f = this.gui!.addFolder('Lights');

		lights.forEach((light, i) =>
		{
			const label = this.lightLabel(light, i);
			const sub = f.addFolder(label);
			sub.add(light, 'intensity', 0, 10, 0.01).name('Intensity');
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
		const fog = s.scene.fog as THREE.FogExp2 | null;
		if (!fog) return;
		const f = this.gui!.addFolder('Fog');
		if ((fog as any).density !== undefined)
		{
			f.add(fog as any, 'density', 0, 0.01, 0.00005).name('Density');
		}
		f.addColor({ color: '#' + fog.color.getHexString() }, 'color').name('Color').onChange((v: string) =>
		{
			fog.color.set(v);
		});
		f.close();
	}

	/* ── Floor (Showroom Floor) ───── */
	private buildFloorFolder(s: SceneDebugSource): void
	{
		const floor = s.showroomFloor;
		if (!floor) return;
		const f = this.gui!.addFolder('Floor');

		const reflector = floor.reflector;
		if (reflector && reflector.material && reflector.material.uniforms)
		{
			const uniforms = reflector.material.uniforms;
			const sub = f.addFolder('Reflector');

			if (uniforms['color'])
			{
				const c = uniforms['color'].value as THREE.Color;
				sub.addColor({ color: '#' + c.getHexString() }, 'color').name('Tint').onChange((v: string) =>
				{
					c.set(v);
				});
			}

			if (uniforms['opacity'] !== undefined)
			{
				sub.add(uniforms['opacity'], 'value', 0, 1, 0.01).name('Opacity');
			}

			sub.add(reflector, 'visible').name('Visible');
			sub.open();
		}

		const catcher = floor.shadowCatcher;
		if (catcher)
		{
			const mat = catcher.material as THREE.ShadowMaterial;
			const sub = f.addFolder('Shadow Catcher');
			sub.add(mat, 'opacity', 0, 1, 0.01).name('Opacity');
			sub.addColor({ color: '#' + mat.color.getHexString() }, 'color').name('Color').onChange((v: string) =>
			{
				mat.color.set(v);
			});
			sub.add(catcher, 'visible').name('Visible');
			sub.close();
		}

		const floorBase = floor.floorBase;
		if (floorBase && floorBase.material)
		{
			const mat = floorBase.material as THREE.MeshPhysicalMaterial;
			const sub = f.addFolder('Floor Base');
			sub.add(floorBase, 'visible').name('Visible');
			sub.add(mat, 'metalness', 0, 1, 0.01).name('Metalness');
			sub.add(mat, 'roughness', 0, 1, 0.01).name('Roughness');
			sub.add(mat, 'clearcoat', 0, 1, 0.01).name('Clearcoat');
			sub.add(mat, 'clearcoatRoughness', 0, 1, 0.01).name('Clearcoat Roughness');
			sub.close();
		}

		f.open();
	}

	/* ── Shadow Camera ────────────────────────── */
	private buildShadowFolder(s: SceneDebugSource): void
	{
		const dirLight = this.findFirstShadowCaster(s.scene);
		if (!dirLight) return;
		const shadow = dirLight.shadow;
		const cam = shadow.camera as THREE.OrthographicCamera;
		if (!cam || cam.type !== 'OrthographicCamera') return;

		const f = this.gui!.addFolder('Shadow Camera');
		f.add(cam, 'near', 0.1, 50, 0.5).name('Near').onChange(() => cam.updateProjectionMatrix());
		f.add(cam, 'far', 50, 2000, 10).name('Far').onChange(() => cam.updateProjectionMatrix());

		this.proxyState['shadowSize'] = cam.right;
		f.add(this.proxyState, 'shadowSize', 10, 200, 5).name('Ortho Size').onChange((v: number) =>
		{
			cam.left = -v;
			cam.right = v;
			cam.top = v;
			cam.bottom = -v;
			cam.updateProjectionMatrix();
		});
		f.close();
	}

	/* ── Helpers ──────────────────────────────── */
	private collectLights(scene: THREE.Scene): THREE.Light[]
	{
		const results: THREE.Light[] = [];
		scene.traverse((child: THREE.Object3D) =>
		{
			if ((child as any).isLight) results.push(child as THREE.Light);
		});
		return results;
	}

	private lightLabel(light: THREE.Light, index: number): string
	{
		if ((light as any).isDirectionalLight) return 'Dir ' + index;
		if ((light as any).isPointLight) return 'Point ' + index;
		if ((light as any).isHemisphereLight) return 'Hemi ' + index;
		if ((light as any).isSpotLight) return 'Spot ' + index;
		if ((light as any).isAmbientLight) return 'Ambient ' + index;
		return 'Light ' + index;
	}

	private findFirstShadowCaster(scene: THREE.Scene): THREE.DirectionalLight | null
	{
		let result: THREE.DirectionalLight | null = null;
		scene.traverse((child: THREE.Object3D) =>
		{
			if (result) return;
			const dl = child as THREE.DirectionalLight;
			if (dl.isDirectionalLight && dl.castShadow) result = dl;
		});
		return result;
	}
}
