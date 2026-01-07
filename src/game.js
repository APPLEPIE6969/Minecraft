import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateWorld, getSurfaceHeight, isSolid, MATS } from './world.js';
import { Minimap } from './minimap.js';
import { MobController } from './mobs.js';

// --- INVENTORY SYSTEM (Built-in) ---
const ITEMS = {
    WOOD: { id: 1, name: "Wood", icon: "🪵", placeable: true, mat: 'WOOD' },
    PLANK: { id: 2, name: "Plank", icon: "🟫", placeable: true, mat: 'WOOD' },
    STICK: { id: 3, name: "Stick", icon: "🥢", placeable: false },
    STONE: { id: 4, name: "Stone", icon: "⬜", placeable: true, mat: 'STONE' },
    DIRT: { id: 5, name: "Dirt", icon: "🟫", placeable: true, mat: 'DIRT' },
    DIAMOND: { id: 6, name: "Diamond", icon: "💎", placeable: false },
    CRAFTING: { id: 7, name: "Table", icon: "🪚", placeable: true, mat: 'WOOD' }
};
const RECIPES = [
    { name: "Planks (4)", req: { WOOD: 1 }, out: { PLANK: 4 } },
    { name: "Sticks (4)", req: { PLANK: 2 }, out: { STICK: 4 } },
    { name: "Crafting Table", req: { PLANK: 4 }, out: { CRAFTING: 1 } }
];

class Inventory {
    constructor() {
        this.slots = new Array(9).fill(null);
        this.counts = new Array(9).fill(0);
        this.selected = 0;
    }
    addItem(key, count=1) {
        for(let i=0; i<9; i++) if(this.slots[i] === ITEMS[key]) { this.counts[i]+=count; this.updateUI(); return; }
        for(let i=0; i<9; i++) if(this.slots[i] === null) { this.slots[i] = ITEMS[key]; this.counts[i]=count; this.updateUI(); return; }
    }
    useItem() {
        if(this.slots[this.selected]) {
            this.counts[this.selected]--;
            if(this.counts[this.selected] <= 0) this.slots[this.selected] = null;
            this.updateUI();
            return true;
        }
        return false;
    }
    getSelectedItem() { return this.slots[this.selected]; }
    updateUI() {
        const ui = document.querySelectorAll('.slot');
        if(ui.length === 0) return;
        ui.forEach((el, i) => {
            if(this.slots[i]) { el.innerText = this.slots[i].icon; el.setAttribute('data-count', this.counts[i]); }
            else { el.innerText = ""; el.setAttribute('data-count', ""); }
            if(i===this.selected) el.classList.add('selected'); else el.classList.remove('selected');
        });
        this.updateCrafting();
    }
    updateCrafting() {
        const list = document.getElementById('crafting-list');
        if(!list) return;
        list.innerHTML = '';
        RECIPES.forEach(r => {
            const btn = document.createElement('div');
            btn.innerText = r.name;
            btn.style.padding = "5px"; btn.style.border = "1px solid gray"; btn.style.margin = "5px"; btn.style.cursor = "pointer";
            let can = true;
            for(const [k, q] of Object.entries(r.req)) if(this.count(k) < q) can=false;
            if(can) { btn.style.color = "lightgreen"; btn.onclick = () => this.craft(r); }
            else btn.style.color = "gray";
            list.appendChild(btn);
        });
    }
    count(key) { let t=0; for(let i=0;i<9;i++) if(this.slots[i]===ITEMS[key]) t+=this.counts[i]; return t; }
    craft(r) {
        for(const [k,q] of Object.entries(r.req)) {
            let rem = q;
            for(let i=0;i<9;i++) if(this.slots[i]===ITEMS[k]) {
                const take = Math.min(rem, this.counts[i]);
                this.counts[i]-=take; rem-=take;
                if(this.counts[i]<=0) this.slots[i]=null;
                if(rem===0) break;
            }
        }
        for(const [k,q] of Object.entries(r.out)) this.addItem(k, q);
    }
}

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

// --- CLICK TO START (Robust) ---
const controls = new PointerLockControls(camera, document.body);
const blocker = document.getElementById('blocker');
const inventory = new Inventory();

// Force Click Listener
document.addEventListener('click', () => {
    if (!controls.isLocked) controls.lock();
});
controls.addEventListener('lock', () => { if(blocker) blocker.style.display = 'none'; });
controls.addEventListener('unlock', () => { if(blocker) blocker.style.display = 'flex'; });

