import * as THREE from 'three';

function createTexture(color, noiseFactor = 0.1) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 64, 64);
    
    for (let i = 0; i < 500; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${noiseFactor})` : `rgba(0,0,0,${noiseFactor})`;
        ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// --- TEXTURE DEFINITIONS ---
const t_grass = createTexture('#567d46', 0.15);
const t_dirt = createTexture('#8B4513', 0.1);
const t_stone = createTexture('#808080', 0.1);
const t_wood = createTexture('#5C4033', 0.2);
const t_leaf = createTexture('#228B22', 0.3);
const t_sand = createTexture('#E6C288', 0.1);
const t_bedrock = createTexture('#222222', 0.5);
const t_plank = createTexture('#A0522D', 0.05);

// --- MATERIALS ---
export const MATS = {
    GRASS: new THREE.MeshLambertMaterial({ map: t_grass }),
    DIRT: new THREE.MeshLambertMaterial({ map: t_dirt }),
    STONE: new THREE.MeshLambertMaterial({ map: t_stone }),
    WOOD: new THREE.MeshLambertMaterial({ map: t_wood }),
    LEAF: new THREE.MeshLambertMaterial({ map: t_leaf, transparent: true, opacity: 0.9 }),
    SAND: new THREE.MeshLambertMaterial({ map: t_sand }),
    BEDROCK: new THREE.MeshLambertMaterial({ map: t_bedrock }),
    PLANK: new THREE.MeshLambertMaterial({ map: t_plank }),
    WATER: new THREE.MeshLambertMaterial({ color: 0x40a4df, transparent: true, opacity: 0.6 })
};
