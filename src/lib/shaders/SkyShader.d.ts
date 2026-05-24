import * as THREE from 'three';

export const SkyShader: {
    uniforms: {
        luminance: THREE.IUniform<number>;
        turbidity: THREE.IUniform<number>;
        rayleigh: THREE.IUniform<number>;
        mieCoefficient: THREE.IUniform<number>;
        mieDirectionalG: THREE.IUniform<number>;
        sunPosition: THREE.IUniform<THREE.Vector3>;
        cameraPos: THREE.IUniform<THREE.Vector3>;
    };
    vertexShader: string;
    fragmentShader: string;
};
