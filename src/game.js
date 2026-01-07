import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateChunks, getHeight } from './world.js';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
// Fog hides the chunk loading edge
scene.fog = new THREE.Fog(0x87CEEB, 10, 40); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    powerPreference: "high-performance", // Hints computer to use GPU
    antialias: false 
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// We switched to BasicMaterial (faster), so we don't strictly need lights,
// but we keep a simple one just in case you add other objects later.
const ambient = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambient);

// Controls
const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());

const keys = { w:false, a:false, s:false, d:false, space:false };
document.addEventListener('keydown', (e) => {
    if(e.code === 'KeyW') keys.w = true;
    if(e.code === 'KeyA') keys.a = true;
    if(e.code === 'KeyS') keys.s = true;
    if(e.code === 'KeyD') keys.d = true;
    if(e.code === 'Space') keys.space = true;
});
document.addEventListener('keyup', (e) => {
    if(e.code === 'KeyW') keys.w = false;
    if(e.code === 'KeyA') keys.a = false;
    if(e.code === 'KeyS') keys.s = false;
    if(e.code === 'KeyD') keys.d = false;
    if(e.code === 'Space') keys.space = false;
});

// Physics
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let canJump = false;
const gravity = 25.0;

// Force load spawn
updateChunks(scene, new THREE.Vector3(0,0,0)); 
const startY = getHeight(0, 0);
camera.position.set(0, startY + 5, 0);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (controls.isLocked) {
        // Friction: Slows you down when you stop pressing keys
        velocity.x -= velocity.x * 5.0 * delta; // Lower friction for smoother stop
        velocity.z -= velocity.z * 5.0 * delta;
        velocity.y -= gravity * delta;

        direction.z = Number(keys.w) - Number(keys.s);
        direction.x = Number(keys.d) - Number(keys.a);
        direction.normalize();

        // MOVEMENT SPEED ADJUSTMENT
        // Previous value: 400.0 (Too fast)
        // New value: 50.0 (Walking speed)
        if (keys.w || keys.s) velocity.z -= direction.z * 50.0 * delta;
        if (keys.a || keys.d) velocity.x -= direction.x * 50.0 * delta;

        // Ground Collision
        const groundHeight = getHeight(camera.position.x, camera.position.z);
        if (camera.position.y - 1.6 < groundHeight) {
            velocity.y = Math.max(0, velocity.y);
            camera.position.y = groundHeight + 1.6;
            canJump = true;
        }

        if (keys.space && canJump) {
            velocity.y = 10;
            canJump = false;
        }

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        camera.position.y += velocity.y * delta;
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
