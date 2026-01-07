import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateWorld, isSolid, getSurfaceHeight } from './world.js';

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

// --- MULTIPLAYER LOGIC ---
const socket = io(); // Connect to server
const otherPlayers = {}; // Store other player meshes
const playerGeom = new THREE.BoxGeometry(0.6, 1.8, 0.6);
const playerMat = new THREE.MeshLambertMaterial({ color: 0xFF0000 }); // Red players

function addOtherPlayer(id, pos) {
    const mesh = new THREE.Mesh(playerGeom, playerMat);
    mesh.position.set(pos.x, pos.y, pos.z);
    scene.add(mesh);
    otherPlayers[id] = mesh;
}

socket.on('currentPlayers', (players) => {
    Object.keys(players).forEach((id) => {
        if (id !== socket.id) addOtherPlayer(id, players[id]);
    });
});

socket.on('newPlayer', (data) => {
    addOtherPlayer(data.id, data.player);
});

socket.on('playerMoved', (data) => {
    if (otherPlayers[data.id]) {
        otherPlayers[data.id].position.set(data.pos.x, data.pos.y, data.pos.pos.z); // .z fix
        otherPlayers[data.id].position.x = data.pos.x;
        otherPlayers[data.id].position.y = data.pos.y;
        otherPlayers[data.id].position.z = data.pos.z;
        otherPlayers[data.id].rotation.y = data.pos.r;
    }
});

socket.on('playerDisconnected', (id) => {
    if (otherPlayers[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

// --- CLIENT LOGIC ---
const controls = new PointerLockControls(camera, document.body);
const blocker = document.getElementById('blocker');
document.getElementById('instructions').addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => blocker.style.display = 'none');
controls.addEventListener('unlock', () => blocker.style.display = 'flex');

// Spawn
const startX = Math.floor(Math.random() * 20); // Random spawn
const startZ = Math.floor(Math.random() * 20);
let groundH = 20;
try { groundH = getSurfaceHeight(startX, startZ); } catch(e){}
const player = { pos: new THREE.Vector3(startX, groundH + 5, startZ), vel: new THREE.Vector3(), w: 0.6, h: 1.8 };

updateWorld(scene, player.pos);
camera.position.copy(player.pos);

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

function checkCol(x, y, z) {
    const minX = Math.floor(x-0.3), maxX = Math.floor(x+0.3);
    const minZ = Math.floor(z-0.3), maxZ = Math.floor(z+0.3);
    const minY = Math.floor(y), maxY = Math.floor(y+1.8);
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
let emitTimer = 0;

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (controls.isLocked) {
        const speed = 6.0;
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
        if(player.pos.y < -100) { player.pos.y = 100; player.vel.y = 0; }

        camera.position.copy(player.pos);
        camera.position.y += 1.6;

        // SEND POSITION TO SERVER (20 times per second)
        emitTimer += delta;
        if (emitTimer > 0.05) {
            emitTimer = 0;
            socket.emit('playerMovement', { 
                x: player.pos.x, 
                y: player.pos.y, 
                z: player.pos.z,
                r: camera.rotation.y
            });
        }

        if(elCoords) elCoords.innerText = `X: ${Math.floor(player.pos.x)} Y: ${Math.floor(player.pos.y)} Z: ${Math.floor(player.pos.z)}`;
    }

    updateWorld(scene, player.pos);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
