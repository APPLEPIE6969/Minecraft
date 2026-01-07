import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

// --- TEXTURE GENERATOR ---
function createTexture(colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = colorHex;
    ctx.fillRect(0,0,64,64);
    // Noise
    for(let i=0; i<300; i++){
        ctx.fillStyle = Math.random()>0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        ctx.fillRect(Math.floor(Math.random()*64), Math.floor(Math.random()*64), 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

const textures = {
    grass: createTexture('#567d46'),
    dirt:  createTexture('#8B4513'),
    stone: createTexture('#808080'),
    wood:  createTexture('#5C4033'),
    leaf:  createTexture('#228B22')
};

// Export materials so game.js can use them for placing blocks
export const materials = {
    GRASS: new THREE.MeshLambertMaterial({ map: textures.grass }),
    DIRT:  new THREE.MeshLambertMaterial({ map: textures.dirt }),
    STONE: new THREE.MeshLambertMaterial({ map: textures.stone }),
    WOOD:  new THREE.MeshLambertMaterial({ map: textures.wood }),
    LEAVES: new THREE.MeshLambertMaterial({ map: textures.leaf })
};

export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 3;
export const geometry = new THREE.BoxGeometry(1, 1, 1); // Shared geometry

const chunks = new Map();
const chunkQueue = []; 

// Height Math
export function getHeight(x, z) {
    const global = noise2D(x/50, z/50); 
    const local = noise2D(x/15, z/15);
    return Math.floor(global*10 + local*3); 
}

function isTree(x, z, h) {
    return (h > -2 && h < 12 && Math.abs(noise2D(x*3.4, z*3.4)) > 0.85);
}

// Chunk Logic
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
    chunkQueue.sort((a,b) => a.dist - b.dist);
    if(chunkQueue.length > 0) {
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

function generateChunk(scene, cx, cz) {
    const meshes = [];
    for(let x=0; x<CHUNK_SIZE; x++){
        for(let z=0; z<CHUNK_SIZE; z++){
            const wx = cx*CHUNK_SIZE + x;
            const wz = cz*CHUNK_SIZE + z;
            const h = getHeight(wx, wz);
            
            let mat = materials.GRASS;
            if(h < -3) mat = materials.STONE;
            if(h > 12) mat = materials.STONE;

            const mesh = new THREE.Mesh(geometry, mat);
            mesh.position.set(wx, h, wz);
            scene.add(mesh);
            meshes.push(mesh);

            if(mat === materials.GRASS && isTree(wx, wz, h)){
                for(let i=1; i<=3; i++) { // Log
                    const log = new THREE.Mesh(geometry, materials.WOOD);
                    log.position.set(wx, h+i, wz);
                    scene.add(log); meshes.push(log);
                }
                const leaf = new THREE.Mesh(geometry, materials.LEAVES); // Leaves
                leaf.position.set(wx, h+4, wz);
                leaf.scale.set(3,2,3); // Big block leaves
                scene.add(leaf); meshes.push(leaf);
            }
        }
    }
    chunks.set(`${cx},${cz}`, meshes);
}
