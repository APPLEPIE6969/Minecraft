import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { MATS } from './textures.js';

const noise2D = createNoise2D();

export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 3;
export const chunks = new Map();
const geometry = new THREE.BoxGeometry(1, 1, 1);

// 1. HEIGHT MATH
export function getSurfaceHeight(x, z) {
    const global = noise2D(x/60, z/60); 
    const local = noise2D(x/20, z/20);  
    return Math.floor(global * 20 + local * 5); // Taller mountains
}

// 2. BLOCK TYPES (Deep World)
export function getBlockType(x, y, z) {
    const surface = getSurfaceHeight(x, z);

    if (y > surface) return null; // Air
    if (y === surface) return 'GRASS';
    if (y > surface - 4) return 'DIRT';
    
    // Bedrock Floor
    if (y <= -60) return 'BEDROCK'; 

    // Ores based on Depth
    const rand = Math.abs(noise2D(x/3, y/3 + z/3)); 
    if (y < -40 && rand > 0.92) return 'DIAMOND';
    if (y < -20 && rand > 0.88) return 'IRON';
    if (y < -5  && rand > 0.85) return 'COAL';

    return 'STONE';
}

// 3. SOLID CHECK (Fix Falling)
export function isSolid(x, y, z) {
    const surface = getSurfaceHeight(x, z);
    // SOLID from Surface down to -1000.
    // This makes the world physically infinite downwards.
    return y <= surface && y > -1000;
}

// 4. CHUNK GENERATION
export function updateWorld(scene, playerPos) {
    const px = Math.floor(playerPos.x / CHUNK_SIZE);
    const pz = Math.floor(playerPos.z / CHUNK_SIZE);

    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            const key = `${px + x},${pz + z}`;
            if (!chunks.has(key)) createChunk(scene, px + x, pz + z);
        }
    }

    for (const [key, group] of chunks.entries()) {
        const [cx, cz] = key.split(',').map(Number);
        if (Math.abs(cx - px) > RENDER_DISTANCE + 1 || Math.abs(cz - pz) > RENDER_DISTANCE + 1) {
            scene.remove(group);
            chunks.delete(key);
        }
    }
}

function createChunk(scene, cx, cz) {
    const group = new THREE.Group();
    const posData = {};
    Object.keys(MATS).forEach(k => posData[k] = []);

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const wx = cx * CHUNK_SIZE + x;
            const wz = cz * CHUNK_SIZE + z;
            const surface = getSurfaceHeight(wx, wz);

            // RENDER from Surface down to Bedrock (-64)
            // This visualizes the "Thick World"
            const bottomLimit = -64;
            
            // Optimization: Don't render blocks completely hidden by others
            // Only render surface, bottom, and ore cavities if we had them.
            // For simple rendering: Draw top 5 layers + random layers below to simulate density?
            // No, user wants thick world. We draw solid column?
            // Drawing a solid column of 80 blocks = LAG.
            // Solution: Draw surface + cave walls?
            // Compromise: We draw Surface to Surface-5, then only Bedrock.
            // BUT user wants to mine. So we must draw them if they are exposed.
            // Let's draw Surface to -64. InstancedMesh handles it well.
            
            for (let y = surface; y >= bottomLimit; y--) {
                // Culling: If surrounded by blocks, skip?
                // Simple Culling: Check if block above is solid. If so, and we are stone, maybe skip?
                // To keep it simple and reliable: Draw everything.
                const type = getBlockType(wx, y, wz);
                if (type) posData[type].push(wx, y, wz);
            }
        }
    }

    Object.keys(posData).forEach(type => {
        const arr = posData[type];
        if (arr.length === 0) return;
        const mesh = new THREE.InstancedMesh(geometry, MATS[type], arr.length / 3);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < arr.length / 3; i++) {
            dummy.position.set(arr[i*3], arr[i*3+1], arr[i*3+2]);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        group.add(mesh);
    });

    scene.add(group);
    chunks.set(`${cx},${cz}`, group);
}
