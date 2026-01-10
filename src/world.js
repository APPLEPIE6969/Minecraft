import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { MATS } from './textures.js';

const noise2D = createNoise2D();

export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 4;
export const chunks = new Map();
export const worldData = new Map(); // Stores block data: "x,y,z" -> blockType
let lastPlayerChunk = null; // Track player's last chunk position
const geometry = new THREE.BoxGeometry(1, 1, 1);
const SHARED_MATERIALS = new Set(Object.values(MATS));

// Block types matching Minecraft
export const BLOCKS = {
    AIR: null,
    GRASS: 'GRASS',
    DIRT: 'DIRT',
    STONE: 'STONE',
    COBBLESTONE: 'STONE',
    BEDROCK: 'BEDROCK',
    WOOD: 'WOOD',
    LEAVES: 'LEAF',
    COAL_ORE: 'COAL',
    IRON_ORE: 'IRON',
    DIAMOND_ORE: 'DIAMOND',
    SAND: 'DIRT',
    GRAVEL: 'STONE',
    CLAY: 'DIRT'
};

function getKey(x, y, z) {
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
}

// Minecraft-like terrain generation
function getBiome(x, z) {
    const temp = getCachedNoise(x, z, 200);
    const humidity = getCachedNoise(x + 1000, z + 1000, 200);
    
    if (temp < -0.3) return 'SNOW'; // Tundra
    if (temp > 0.3 && humidity < -0.2) return 'DESERT';
    if (temp > 0.4 && humidity > 0.3) return 'JUNGLE';
    return 'PLAINS';
}

// Cache for noise values to reduce repeated calculations
const noiseCache = new Map();
const MAX_CACHE_SIZE = 5000; // Reduced cache size for memory efficiency

function getCachedNoise(x, z, scale) {
    const key = `${Math.floor(x/scale)},${Math.floor(z/scale)}`;
    if (noiseCache.has(key)) return noiseCache.get(key);
    
    const value = noise2D(x / scale, z / scale);
    if (noiseCache.size > MAX_CACHE_SIZE) {
        // Clear oldest entries (simple LRU)
        const firstKey = noiseCache.keys().next().value;
        noiseCache.delete(firstKey);
    }
    noiseCache.set(key, value);
    return value;
}

export function getSurfaceHeight(x, z) {
    const biome = getBiome(x, z);
    let height = 64;
    
    // Use cached noise for better performance
    const global = getCachedNoise(x, z, 200);
    const local = getCachedNoise(x, z, 50);
    const detail = getCachedNoise(x, z, 20) * 0.3;
    
    height = 64 + Math.floor(global * 30 + local * 10 + detail * 5);
    
    if (biome === 'DESERT') height = 64 + Math.floor(global * 15 + local * 5);
    if (biome === 'SNOW') height = 80 + Math.floor(global * 40 + local * 15);
    
    return Math.max(32, Math.min(120, height));
}

function getCaveNoise(x, y, z) {
    const cave1 = getCachedNoise(x, y + z, 30);
    const cave2 = getCachedNoise(x + 1000, z + y, 50);
    const cave3 = getCachedNoise(y, x + z + 2000, 25);
    return (cave1 + cave2 + cave3) / 3;
}

export function getBlockType(x, y, z) {
    const key = getKey(x, y, z);
    
    // Check for manually placed/removed blocks
    if (worldData.has(key)) {
        const stored = worldData.get(key);
        if (stored === null || stored === BLOCKS.AIR || stored === 'AIR') return null;
        return stored; // Return stored block type (string like 'GRASS', 'DIRT', etc.)
    }
    
    // Generate terrain
    const surface = getSurfaceHeight(x, z);
    const biome = getBiome(x, z);
    
    // Bedrock layer at bottom
    if (y <= 0) return BLOCKS.BEDROCK;
    
    // Caves (remove blocks if in cave)
    if (y < surface - 3 && y > 5) {
        const cave = getCaveNoise(x, y, z);
        if (cave > 0.25) {
            // Small caves
            return null;
        }
    }
    
    // Surface layers
    if (y === surface) {
        if (biome === 'DESERT') return 'SAND';
        if (biome === 'SNOW') return 'DIRT'; // Snow layer would go here
        return BLOCKS.GRASS;
    }
    
    if (y < surface && y > surface - 4) {
        if (biome === 'DESERT') return 'SAND';
        return BLOCKS.DIRT;
    }
    
    // Stone layer with ores
    if (y < surface - 4) {
        const oreNoise = Math.abs(noise2D(x / 5, y / 5 + z / 5));
        
        // Diamond ore (very rare, deep)
        if (y < 16 && oreNoise > 0.96) return BLOCKS.DIAMOND_ORE;
        
        // Iron ore (common, medium depth)
        if (y < 64 && y > 5 && oreNoise > 0.90) return BLOCKS.IRON_ORE;
        
        // Coal ore (very common, any depth)
        if (y < 128 && oreNoise > 0.85) return BLOCKS.COAL_ORE;
        
        return BLOCKS.STONE;
    }
    
    return null; // Air
}

