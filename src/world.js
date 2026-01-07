import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

// --- TEXTURE LOADER ---
const loader = new THREE.TextureLoader();

// Helper to load texture with "Pixelated" look (NearestFilter)
function loadTexture(url) {
    const tex = loader.load(url);
    tex.magFilter = THREE.NearestFilter; // KEEPS IT PIXELATED
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// We use direct URLs for textures. 
// You can replace these URLs with your own images if you want different packs.
const textures = {
    grassTop: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/grass.png'),
    grassSide: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/grass_dirt.png'),
    dirt: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/dirt.png'),
    stone: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/stone.png'),
    sand: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/sand.png'),
    log: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/tree_side.png'),
    leaves: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/leaves_oak.png')
};

// Materials array for the Mesh
const materials = {
    GRASS: [
        new THREE.MeshStandardMaterial({ map: textures.grassSide }), // Right
        new THREE.MeshStandardMaterial({ map: textures.grassSide }), // Left
        new THREE.MeshStandardMaterial({ map: textures.grassTop }),  // Top
        new THREE.MeshStandardMaterial({ map: textures.dirt }),      // Bottom
        new THREE.MeshStandardMaterial({ map: textures.grassSide }), // Front
        new THREE.MeshStandardMaterial({ map: textures.grassSide })  // Back
    ],
    DIRT: new THREE.MeshStandardMaterial({ map: textures.dirt }),
    STONE: new THREE.MeshStandardMaterial({ map: textures.stone }),
    SAND: new THREE.MeshStandardMaterial({ map: textures.sand }),
    LOG: new THREE.MeshStandardMaterial({ map: textures.log }),
    LEAVES: new THREE.MeshStandardMaterial({ map: textures.leaves, transparent: true, alphaTest: 0.5 })
};

// --- CHUNK SETTINGS ---
export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 4; // Radius of chunks to draw
const chunks = new Map(); // Store generated chunks

export function getHeight(x, z) {
    // Combine noises for better terrain
    const globalBase = noise2D(x / 100, z / 100); // Big mountains
    const localDetail = noise2D(x / 20, z / 20);  // Small bumps
    
    // Math to create height
    let y = Math.floor(globalBase * 10 + localDetail * 5); 
    return y; 
}

export function updateChunks(scene, playerPos) {
    const playerChunkX = Math.floor(playerPos.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPos.z / CHUNK_SIZE);

    // 1. Create new chunks
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            const chunkX = playerChunkX + x;
            const chunkZ = playerChunkZ + z;
            const key = `${chunkX},${chunkZ}`;

            if (!chunks.has(key)) {
                generateChunk(scene, chunkX, chunkZ);
            }
        }
    }

    // 2. Remove old chunks (Simple garbage collection)
    for (const [key, chunkData] of chunks.entries()) {
        const [cx, cz] = key.split(',').map(Number);
        const dist = Math.sqrt((cx - playerChunkX)**2 + (cz - playerChunkZ)**2);
        
        if (dist > RENDER_DISTANCE + 2) {
            // Too far away, delete it
            chunkData.forEach(mesh => {
                scene.remove(mesh);
                mesh.geometry.dispose();
            });
            chunks.delete(key);
        }
    }
    
    return chunks; // Return map for collision checking
}

function generateChunk(scene, chunkX, chunkZ) {
    const chunkMeshes = [];
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    // We group blocks by type to optimize rendering
    // This is a simplified approach. Real engines use instancing.
    // For this code, we create standard meshes to ensure textures work easily for you.
    
    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const worldX = chunkX * CHUNK_SIZE + x;
            const worldZ = chunkZ * CHUNK_SIZE + z;
            
            const height = getHeight(worldX, worldZ);
            
            // Determine Block Type
            let mat = materials.GRASS;
            if (height < -3) mat = materials.SAND; // Water level
            else if (height > 10) mat = materials.STONE; // Mountain peaks

            const mesh = new THREE.Mesh(geometry, mat);
            mesh.position.set(worldX, height, worldZ);
            
            scene.add(mesh);
            chunkMeshes.push(mesh);

            // Fill gaps below (optimization: only 2 layers deep)
            if (height > -5) {
                const dirt = new THREE.Mesh(geometry, materials.DIRT);
                dirt.position.set(worldX, height - 1, worldZ);
                scene.add(dirt);
                chunkMeshes.push(dirt);
            }
        }
    }
    
    chunks.set(`${chunkX},${chunkZ}`, chunkMeshes);
}
