import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

// --- 1. RELIABLE TEXTURES (Base64) ---
// These are embedded images. They will never turn black.
const b64_grass_side = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABgklEQVQ4T6WTzU7CQBDH/7tsS6GQCCIe9OTBg+9gvCq+gvEdfBo96UGDiQf14kX5CNqW7/xjO7tUUgomm+zMfvOb/8zsDmF/b4845+QfQOT7/Y4558QYQ+12m0gpfwh5s9nQer2m1WpFtVrNntfrNc3n858A0+mUVqsVjcdjajQaHmQYBgRB4Mfv9/tUqVRovV5TGIbU7/dpOBxSo9Gg8XhM8/mc4jh2QJIkVK1WqdvtUj6fp+FwSJZl0WQyoUqlQv1+n2q1GkVRROVymTiO44BEKUVhGNIyDMkFMC2LTsOAms0mbbdbWq/XlM/nKQiC/wB0u11yHIfSNE2Xy6W7cBfq9Trt93u6XC7UaDTocDh4gCAIaDQa0fF4pCiK6HA4eJDL5ZLnubRcLmk6nXqA8/lM+/2eZFlOvu/Ter32gGw2S57n0WKx8AB1OAAzmQzZtu0ByLLs5bdtm2zb9gB1OAA1y7I8QJZlP/l/A7AuHQA1TdP/APwFbwHA3x7wBevww/hdtm2jAAAAAElFTkSuQmCC';
const b64_grass_top = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAXUlEQVQ4T2NkYGD4z0AAMDIwMKAo+P///38G/0F8kIGBYQ0DIzYFMPUwoCjA5wJkBTCTsCmAmYQNATYF6GGMz0WjYQCTAmQFMJOwKYCZhA0BNgUwc9HwBTIAow4DAG41IBG7y6dMAAAAAElFTkSuQmCC';
const b64_dirt = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAYklEQVQ4T2NkQAKrVq36zwjjgzhhYWMNQFYAMwmbAphp2BTATMOGAJwCmAQjIyMDIzYFMPUwoCjA5wJkBTCTsCmAmYQNATYFMHPR8AWyAJA0DQOQFcBMwghgU4CYi0bDAABWfiAR/U0e1AAAAABJRU5ErkJggg==';
const b64_stone = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAY0lEQVQ4T2NkwAj+////nwHGB3HCwsIagKwAZhI2BTDTsCmAmYYNAfgUwCQYGRkZGLEpgKmHAUUBPhcgK4CZhE0BzCRsCLApgJmLhi+QBYCkaRiArABmEkYAmwLEXDQaBgAA110gESt0e30AAAAASUVORK5CYII=';
const b64_wood = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAATklEQVQ4T2NkwAj+////nwHGB3HCwsIagKwAZhI2BTDTsCmAmYYNAfgUwCQYGRkZGLEpgKmHAUUBPhcgK4CZhE0BzCRsCLApwMhFwxcAALddIBG0rFjqAAAAAElFTkSuQmCC';
const b64_leaves = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZ0lEQVQ4T2NkYGD4z0AAMDIwMKAo+P///38G/0F8kIGBYQ0DIzYFMPUwoCjA5wJkBTCTsCmAmYQNATYF6GGMz0WjYQCTAmQFMJOwKYCZhA0BNgUwc9HwBTIAow4DAG41IBG7y6dMAAAAAElFTkSuQmCC';

const loader = new THREE.TextureLoader();

function loadTex(b64) {
    const tex = loader.load(b64);
    tex.magFilter = THREE.NearestFilter; // PIXELATED
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

const textures = {
    grassSide: loadTex(b64_grass_side),
    grassTop: loadTex(b64_grass_top),
    dirt: loadTex(b64_dirt),
    stone: loadTex(b64_stone),
    wood: loadTex(b64_wood),
    leaves: loadTex(b64_leaves)
};

const materials = {
    GRASS: [
        new THREE.MeshBasicMaterial({ map: textures.grassSide }), // Right
        new THREE.MeshBasicMaterial({ map: textures.grassSide }), // Left
        new THREE.MeshBasicMaterial({ map: textures.grassTop }),  // Top
        new THREE.MeshBasicMaterial({ map: textures.dirt }),      // Bottom
        new THREE.MeshBasicMaterial({ map: textures.grassSide }), // Front
        new THREE.MeshBasicMaterial({ map: textures.grassSide })  // Back
    ],
    DIRT: new THREE.MeshBasicMaterial({ map: textures.dirt }),
    STONE: new THREE.MeshBasicMaterial({ map: textures.stone }),
    WOOD: new THREE.MeshBasicMaterial({ map: textures.wood }),
    LEAVES: new THREE.MeshBasicMaterial({ map: textures.leaves, transparent:true, opacity:0.8 })
};

export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 3;
const chunks = new Map();
const chunkQueue = []; 
const geometry = new THREE.BoxGeometry(1, 1, 1);

export function getHeight(x, z) {
    const globalBase = noise2D(x / 40, z / 40); 
    const local = noise2D(x / 10, z / 10);
    return Math.floor(globalBase * 8 + local * 2); 
}

// Check for tree position
function isTree(x, z, height) {
    // Trees only on grass (height > -2) and rare (random < 0.02)
    // We use noise to make it deterministic (so trees don't move when you reload chunk)
    const treeNoise = Math.abs(noise2D(x * 2.5, z * 2.5));
    return (height >= 0 && height < 10 && treeNoise > 0.85); 
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

    // Cleanup
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
            if (h < -2) mat = materials.STONE; // Caves/Low
            if (h > 10) mat = materials.STONE; // Mountains

            // Terrain
            const mesh = new THREE.Mesh(geometry, mat);
            mesh.position.set(worldX, h, worldZ);
            scene.add(mesh);
            chunkMeshes.push(mesh);

            // Trees
            if (mat === materials.GRASS && isTree(worldX, worldZ, h)) {
                // Trunk
                for(let i=1; i<=3; i++) {
                    const log = new THREE.Mesh(geometry, materials.WOOD);
                    log.position.set(worldX, h + i, worldZ);
                    scene.add(log);
                    chunkMeshes.push(log);
                }
                // Leaves
                const leafPos = [[0,4,0], [1,3,0], [-1,3,0], [0,3,1], [0,3,-1]];
                leafPos.forEach(pos => {
                    const leaf = new THREE.Mesh(geometry, materials.LEAVES);
                    leaf.position.set(worldX + pos[0], h + pos[1], worldZ + pos[2]);
                    scene.add(leaf);
                    chunkMeshes.push(leaf);
                });
            }
        }
    }
    chunks.set(`${chunkX},${chunkZ}`, chunkMeshes);
}
