import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { MATS } from './textures.js'; // MUST BE HERE

const noise2D = createNoise2D();

export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE = 3;
export const chunks = new Map();
const geometry = new THREE.BoxGeometry(1, 1, 1);

export function getSurfaceHeight(x, z) {
    const global = noise2D(x/60, z/60);
    const local = noise2D(x/20, z/20);
    return Math.floor(global * 20 + local * 5);
}

export function getBlockType(x, y, z) {
    const surface = getSurfaceHeight(x, z);
    if (y > surface) return null;
    if (y === surface) return 'GRASS';
    if (y > surface - 4) return 'DIRT';
    if (y <= -60) return 'BEDROCK';
    const r = Math.abs(noise2D(x/2, y/2+z/2));
    if (y < -15 && r > 0.92) return 'DIAMOND';
    if (y < -5 && r > 0.88) return 'IRON';
    return 'STONE';
}

export { isSolid, updateWorld } from './world.js'; // Self export hack or just define them

export function isSolid(x, y, z) {
    const s = getSurfaceHeight(x, z);
    return y <= s && y > -1000;
}

export function updateWorld(scene, playerPos) {
    const px = Math.floor(playerPos.x / CHUNK_SIZE);
    const pz = Math.floor(playerPos.z / CHUNK_SIZE);
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            const key = `${px+x},${pz+z}`;
            if (!chunks.has(key)) createChunk(scene, px+x, pz+z);
        }
    }
    for (const [key, group] of chunks.entries()) {
        const [cx, cz] = key.split(',').map(Number);
        if (Math.abs(cx-px) > RENDER_DISTANCE+1 || Math.abs(cz-pz) > RENDER_DISTANCE+1) {
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
            const wx = cx*CHUNK_SIZE+x;
            const wz = cz*CHUNK_SIZE+z;
            const s = getSurfaceHeight(wx, wz);
            const lim = Math.max(-64, s-40);
            for (let y = s; y >= lim; y--) {
                const t = getBlockType(wx, y, wz);
                if (t) posData[t].push(wx, y, wz);
            }
        }
    }
    Object.keys(posData).forEach(t => {
        const arr = posData[t];
        if (arr.length === 0) return;
        const m = new THREE.InstancedMesh(geometry, MATS[t], arr.length/3);
        const o = new THREE.Object3D();
        for(let i=0; i<arr.length/3; i++) {
            o.position.set(arr[i*3], arr[i*3+1], arr[i*3+2]);
            o.updateMatrix();
            m.setMatrixAt(i, o.matrix);
        }
        group.add(m);
    });
    scene.add(group);
    chunks.set(`${cx},${cz}`, group);
}
