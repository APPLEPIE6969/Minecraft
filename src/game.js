import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateChunks, getHeight, materials, geometry } from './world.js';

// --- INIT ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 10, 60);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- LIGHTS ---
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
scene.add(sun);

// --- CONTROLS ---
const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());

// --- INVENTORY SYSTEM ---
const hotbar = [materials.GRASS, materials.DIRT, materials.STONE, materials.WOOD, materials.LEAVES];
let selectedSlot = 0;

function selectSlot(index) {
    selectedSlot = index;
    // Update UI
    document.querySelectorAll('.slot').forEach((el, i) => {
        if(i === index) el.classList.add('active');
        else el.classList.remove('active');
    });
}

const keys = { w:0, a:0, s:0, d:0, space:0 };
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': keys.w = true; break;
        case 'KeyA': keys.a = true; break;
        case 'KeyS': keys.s = true; break;
        case 'KeyD': keys.d = true; break;
        case 'Space': keys.space = true; break;
        case 'Digit1': selectSlot(0); break;
        case 'Digit2': selectSlot(1); break;
        case 'Digit3': selectSlot(2); break;
        case 'Digit4': selectSlot(3); break;
        case 'Digit5': selectSlot(4); break;
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

// --- INTERACTION (Break & Place) ---
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0); // Screen center

// Selection Box (The wireframe cursor)
const selectorGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
const selectorMat = new THREE.LineBasicMaterial({ color: 0x000000 });
const selector = new THREE.LineSegments(new THREE.EdgesGeometry(selectorGeo), selectorMat);
selector.visible = false;
scene.add(selector);

document.addEventListener('mousedown', (e) => {
    if(!controls.isLocked) return;
    
    // Raycast from camera center
    raycaster.setFromCamera(center, camera);
    // Intersect all meshes in scene (simple but effective for this scale)
    const intersects = raycaster.intersectObjects(scene.children);

    // Filter out selector and non-meshes
    const validHit = intersects.find(hit => hit.object.isMesh && hit.distance < 8);

    if(validHit) {
        // Left Click (0) = Break
        if(e.button === 0) {
            scene.remove(validHit.object);
            validHit.object.geometry.dispose(); // Cleanup memory
        }
        // Right Click (2) = Place
        if(e.button === 2) {
            const pos = new THREE.Vector3().copy(validHit.point).add(validHit.face.normal);
            const newBlock = new THREE.Mesh(geometry, hotbar[selectedSlot]);
            // Snap to grid
            newBlock.position.copy(pos).floor().addScalar(0.5);
            scene.add(newBlock);
        }
    }
});

// --- PHYSICS VARIABLES ---
let velocityY = 0;
const gravity = 25.0;
const speed = 4.0;
const playerHeight = 1.6;
const bodyRadius = 0.3; 

// Initial Spawn
updateChunks(scene, new THREE.Vector3(0,0,0));
const startY = getHeight(0, 0);
camera.position.set(0, startY + 5, 0);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // 1. UPDATE SELECTOR (Highlight box)
    if(controls.isLocked) {
        raycaster.setFromCamera(center, camera);
        const intersects = raycaster.intersectObjects(scene.children);
        const validHit = intersects.find(hit => hit.object.isMesh && hit.distance < 8);
        if(validHit) {
            selector.visible = true;
            selector.position.copy(validHit.object.position);
        } else {
            selector.visible = false;
        }
    }

    if (controls.isLocked) {
        // 2. MOVEMENT
        const direction = new THREE.Vector3();
        direction.z = Number(keys.w) - Number(keys.s);
        direction.x = Number(keys.d) - Number(keys.a);
        direction.normalize();

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0; forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0; right.normalize();

        const moveX = (forward.x * direction.z + right.x * direction.x) * speed * delta;
        const moveZ = (forward.z * direction.z + right.z * direction.x) * speed * delta;

        camera.position.x += moveX;
        camera.position.z += moveZ;

        // 3. RAYCAST GRAVITY (The Real Physics Update)
        // Instead of Math, we shoot a ray DOWN from feet to find the floor.
        // This allows walking on placed blocks.
        const rayDown = new THREE.Raycaster(camera.position, new THREE.Vector3(0, -1, 0), 0, 10);
        const hits = rayDown.intersectObjects(scene.children);
        // Find closest mesh below us
        const ground = hits.find(h => h.object.isMesh);

        if (ground && ground.distance < playerHeight) {
            // We are on the ground
            velocityY = 0;
            camera.position.y = ground.point.y + playerHeight; // Snap to top
            
            if (keys.space) velocityY = 9; // Jump
        } else {
            // Falling
            velocityY -= gravity * delta;
        }

        camera.position.y += velocityY * delta;

        // "Void" safety (Respawn if fell through world)
        if(camera.position.y < -20) {
            camera.position.y = 50;
            velocityY = 0;
        }
    }

    // 4. GENERATE WORLD
    updateChunks(scene, camera.position);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