// --- PLAYER ---
const startX = 0;
const startZ = 0;
let ground = 20;
// Safety: If world.js fails, use default height
try { ground = getSurfaceHeight(startX, startZ); } catch(e) { console.log("Terrain gen error"); }

const player = { 
    pos: new THREE.Vector3(startX, ground + 5, startZ), 
    vel: new THREE.Vector3(), 
    w: 0.6, h: 1.8 
};
camera.position.copy(player.pos);
updateWorld(scene, player.pos);

// Modules
let mobManager; try { mobManager = new MobController(scene); } catch(e){}
let minimap; try { minimap = new Minimap(player); } catch(e){}

// --- INTERACTION ---
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0,0);
const geo = new THREE.BoxGeometry(1,1,1);

document.addEventListener('mousedown', e => {
    if(controls.isLocked) {
        raycaster.setFromCamera(center, camera);
        const hits = raycaster.intersectObjects(scene.children, true);
        const hit = hits.find(h => h.distance < 6 && (h.object.isInstancedMesh || h.object.isMesh));
        
        if(hit) {
            // LEFT CLICK (Break)
            if(e.button === 0) {
                if(hit.object.isInstancedMesh) {
                    const m = new THREE.Matrix4();
                    hit.object.getMatrixAt(hit.instanceId, m);
                    m.makeScale(0,0,0);
                    hit.object.setMatrixAt(hit.instanceId, m);
                    hit.object.instanceMatrix.needsUpdate = true;
                    // Add item based on material guess
                    if(hit.object.material === MATS.WOOD) inventory.addItem('WOOD');
                    else if(hit.object.material === MATS.STONE) inventory.addItem('STONE');
                    else inventory.addItem('DIRT');
                } else {
                    scene.remove(hit.object);
                }
            }
            // RIGHT CLICK (Place)
            if(e.button === 2) {
                const item = inventory.getSelectedItem();
                if(item && item.placeable) {
                    const p = new THREE.Vector3().copy(hit.point).add(hit.face.normal).floor().addScalar(0.5);
                    const m = new THREE.Mesh(geo, MATS[item.mat]);
                    m.position.copy(p);
                    scene.add(m);
                    inventory.useItem();
                }
            }
        }
    }
});

// --- CONTROLS ---
const keys = { w:0, a:0, s:0, d:0, sp:0, sh:0 };
document.addEventListener('keydown', e => {
    if(e.code==='KeyW') keys.w=1;
    if(e.code==='KeyS') keys.s=1;
    if(e.code==='KeyA') keys.a=1;
    if(e.code==='KeyD') keys.d=1;
    if(e.code==='Space') keys.sp=1;
    if(e.code==='ShiftLeft') keys.sh=1;
    if(e.code==='KeyE') {
        const menu = document.getElementById('crafting-menu');
        if(menu.style.display==='block') { menu.style.display='none'; controls.lock(); }
        else { menu.style.display='block'; controls.unlock(); inventory.updateCrafting(); }
    }
});
document.addEventListener('keyup', e => {
    if(e.code==='KeyW') keys.w=0;
    if(e.code==='KeyS') keys.s=0;
    if(e.code==='KeyA') keys.a=0;
    if(e.code==='KeyD') keys.d=0;
    if(e.code==='Space') keys.sp=0;
    if(e.code==='ShiftLeft') keys.sh=0;
});
document.addEventListener('wheel', e => {
    if(e.deltaY > 0) inventory.selected = (inventory.selected + 1) % 9;
    else inventory.selected = (inventory.selected - 1 + 9) % 9;
    inventory.updateUI();
});

// --- LOOP ---
const clock = new THREE.Clock();
let socket;
try { socket = io(); } catch(e) {} // Safe Socket

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (controls.isLocked) {
        const speed = keys.sh ? 10 : 5;
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

        // PHYSICS & FLOOR CLAMP
        let h = 20;
        try { h = getSurfaceHeight(player.pos.x, player.pos.z); } catch(e){}
        
        player.vel.y -= 30 * delta;
        player.pos.y += player.vel.y * delta;
        
        if(player.pos.y < h + 1.8) {
            player.pos.y = h + 1.8;
            player.vel.y = 0;
            if(keys.sp) player.vel.y = 10;
        }

        camera.position.copy(player.pos);
        if(socket) socket.emit('playerMovement', { x:player.pos.x, y:player.pos.y, z:player.pos.z, r:camera.rotation.y });
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

inventory.updateUI();
animate();
