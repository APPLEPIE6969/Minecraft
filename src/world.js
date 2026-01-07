import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { MATS } from './textures.js';

const noise2D = createNoise2D();

export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 3;
export const chunks = new Map();
const geometry = new THREE.BoxGeometry(1, 1, 1);

// Helper: Get Terrain Height
export function getBlockHeight(x, z) {
    const global = noise2D(x/50, z/50);
    const local = noise2D(x/15, z/15);
    return Math.floor(global * 12 + local * 4);
}

// Helper: Determine block type based on Depth (Y)
function getBlockType(y, surfaceH) {
    // 1. Surface
    if (y === surfaceH) return 'GRASS';
    // 2. Just below surface
    if (y > surfaceH - 3) return 'DIRT';
    
    // 3. Deep Underground (Ores)
    if (y === -30) return 'BEDROCK'; // Bottom of visible world
    
    const rand = Math.random();
    if (y < -15 && rand > 0.98) return 'DIAMOND'; // Deep Rare
    if (y < -5  && rand > 0.95) return 'IRON';    // Medium Rare
    if (y < 0   && rand > 0.92) return 'COAL';    // Common
    
    return 'STONE'; // Default
}

// Update Logic
export function updateWorld(scene, playerPos) {
    const px = Math.floor(playerPos.x / CHUNK_SIZE);
    const pz = Math.floor(playerPos.z / CHUNK_SIZE);

    // Load new chunks
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            const key = `${px + x},${pz + z}`;
            if (!chunks.has(key)) createChunk(scene, px + x, pz + z);
        }
    }

    // Remove old chunks
    for (const [key, group] of chunks.entries()) {
        const [cx, cz] = key.split(',').map(Number);
        if (Math.abs(cx - px) > RENDER_DISTANCE + 1 || Math.abs(cz - pz) > RENDER_DISTANCE + 1) {
            scene.remove(group);
            chunks.delete(key);
        }
    }
}

// Generate Chunk with DEPTH
function createChunk(scene, cx, cz) {
    const group = new THREE.Group();
    const posData = {}; // Store positions per material

    // Initialize arrays
    Object.keys(MATS).forEach(k => posData[k] = []);

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const wx = cx * CHUNK_SIZE + x;
            const wz = cz * CHUNK_SIZE + z;
            const h = getBlockHeight(wx, wz);

            // FILL DOWNWARDS (Create depth)
            // We go from Surface down to -30
            // Optimization: Only draw down 8 blocks unless exposed?
            // For now, we draw 8 layers to ensure no holes.
            for (let y = h; y > h - 8; y--) {
                const type = getBlockType(y, h);
                posData[type].push(wx, y, wz);
            }

            // Trees (On Surface Only)
            if (Math.random() > 0.99) {
                posData['WOOD'].push(wx, h+1, wz, wx, h+2, wz, wx, h+3, wz);
                posData['LEAF'].push(wx, h+4, wz, wx+1, h+3, wz, wx-1, h+3, wz, wx, h+3, wz+1, wx, h+3, wz-1);
            }
        }
    }

    // Create Instanced Meshes
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

export function isSolid(x, y, z) {
    const h = getBlockHeight(x, z);
    // You collide with anything below the surface
    return y <= h;
}
