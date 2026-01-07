import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateWorld, isSolid, getSurfaceHeight } from './world.js';
import { MobController } from './mobs.js';

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 100, 50);
sun.castShadow = true;
scene.add(sun);

// --- CLICK TO START LOGIC (The Fix) ---
const controls = new PointerLockControls(camera, document.body);
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', function () {
    controls.lock();
});

controls.addEventListener('lock', function () {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
});

controls.addEventListener('unlock', function () {
    blocker.style.display = 'flex';
    instructions.style.display = '';
});

// --- PLAYER & WORLD ---
const startX = 0;
const startZ = 0;
// Note: If world.js is missing, this line will crash and screen stays white.
let groundLevel = 20; 
try { groundLevel = getSurfaceHeight(startX, startZ); } catch(e) { console.error("World file missing?"); }

const player = { 
    pos: new THREE.Vector3(startX, groundLevel + 10, startZ), 
    vel: new THREE.Vector3(), 
    w: 0.6, h: 1.8,
    hunger: 100
};

// Load World
updateWorld(scene, player.pos);
camera.position.copy(player.pos);

// Load Mobs (Try/Catch to prevent crash if mobs.js is missing)
let mobManager = null;
try {
    mobManager = new MobController(scene);
} catch (e) {
    console.warn("Mobs.js missing - Game running without mobs");
}

// Input
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

// Physics Helper
function checkCol(x, y, z) {
    const minX = Math.floor(x - player.w/2), maxX = Math.floor(x + player.w/2);
    const minZ = Math.floor(z - player.w/2), maxZ = Math.floor(z + player.w/2);
    const minY = Math.floor(y), maxY = Math.floor(y + player.h);

    for (let bx=minX; bx<=maxX; bx++) {
        for (let bz=minZ; bz<=maxZ; bz++) {
            for (let by=minY; by<maxY; by++) {
                if (isSolid(bx, by, bz)) return true;
            }
        }
    }
    return false;
}

// Animation Loop
const clock = new THREE.Clock();
const elCoords = document.getElementById('coords');
const elPlayers = document.getElementById('players');

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (controls.isLocked) {
        const speed = keys.sh ? 8.0 : 4.3;
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

        if(!checkCol(player.pos.x+move.x, player.pos.y, player.pos.z)) player.pos.x += move.x;
        if(!checkCol(player.pos.x, player.pos.y, player.pos.z+move.z)) player.pos.z += move.z;

        player.vel.y -= 25 * delta;
        const nextY = player.pos.y + player.vel.y * delta;

        if(!checkCol(player.pos.x, nextY, player.pos.z)) {
            player.pos.y = nextY;
        } else {
            if(player.vel.y < 0) { 
                player.vel.y = 0;
                player.pos.y = Math.ceil(player.pos.y - 1);
                if(keys.sp) player.vel.y = 9;
            } else {
                player.vel.y = 0;
            }
        }

        if(player.pos.y < -100) {
            player.pos.y = 50; 
            player.vel.y = 0;
        }

        camera.position.copy(player.pos);
        camera.position.y += 1.6;

        elCoords.innerText = `X: ${Math.floor(player.pos.x)} Y: ${Math.floor(player.pos.y)} Z: ${Math.floor(player.pos.z)}`;
    }

    if(mobManager) mobManager.update(delta, player.pos);
    updateWorld(scene, player.pos);
    renderer.render(scene, camera);
}

// Fake Player Counter
setInterval(() => {
    elPlayers.innerText = `Players: ${1 + Math.floor(Math.random()*4)} / 20`;
}, 10000);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
