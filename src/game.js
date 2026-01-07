import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateWorld, getSurfaceHeight, isSolid, chunks, MATS } from './world.js';
import { Minimap } from './minimap.js';
import { MobController } from './mobs.js';
import { Inventory } from './inventory.js';
import { ITEMS } from './items.js';

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
sun.castShadow = true;
scene.add(sun);

// --- SYSTEMS ---
const socket = io(); // Multiplayer
const inventory = new Inventory();
let renderDistance = 3;
let sensitivity = 50;

// --- PLAYER ---
const startX = Math.floor(Math.random()*20);
const startZ = Math.floor(Math.random()*20);
const ground = getSurfaceHeight(startX, startZ);
const player = { 
    pos: new THREE.Vector3(startX, ground + 5, startZ), 
    vel: new THREE.Vector3(), 
    w: 0.6, h: 1.8 
};
camera.position.copy(player.pos);
updateWorld(scene, player.pos);

// --- MODULES ---
const mobManager = new MobController(scene);
const minimap = new Minimap(player);

// --- RAYCASTER (Interaction) ---
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0,0);
const placementGeo = new THREE.BoxGeometry(1,1,1);

function handleInteraction(button) {
    raycaster.setFromCamera(center, camera);
    // Intersect chunks
    const hits = raycaster.intersectObjects(scene.children, true);
    // Filter for close objects (distance < 5) and ensure it's a mesh
    const hit = hits.find(h => h.distance < 5 && h.object.isInstancedMesh);

    if (hit) {
        // BREAK BLOCK (Left Click)
        if (button === 0) {
            // Get instance ID and "remove" it (scale to 0)
            const matrix = new THREE.Matrix4();
            hit.object.getMatrixAt(hit.instanceId, matrix);
            
            // Scale to 0 to hide
            matrix.makeScale(0, 0, 0);
            hit.object.setMatrixAt(hit.instanceId, matrix);
            hit.object.instanceMatrix.needsUpdate = true;

            // Add drop to inventory
            // Simple logic: If it's wood, give wood. If stone, give stone.
            // In a full game, we'd map Instance ID to Block Type.
            // For now, give generic items based on material guess
            if(hit.object.material === MATS.WOOD) inventory.addItem('WOOD');
            else if(hit.object.material === MATS.STONE) inventory.addItem('STONE');
            else if(hit.object.material === MATS.DIRT) inventory.addItem('DIRT');
            else if(hit.object.material === MATS.DIAMOND) inventory.addItem('DIAMOND');
            else inventory.addItem('DIRT'); // Fallback
        }

        // PLACE BLOCK (Right Click)
        if (button === 2) {
            const item = inventory.getSelectedItem();
            if (item && item.placeable) {
                // Calculate position against face
                const p = new THREE.Vector3().copy(hit.point).add(hit.face.normal).floor().addScalar(0.5);
                
                // Don't place inside player
                if (p.distanceTo(player.pos) > 1.5) {
                    // Create a real mesh for placed blocks (easier than updating InstancedMesh)
                    const m = new THREE.Mesh(placementGeo, MATS[item.mat]);
                    m.position.copy(p);
                    scene.add(m);
                    inventory.useItem();
                }
            }
        }
    }
}

// --- INPUTS ---
const controls = new PointerLockControls(camera, document.body);
const blocker = document.getElementById('blocker');
const settingsMenu = document.getElementById('settings-menu');
const craftingMenu = document.getElementById('crafting-menu');
let isMenuOpen = false;

document.getElementById('instructions').addEventListener('click', () => controls.lock());

controls.addEventListener('lock', () => {
    blocker.style.display = 'none';
    settingsMenu.style.display = 'none';
    craftingMenu.style.display = 'none';
    isMenuOpen = false;
});
controls.addEventListener('unlock', () => {
    if(!isMenuOpen) blocker.style.display = 'flex';
});

