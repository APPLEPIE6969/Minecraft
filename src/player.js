import * as THREE from 'three';
import { BLOCKS, setBlock } from './world.js';

export const player = {
    hp: 10,
    hunger: 10,
    inventory: [BLOCKS.GRASS, BLOCKS.DIRT, BLOCKS.STONE, BLOCKS.PLANK, BLOCKS.WOOD],
    selectedSlot: 0,
    mode: 'survival' // or 'creative'
};

// Update UI
export function updateHUD() {
    let hearts = "❤️".repeat(player.hp);
    let food = "🍗".repeat(player.hunger);
    document.getElementById('stats').innerHTML = `${hearts}<br>${food}`;
    
    // Hotbar UI
    document.querySelectorAll('.slot').forEach((el, i) => {
        el.style.borderColor = (i === player.selectedSlot) ? 'white' : '#555';
    });
}

// Raycast interaction
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);

export function handleInteraction(camera, scene, mouseBtn) {
    raycaster.setFromCamera(center, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    // Find closest block
    const hit = intersects.find(i => i.distance < 6 && i.object.isMesh);
    
    if (hit) {
        if (mouseBtn === 0) { // Left Click: Break
            scene.remove(hit.object);
            const p = hit.object.position;
            setBlock(p.x, p.y, p.z, BLOCKS.AIR);
        }
        if (mouseBtn === 2) { // Right Click: Place
            const p = new THREE.Vector3().copy(hit.point).add(hit.face.normal).floor();
            
            // Don't place inside player
            if (p.distanceTo(camera.position) > 1.5) {
                // Create temp mesh (real mesh appears on chunk update)
                // For now we rely on chunk update or quick reload
                // Just setting logic data:
                setBlock(p.x, p.y, p.z, player.inventory[player.selectedSlot]);
                
                // Force a reload signal (simplification)
                location.reload(); // Quick cheat to redraw world for this basic engine
                // *In a full engine, you would just addMesh() here*
            }
        }
    }
}