export function setBlock(x, y, z, blockType) {
    const key = getKey(x, y, z);
    if (blockType === null || blockType === BLOCKS.AIR || blockType === 'AIR') {
        worldData.set(key, null);
    } else {
        // Normalize block type
        if (typeof blockType === 'string') {
            // Map material names to block types
            if (blockType === 'GRASS') worldData.set(key, BLOCKS.GRASS);
            else if (blockType === 'DIRT') worldData.set(key, BLOCKS.DIRT);
            else if (blockType === 'STONE') worldData.set(key, BLOCKS.STONE);
            else if (blockType === 'WOOD') worldData.set(key, BLOCKS.WOOD);
            else if (blockType === 'LEAVES' || blockType === 'LEAF') worldData.set(key, BLOCKS.LEAVES);
            else if (blockType === 'BEDROCK') worldData.set(key, BLOCKS.BEDROCK);
            else worldData.set(key, blockType);
        } else {
            worldData.set(key, blockType);
        }
    }
}

export function getBlock(x, y, z) {
    return getBlockType(x, y, z);
}

// Face culling - only render visible faces
function shouldRenderFace(x, y, z, face) {
    const offsets = {
        'top': [0, 1, 0],
        'bottom': [0, -1, 0],
        'north': [0, 0, -1],
        'south': [0, 0, 1],
        'east': [1, 0, 0],
        'west': [-1, 0, 0]
    };
    
    const offset = offsets[face];
    const neighbor = getBlockType(x + offset[0], y + offset[1], z + offset[2]);
    return neighbor === null;
}

export function isSolid(x, y, z) {
    const block = getBlockType(x, y, z);
    return block !== null && block !== BLOCKS.AIR && block !== 'AIR';
}

// Generate trees
function generateTree(chunkData, wx, y, wz) {
    const height = 4 + Math.floor(Math.random() * 3);
    
    // Trunk
    for (let i = 0; i < height; i++) {
        const key = getKey(wx, y + i + 1, wz);
        if (!worldData.has(key)) {
            chunkData['WOOD'].push(wx, y + i + 1, wz);
        }
    }
    
    // Leaves
    const leafY = y + height;
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            for (let dy = 0; dy <= 2; dy++) {
                if (Math.abs(dx) + Math.abs(dz) + dy <= 3 || (Math.abs(dx) === 2 && Math.abs(dz) === 2)) {
                    const lx = wx + dx;
                    const lz = wz + dz;
                    const ly = leafY + dy;
                    const key = getKey(lx, ly, lz);
                    if (!worldData.has(key)) {
                        chunkData['LEAF'].push(lx, ly, lz);
                    }
                }
            }
        }
    }
}

function createChunk(scene, cx, cz) {
    const group = new THREE.Group();
    const chunkData = {};
    Object.keys(MATS).forEach(k => chunkData[k] = []);
    
    const treePositions = [];
    
    // Pre-calculate only what we need - no arrays to save memory
    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const wx = cx * CHUNK_SIZE + x;
            const wz = cz * CHUNK_SIZE + z;
            const surface = getSurfaceHeight(wx, wz);
            const biome = getBiome(wx, wz);
            const depth = Math.max(0, surface - 50);
            
            // Generate terrain
            for (let y = surface; y >= depth; y--) {
                const blockType = getBlockType(wx, y, wz);
                if (blockType) {
                    let matKey = 'STONE';
                    
                    if (blockType === BLOCKS.GRASS) matKey = 'GRASS';
                    else if (blockType === BLOCKS.DIRT || blockType === 'SAND') matKey = 'DIRT';
                    else if (blockType === BLOCKS.WOOD) matKey = 'WOOD';
                    else if (blockType === BLOCKS.LEAVES) matKey = 'LEAF';
                    else if (blockType === BLOCKS.COAL_ORE) matKey = 'COAL';
                    else if (blockType === BLOCKS.IRON_ORE) matKey = 'IRON';
                    else if (blockType === BLOCKS.DIAMOND_ORE) matKey = 'DIAMOND';
                    else if (blockType === BLOCKS.BEDROCK) matKey = 'BEDROCK';
                    else if (blockType === BLOCKS.STONE) matKey = 'STONE';
                    
                    chunkData[matKey].push(wx, y, wz);
                }
                
                // Generate trees (check at surface level only, once per x,z position)
                if (y === surface && biome !== 'DESERT' && biome !== 'SNOW' && Math.random() > 0.98) {
                    treePositions.push({x: wx, y: surface, z: wz});
                }
            }
        }
    }
    
    // Add trees after terrain
    treePositions.forEach(pos => {
        generateTree(chunkData, pos.x, pos.y, pos.z);
    });
    
    // Create instanced meshes
    Object.keys(chunkData).forEach(matKey => {
        const positions = chunkData[matKey];
        if (positions.length === 0) return;
        
        const instanceCount = positions.length / 3;
        const mesh = new THREE.InstancedMesh(geometry, MATS[matKey], instanceCount);
        const tempObject = new THREE.Object3D();
        
        // Add userData for raycasting detection
        mesh.userData.isBlock = true;
        mesh.userData.materialType = matKey;
        
        for (let i = 0; i < instanceCount; i++) {
            const px = positions[i * 3];
            const py = positions[i * 3 + 1];
            const pz = positions[i * 3 + 2];
            tempObject.position.set(px, py, pz);
            tempObject.updateMatrix();
            mesh.setMatrixAt(i, tempObject.matrix);
        }
        
        mesh.instanceMatrix.needsUpdate = true;
        group.add(mesh);
    });
    
    scene.add(group);
    chunks.set(`${cx},${cz}`, group);
}

