import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateChunks, getBlock } from './world.js';
import { resolveCollision } from './physics.js';
import { player, updateHUD, handleInteraction } from './player.js';

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
scene.add(sun);

// --- INPUTS ---
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code.startsWith('Digit')) player.selectedSlot = parseInt(e.key) - 1;
    updateHUD();
});
document.addEventListener('keyup', (e) => keys[e.code] = false);
document.addEventListener('mousedown', (e) => {
    if (controls.isLocked) handleInteraction(camera, scene, e.button);
});

// --- VARIABLES ---
const velocity = new THREE.Vector3();
const speed = 0.15;
let isGrounded = false;

// Spawn
updateChunks(scene, 0, 0, 3);
camera.position.set(0, 10, 0);

// --- LOOP ---
function animate() {
    requestAnimationFrame(animate);

    if (controls.isLocked) {
        // 1. Input Physics
        if (keys['KeyW']) velocity.z = -speed;
        else if (keys['KeyS']) velocity.z = speed;
        else velocity.z = 0;

        if (keys['KeyA']) velocity.x = -speed;
        else if (keys['KeyD']) velocity.x = speed;
        else velocity.x = 0;

        if (keys['Space'] && isGrounded) velocity.y = 0.25; // Jump
        if (keys['ShiftLeft']) velocity.y = -0.1; // Sneak

        // Apply Rotation to Velocity
        const v = velocity.clone();
        v.applyQuaternion(camera.quaternion);
        // Remove Y influence from Walk
        if(!keys['Space']) v.y = velocity.y; 

        // Gravity
        v.y -= 0.01; 

        // 2. Resolve Collision
        // We pass the camera position directly to move it
        isGrounded = resolveCollision(camera.position, v);
    }

    renderer.render(scene, camera);
}

updateHUD(); // Init UI
animate();
