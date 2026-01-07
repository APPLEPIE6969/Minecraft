import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { MATS } from './textures.js';

const noise2D = createNoise2D();

export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 3;
export const chunks = new Map();
const geometry = new THREE.BoxGeometry(1, 1, 1);

// 1. TERRAIN HEIGHT MATH
export function getSurfaceHeight(x, z) {
    const global = noise2D(x/60, z/60); // Big hills
    const local = noise2D(x/20, z/20);  // Small bumps
    return Math.floor(global * 15 + local * 5);
}

// 2. BLOCK LOGIC (Mathematical, Infinite)
export function getBlockType(x, y, z) {
    const surface = getSurfaceHeight(x, z);

    if (y > surface) return null; // Air
    if (y === surface) return 'GRASS';
    if (y > surface - 4) return 'DIRT';
    
    if (y <= -60) return 'BEDROCK'; // Bottom

    // Ore Generation (Based on depth)
    const rand = Math.abs(noise2D(x/2, y/2 + z/2)); // Randomness
    if (y < -15 && rand > 0.90) return 'DIAMOND';
    if (y < -5  && rand > 0.85) return 'IRON';
    if (y < 0   && rand > 0.80) return 'COAL';

    return 'STONE';
}

// 3. PHYSICS CHECK (The "Falling Through" Fix)
export function isSolid(x, y, z) {
    const surface = getSurfaceHeight(x, z);
    // If we are below the surface, it is solid. Period.
    // We limit it to -1000 so you don't fall forever if you glitch.
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

    // Cleanup
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

            // OPTIMIZATION:
            // We only RENDER the top 40 layers. 
            // Physics works down to -1000, but we don't draw it to save RAM.
            // 40 layers is plenty for mining coal/iron/diamond.
            const renderLimit = Math.max(-64, surface - 40);

            for (let y = surface; y >= renderLimit; y--) {
                const type = getBlockType(wx, y, wz);
                if (type) posData[type].push(wx, y, wz);
            }

            // Trees
            if (Math.random() > 0.985) {
                posData['WOOD'].push(wx, surface+1, wz, wx, surface+2, wz, wx, surface+3, wz);
                posData['LEAF'].push(wx, surface+4, wz, wx+1, surface+3, wz, wx-1, surface+3, wz, wx, surface+3, wz+1, wx, surface+3, wz-1);
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
