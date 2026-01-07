import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateWorld, getSurfaceHeight, isSolid, MATS } from './world.js';
import { Minimap } from './minimap.js';
import { MobController } from './mobs.js';

// ==========================================
// 1. INVENTORY & ITEMS SYSTEM (Built-in)
// ==========================================
const ITEMS = {
    WOOD: { id: 1, name: "Wood Log", icon: "🪵", placeable: true, mat: 'WOOD' },
    PLANK: { id: 2, name: "Plank", icon: "🟫", placeable: true, mat: 'WOOD' },
    STICK: { id: 3, name: "Stick", icon: "🥢", placeable: false },
    TABLE: { id: 4, name: "Crafting Table", icon: "🪚", placeable: true, mat: 'WOOD' },
    STONE: { id: 5, name: "Cobblestone", icon: "⬜", placeable: true, mat: 'STONE' },
    DIRT: { id: 8, name: "Dirt", icon: "🟫", placeable: true, mat: 'DIRT' },
    DIAMOND: { id: 9, name: "Diamond", icon: "💎", placeable: false },
};

const RECIPES = [
    { name: "Planks (4)", req: { WOOD: 1 }, out: { PLANK: 4 } },
    { name: "Sticks (4)", req: { PLANK: 2 }, out: { STICK: 4 } },
    { name: "Crafting Table", req: { PLANK: 4 }, out: { TABLE: 1 } },
];

class Inventory {
    constructor() {
        this.slots = new Array(9).fill(null);
        this.counts = new Array(9).fill(0);
        this.selected = 0;
    }

    addItem(itemKey, count = 1) {
        // Stack
        for (let i = 0; i < 9; i++) {
            if (this.slots[i] === ITEMS[itemKey]) {
                this.counts[i] += count;
                this.updateUI();
                return true;
            }
        }
        // Empty Slot
        for (let i = 0; i < 9; i++) {
            if (this.slots[i] === null) {
                this.slots[i] = ITEMS[itemKey];
                this.counts[i] = count;
                this.updateUI();
                return true;
            }
        }
        return false;
    }

    useItem() {
        if (this.slots[this.selected]) {
            this.counts[this.selected]--;
            if (this.counts[this.selected] <= 0) this.slots[this.selected] = null;
            this.updateUI();
            return true;
        }
        return false;
    }

    getSelectedItem() { return this.slots[this.selected]; }

    updateUI() {
        const uiSlots = document.querySelectorAll('.slot');
        if (uiSlots.length === 0) return;
        
        uiSlots.forEach((el, i) => {
            if (this.slots[i]) {
                el.innerText = this.slots[i].icon;
                el.setAttribute('data-count', this.counts[i]);
            } else {
                el.innerText = "";
                el.setAttribute('data-count', "");
            }
            if(i === this.selected) el.classList.add('selected');
            else el.classList.remove('selected');
        });
        this.updateCraftingUI();
    }

    updateCraftingUI() {
        const list = document.getElementById('crafting-list');
        if(!list) return;
        list.innerHTML = '';
        RECIPES.forEach(recipe => {
            const btn = document.createElement('div');
            btn.className = 'recipe-btn';
            btn.innerText = recipe.name;
            let canCraft = true;
            for(const [key, qty] of Object.entries(recipe.req)) {
                if(this.countItem(key) < qty) canCraft = false;
            }
            if(canCraft) {
                btn.style.color = '#00FF00';
                btn.onclick = () => this.craft(recipe);
            } else {
                btn.style.color = '#555';
            }
            list.appendChild(btn);
        });
    }

    countItem(key) {
        let total = 0;
        for(let i=0; i<9; i++) if(this.slots[i] === ITEMS[key]) total += this.counts[i];
        return total;
    }

    craft(recipe) {
        for(const [key, qty] of Object.entries(recipe.req)) {
            let toRemove = qty;
            for(let i=0; i<9; i++) {
                if(this.slots[i] === ITEMS[key]) {
                    const take = Math.min(toRemove, this.counts[i]);
                    this.counts[i] -= take;
                    toRemove -= take;
                    if(this.counts[i] <= 0) this.slots[i] = null;
                    if(toRemove === 0) break;
                }
            }
        }
        for(const [key, qty] of Object.entries(recipe.out)) this.addItem(key, qty);
    }
}

// ==========================================
// 2. MAIN GAME SETUP
// ==========================================
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

// --- CLICK TO START (Robust) ---
const controls = new PointerLockControls(camera, document.body);
const blocker = document.getElementById('blocker');
let isMenuOpen = false;

// Attach click listener to EVERYTHING to ensure it works
function tryLock() {
    if (!isMenuOpen && !controls.isLocked) {
        controls.lock();
    }
}
document.body.addEventListener('click', tryLock);
if (blocker) blocker.addEventListener('click', tryLock);

