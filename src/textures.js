import * as THREE from 'three';

function createTexture(color, pattern = null, details = []) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; // 4K textures
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);
    
    // Add texture noise
    for (let i = 0; i < 1000; i++) {
        const brightness = Math.random() > 0.5 ? 255 : 0;
        const alpha = Math.random() * 0.2 + 0.1;
        ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${alpha})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    
    // Add pattern overlay
    if (pattern === 'grass') {
        // Grass has green top, brown bottom
        ctx.fillStyle = '#4a7c3e';
        ctx.fillRect(0, 0, 256, 64);
        for (let i = 0; i < 100; i++) {
            ctx.fillStyle = 'rgba(100, 150, 80, 0.6)';
            ctx.fillRect(Math.random() * 256, Math.random() * 80, 6, 16);
        }
    } else if (pattern === 'wood') {
        // Wood grain
        for (let i = 0; i < 16; i++) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(i * 16, 0, 4, 256);
        }
    } else if (pattern === 'leaves') {
        // Leaf texture
        for (let i = 0; i < 60; i++) {
            ctx.fillStyle = `rgba(${Math.random() * 50}, ${Math.random() * 50 + 100}, ${Math.random() * 50}, 0.8)`;
            ctx.beginPath();
            ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 16 + 8, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (pattern === 'ore') {
        // Ore veins
        for (const detail of details) {
            ctx.fillStyle = detail;
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * 256;
                const y = Math.random() * 256;
                ctx.fillRect(x, y, 8 + Math.random() * 8, 8 + Math.random() * 8);
            }
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; // Back to Nearest for blocky look
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function adjustBrightness(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

export const MATS = {
    GRASS: new THREE.MeshLambertMaterial({ map: createTexture('#7cb342', 'grass') }),
    DIRT: new THREE.MeshLambertMaterial({ map: createTexture('#8b6914') }),
    STONE: new THREE.MeshLambertMaterial({ map: createTexture('#808080') }),
    WOOD: new THREE.MeshLambertMaterial({ map: createTexture('#8b4513', 'wood') }),
    LEAF: new THREE.MeshLambertMaterial({ 
        map: createTexture('#228b22', 'leaves'),
        transparent: true,
        alphaTest: 0.1
    }),
    COAL: new THREE.MeshLambertMaterial({ 
        map: createTexture('#404040', 'ore', ['#000000', '#1a1a1a'])
    }),
    IRON: new THREE.MeshLambertMaterial({ 
        map: createTexture('#d3d3d3', 'ore', ['#c4a574', '#d4b884'])
    }),
    DIAMOND: new THREE.MeshLambertMaterial({ 
        map: createTexture('#b0e0e6', 'ore', ['#00ffff', '#00e5e5'])
    }),
    BEDROCK: new THREE.MeshLambertMaterial({ map: createTexture('#1a1a1a') })
};
