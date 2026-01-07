import * as THREE from 'three';

// This function creates the ground
export function generateTerrain(scene) {
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x567d46, // Grass green
        side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // Return the plane so we can check for collisions later
    return [plane];
}

// This function creates a block at a specific position
export function placeBlock(scene, position) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Dirt brown
    const block = new THREE.Mesh(geometry, material);
    
    // Snap to grid
    block.position.copy(position).round();
    
    scene.add(block);
    return block;
}