controls.addEventListener('lock', () => {
    if(blocker) blocker.style.display = 'none';
    const settings = document.getElementById('settings-menu');
    const crafting = document.getElementById('crafting-menu');
    if(settings) settings.style.display = 'none';
    if(crafting) crafting.style.display = 'none';
    isMenuOpen = false;
});

controls.addEventListener('unlock', () => {
    if(!isMenuOpen && blocker) blocker.style.display = 'flex';
});

// --- SYSTEMS INIT ---
// Socket.io Safety Check
let socket = null;
if (typeof io !== 'undefined') {
    socket = io();
} else {
    console.warn("Socket.io not loaded. Playing in Singleplayer.");
}

const inventory = new Inventory();

// --- PLAYER INIT ---
const startX = 0;
const startZ = 0;
let ground = 20;
try { ground = getSurfaceHeight(startX, startZ); } catch(e){}

const player = { 
    pos: new THREE.Vector3(startX, ground + 5, startZ), 
    vel: new THREE.Vector3(), 
    w: 0.6, h: 1.8 
};
camera.position.copy(player.pos);
updateWorld(scene, player.pos);

// Modules Safety Check
let mobManager, minimap;
try { mobManager = new MobController(scene); } catch(e){}
try { minimap = new Minimap(player); } catch(e){}

// --- INTERACTION ---
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0,0);
const placementGeo = new THREE.BoxGeometry(1,1,1);

function handleInteraction(button) {
    raycaster.setFromCamera(center, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    // Find closest valid hit
    const hit = hits.find(h => h.distance < 6 && (h.object.isInstancedMesh || h.object.isMesh));

    if (hit) {
        // BREAK (Left Click)
        if (button === 0) {
            if (hit.object.isInstancedMesh) {
                // Instanced Mesh Hiding Logic
                const matrix = new THREE.Matrix4();
                hit.object.getMatrixAt(hit.instanceId, matrix);
                matrix.makeScale(0, 0, 0); // Hide it
                hit.object.setMatrixAt(hit.instanceId, matrix);
                hit.object.instanceMatrix.needsUpdate = true;
                
                // Give Item (Simple check)
                if(hit.object.material === MATS.WOOD) inventory.addItem('WOOD');
                else if(hit.object.material === MATS.STONE) inventory.addItem('STONE');
                else inventory.addItem('DIRT');
            } else if (hit.object !== placementGeo) {
                scene.remove(hit.object); // Remove placed mesh
            }
        }
        // PLACE (Right Click)
        if (button === 2) {
            const item = inventory.getSelectedItem();
            if (item && item.placeable) {
                const p = new THREE.Vector3().copy(hit.point).add(hit.face.normal).floor().addScalar(0.5);
                // Don't place inside self
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
    if(e.code==='KeyE') toggleCrafting();
    if(e.code==='KeyP') toggleSettings();
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
document.addEventListener('wheel', e => {
    if(e.deltaY > 0) inventory.selected = (inventory.selected + 1) % 9;
    else inventory.selected = (inventory.selected - 1 + 9) % 9;
    inventory.updateUI();
});

// UI Functions
function toggleCrafting() {
    isMenuOpen = !isMenuOpen;
    const menu = document.getElementById('crafting-menu');
    if(isMenuOpen) {
        controls.unlock();
        if(menu) menu.style.display = 'block';
        inventory.updateCraftingUI();
        if(blocker) blocker.style.display = 'none';
    } else {
        if(menu) menu.style.display = 'none';
        controls.lock();
    }
}
function toggleSettings() {
    isMenuOpen = !isMenuOpen;
    const menu = document.getElementById('settings-menu');
    if(isMenuOpen) {
        controls.unlock();
        if(menu) menu.style.display = 'block';
        if(blocker) blocker.style.display = 'none';
    } else {
        if(menu) menu.style.display = 'none';
        controls.lock();
    }
}
const btnClose = document.getElementById('close-settings');
if(btnClose) btnClose.addEventListener('click', toggleSettings);


// --- MULTIPLAYER SYNC ---
const otherPlayers = {};
const pMat = new THREE.MeshLambertMaterial({ color: 'red' });
const pGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);

if(socket) {
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

// --- GAME LOOP ---
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
        
        // Physics
        const floorH = getSurfaceHeight(player.pos.x, player.pos.z);
        player.vel.y -= 30 * delta;
        player.pos.y += player.vel.y * delta;

        // Anti-Fall Clamp
        if (player.pos.y < floorH + 1.8) {
            player.pos.y = floorH + 1.8;
            player.vel.y = 0;
            if (keys.sp) player.vel.y = 10;
        }
        if (player.pos.y < -100) { player.pos.y = floorH + 20; player.vel.y = 0; }

        camera.position.copy(player.pos);
        
        // Network
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

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

inventory.updateUI(); // Init UI
animate();
