import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { MATS } from './textures.js';

const noise2D = createNoise2D();

// BLOCK IDS
export const BLOCKS = {
    AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAF: 5, SAND: 6, BEDROCK: 7, PLANK: 8, WATER: 9
};

// Map IDs to Materials
const MAT_MAP = [null, MATS.GRASS, MATS.DIRT, MATS.STONE, MATS.WOOD, MATS.LEAF, MATS.SAND, MATS.BEDROCK, MATS.PLANK, MATS.WATER];

// --- CHUNK MANAGER ---
export const CHUNK_SIZE = 16;
const chunks = new Map();     // Visual Meshes
const worldData = new Map();  // Logic Data (for saving)

// --- SAVE SYSTEM ---
// We only save modified blocks to save memory
function getKey(x, y, z) { return `${x},${y},${z}`; }

export function getBlock(x, y, z) {
    const key = getKey(x, y, z);
    // 1. Check if user modified this block
    if (worldData.has(key)) return worldData.get(key);
    
    // 2. Procedural Generation (If not modified)
    if (y === -5) return BLOCKS.BEDROCK; // Bottom of world
    
    const globalH = noise2D(x / 50, z / 50);
    const localH = noise2D(x / 15, z / 15);
    const height = Math.floor(globalH * 10 + localH * 3);

    if (y > height) {
        if (y <= -2) return BLOCKS.WATER; // Sea Level
        return BLOCKS.AIR;
    }
    if (y === height) {
        if (y < -2) return BLOCKS.SAND; // Beach
        return BLOCKS.GRASS;
    }
    if (y > height - 4) return BLOCKS.DIRT;
    return BLOCKS.STONE;
}

export function setBlock(x, y, z, id) {
    worldData.set(getKey(x, y, z), id); // Save change
    // Trigger chunk rebuild (simplified: reload all nearby for now)
    // In a full game, you'd only update the specific chunk
}

// --- GENERATION ---
const geometry = new THREE.BoxGeometry(1, 1, 1);

export function updateChunks(scene, px, pz, dist) {
    const cx = Math.floor(px / CHUNK_SIZE);
    const cz = Math.floor(pz / CHUNK_SIZE);

    for (let x = -dist; x <= dist; x++) {
        for (let z = -dist; z <= dist; z++) {
            const key = `${cx + x},${cz + z}`;
            if (!chunks.has(key)) {
                generateChunkMesh(scene, cx + x, cz + z);
            }
        }
    }
}

function generateChunkMesh(scene, cx, cz) {
    const meshes = [];
    
    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const wx = cx * CHUNK_SIZE + x;
            const wz = cz * CHUNK_SIZE + z;
            
            // Optimization: Only scan relevant heights (e.g., -5 to 20)
            for (let y = -5; y < 20; y++) {
                const id = getBlock(wx, y, wz);
                if (id !== BLOCKS.AIR) {
                    // Culling: Don't draw if surrounded by solid blocks
                    // (Skipped for code brevity, but crucial for huge worlds)
                    
                    const mat = MAT_MAP[id];
                    const mesh = new THREE.Mesh(geometry, mat);
                    mesh.position.set(wx, y, wz);
                    scene.add(mesh);
                    meshes.push(mesh);
                }
            }
        }
    }
    chunks.set(`${cx},${cz}`, meshes);
}
