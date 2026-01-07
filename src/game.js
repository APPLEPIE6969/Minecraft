import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateChunks, getHeight } from './world.js';

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 60); // Distance fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false }); // False is better for pixel art style
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- LIGHTS ---
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
scene.add(sun);

// --- CONTROLS ---
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

// --- PHYSICS VARIABLES ---
const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();
let canJump = false;
const gravity = 30.0; // Gravity strength
const speed = 10.0;   // Walk speed

// Set Initial Spawn (Find a safe height)
const startHeight = getHeight(0, 0);
camera.position.set(0, startHeight + 2, 0);
document.getElementById('loading').style.display = 'none';

// --- ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // 1. Generate Infinite Terrain
    updateChunks(scene, camera.position);

    if (controls.isLocked) {
        // 2. Physics & Gravity
        playerVelocity.x -= playerVelocity.x * 10.0 * delta;
        playerVelocity.z -= playerVelocity.z * 10.0 * delta;
        playerVelocity.y -= gravity * delta; // Apply gravity

        playerDirection.z = Number(keys.w) - Number(keys.s);
        playerDirection.x = Number(keys.d) - Number(keys.a);
        playerDirection.normalize();

        if (keys.w || keys.s) playerVelocity.z -= playerDirection.z * 400.0 * delta;
        if (keys.a || keys.d) playerVelocity.x -= playerDirection.x * 400.0 * delta;

        // 3. Collision Detection (Floor)
        // We calculate the ground height at the player's EXACT position
        const groundHeight = getHeight(camera.position.x, camera.position.z);
        
        // The player is 1.6 units tall. If the camera Y is below ground + 1.6, we hit the floor.
        if (camera.position.y - 1.6 < groundHeight) {
            playerVelocity.y = Math.max(0, playerVelocity.y);
            camera.position.y = groundHeight + 1.6; // Snap to top of block
            canJump = true;
        }

        // Jump
        if (keys.space && canJump) {
            playerVelocity.y = 12; // Jump force
            canJump = false;
        }

        controls.moveRight(-playerVelocity.x * delta);
        controls.moveForward(-playerVelocity.z * delta);
        
        // Apply Y movement manually since PointerLockControls only does X/Z
        camera.position.y += playerVelocity.y * delta;
    }

    renderer.render(scene, camera);
}

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
