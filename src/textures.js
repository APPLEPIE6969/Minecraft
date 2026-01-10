import * as THREE from 'three';

function createTexture(color, pattern = null, details = []) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 64, 64);
    
    // Add texture noise
    for (let i = 0; i < 500; i++) {
        const brightness = Math.random() > 0.5 ? 255 : 0;
        const alpha = Math.random() * 0.2 + 0.1;
        ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${alpha})`;
        ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
    }
    
    // Add pattern overlay
    if (pattern === 'grass') {
        // Grass has green top, brown bottom
        ctx.fillStyle = '#4a7c3e';
        ctx.fillRect(0, 0, 64, 16);
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = 'rgba(100, 150, 80, 0.6)';
            ctx.fillRect(Math.random() * 64, Math.random() * 20, 3, 8);
        }
    } else if (pattern === 'wood') {
        // Wood grain
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(i * 8, 0, 2, 64);
        }
    } else if (pattern === 'leaves') {
        // Leaf texture
        for (let i = 0; i < 30; i++) {
            ctx.fillStyle = `rgba(${Math.random() * 50}, ${Math.random() * 50 + 100}, ${Math.random() * 50}, 0.8)`;
            ctx.beginPath();
            ctx.arc(Math.random() * 64, Math.random() * 64, Math.random() * 8 + 4, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (pattern === 'ore') {
        // Ore veins
        for (const detail of details) {
            ctx.fillStyle = detail;
            for (let i = 0; i < 15; i++) {
                const x = Math.random() * 64;
                const y = Math.random() * 64;
                ctx.fillRect(x, y, 4 + Math.random() * 4, 4 + Math.random() * 4);
            }
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
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
