import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateChunks, getHeight } from './world.js';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 70);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
scene.add(sun);

// Controls
const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());

// Input
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

// Force generate the chunk UNDER the player immediately so you don't fall
// The rest will load in background
updateChunks(scene, new THREE.Vector3(0,0,0)); 

// Set Spawn Point
const startY = getHeight(0, 0);
camera.position.set(0, startY + 5, 0);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // 1. Physics (Always runs, even if chunk isn't visible yet)
    if (controls.isLocked) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= gravity * delta;

        direction.z = Number(keys.w) - Number(keys.s);
        direction.x = Number(keys.d) - Number(keys.a);
        direction.normalize();

        if (keys.w || keys.s) velocity.z -= direction.z * 400.0 * delta;
        if (keys.a || keys.d) velocity.x -= direction.x * 400.0 * delta;

        // Floor Collision
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

    // 2. Stream chunks (Load 1 per frame)
    updateChunks(scene, camera.position);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
