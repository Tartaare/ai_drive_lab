const fs = require('fs');
const path = require('path');

const glbPath = path.resolve(__dirname, 'car_models/car_blue.glb');
const buffer = fs.readFileSync(glbPath);

// Lecture du header GLB
// Magic (4) + Version (4) + Length (4)
const magic = buffer.readUInt32LE(0);
const version = buffer.readUInt32LE(4);
const length = buffer.readUInt32LE(8);

if (magic !== 0x46546C67) { // 'glTF'
    console.error("Ce n'est pas un fichier GLB valide !");
    process.exit(1);
}

console.log(`GLB Version: ${version}, Total Size: ${length} bytes`);

// Lecture du premier chunk (JSON)
// Chunk Length (4) + Chunk Type (4) + Chunk Data (Length)
let offset = 12;
const chunkLength = buffer.readUInt32LE(offset);
const chunkType = buffer.readUInt32LE(offset + 4);

if (chunkType !== 0x4E4F534A) { // 'JSON'
    console.error("Le premier chunk n'est pas du JSON !");
    process.exit(1);
}

const jsonBuffer = buffer.slice(offset + 8, offset + 8 + chunkLength);
const jsonStr = jsonBuffer.toString('utf8');
const gltf = JSON.parse(jsonStr);

console.log("\n--- NOEUDS (NODES) DÉTECTÉS ---");
if (gltf.nodes) {
    gltf.nodes.forEach((node, index) => {
        console.log(`Node ${index}: "${node.name || 'Unnamed'}"`);
        if (node.translation) {
            console.log(`   Pos: [${node.translation.join(', ')}]`);
        }
        if (node.children) {
            console.log(`   Children IDs: [${node.children.join(', ')}]`);
        }
    });
} else {
    console.log("Aucun noeud trouvé.");
}

console.log("\n--- SCÈNE ---");
if (gltf.scenes) {
    gltf.scenes.forEach((scene, index) => {
        console.log(`Scene ${index}: "${scene.name || 'Unnamed'}"`);
        console.log(`   Root Nodes: [${scene.nodes.join(', ')}]`);
    });
}

