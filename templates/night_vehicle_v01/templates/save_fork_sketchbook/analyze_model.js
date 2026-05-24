const fs = require('fs');
const path = require('path');
const THREE = require('three');

// Injection globale pour les exemples legacy de Three.js
global.THREE = THREE;
global.window = {
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 1,
    addEventListener: () => {},
    TextDecoder: TextDecoder // Nécessaire pour GLTFLoader
};
global.self = global.window;
global.document = {
    createElement: () => ({ getContext: () => {} }),
};

// Charger le GLTFLoader (version commonjs/node compatible si possible, sinon hack)
require('three/examples/js/loaders/GLTFLoader');

const glbPath = path.resolve(__dirname, 'car_models/car_red.glb');
const glbBuffer = fs.readFileSync(glbPath);

// Convertir Node Buffer vers ArrayBuffer
const arrayBuffer = glbBuffer.buffer.slice(glbBuffer.byteOffset, glbBuffer.byteOffset + glbBuffer.byteLength);

const loader = new THREE.GLTFLoader();

console.log("--- ANALYSE DU MODÈLE car_red.glb ---");

loader.parse(arrayBuffer, '', (gltf) => {
    console.log("Structure de la scène :");
    
    function traverse(node, depth = 0) {
        const indent = "  ".repeat(depth);
        // Ignorer les nodes techniques de GLTF sauf si ce sont des mesh/groups pertinents
        let info = `${indent}- [${node.type}] "${node.name}"`;
        
        if (node.isMesh) {
            info += ` (Mesh)`;
        }
        
        // Position relative
        info += ` Pos: [${node.position.x.toFixed(2)}, ${node.position.y.toFixed(2)}, ${node.position.z.toFixed(2)}]`;
        
        console.log(info);
        
        if (node.children) {
            node.children.forEach(child => traverse(child, depth + 1));
        }
    }

    traverse(gltf.scene);

}, (err) => {
    console.error("Erreur lors du chargement :", err);
});
