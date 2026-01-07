import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

// --- BLOCK DEFINITIONS ---
// We use simple colors to represent materials for performance
export const BLOCKS = {
    GRASS: { color: 0x567d46, id: 1 },
    DIRT: { color: 0x8B4513, id: 2 },
    STONE: { color: 0x808080, id: 3 },
    SAND: { color: 0xE6C288, id: 4 },
    WATER: { color: 0x40a4df, id: 5 }, // Water biome
    WOOD: { color: 0x5C4033, id: 6 },
    LEAVES: { color: 0x228B22, id: 7 },
    SNOW: { color: 0xFFFFFF, id: 8 }
};

// Map hotbar keys to blocks
export const HOTBAR = [BLOCKS.GRASS, BLOCKS.DIRT, BLOCKS.STONE, BLOCKS.WOOD, BLOCKS.LEAVES];

export function getBlockMaterial(type) {
    return new THREE.MeshStandardMaterial({ color: type.color });
}

// --- WORLD GENERATION ---
export function generateChunk(scene) {
    const objects = [];
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    const size = 30; // 30x30 chunks (Increase for bigger world, but lags browser)

    // Helper to add block
    function addBlock(x, y, z, blockType) {
        const mat = getBlockMaterial(blockType);
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.position.set(x, y, z);
        scene.add(mesh);
        objects.push(mesh);
        return mesh;
    }

    // Loop through x and z to create terrain
    for (let x = -size; x < size; x++) {
        for (let z = -size; z < size; z++) {
            
            // Generate Height using Noise
            // Division controls "zoom" (higher number = smoother hills)
            const noise = noise2D(x / 20, z / 20); 
            let height = Math.floor(noise * 5); // Height varies between -5 and 5

            // --- BIOME LOGIC ---
            
            // 1. WATER & SAND (Low levels)
            if (height < -2) {
                // Fill water up to level -2
                addBlock(x, -2, z, BLOCKS.WATER);
                // Sand below water
                addBlock(x, -3, z, BLOCKS.SAND);
                continue; // Skip the rest for this coordinate
            }

            // 2. PLAINS & FOREST (Mid levels)
            let surfaceBlock = BLOCKS.GRASS;
            if (height < -1) surfaceBlock = BLOCKS.SAND; // Beach

            // 3. SNOW & MOUNTAINS (High levels)
            if (height > 3) surfaceBlock = BLOCKS.SNOW;

            // Place the surface block
            addBlock(x, height, z, surfaceBlock);

            // Fill underneath with Dirt and Stone
            addBlock(x, height - 1, z, BLOCKS.DIRT);
            addBlock(x, height - 2, z, BLOCKS.STONE);

            // --- TREES (Simple Procedural Generation) ---
            // 1 in 50 chance to spawn a tree on grass
            if (surfaceBlock === BLOCKS.GRASS && Math.random() > 0.98) {
                // Trunk
                addBlock(x, height + 1, z, BLOCKS.WOOD);
                addBlock(x, height + 2, z, BLOCKS.WOOD);
                addBlock(x, height + 3, z, BLOCKS.WOOD);
                // Leaves
                addBlock(x, height + 4, z, BLOCKS.LEAVES);
                addBlock(x + 1, height + 3, z, BLOCKS.LEAVES);
                addBlock(x - 1, height + 3, z, BLOCKS.LEAVES);
                addBlock(x, height + 3, z + 1, BLOCKS.LEAVES);
                addBlock(x, height + 3, z - 1, BLOCKS.LEAVES);
            }
        }
    }
    return objects;
}
