import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateWorld, isSolid, chunks } from './world.js';
import { MobController } from './mobs.js';

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 80, 50);
sun.castShadow = true;
scene.add(sun);

// --- CONTROLS FIX ---
const controls = new PointerLockControls(camera, document.body);
const ui = document.getElementById('ui');

// We listen to the WHOLE body, so clicks never miss
document.body.addEventListener('click', () => {
    if(!controls.isLocked) {
        controls.lock();
    }
});

controls.addEventListener('lock', () => {
    ui.style.display = 'none';
});
controls.addEventListener('unlock', () => {
    ui.style.display = 'block';
});

// --- MOBS ---
const mobManager = new MobController(scene);

// --- PLAYER ---
const player = { pos: new THREE.Vector3(0, 30, 0), vel: new THREE.Vector3(), speed: 6.0, w: 0.6, h: 1.8 };
const keys = { w:0, a:0, s:0, d:0, sp:0 };

document.addEventListener('keydown', e => {
    if(e.code==='KeyW') keys.w=1;
    if(e.code==='KeyS') keys.s=1;
    if(e.code==='KeyA') keys.a=1;
    if(e.code==='KeyD') keys.d=1;
    if(e.code==='Space') keys.sp=1;
});
document.addEventListener('keyup', e => {
    if(e.code==='KeyW') keys.w=0;
    if(e.code==='KeyS') keys.s=0;
    if(e.code==='KeyA') keys.a=0;
    if(e.code==='KeyD') keys.d=0;
    if(e.code==='Space') keys.sp=0;
});

// Initial Load
updateWorld(scene, player.pos);

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

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (controls.isLocked) {
        // Move Input
        const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
        fwd.y=0; fwd.normalize();
        const rgt = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
        rgt.y=0; rgt.normalize();

        const move = new THREE.Vector3();
        if(keys.w) move.add(fwd);
        if(keys.s) move.sub(fwd);
        if(keys.d) move.add(rgt);
        if(keys.a) move.sub(rgt);
        move.normalize().multiplyScalar(player.speed * delta);

        // X Move
        if(!checkCol(player.pos.x+move.x, player.pos.y, player.pos.z)) player.pos.x += move.x;
        // Z Move
        if(!checkCol(player.pos.x, player.pos.y, player.pos.z+move.z)) player.pos.z += move.z;

        // Gravity / Y Move
        player.vel.y -= 20 * delta;
        if(!checkCol(player.pos.x, player.pos.y+player.vel.y*delta, player.pos.z)) {
            player.pos.y += player.vel.y*delta;
        } else {
            if(player.vel.y < 0) { // Hit floor
                player.vel.y = 0;
                player.pos.y = Math.round(player.pos.y);
                if(keys.sp) player.vel.y = 8;
            } else { // Hit Head
                player.vel.y = 0;
            }
        }
        
        if(player.pos.y < -30) { player.pos.y = 50; player.vel.y=0; } // Void reset

        camera.position.copy(player.pos);
        camera.position.y += 1.6;
    }

    // Update Mobs & World
    mobManager.update(delta, player.pos);
    updateWorld(scene, player.pos);
    
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
