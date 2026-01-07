import * as THREE from 'three';

// Procedural Texture Generator
function createTexture(color, noise = 0.1, spots = []) {
    const cvs = document.createElement('canvas'); cvs.width = 64; cvs.height = 64;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0,0,64,64);
    
    // Noise
    for(let i=0; i<400; i++) {
        ctx.fillStyle = Math.random()>0.5?`rgba(255,255,255,${noise})`:`rgba(0,0,0,${noise})`;
        ctx.fillRect(Math.random()*64, Math.random()*64, 2, 2);
    }

    // Ore Spots
    if(spots.length > 0) {
        spots.forEach(spotColor => {
            for(let i=0; i<10; i++) { // 10 ore chunks
                ctx.fillStyle = spotColor;
                const cx = Math.random()*50; const cy = Math.random()*50;
                ctx.fillRect(cx, cy, 10, 10); // Big pixel ore
            }
        });
    }

    const tex = new THREE.CanvasTexture(cvs);
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export const MATS = {
    GRASS: new THREE.MeshLambertMaterial({ map: createTexture('#567d46') }),
    DIRT:  new THREE.MeshLambertMaterial({ map: createTexture('#8B4513') }),
    STONE: new THREE.MeshLambertMaterial({ map: createTexture('#808080') }),
    WOOD:  new THREE.MeshLambertMaterial({ map: createTexture('#5C4033') }),
    LEAF:  new THREE.MeshLambertMaterial({ map: createTexture('#228B22') }),
    // ORES
    COAL:    new THREE.MeshLambertMaterial({ map: createTexture('#808080', 0.1, ['#000000']) }),
    IRON:    new THREE.MeshLambertMaterial({ map: createTexture('#808080', 0.1, ['#E6C288']) }),
    DIAMOND: new THREE.MeshLambertMaterial({ map: createTexture('#808080', 0.1, ['#00FFFF']) }),
    // UTILS
    BEDROCK: new THREE.MeshLambertMaterial({ map: createTexture('#111111') })
};
