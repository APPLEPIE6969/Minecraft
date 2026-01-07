import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

// --- 1. PROCEDURAL TEXTURE GENERATOR (No Downloads!) ---
function createTexture(colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // 1. Fill base color
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 64, 64);

    // 2. Add "Noise" (Random dots to make it look like a block)
    for (let i = 0; i < 400; i++) { // 400 random dots
        const x = Math.floor(Math.random() * 64);
        const y = Math.floor(Math.random() * 64);
        // Slightly lighter or darker
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
        ctx.fillRect(x, y, 2, 2); // 2x2 pixel dots
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; // Keep it pixelated
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// Generate the textures on the fly
const textures = {
    grass: createTexture('#567d46'), // Green
    dirt:  createTexture('#8B4513'), // Brown
    stone: createTexture('#808080'), // Grey
    wood:  createTexture('#5C4033'), // Dark Brown
    leaf:  createTexture('#228B22')  // Dark Green
};

// Use LambertMaterial (Reacts to light, but cheaper than Standard)
const materials = {
    GRASS: new THREE.MeshLambertMaterial({ map: textures.grass }),
    DIRT:  new THREE.MeshLambertMaterial({ map: textures.dirt }),
    STONE: new THREE.MeshLambertMaterial({ map: textures.stone }),
    WOOD:  new THREE.MeshLambertMaterial({ map: textures.wood }),
    LEAVES: new THREE.MeshLambertMaterial({ map: textures.leaf, transparent: false })
};

export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 3;
const chunks = new Map();
const chunkQueue = []; 
const geometry = new THREE.BoxGeometry(1, 1, 1);

export function getHeight(x, z) {
    // Smooth rolling hills
    const globalBase = noise2D(x / 50, z / 50); 
    const local = noise2D(x / 15, z / 15);
    return Math.floor(globalBase * 10 + local * 3); 
}

// Check for tree position
function isTree(x, z, height) {
    const treeNoise = Math.abs(noise2D(x * 3.4, z * 3.4)); // Different noise scale
    // Only on grass, not too high, not in water, rare
    return (height > -2 && height < 12 && treeNoise > 0.85); 
}

export function updateChunks(scene, playerPos) {
    const pCX = Math.floor(playerPos.x / CHUNK_SIZE);
    const pCZ = Math.floor(playerPos.z / CHUNK_SIZE);

    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            const chunkX = pCX + x;
            const chunkZ = pCZ + z;
            const key = `${chunkX},${chunkZ}`;

            if (!chunks.has(key) && !chunkQueue.some(c => c.key === key)) {
                const dist = Math.sqrt(x*x + z*z);
                chunkQueue.push({ key, x: chunkX, z: chunkZ, dist });
            }
        }
    }

    chunkQueue.sort((a, b) => a.dist - b.dist);
    if (chunkQueue.length > 0) {
        const next = chunkQueue.shift(); 
        generateChunk(scene, next.x, next.z);
    }

    // Cleanup far chunks
    for (const [key, meshes] of chunks.entries()) {
        const [cx, cz] = key.split(',').map(Number);
        if (Math.abs(cx - pCX) > RENDER_DISTANCE + 1 || Math.abs(cz - pCZ) > RENDER_DISTANCE + 1) {
            meshes.forEach(m => scene.remove(m));
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
            
            const h = getHeight(worldX, worldZ);
            
            let mat = materials.GRASS;
            if (h < -3) mat = materials.STONE; // Deep
            else if (h > 12) mat = materials.STONE; // High Mountains

            // Draw Block
            const mesh = new THREE.Mesh(geometry, mat);
            mesh.position.set(worldX, h, worldZ);
            scene.add(mesh);
            chunkMeshes.push(mesh);

            // Draw Tree
            if (mat === materials.GRASS && isTree(worldX, worldZ, h)) {
                // Trunk
                for(let i=1; i<=3; i++) {
                    const log = new THREE.Mesh(geometry, materials.WOOD);
                    log.position.set(worldX, h + i, worldZ);
                    scene.add(log);
                    chunkMeshes.push(log);
                }
                // Leaves (Simple Box)
                const leaf = new THREE.Mesh(geometry, materials.LEAVES);
                leaf.position.set(worldX, h + 4, worldZ);
                leaf.scale.set(3, 2, 3); // Big leaf block
                scene.add(leaf);
                chunkMeshes.push(leaf);
            }
        }
    }
    chunks.set(`${chunkX},${chunkZ}`, chunkMeshes);
}
