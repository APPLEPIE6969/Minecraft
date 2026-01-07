import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateWorld, getBlockHeight, isSolid } from './world.js';

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 60); // Hides chunk loading

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(50, 80, 50);
sun.castShadow = true;
scene.add(sun);

// Controls
const controls = new PointerLockControls(camera, document.body);
document.getElementById('ui').addEventListener('click', () => {
    controls.lock();
    document.getElementById('ui').style.display = 'none';
});

// --- PHYSICS VARIABLES ---
const player = {
    pos: new THREE.Vector3(0, 20, 0),
    vel: new THREE.Vector3(0, 0, 0),
    speed: 5.0,
    width: 0.6, // Player width
    height: 1.8 // Player height
};

const keys = { w:0, a:0, s:0, d:0, space:0, shift:0 };
document.addEventListener('keydown', (e) => {
    if(e.code==='KeyW') keys.w=1;
    if(e.code==='KeyS') keys.s=1;
    if(e.code==='KeyA') keys.a=1;
    if(e.code==='KeyD') keys.d=1;
    if(e.code==='Space') keys.space=1;
    if(e.code==='ShiftLeft') keys.shift=1;
});
document.addEventListener('keyup', (e) => {
    if(e.code==='KeyW') keys.w=0;
    if(e.code==='KeyS') keys.s=0;
    if(e.code==='KeyA') keys.a=0;
    if(e.code==='KeyD') keys.d=0;
    if(e.code==='Space') keys.space=0;
    if(e.code==='ShiftLeft') keys.shift=0;
});

// Initial Spawn
camera.position.set(0, 30, 0);
updateWorld(scene, camera.position);

// --- COLLISION FUNCTION ---
function checkCollision(x, y, z) {
    // Check if the player's bounding box intersects with a solid block
    // We check the corners of the player's "feet" and "head"
    const startX = Math.floor(x - player.width/2);
    const endX   = Math.floor(x + player.width/2);
    const startZ = Math.floor(z - player.width/2);
    const endZ   = Math.floor(z + player.width/2);
    const startY = Math.floor(y);
    const endY   = Math.floor(y + player.height);

    for (let bx = startX; bx <= endX; bx++) {
        for (let bz = startZ; bz <= endZ; bz++) {
            for (let by = startY; by < endY; by++) {
                if (isSolid(bx, by, bz)) {
                    return true; // Hit a block
                }
            }
        }
    }
    return false;
}

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    // Use fixed time step for consistent physics (prevents falling through floor)
    const delta = Math.min(clock.getDelta(), 0.1); 

    if (controls.isLocked) {
        
        // 1. HORIZONTAL MOVEMENT
        let mx = 0, mz = 0;
        if(keys.w) mz -= 1;
        if(keys.s) mz += 1;
        if(keys.a) mx -= 1;
        if(keys.d) mx += 1;

        // Apply Speed & Direction
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0; forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0; right.normalize();

        const moveVec = new THREE.Vector3();
        moveVec.add(forward.multiplyScalar(-mz)); // Wait, forward is -z
        moveVec.add(right.multiplyScalar(mx));
        moveVec.normalize().multiplyScalar(player.speed * delta);
        if(keys.shift) moveVec.multiplyScalar(1.5); // Sprint

        // X Collision
        if (!checkCollision(player.pos.x + moveVec.x, player.pos.y, player.pos.z)) {
            player.pos.x += moveVec.x;
        }
        // Z Collision
        if (!checkCollision(player.pos.x, player.pos.y, player.pos.z + moveVec.z)) {
            player.pos.z += moveVec.z;
        }

        // 2. GRAVITY & JUMPING
        player.vel.y -= 15 * delta; // Gravity (15m/s^2)

        // Predict Y movement
        if (!checkCollision(player.pos.x, player.pos.y + player.vel.y * delta, player.pos.z)) {
            player.pos.y += player.vel.y * delta;
        } else {
            // We hit something
            if (player.vel.y < 0) {
                // Hitting floor
                player.vel.y = 0;
                // Snap to integer to prevent jitter
                player.pos.y = Math.round(player.pos.y); 
                
                if (keys.space) {
                    player.vel.y = 8; // Jump Force
                }
            } else {
                // Hitting Head
                player.vel.y = 0;
            }
        }
        
        // Void Safety
        if (player.pos.y < -30) {
            player.pos.y = 60;
            player.vel.y = 0;
        }

        camera.position.copy(player.pos);
        camera.position.y += 1.6; // Eye height
    }

    // World Generation
    updateWorld(scene, camera.position);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
