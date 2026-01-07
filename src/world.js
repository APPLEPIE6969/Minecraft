import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();
const loader = new THREE.TextureLoader();

// Helper for pixelated textures
function loadTexture(url) {
    const tex = loader.load(url);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

const textures = {
    grassTop: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/grass.png'),
    grassSide: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/grass_dirt.png'),
    dirt: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/dirt.png'),
    stone: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/stone.png'),
    sand: loadTexture('https://raw.githubusercontent.com/ozcanzaferayan/minecraft-threejs/master/public/textures/sand.png'),
};

const materials = {
    GRASS: [
        new THREE.MeshStandardMaterial({ map: textures.grassSide }),
        new THREE.MeshStandardMaterial({ map: textures.grassSide }),
        new THREE.MeshStandardMaterial({ map: textures.grassTop }), 
        new THREE.MeshStandardMaterial({ map: textures.dirt }), 
        new THREE.MeshStandardMaterial({ map: textures.grassSide }), 
        new THREE.MeshStandardMaterial({ map: textures.grassSide })
    ],
    DIRT: new THREE.MeshStandardMaterial({ map: textures.dirt }),
    STONE: new THREE.MeshStandardMaterial({ map: textures.stone }),
    SAND: new THREE.MeshStandardMaterial({ map: textures.sand }),
};

export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 5; 
const chunks = new Map();
const chunkQueue = []; // List of chunks waiting to be built

// Pure Math Height (Fast)
export function getHeight(x, z) {
    const globalBase = noise2D(x / 60, z / 60); 
    const localDetail = noise2D(x / 20, z / 20);  
    let y = Math.floor(globalBase * 15 + localDetail * 5); 
    return y; 
}

// Check for new chunks, but don't build them yet!
export function updateChunks(scene, playerPos) {
    const playerChunkX = Math.floor(playerPos.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPos.z / CHUNK_SIZE);

    // 1. Queue new chunks
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            const chunkX = playerChunkX + x;
            const chunkZ = playerChunkZ + z;
            const key = `${chunkX},${chunkZ}`;

            // If chunk doesn't exist and isn't already queued
            if (!chunks.has(key) && !chunkQueue.some(c => c.key === key)) {
                // Add to queue with distance info
                const dist = Math.sqrt(x*x + z*z);
                chunkQueue.push({ key, x: chunkX, z: chunkZ, dist });
            }
        }
    }

    // 2. Sort Queue: Build closest chunks FIRST
    chunkQueue.sort((a, b) => a.dist - b.dist);

    // 3. Build ONLY ONE chunk per frame (Prevents Lag)
    if (chunkQueue.length > 0) {
        const nextChunk = chunkQueue.shift(); // Get closest
        generateChunk(scene, nextChunk.x, nextChunk.z);
    }

    // 4. Remove far chunks
    for (const [key, chunkMeshes] of chunks.entries()) {
        const [cx, cz] = key.split(',').map(Number);
        const dist = Math.sqrt((cx - playerChunkX)**2 + (cz - playerChunkZ)**2);
        
        if (dist > RENDER_DISTANCE + 2) {
            chunkMeshes.forEach(mesh => {
                scene.remove(mesh);
                mesh.geometry.dispose();
            });
            chunks.delete(key);
        }
    }
}

function generateChunk(scene, chunkX, chunkZ) {
    const chunkMeshes = [];
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const worldX = chunkX * CHUNK_SIZE + x;
            const worldZ = chunkZ * CHUNK_SIZE + z;
            
            const height = getHeight(worldX, worldZ);
            
            let mat = materials.GRASS;
            if (height < -3) mat = materials.SAND;
            else if (height > 15) mat = materials.STONE;

            const mesh = new THREE.Mesh(geometry, mat);
            mesh.position.set(worldX, height, worldZ);
            scene.add(mesh);
            chunkMeshes.push(mesh);

            // Optimization: Only render the block directly below surface to hide holes
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
