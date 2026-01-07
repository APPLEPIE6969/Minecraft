import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateChunks, getHeight } from './world.js';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());

const keys = { w:false, a:false, s:false, d:false, space:false };
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': keys.w = true; break;
        case 'KeyA': keys.a = true; break;
        case 'KeyS': keys.s = true; break;
        case 'KeyD': keys.d = true; break;
        case 'Space': keys.space = true; break;
    }
});
document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': keys.w = false; break;
        case 'KeyA': keys.a = false; break;
        case 'KeyS': keys.s = false; break;
        case 'KeyD': keys.d = false; break;
        case 'Space': keys.space = false; break;
    }
});

// Physics Variables
let velocityY = 0;
const gravity = 25.0;
const speed = 4.0; // Minecraft Walk Speed (approx 4.3 m/s)

// Force load spawn
updateChunks(scene, new THREE.Vector3(0,0,0)); 
const startY = getHeight(0, 0);
camera.position.set(0, startY + 5, 0);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (controls.isLocked) {
        // 1. Calculate intended movement (X and Z)
        // We do NOT modify camera position yet.
        const direction = new THREE.Vector3();
        direction.z = Number(keys.w) - Number(keys.s);
        direction.x = Number(keys.d) - Number(keys.a);
        direction.normalize();

        // Convert direction to world coordinates
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0; forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0; right.normalize();

        const moveX = (forward.x * direction.z + right.x * direction.x) * speed * delta;
        const moveZ = (forward.z * direction.z + right.z * direction.x) * speed * delta;

        // 2. SURVIVAL COLLISION (The Wall Check)
        const currentPos = camera.position.clone();
        
        // Check X axis
        let targetX = currentPos.x + moveX;
        let heightAtTargetX = getHeight(Math.round(targetX), Math.round(currentPos.z));
        
        // If the block in front is higher than my knees (currentY - 1)
        // AND higher than my head (cannot step up)
        if (heightAtTargetX > currentPos.y - 1.0) {
            // It's a wall. Stop X movement.
            // Exception: If it's a small step (1 block), we can jump up later
             if (heightAtTargetX > currentPos.y + 0.5) {
                 // Too high, stop
                 targetX = currentPos.x;
             }
        }

        // Check Z axis
        let targetZ = currentPos.z + moveZ;
        let heightAtTargetZ = getHeight(Math.round(targetX), Math.round(targetZ));
        
        if (heightAtTargetZ > currentPos.y - 1.0) {
             if (heightAtTargetZ > currentPos.y + 0.5) {
                 targetZ = currentPos.z;
             }
        }

        // Apply Move
        camera.position.x = targetX;
        camera.position.z = targetZ;

        // 3. GRAVITY & JUMPING
        velocityY -= gravity * delta;
        
        // Check ground
        const groundHeight = getHeight(Math.round(camera.position.x), Math.round(camera.position.z));
        
        // Height of player eyes = 1.6
        if (camera.position.y - 1.6 <= groundHeight) {
            // Hit ground
            camera.position.y = groundHeight + 1.6;
            velocityY = 0;
            
            if (keys.space) {
                velocityY = 9; // Jump power
            }
        } else {
            camera.position.y += velocityY * delta;
        }
    }

    updateChunks(scene, camera.position);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
