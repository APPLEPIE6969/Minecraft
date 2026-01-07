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

// --- CONTROLS & CLICK FIX (Moved to Top) ---
const controls = new PointerLockControls(camera, document.body);
const blocker = document.getElementById('blocker');
const settingsMenu = document.getElementById('settings-menu');
const craftingMenu = document.getElementById('crafting-menu');
let isMenuOpen = false;

// FIX: Listen to the BLOCKER (Whole Screen), not just the text
if (blocker) {
    blocker.addEventListener('click', () => {
        if (!isMenuOpen) controls.lock();
    });
}

controls.addEventListener('lock', () => {
    if(blocker) blocker.style.display = 'none';
    if(settingsMenu) settingsMenu.style.display = 'none';
    if(craftingMenu) craftingMenu.style.display = 'none';
    isMenuOpen = false;
});

controls.addEventListener('unlock', () => {
    if(!isMenuOpen && blocker) blocker.style.display = 'flex';
});

// --- SYSTEMS ---
// FIX: Safety check for Multiplayer (Prevents crash if server is offline)
let socket = null;
if (typeof io !== 'undefined') {
    socket = io();
} else {
    console.warn("Socket.io not found - Running in Singleplayer Mode");
}

const inventory = new Inventory();
let renderDistance = 3;
let sensitivity = 50;

// --- PLAYER ---
const startX = Math.floor(Math.random()*20);
const startZ = Math.floor(Math.random()*20);
let ground = 20;
try { ground = getSurfaceHeight(startX, startZ); } catch(e){}

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

// --- RAYCASTER ---
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0,0);
const placementGeo = new THREE.BoxGeometry(1,1,1);

function handleInteraction(button) {
    raycaster.setFromCamera(center, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = hits.find(h => h.distance < 5 && (h.object.isInstancedMesh || h.object.isMesh));

    if (hit) {
        // BREAK (Left Click)
        if (button === 0) {
            if (hit.object.isInstancedMesh) {
                const matrix = new THREE.Matrix4();
                hit.object.getMatrixAt(hit.instanceId, matrix);
                matrix.makeScale(0, 0, 0);
                hit.object.setMatrixAt(hit.instanceId, matrix);
                hit.object.instanceMatrix.needsUpdate = true;
                
                // Inventory Logic
                if(hit.object.material === MATS.WOOD) inventory.addItem('WOOD');
                else if(hit.object.material === MATS.STONE) inventory.addItem('STONE');
                else if(hit.object.material === MATS.DIRT) inventory.addItem('DIRT');
                else if(hit.object.material === MATS.DIAMOND) inventory.addItem('DIAMOND');
                else inventory.addItem('DIRT');
            } else if (hit.object !== placementGeo) {
                scene.remove(hit.object); // Remove placed blocks
            }
        }
        // PLACE (Right Click)
        if (button === 2) {
            const item = inventory.getSelectedItem();
            if (item && item.placeable) {
                const p = new THREE.Vector3().copy(hit.point).add(hit.face.normal).floor().addScalar(0.5);
                if (p.distanceTo(player.pos) > 1.5) {
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

// UI Toggles
function toggleSettings() {
    isMenuOpen = !isMenuOpen;
    if(isMenuOpen) {
        controls.unlock();
        if(settingsMenu) settingsMenu.style.display = 'block';
        if(blocker) blocker.style.display = 'none';
    } else {
        if(settingsMenu) settingsMenu.style.display = 'none';
        controls.lock();
    }
}
function toggleCrafting() {
    isMenuOpen = !isMenuOpen;
    if(isMenuOpen) {
        controls.unlock();
        if(craftingMenu) craftingMenu.style.display = 'block';
        inventory.updateCraftingUI();
        if(blocker) blocker.style.display = 'none';
    } else {
        if(craftingMenu) craftingMenu.style.display = 'none';
        controls.lock();
    }
}
if(document.getElementById('close-settings')) document.getElementById('close-settings').addEventListener('click', toggleSettings);

// --- MULTIPLAYER EVENTS ---
const otherPlayers = {};
const pMat = new THREE.MeshLambertMaterial({ color: 'red' });
const pGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);

if (socket) {
    socket.on('currentPlayers', players => {
        Object.keys(players).forEach(id => {
            if(id !== socket.id) {
                const m = new THREE.Mesh(pGeo, pMat);
                m.position.set(players[id].x, players[id].y, players[id].z);
                scene.add(m);
                otherPlayers[id] = m;
            }
        });
    });
    socket.on('newPlayer', data => {
        const m = new THREE.Mesh(pGeo, pMat);
        m.position.set(data.player.x, data.player.y, data.player.z);
        scene.add(m);
        otherPlayers[data.id] = m;
    });
    socket.on('playerMoved', data => {
        if(otherPlayers[data.id]) {
            otherPlayers[data.id].position.set(data.pos.x, data.pos.y, data.pos.z);
            otherPlayers[data.id].rotation.y = data.pos.r;
        }
    });
    socket.on('playerDisconnected', id => {
        if(otherPlayers[id]) { scene.remove(otherPlayers[id]); delete otherPlayers[id]; }
    });
}

// --- LOOP ---
const clock = new THREE.Clock();
const elCoords = document.getElementById('coords');
let emitTimer = 0;

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (controls.isLocked) {
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
        
        // PHYSICS
        const floorH = getSurfaceHeight(player.pos.x, player.pos.z);
        player.vel.y -= 30 * delta;
        player.pos.y += player.vel.y * delta;

        // Anti-Fall
        if (player.pos.y < floorH + 1.8) {
            player.pos.y = floorH + 1.8;
            player.vel.y = 0;
            if (keys.sp) player.vel.y = 10;
        }
        if (player.pos.y < -100) { player.pos.y = floorH + 20; player.vel.y = 0; }

        camera.position.copy(player.pos);
        
        // Socket Emit
        if (socket) {
            emitTimer += delta;
            if(emitTimer > 0.05) {
                emitTimer = 0;
                socket.emit('playerMovement', { x:player.pos.x, y:player.pos.y, z:player.pos.z, r:camera.rotation.y });
            }
        }

        if(elCoords) elCoords.innerText = `X: ${Math.floor(player.pos.x)} Y: ${Math.floor(player.pos.y)} Z: ${Math.floor(player.pos.z)}`;
    }

    if(mobManager) mobManager.update(delta, player.pos);
    if(minimap) minimap.update();
    updateWorld(scene, player.pos);
    renderer.render(scene, camera);
}

// Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

inventory.updateUI();
animate();
