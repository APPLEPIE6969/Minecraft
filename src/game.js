import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateWorld, isSolid, getSurfaceHeight } from './world.js';
import { MobController } from './mobs.js';
import { Minimap } from './minimap.js';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 80);

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

// UI & Controls
const controls = new PointerLockControls(camera, document.body);
const blocker = document.getElementById('blocker');
if(document.getElementById('instructions')) {
    document.getElementById('instructions').addEventListener('click', () => controls.lock());
}
controls.addEventListener('lock', () => { if(blocker) blocker.style.display = 'none'; });
controls.addEventListener('unlock', () => { if(blocker) blocker.style.display = 'flex'; });

// Player Setup
const startX = 0;
const startZ = 0;
// Force Ground Height Check
const groundH = getSurfaceHeight(startX, startZ);
const player = { 
    pos: new THREE.Vector3(startX, groundH + 10, startZ), 
    vel: new THREE.Vector3(), 
    w: 0.6, h: 1.8 
};

// Initial Load
updateWorld(scene, player.pos);
camera.position.copy(player.pos);

// Modules
let mobManager;
try { mobManager = new MobController(scene); } catch(e) {}
let minimap;
setTimeout(() => { minimap = new Minimap(scene, player); }, 1000); // Delay to let DOM load

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

// ROBUST PHYSICS (Wall Checks)
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
const elCoords = document.getElementById('coords');

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

        // Movement
        if(!checkCol(player.pos.x+move.x, player.pos.y, player.pos.z)) player.pos.x += move.x;
        if(!checkCol(player.pos.x, player.pos.y, player.pos.z+move.z)) player.pos.z += move.z;

        // Gravity / Floor Clamping (Fixes Falling Through)
        player.vel.y -= 30 * delta;
        const nextY = player.pos.y + player.vel.y * delta;
        
        // Check where the floor is exactly
        const floorHeight = getSurfaceHeight(player.pos.x, player.pos.z);
        
        // If we are about to fall below floor, SNAP to floor
        if (nextY < floorHeight + 1.8 && player.pos.y >= floorHeight) {
            player.pos.y = floorHeight + 1.8; // Stand on block
            player.vel.y = 0;
            if (keys.sp) player.vel.y = 10; // Jump
        } 
        // If we are high in the air, falling is fine
        else if (!checkCol(player.pos.x, nextY, player.pos.z)) {
            player.pos.y = nextY;
        } else {
             player.vel.y = 0; // Hit head or other solid
        }
        
        // Void Reset
        if(player.pos.y < -100) { 
             player.pos.y = floorHeight + 10; 
             player.vel.y = 0; 
        }

        camera.position.copy(player.pos);
        camera.position.y += 0.0; // Already calculated eyes

        if(elCoords) elCoords.innerText = `X: ${Math.floor(player.pos.x)} Y: ${Math.floor(player.pos.y)} Z: ${Math.floor(player.pos.z)}`;
    }

    if(mobManager) mobManager.update(delta, player.pos);
    if(minimap) minimap.update();
    
    updateWorld(scene, player.pos);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
