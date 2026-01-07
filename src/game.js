import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { generateChunk, getBlockMaterial, HOTBAR } from './world.js';

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Start high up so we don't spawn inside a mountain
camera.position.set(0, 10, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- LIGHTS ---
const ambient = new THREE.AmbientLight(0xaaaaaa);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(50, 50, 50);
sun.castShadow = true;
scene.add(sun);

// --- CONTROLS ---
const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => {
    if (!controls.isLocked) controls.lock();
});

// Keys
const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'w': keys.w = true; break;
        case 'a': keys.a = true; break;
        case 's': keys.s = true; break;
        case 'd': keys.d = true; break;
        case ' ': keys.space = true; break;
        case 'shift': keys.shift = true; break;
        // Inventory Selection
        case '1': selectSlot(0); break;
        case '2': selectSlot(1); break;
        case '3': selectSlot(2); break;
        case '4': selectSlot(3); break;
        case '5': selectSlot(4); break;
    }
});
document.addEventListener('keyup', (e) => {
    switch(e.key.toLowerCase()) {
        case 'w': keys.w = false; break;
        case 'a': keys.a = false; break;
        case 's': keys.s = false; break;
        case 'd': keys.d = false; break;
        case ' ': keys.space = false; break;
        case 'shift': keys.shift = false; break;
    }
});

// --- INVENTORY SYSTEM ---
let selectedBlockType = HOTBAR[0];

function selectSlot(index) {
    selectedBlockType = HOTBAR[index];
    // Update UI
    document.querySelectorAll('.slot').forEach(el => el.classList.remove('selected'));
    document.getElementById(`slot${index+1}`).classList.add('selected');
}

// --- WORLD ---
const chunks = generateChunk(scene);
let allBlocks = [...chunks]; 

// --- INTERACTION ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0,0);

document.addEventListener('mousedown', (event) => {
    if (!controls.isLocked) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(allBlocks);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        
        // Left Click (0) = Destroy
        if (event.button === 0) {
            scene.remove(intersect.object);
            // Remove from array (slow method but works for now)
            allBlocks = allBlocks.filter(b => b !== intersect.object);
        }
        
        // Right Click (2) = Place
        if (event.button === 2) {
            const pos = new THREE.Vector3().copy(intersect.point).add(intersect.face.normal);
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = getBlockMaterial(selectedBlockType);
            const newBlock = new THREE.Mesh(geometry, material);
            
            newBlock.position.copy(pos).floor().addScalar(0.5);
            
            scene.add(newBlock);
            allBlocks.push(newBlock);
        }
    }
});

// --- PHYSICS (Simple Gravity) ---
let velocityY = 0;
const gravity = -0.5; // Gravity strength

function updatePhysics() {
    // Very simple collision detection (Floor at Y= -3 roughly)
    // Real Minecraft needs AABB collision, this is a placeholder
    if (camera.position.y > 2) {
        velocityY += gravity * 0.05;
    } else {
        velocityY = 0;
        camera.position.y = 2; // Snap to ground
    }
    
    if (keys.space && camera.position.y <= 2.1) {
        velocityY = 0.2; // Jump
    }
    
    camera.position.y += velocityY;
}

// --- ANIMATION ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (controls.isLocked) {
        updatePhysics();
        
        const speed = 10 * delta;
        if (keys.w) controls.moveForward(speed);
        if (keys.s) controls.moveForward(-speed);
        if (keys.a) controls.moveRight(-speed);
        if (keys.d) controls.moveRight(speed);
        if (keys.shift) camera.position.y -= speed; // Fly down/Sneak
    }

    renderer.render(scene, camera);
}

// Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