function disposeChunkGroup(group) {
    group.traverse(obj => {
        if (obj.isInstancedMesh && typeof obj.dispose === 'function') {
            obj.dispose();
            return;
        }
        
        if (obj.geometry && obj.geometry !== geometry && typeof obj.geometry.dispose === 'function') {
            obj.geometry.dispose();
        }
        
        if (obj.material) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            materials.forEach(mat => {
                if (mat && !SHARED_MATERIALS.has(mat) && typeof mat.dispose === 'function') {
                    mat.dispose();
                }
            });
        }
    });
}

export function updateWorld(scene, playerPos) {
    const px = Math.floor(playerPos.x / CHUNK_SIZE);
    const pz = Math.floor(playerPos.z / CHUNK_SIZE);
    
    // Only check for chunks to load/unload if player moved significantly
    const playerChunkKey = `${px},${pz}`;
    if (lastPlayerChunk === playerChunkKey) return;
    lastPlayerChunk = playerChunkKey;
    
    // Calculate which chunks should be loaded
    const chunksToLoad = new Set();
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            chunksToLoad.add(`${px + x},${pz + z}`);
        }
    }
    
    // Load only 1 new chunk per frame to spread work
    const chunksToUnload = [];
    for (const [key, group] of chunks.entries()) {
        if (!chunksToLoad.has(key)) {
            chunksToUnload.push({key, group});
        }
    }
    
    // Load chunks (limit to 1 per frame)
    let loadedOne = false;
    for (const key of chunksToLoad) {
        if (!chunks.has(key) && !loadedOne) {
            const [cx, cz] = key.split(',').map(Number);
            createChunk(scene, cx, cz);
            loadedOne = true;
            break;
        }
    }
    
    // Unload chunks (limit to 1 per frame)
    if (chunksToUnload.length > 0 && !loadedOne) {
        const {key, group} = chunksToUnload[0];
        scene.remove(group);
        disposeChunkGroup(group);
        chunks.delete(key);
    }
}

// Rebuild specific chunk when blocks change
export function rebuildChunk(scene, blockX, blockZ) {
    const cx = Math.floor(blockX / CHUNK_SIZE);
    const cz = Math.floor(blockZ / CHUNK_SIZE);
    const key = `${cx},${cz}`;
    
    if (chunks.has(key)) {
        const oldChunk = chunks.get(key);
        scene.remove(oldChunk);
        disposeChunkGroup(oldChunk);
        chunks.delete(key);
    }
    
    createChunk(scene, cx, cz);
    
    // Also rebuild neighboring chunks for edge blocks
    const localX = ((blockX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localZ = ((blockZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const neighborCoords = [];
    if (localX === 0) neighborCoords.push([cx - 1, cz]);
    if (localX === CHUNK_SIZE - 1) neighborCoords.push([cx + 1, cz]);
    if (localZ === 0) neighborCoords.push([cx, cz - 1]);
    if (localZ === CHUNK_SIZE - 1) neighborCoords.push([cx, cz + 1]);

    for (const [nx, nz] of neighborCoords) {
        const nKey = `${nx},${nz}`;
        if (chunks.has(nKey)) {
            const neighbor = chunks.get(nKey);
            scene.remove(neighbor);
            disposeChunkGroup(neighbor);
            chunks.delete(nKey);
            createChunk(scene, nx, nz);
        }
    }
}