const keys = { w:0, a:0, s:0, d:0, sp:0, sh:0 };
document.addEventListener('keydown', e => {
    if(e.code==='KeyW') keys.w=1;
    if(e.code==='KeyS') keys.s=1;
    if(e.code==='KeyA') keys.a=1;
    if(e.code==='KeyD') keys.d=1;
    if(e.code==='Space') keys.sp=1;
    if(e.code==='ShiftLeft') keys.sh=1;
    if(e.code==='KeyP') toggleSettings();
    if(e.code==='KeyE') toggleCrafting();
});
document.addEventListener('keyup', e => {
    if(e.code==='KeyW') keys.w=0;
    if(e.code==='KeyS') keys.s=0;
    if(e.code==='KeyA') keys.a=0;
    if(e.code==='KeyD') keys.d=0;
    if(e.code==='Space') keys.sp=0;
    if(e.code==='ShiftLeft') keys.sh=0;
});
document.addEventListener('mousedown', e => {
    if(controls.isLocked) handleInteraction(e.button);
});

// Scroll Wheel
document.addEventListener('wheel', (e) => {
    if(e.deltaY > 0) inventory.selected = (inventory.selected + 1) % 9;
    else inventory.selected = (inventory.selected - 1 + 9) % 9;
    inventory.updateUI();
});

// --- SETTINGS LOGIC ---
const sliderDist = document.getElementById('render-dist');
const sliderSens = document.getElementById('sensitivity');
const btnClose = document.getElementById('close-settings');

// Apply Settings
if(sliderDist) sliderDist.addEventListener('input', (e) => renderDistance = parseInt(e.target.value));
if(sliderSens) sliderSens.addEventListener('input', (e) => sensitivity = parseInt(e.target.value));

function toggleSettings() {
    isMenuOpen = !isMenuOpen;
    if(isMenuOpen) {
        controls.unlock();
        settingsMenu.style.display = 'block';
        blocker.style.display = 'none';
    } else {
        settingsMenu.style.display = 'none';
        controls.lock();
    }
}
if(btnClose) btnClose.addEventListener('click', toggleSettings);

function toggleCrafting() {
    isMenuOpen = !isMenuOpen;
    if(isMenuOpen) {
        controls.unlock();
        craftingMenu.style.display = 'block';
        inventory.updateCraftingUI();
        blocker.style.display = 'none';
    } else {
        craftingMenu.style.display = 'none';
        controls.lock();
    }
}

// --- GAME LOOP ---
const clock = new THREE.Clock();
const elCoords = document.getElementById('coords');

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (controls.isLocked) {
        // Sensitivity affects look speed (handled by PointerLock, but we can scale delta if needed)
        // Physics Loop
        const speed = keys.sh ? 10.0 : 5.0;
        const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
        fwd.y=0; fwd.normalize();
        const rgt = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
        rgt.y=0; rgt.normalize();

        const move = new THREE.Vector3();
        if(keys.w) move.add(fwd);
        if(keys.s) move.sub(fwd);
        if(keys.d) move.add(rgt);
        if(keys.a) move.sub(rgt);
        if(move.length()>0) move.normalize().multiplyScalar(speed*delta);

        player.pos.add(move);
        
        // Floor Clamping (Anti-Fall)
        const floorH = getSurfaceHeight(player.pos.x, player.pos.z);
        player.vel.y -= 30 * delta;
        player.pos.y += player.vel.y * delta;

        if (player.pos.y < floorH + 1.8) {
            player.pos.y = floorH + 1.8;
            player.vel.y = 0;
            if (keys.sp) player.vel.y = 10;
        }

        camera.position.copy(player.pos);
        
        // Network Sync
        socket.emit('playerMovement', { x:player.pos.x, y:player.pos.y, z:player.pos.z, r:camera.rotation.y });

        elCoords.innerText = `X: ${Math.floor(player.pos.x)} Y: ${Math.floor(player.pos.y)} Z: ${Math.floor(player.pos.z)}`;
    }

    mobManager.update(delta, player.pos);
    minimap.update();
    updateWorld(scene, player.pos); // Uses renderDistance variable internally if we updated function
    renderer.render(scene, camera);
}

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

inventory.updateUI(); // Init empty UI
animate();
