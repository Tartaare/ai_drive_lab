import * as THREE from 'three';
// @ts-ignore
import { Reflector } from 'three/examples/jsm/objects/Reflector';

/**
 * Sol glossy inspiré du template MeshReflectorMaterial (@react-three/drei)
 *
 * Paramètres du template:
 * - blur: [400, 100]
 * - resolution: 1024
 * - mixBlur: 1
 * - mixStrength: 15
 * - depthScale: 1
 * - minDepthThreshold: 0.85
 * - color: "#151515"
 * - metalness: 0.6
 * - roughness: 1
 */
export class GlossyShowroomFloor {
    public readonly reflector: any;
    public readonly shadowCatcher: THREE.Mesh;
    public readonly floorBase: THREE.Mesh;
    private readonly scene: THREE.Scene;
    private readonly floorSize = 50; // Template: planeGeometry args={[50, 50]}

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        // Configuration du fond et fog (template: color="#17171b", fog args={['#17171b', 30, 40]})
        this.scene.background = new THREE.Color(0x17171b);
        // FogExp2 pour une chute plus douce et dense comme le template
        this.scene.fog = new THREE.FogExp2(0x17171b, 0.025);

        // Floor base avec MeshPhysicalMaterial pour simuler le clearcoat du template
        const floorMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x151515,
            roughness: 0.35,
            metalness: 0.6,
            clearcoat: 0.8,
            clearcoatRoughness: 0.15,
            reflectivity: 0.8
        });
        this.floorBase = new THREE.Mesh(
            new THREE.PlaneGeometry(this.floorSize, this.floorSize),
            floorMaterial
        );
        this.floorBase.rotation.x = -Math.PI / 2;
        this.floorBase.position.y = -0.005;
        this.floorBase.receiveShadow = true;
        this.scene.add(this.floorBase);

        // Reflector avec paramètres inspirés du template
        // Note: Le Reflector natif Three.js est plus limité que MeshReflectorMaterial
        // Il n'a pas de blur intégré, mais on optimise au maximum
        this.reflector = new Reflector(
            new THREE.PlaneGeometry(this.floorSize, this.floorSize) as unknown as THREE.BufferGeometry,
            {
                clipBias: 0.003,
                textureWidth: 1024, // Template: resolution={1024}
                textureHeight: 1024,
                color: new THREE.Color(0x151515),
                multisample: 4
            } as any
        );
        this.reflector.rotation.x = -Math.PI / 2;
        this.reflector.position.y = 0.001;
        this.scene.add(this.reflector);

        // Shadow catcher pour les ombres douces (template n'a pas de shadow catcher explicite)
        this.shadowCatcher = new THREE.Mesh(
            new THREE.PlaneGeometry(this.floorSize, this.floorSize),
            new THREE.ShadowMaterial({
                color: 0x000000,
                opacity: 0.35,
                blending: THREE.CustomBlending,
                blendSrc: THREE.SrcAlphaFactor,
                blendDst: THREE.OneMinusSrcAlphaFactor
            })
        );
        this.shadowCatcher.rotation.x = -Math.PI / 2;
        this.shadowCatcher.position.y = 0.008;
        this.shadowCatcher.receiveShadow = true;
        this.scene.add(this.shadowCatcher);
    }

    /**
     * Configure l'éclairage showroom comme dans le template:
     * - Ambient: intensity 0.25
     * - Directional: intensity 2, position [10, 6, 6]
     * - Environment: preset="dawn" (simulé par les lumières)
     */
    public setupLighting(): void {
        // Ambient light (template: intensity 0.25)
        const ambient = new THREE.AmbientLight(0xffffff, 0.25);
        this.scene.add(ambient);

        // Directional light principale (template: intensity 2, position [10, 6, 6])
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
        keyLight.position.set(10, 6, 6);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 50;
        keyLight.shadow.camera.left = -25;
        keyLight.shadow.camera.right = 25;
        keyLight.shadow.camera.top = 25;
        keyLight.shadow.camera.bottom = -25;
        keyLight.shadow.bias = -0.0005;
        this.scene.add(keyLight);

        // Rim light bleuté pour simuler l'Environment preset="dawn"
        const rimLight = new THREE.DirectionalLight(0x88aadd, 0.5);
        rimLight.position.set(-10, 4, -10);
        this.scene.add(rimLight);

        // Fill light doux
        const fillLight = new THREE.DirectionalLight(0xffeedd, 0.3);
        fillLight.position.set(-5, 3, 8);
        this.scene.add(fillLight);
    }

    /**
     * Met à jour la couleur du sol selon le thème
     */
    public setTheme(theme: 'dark' | 'light'): void {
        const isLight = theme === 'light';
        const bgColor = isLight ? 0xe8e8ea : 0x17171b;
        const floorColor = isLight ? 0xd8d8dc : 0x151515;
        const reflectorColor = isLight ? 0xd0d0d4 : 0x151515;

        this.scene.background = new THREE.Color(bgColor);
        this.scene.fog = new THREE.FogExp2(bgColor, 0.025);

        if (this.reflector?.material?.uniforms?.color) {
            this.reflector.material.uniforms.color.value.setHex(reflectorColor);
        }

        if (this.floorBase.material instanceof THREE.MeshPhysicalMaterial) {
            this.floorBase.material.color.setHex(floorColor);
        }
    }

    /**
     * Nettoie les ressources
     */
    public dispose(): void {
        this.scene.remove(this.reflector);
        this.scene.remove(this.floorBase);
        this.scene.remove(this.shadowCatcher);

        this.reflector.dispose?.();

        if (this.floorBase.geometry) this.floorBase.geometry.dispose();
        if (this.floorBase.material) {
            if (Array.isArray(this.floorBase.material)) {
                this.floorBase.material.forEach(m => m.dispose());
            } else {
                this.floorBase.material.dispose();
            }
        }

        if (this.shadowCatcher.geometry) this.shadowCatcher.geometry.dispose();
        if (this.shadowCatcher.material) {
            if (Array.isArray(this.shadowCatcher.material)) {
                this.shadowCatcher.material.forEach(m => m.dispose());
            } else {
                this.shadowCatcher.material.dispose();
            }
        }
    }
}
