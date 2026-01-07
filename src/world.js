import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();
const loader = new THREE.TextureLoader();

// --- LOW SPEC SETTINGS ---
export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 3; // Reduced from 5 to 3 to save RAM
const chunks = new Map();
const chunkQueue = []; 

// Reuse Geometry to save memory
const geometry = new THREE.BoxGeometry(1, 1, 1);

function loadTexture(url) {
    const tex = loader.load(url);
    tex.magFilter = THREE.NearestFilter; // Pixelated
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

const textures = {
    grassSide: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/grass_dirt.png'),
    grassTop: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/grass.png'),
    dirt: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/dirt.png'),
    stone: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/stone.png'),
    sand: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/sand.png'),
};

const materials = {
    GRASS: [
        new THREE.MeshBasicMaterial({ map: textures.grassSide }), // Sides
        new THREE.MeshBasicMaterial({ map: textures.grassSide }), 
        new THREE.MeshBasicMaterial({ map: textures.grassTop }),  // Top
        new THREE.MeshBasicMaterial({ map: textures.dirt }),      // Bottom
        new THREE.MeshBasicMaterial({ map: textures.grassSide }), 
        new THREE.MeshBasicMaterial({ map: textures.grassSide })
    ],
    // Using MeshBasicMaterial is faster than StandardMaterial (No shadows/lighting calcs)
    DIRT: new THREE.MeshBasicMaterial({ map: textures.dirt }),
    STONE: new THREE.MeshBasicMaterial({ map: textures.stone }),
    SAND: new THREE.MeshBasicMaterial({ map: textures.sand }),
};

export function getHeight(x, z) {
    const globalBase = noise2D(x / 50, z / 50); 
    let y = Math.floor(globalBase * 10); 
    return y; 
}

export function updateChunks(scene, playerPos) {
    const playerChunkX = Math.floor(playerPos.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPos.z / CHUNK_SIZE);

    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            const chunkX = playerChunkX + x;
            const chunkZ = playerChunkZ + z;
            const key = `${chunkX},${chunkZ}`;

            if (!chunks.has(key) && !chunkQueue.some(c => c.key === key)) {
                const dist = Math.sqrt(x*x + z*z);
                chunkQueue.push({ key, x: chunkX, z: chunkZ, dist });
            }
        }
    }

    chunkQueue.sort((a, b) => a.dist - b.dist);

    if (chunkQueue.length > 0) {
        const nextChunk = chunkQueue.shift(); 
        generateChunk(scene, nextChunk.x, nextChunk.z);
    }

    // Cleanup far chunks
    for (const [key, chunkMeshes] of chunks.entries()) {
        const [cx, cz] = key.split(',').map(Number);
        const dist = Math.sqrt((cx - playerChunkX)**2 + (cz - playerChunkZ)**2);
        
        if (dist > RENDER_DISTANCE + 1) {
            chunkMeshes.forEach(mesh => {
                scene.remove(mesh);
                // Important: We don't dispose geometry because we reuse the single global 'geometry'
            });
            chunks.delete(key);
        }
    }
}

function generateChunk(scene, chunkX, chunkZ) {
    const chunkMeshes = [];
    
    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const worldX = chunkX * CHUNK_SIZE + x;
            const worldZ = chunkZ * CHUNK_SIZE + z;
            
            const height = getHeight(worldX, worldZ);
            
            let mat = materials.GRASS;
            if (height < -3) mat = materials.SAND;
            else if (height > 8) mat = materials.STONE;

            const mesh = new THREE.Mesh(geometry, mat);
            mesh.position.set(worldX, height, worldZ);
            scene.add(mesh);
            chunkMeshes.push(mesh);
            
            // REMOVED: The "Dirt Underneath" loop. 
            // We now only draw the top surface block. 
            // This cuts memory usage by 50%+.
        }
    }
    chunks.set(`${chunkX},${chunkZ}`, chunkMeshes);
}
