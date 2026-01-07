import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateWorld, getSurfaceHeight } from './world.js';
import { Minimap } from './minimap.js';

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
scene.add(sun);

// --- MULTIPLAYER ---
const socket = io();
const otherPlayers = {};
const pMat = new THREE.MeshLambertMaterial({ color: 'red' });
const pGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);

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

// --- PLAYER ---
const startX = Math.floor(Math.random()*20);
const startZ = Math.floor(Math.random()*20);
const ground = getSurfaceHeight(startX, startZ);
const player = { 
    pos: new THREE.Vector3(startX, ground + 2, startZ), 
    vel: new THREE.Vector3(), w: 0.6, h: 1.8 
};

camera.position.copy(player.pos);
updateWorld(scene, player.pos);

// --- MODULES ---
const minimap = new Minimap(player);

// --- UI & INPUT ---
const controls = new PointerLockControls(camera, document.body);
const blocker = document.getElementById('blocker');
const settingsMenu = document.getElementById('settings-menu');
let isSettingsOpen = false;

// Start Game
document.getElementById('instructions').addEventListener('click', () => controls.lock());

controls.addEventListener('lock', () => {
    blocker.style.display = 'none';
    settingsMenu.style.display = 'none';
    isSettingsOpen = false;
});
controls.addEventListener('unlock', () => {
    if(!isSettingsOpen) blocker.style.display = 'flex';
});

// Keys
const keys = { w:0, a:0, s:0, d:0, sp:0, sh:0 };
document.addEventListener('keydown', e => {
    if(e.code==='KeyW') keys.w=1;
    if(e.code==='KeyS') keys.s=1;
    if(e.code==='KeyA') keys.a=1;
    if(e.code==='KeyD') keys.d=1;
    if(e.code==='Space') keys.sp=1;
    if(e.code==='ShiftLeft') keys.sh=1;
    if(e.code==='KeyP') toggleSettings(); // P for Settings
});
document.addEventListener('keyup', e => {
    if(e.code==='KeyW') keys.w=0;
    if(e.code==='KeyS') keys.s=0;
    if(e.code==='KeyA') keys.a=0;
    if(e.code==='KeyD') keys.d=0;
    if(e.code==='Space') keys.sp=0;
    if(e.code==='ShiftLeft') keys.sh=0;
});

// Scroll Wheel (Hotbar)
const slots = document.querySelectorAll('.slot');
let selectedSlot = 0;
document.addEventListener('wheel', (e) => {
    if(e.deltaY > 0) selectedSlot++;
    else selectedSlot--;
    
    if(selectedSlot > 6) selectedSlot = 0;
    if(selectedSlot < 0) selectedSlot = 6;
    
    slots.forEach((s, i) => {
        if(i === selectedSlot) s.classList.add('selected');
        else s.classList.remove('selected');
    });
});

function toggleSettings() {
    isSettingsOpen = !isSettingsOpen;
    if(isSettingsOpen) {
        controls.unlock();
        settingsMenu.style.display = 'block';
        blocker.style.display = 'none';
    } else {
        settingsMenu.style.display = 'none';
        controls.lock();
    }
}

// Close settings button
document.getElementById('close-settings').addEventListener('click', toggleSettings);

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

        // --- PHYSICS: FLOOR CLAMPING (Crucial Fix) ---
        // 1. Get exact height of terrain at current X,Z
        const floorH = getSurfaceHeight(player.pos.x, player.pos.z);
        
        // 2. Gravity
        player.vel.y -= 30 * delta;
        player.pos.y += player.vel.y * delta;

        // 3. Clamp
        // If feet are below floor, SNAP up.
        if (player.pos.y < floorH + 1.8) {
            player.pos.y = floorH + 1.8;
            player.vel.y = 0;
            if (keys.sp) player.vel.y = 10; // Jump
        }

        // Void Safety
        if (player.pos.y < -100) {
            player.pos.y = floorH + 20;
            player.vel.y = 0;
        }

        camera.position.copy(player.pos);
        camera.position.y += 0; // Already centered on eyes

        // Multiplayer Sync
        emitTimer += delta;
        if(emitTimer > 0.05) {
            emitTimer = 0;
            socket.emit('playerMovement', { x:player.pos.x, y:player.pos.y, z:player.pos.z, r:camera.rotation.y });
        }

        elCoords.innerText = `X: ${Math.floor(player.pos.x)} Y: ${Math.floor(player.pos.y)} Z: ${Math.floor(player.pos.z)}`;
    }

    minimap.update();
    updateWorld(scene, player.pos);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
