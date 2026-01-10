import * as THREE from 'three';

function createTexture(color, pattern = null, details = []) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; // Increased from 64 to 512 for 8x better quality
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Base color with gradient
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, adjustBrightness(color, 10));
    gradient.addColorStop(1, adjustBrightness(color, -10));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add high-quality texture noise
    for (let i = 0; i < 2000; i++) {
        const brightness = Math.random() > 0.5 ? 255 : 0;
        const alpha = Math.random() * 0.15 + 0.05;
        const size = Math.random() * 3 + 1;
        ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${alpha})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
    }
    
    // Add pattern overlay with enhanced details
    if (pattern === 'grass') {
        // Enhanced grass texture
        ctx.fillStyle = '#4a7c3e';
        ctx.fillRect(0, 0, 512, 128);
        
        // Add grass blades
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 160;
            const height = Math.random() * 20 + 10;
            const width = Math.random() * 4 + 2;
            
            ctx.fillStyle = `rgba(100, 150, 80, ${Math.random() * 0.4 + 0.4})`;
            ctx.fillRect(x, y, width, height);
        }
        
        // Add dirt patches
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `rgba(139, 105, 20, ${Math.random() * 0.3 + 0.1})`;
            ctx.beginPath();
            ctx.arc(Math.random() * 512, Math.random() * 128, Math.random() * 20 + 5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (pattern === 'wood') {
        // Enhanced wood grain
        for (let i = 0; i < 16; i++) {
            const y = i * 32;
            const gradient = ctx.createLinearGradient(0, y, 512, y + 32);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
            gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, y, 512, 32);
        }
        
        // Add wood knots
        for (let i = 0; i < 10; i++) {
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.2 + 0.1})`;
            ctx.beginPath();
            ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 15 + 5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (pattern === 'leaves') {
        // Enhanced leaf texture
        for (let i = 0; i < 150; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 16 + 8;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(${Math.random() * 50 + 50}, ${Math.random() * 50 + 150}, ${Math.random() * 50 + 50}, 0.9)`);
            gradient.addColorStop(1, `rgba(${Math.random() * 50}, ${Math.random() * 50 + 100}, ${Math.random() * 50}, 0.3)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (pattern === 'ore') {
        // Enhanced ore veins
        for (const detail of details) {
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const size = Math.random() * 16 + 8;
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
                gradient.addColorStop(0, detail);
                gradient.addColorStop(1, 'transparent');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x - size, y - size, size * 2, size * 2);
            }
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter; // Changed to Linear for smoother textures
    texture.minFilter = THREE.LinearMipmapLinearFilter; // Better mipmapping
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.anisotropy = 16; // Maximum anisotropic filtering
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
    GRASS: new THREE.MeshStandardMaterial({ 
        map: createTexture('#7cb342', 'grass'),
        roughness: 0.8,
        metalness: 0.0
    }),
    DIRT: new THREE.MeshStandardMaterial({ 
        map: createTexture('#8b6914'),
        roughness: 0.9,
        metalness: 0.0
    }),
    STONE: new THREE.MeshStandardMaterial({ 
        map: createTexture('#808080'),
        roughness: 0.7,
        metalness: 0.1
    }),
    WOOD: new THREE.MeshStandardMaterial({ 
        map: createTexture('#8b4513', 'wood'),
        roughness: 0.6,
        metalness: 0.0
    }),
    LEAF: new THREE.MeshStandardMaterial({ 
        map: createTexture('#228b22', 'leaves'),
        transparent: true,
        alphaTest: 0.1,
        roughness: 0.7,
        metalness: 0.0
    }),
    COAL: new THREE.MeshStandardMaterial({ 
        map: createTexture('#404040', 'ore', ['#000000', '#1a1a1a']),
        roughness: 0.8,
        metalness: 0.0
    }),
    IRON: new THREE.MeshStandardMaterial({ 
        map: createTexture('#d3d3d3', 'ore', ['#c4a574', '#d4b884']),
        roughness: 0.4,
        metalness: 0.8
    }),
    DIAMOND: new THREE.MeshStandardMaterial({ 
        map: createTexture('#b0e0e6', 'ore', ['#00ffff', '#00e5e5']),
        roughness: 0.2,
        metalness: 0.9
    }),
    BEDROCK: new THREE.MeshStandardMaterial({ 
        map: createTexture('#1a1a1a'),
        roughness: 0.9,
        metalness: 0.0
    })
};
