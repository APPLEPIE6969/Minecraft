import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

// --- CONFIG ---
const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 4; // Higher is okay now because of InstancedMesh
const MAX_HEIGHT = 64;

// --- TEXTURES (Procedural) ---
function createTex(color) {
    const cvs = document.createElement('canvas'); 
    cvs.width = 64; cvs.height = 64;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0,0,64,64);
    for(let i=0;i<400;i++) {
        ctx.fillStyle = Math.random()>0.5?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)';
        ctx.fillRect(Math.random()*64, Math.random()*64, 4, 4);
    }
    const tex = new THREE.CanvasTexture(cvs);
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

const MATS = {
    GRASS: new THREE.MeshLambertMaterial({ map: createTex('#567d46') }),
    DIRT:  new THREE.MeshLambertMaterial({ map: createTex('#8B4513') }),
    STONE: new THREE.MeshLambertMaterial({ map: createTex('#808080') }),
    SAND:  new THREE.MeshLambertMaterial({ map: createTex('#E6C288') }),
    LEAF:  new THREE.MeshLambertMaterial({ map: createTex('#228B22') }),
    WOOD:  new THREE.MeshLambertMaterial({ map: createTex('#5C4033') })
};

// --- CHUNK SYSTEM ---
export const chunks = new Map();
const geometry = new THREE.BoxGeometry(1, 1, 1);

export function getBlockHeight(x, z) {
    const global = noise2D(x/60, z/60);
    const local = noise2D(x/20, z/20);
    return Math.floor(global * 15 + local * 5);
}

// Check if a block exists at specific coordinates (For Physics)
export function isSolid(x, y, z) {
    const h = getBlockHeight(x, z);
    // Ground is solid if y <= terrain height
    // But we also need to check caves/trees if we had them.
    // For now: Simple Terrain Physics
    if (y <= h) return true;
    return false;
}

export function updateWorld(scene, playerPos) {
    const px = Math.floor(playerPos.x / CHUNK_SIZE);
    const pz = Math.floor(playerPos.z / CHUNK_SIZE);

    // 1. Load New Chunks
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            const key = `${px + x},${pz + z}`;
            if (!chunks.has(key)) {
                createChunk(scene, px + x, pz + z);
            }
        }
    }

    // 2. Remove Old Chunks (Infinite World Logic)
    for (const [key, meshGroup] of chunks.entries()) {
        const [cx, cz] = key.split(',').map(Number);
        const dist = Math.sqrt((cx - px)**2 + (cz - pz)**2);
        if (dist > RENDER_DISTANCE + 1) {
            scene.remove(meshGroup); // Remove from scene
            // Dispose to free memory
            meshGroup.children.forEach(c => {
                if(c.geometry) c.geometry.dispose();
            });
            chunks.delete(key);
        }
    }
    
    // Update Debug UI
    const debug = document.getElementById('debug');
    if(debug) debug.innerText = `Chunks: ${chunks.size} | X:${Math.floor(playerPos.x)} Y:${Math.floor(playerPos.y)} Z:${Math.floor(playerPos.z)}`;
}

function createChunk(scene, cx, cz) {
    const chunkGroup = new THREE.Group();
    
    // Arrays to store positions for each material type
    const positions = { GRASS: [], DIRT: [], STONE: [], SAND: [], LEAF: [], WOOD: [] };
    
    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const wx = cx * CHUNK_SIZE + x;
            const wz = cz * CHUNK_SIZE + z;
            const h = getBlockHeight(wx, wz);

            // SURFACE ONLY (Optimization: Don't draw blocks underground)
            // This is the secret to high FPS.
            
            // Top Block
            let type = 'GRASS';
            if (h < -2) type = 'SAND'; // Beach
            if (h > 15) type = 'STONE'; // Mountain
            positions[type].push(wx, h, wz);

            // One block below (to hide gaps)
            if (h > -4) {
                 positions['DIRT'].push(wx, h-1, wz);
            }
            
            // Trees (Simple)
            if (type === 'GRASS' && Math.random() > 0.99) {
                positions['WOOD'].push(wx, h+1, wz);
                positions['WOOD'].push(wx, h+2, wz);
                positions['WOOD'].push(wx, h+3, wz);
                positions['LEAF'].push(wx, h+4, wz);
                positions['LEAF'].push(wx+1, h+3, wz);
                positions['LEAF'].push(wx-1, h+3, wz);
                positions['LEAF'].push(wx, h+3, wz+1);
                positions['LEAF'].push(wx, h+3, wz-1);
            }
        }
    }

    // Create Instanced Meshes
    for (const [matType, posArray] of Object.entries(positions)) {
        if (posArray.length === 0) continue;
        
        const count = posArray.length / 3;
        const mesh = new THREE.InstancedMesh(geometry, MATS[matType], count);
        const dummy = new THREE.Object3D();

        for (let i = 0; i < count; i++) {
            dummy.position.set(posArray[i*3], posArray[i*3+1], posArray[i*3+2]);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        chunkGroup.add(mesh);
    }

    chunkGroup.position.set(0,0,0); // Instances already have world coords
    chunks.set(`${cx},${cz}`, chunkGroup);
    scene.add(chunkGroup);
}
