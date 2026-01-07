import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateWorld, isSolid } from './world.js';
import { MobController } from './mobs.js'; // Ensure you still have mobs.js

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 15, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
scene.add(sun);

const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());

// --- UI ELEMENTS ---
const elCoords = document.getElementById('coords');
const elPlayers = document.getElementById('players');
const elHealth = document.getElementById('health-bar');
const elHunger = document.getElementById('hunger-bar');

const player = { 
    pos: new THREE.Vector3(0, 30, 0), 
    vel: new THREE.Vector3(), 
    hp: 100,
    hunger: 100
};
const keys = { w:0, a:0, s:0, d:0, sp:0, sh:0 };

document.addEventListener('keydown', e => {
    if(e.code==='KeyW') keys.w=1;
    if(e.code==='KeyS') keys.s=1;
    if(e.code==='KeyA') keys.a=1;
    if(e.code==='KeyD') keys.d=1;
    if(e.code==='Space') keys.sp=1;
    if(e.code==='ShiftLeft') keys.sh=1;
});
document.addEventListener('keyup', e => {
    if(e.code==='KeyW') keys.w=0;
    if(e.code==='KeyS') keys.s=0;
    if(e.code==='KeyA') keys.a=0;
    if(e.code==='KeyD') keys.d=0;
    if(e.code==='Space') keys.sp=0;
    if(e.code==='ShiftLeft') keys.sh=0;
});

updateWorld(scene, player.pos);

// Physics Helper
function checkCol(x, y, z) {
    // Check center and feet
    if (isSolid(Math.floor(x), Math.floor(y), Math.floor(z))) return true;
    if (isSolid(Math.floor(x), Math.floor(y+1), Math.floor(z))) return true;
    return false;
}

const clock = new THREE.Clock();
let hungerTimer = 0;

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (controls.isLocked) {
        // --- MOVEMENT ---
        const speed = keys.sh ? 8.0 : 4.3; // Sprinting
        
        const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
        fwd.y=0; fwd.normalize();
        const rgt = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
        rgt.y=0; rgt.normalize();

        const move = new THREE.Vector3();
        if(keys.w) move.add(fwd);
        if(keys.s) move.sub(fwd);
        if(keys.d) move.add(rgt);
        if(keys.a) move.sub(rgt);
        
        if (move.length() > 0) move.normalize().multiplyScalar(speed * delta);

        // Simple Axis Collision
        if(!checkCol(player.pos.x+move.x, player.pos.y, player.pos.z)) player.pos.x += move.x;
        if(!checkCol(player.pos.x, player.pos.y, player.pos.z+move.z)) player.pos.z += move.z;

        // Gravity
        player.vel.y -= 25 * delta;
        const nextY = player.pos.y + player.vel.y * delta;

        if (!checkCol(player.pos.x, nextY, player.pos.z)) {
            player.pos.y = nextY;
        } else {
            if (player.vel.y < 0) { // Hit ground
                player.vel.y = 0;
                player.pos.y = Math.ceil(player.pos.y - 1); // Snap
                if(keys.sp) player.vel.y = 9; // Jump
            } else {
                player.vel.y = 0; // Hit head
            }
        }
        
        if(player.pos.y < -40) player.pos.y = 60; // Void safety

        camera.position.copy(player.pos);
        camera.position.y += 1.6;

        // --- UPDATE UI ---
        // Coordinates
        elCoords.innerText = `X: ${Math.floor(player.pos.x)} Y: ${Math.floor(player.pos.y)} Z: ${Math.floor(player.pos.z)}`;
        
        // Hunger Decay
        if (keys.sh && move.length() > 0) hungerTimer += delta; // Sprint drains hunger
        if (hungerTimer > 5) {
            player.hunger = Math.max(0, player.hunger - 5);
            elHunger.style.width = player.hunger + '%';
            hungerTimer = 0;
        }
    }

    updateWorld(scene, player.pos);
    renderer.render(scene, camera);
}

// Fake Player Counter Update
setInterval(() => {
    const count = 1 + Math.floor(Math.random() * 5); // Fakes 1-5 players online
    elPlayers.innerText = `Players: ${count} / 20`;
}, 5000);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
