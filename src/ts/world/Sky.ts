import { SkyShader } from '../../lib/shaders/SkyShader';
import * as THREE from 'three';

export class Sky extends THREE.Object3D
{
    public sunPosition: THREE.Vector3 = new THREE.Vector3();
    public sunLight: THREE.DirectionalLight;

    set theta(value: number) {
        this._theta = value;
        this.refreshSunPosition();
    }

    set phi(value: number) {
        this._phi = value;
        this.refreshSunPosition();
        this.refreshHemiIntensity();
    }

    private _phi: number = 50;
    private _theta: number = 145;

    private hemiLight: THREE.HemisphereLight;
    private maxHemiIntensity: number = 0.9;
    private minHemiIntensity: number = 0.3;

    private skyMesh: THREE.Mesh;
    private skyMaterial: THREE.ShaderMaterial;

    private scene: THREE.Scene;

    constructor(scene: THREE.Scene)
    {
        super();

        this.scene = scene;
        
        // Sky material
        this.skyMaterial = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(SkyShader.uniforms),
            fragmentShader: SkyShader.fragmentShader,
            vertexShader: SkyShader.vertexShader,
            side: THREE.BackSide
        });

        // Mesh
        this.skyMesh = new THREE.Mesh(
            new THREE.SphereGeometry(1000, 24, 12),
            this.skyMaterial
        );
        this.attach(this.skyMesh);

        // Ambient light
        this.hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 1.0 );
        this.refreshHemiIntensity();
        this.hemiLight.color.setHSL( 0.59, 0.4, 0.6 );
        this.hemiLight.groundColor.setHSL( 0.095, 0.2, 0.75 );
        this.hemiLight.position.set( 0, 50, 0 );
        this.scene.add( this.hemiLight );

        // Sun Light
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 1;
        this.sunLight.shadow.camera.far = 500;
        
        const shadowSize = 50;
        this.sunLight.shadow.camera.left = -shadowSize;
        this.sunLight.shadow.camera.right = shadowSize;
        this.sunLight.shadow.camera.top = shadowSize;
        this.sunLight.shadow.camera.bottom = -shadowSize;
        
        this.scene.add(this.sunLight);

        this.refreshSunPosition();
        
        this.scene.add(this);
    }

    public update(camera: THREE.Camera): void
    {
        this.position.copy(camera.position);
        this.skyMaterial.uniforms.cameraPos.value.copy(camera.position);
        
        // Update shadow camera to follow main camera (simple CSM-like behavior)
        this.sunLight.position.x = camera.position.x + this.sunPosition.x;
        this.sunLight.position.y = camera.position.y + this.sunPosition.y;
        this.sunLight.position.z = camera.position.z + this.sunPosition.z;
        this.sunLight.target.position.copy(camera.position);
        this.sunLight.target.updateMatrixWorld();
    }

    public refreshSunPosition(): void
    {
        const sunDistance = 50;

        const x = sunDistance * Math.sin(this._theta * Math.PI / 180) * Math.cos(this._phi * Math.PI / 180);
        const y = sunDistance * Math.sin(this._phi * Math.PI / 180);
        const z = sunDistance * Math.cos(this._theta * Math.PI / 180) * Math.cos(this._phi * Math.PI / 180);

        this.sunPosition.set(x, y, z);

        this.skyMaterial.uniforms.sunPosition.value.copy(this.sunPosition);
    }

    public refreshHemiIntensity(): void
    {
        this.hemiLight.intensity = this.minHemiIntensity + Math.pow(1 - (Math.abs(this._phi - 90) / 90), 0.25) * (this.maxHemiIntensity - this.minHemiIntensity);
    }

	public setHemiIntensityRange(minIntensity: number, maxIntensity: number): void
	{
		this.minHemiIntensity = Math.max(0, minIntensity);
		this.maxHemiIntensity = Math.max(this.minHemiIntensity, maxIntensity);
		this.refreshHemiIntensity();
	}

	public setHemiColors(skyColor: THREE.Color, groundColor: THREE.Color): void
	{
		this.hemiLight.color.copy(skyColor);
		this.hemiLight.groundColor.copy(groundColor);
	}
}

