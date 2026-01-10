import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateWorld, rebuildChunk, setBlock, getBlock, isSolid, getSurfaceHeight, CHUNK_SIZE } from './world.js';
import { Inventory } from './inventory.js';
import { ITEMS, BLOCK_DROPS, MINING_TIMES } from './items.js';
import { MATS } from './textures.js';

console.log('Game module loaded successfully');

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting with day/night cycle
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(100, 200, 50);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 500;
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
scene.add(sun);

// Day/night cycle
let timeOfDay = 0.5; // 0 = midnight, 0.5 = noon, 1 = midnight
function updateDayNight(delta) {
    timeOfDay += delta / 120; // 2 minute day cycle
    if (timeOfDay > 1) timeOfDay -= 1;
    
    const angle = timeOfDay * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(angle);
    
    // Update sun position
    sun.position.set(
        100 * Math.cos(angle),
        Math.max(0, 200 * sunHeight),
        100 * Math.sin(angle)
    );
    
    // Update lighting
    if (sunHeight > 0) {
        // Daytime
        ambientLight.intensity = 0.5 + sunHeight * 0.3;
        sun.intensity = 0.8 * sunHeight;
        scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
        scene.background = new THREE.Color(0x87CEEB);
    } else {
        // Nighttime
        ambientLight.intensity = 0.1;
        sun.intensity = 0;
        scene.fog = new THREE.Fog(0x000011, 20, 100);
        scene.background = new THREE.Color(0x000011);
    }
}

// Sky gradient
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

// Controls
const controls = new PointerLockControls(camera, document.body);
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

if (instructions) {
    instructions.addEventListener('click', () => {
        controls.lock();
    });
} else {
    console.warn('Instructions element not found');
}

controls.addEventListener('lock', () => {
    if (blocker) blocker.style.display = 'none';
});

controls.addEventListener('unlock', () => {
    if (blocker) blocker.style.display = 'flex';
});

// Player setup
const startX = 0;
const startZ = 0;
let startY;
try {
    startY = getSurfaceHeight(startX, startZ) + 2;
} catch (error) {
    console.error('Error getting surface height:', error);
    startY = 70; // Default spawn height
}

const player = {
    pos: new THREE.Vector3(startX, startY, startZ),
    vel: new THREE.Vector3(),
    onGround: false,
    width: 0.6,
    height: 1.8,
    eyeHeight: 1.6,
    sprinting: false,
    sneaking: false
};

camera.position.copy(player.pos);
camera.position.y += player.eyeHeight;

// Inventory
let inventory;
try {
    inventory = new Inventory();
} catch (error) {
    console.error('Error initializing inventory:', error);
    throw error; // This is critical, so we should fail
}

// Block breaking system
let miningBlock = null;
let miningProgress = 0;
let miningTime = 0;
const miningIndicator = document.createElement('div');
miningIndicator.style.position = 'absolute';
miningIndicator.style.top = '50%';
miningIndicator.style.left = '50%';
miningIndicator.style.transform = 'translate(-50%, -50%)';
miningIndicator.style.width = '100px';
miningIndicator.style.height = '4px';
miningIndicator.style.background = 'rgba(0,0,0,0.5)';
miningIndicator.style.border = '1px solid white';
miningIndicator.style.display = 'none';
miningIndicator.style.zIndex = '100';
document.body.appendChild(miningIndicator);

const miningBar = document.createElement('div');
miningBar.style.width = '0%';
miningBar.style.height = '100%';
miningBar.style.background = 'white';
miningIndicator.appendChild(miningBar);

// Raycasting for block interaction
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const maxReach = 5;

function getBlockAtRay() {
    raycaster.setFromCamera(center, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    for (const intersect of intersects) {
        if (intersect.distance > maxReach) continue;
        
        const point = intersect.point.clone();
        const normal = intersect.face.normal.clone();
        
        // Get block position (rounded)
        const blockPos = new THREE.Vector3(
            Math.floor(point.x),
            Math.floor(point.y),
            Math.floor(point.z)
        );
        
        // Check if we hit a face - adjust for block boundaries
        if (Math.abs(point.x - blockPos.x - 0.5) < 0.01) {
            blockPos.x += normal.x > 0 ? 0 : -1;
        } else if (Math.abs(point.z - blockPos.z - 0.5) < 0.01) {
            blockPos.z += normal.z > 0 ? 0 : -1;
        } else if (Math.abs(point.y - blockPos.y - 0.5) < 0.01) {
            blockPos.y += normal.y > 0 ? 0 : -1;
        }
        
        const block = getBlock(blockPos.x, blockPos.y, blockPos.z);
        if (block) {
            return {
                block: block,
                position: blockPos,
                face: intersect.face,
                distance: intersect.distance
            };
        }
    }
    return null;
}

// Collision detection (AABB)
function checkCollision(x, y, z) {
    const minX = Math.floor(x - player.width / 2);
    const maxX = Math.floor(x + player.width / 2);
    const minY = Math.floor(y);
    const maxY = Math.floor(y + player.height);
    const minZ = Math.floor(z - player.width / 2);
    const maxZ = Math.floor(z + player.width / 2);
    
    for (let bx = minX; bx <= maxX; bx++) {
        for (let by = minY; by <= maxY; by++) {
            for (let bz = minZ; bz <= maxZ; bz++) {
                if (isSolid(bx, by, bz)) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Input handling
const keys = {
    w: false, a: false, s: false, d: false,
    space: false, shift: false, ctrl: false,
    leftClick: false, rightClick: false
};

document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': keys.w = true; break;
        case 'KeyS': keys.s = true; break;
        case 'KeyA': keys.a = true; break;
        case 'KeyD': keys.d = true; break;
        case 'Space': keys.space = true; e.preventDefault(); break;
        case 'ShiftLeft': keys.shift = true; break;
        case 'ControlLeft': keys.ctrl = true; break;
        case 'KeyE': 
            e.preventDefault();
            const container = document.getElementById('inventory-container');
            const isOpen = container && container.style.display !== 'none' && container.style.display !== '';
            if (!isOpen) {
                inventory.toggle();
                controls.unlock();
            } else {
                inventory.toggle();
                controls.lock();
            }
            break;
        case 'Digit1': inventory.selectedSlot = 0; inventory.updateUI(); break;
        case 'Digit2': inventory.selectedSlot = 1; inventory.updateUI(); break;
        case 'Digit3': inventory.selectedSlot = 2; inventory.updateUI(); break;
        case 'Digit4': inventory.selectedSlot = 3; inventory.updateUI(); break;
        case 'Digit5': inventory.selectedSlot = 4; inventory.updateUI(); break;
        case 'Digit6': inventory.selectedSlot = 5; inventory.updateUI(); break;
        case 'Digit7': inventory.selectedSlot = 6; inventory.updateUI(); break;
        case 'Digit8': inventory.selectedSlot = 7; inventory.updateUI(); break;
        case 'Digit9': inventory.selectedSlot = 8; inventory.updateUI(); break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': keys.w = false; break;
        case 'KeyS': keys.s = false; break;
        case 'KeyA': keys.a = false; break;
        case 'KeyD': keys.d = false; break;
        case 'Space': keys.space = false; break;
        case 'ShiftLeft': keys.shift = false; break;
        case 'ControlLeft': keys.ctrl = false; break;
    }
});

document.addEventListener('mousedown', (e) => {
    if (!controls.isLocked) return;
    
    if (e.button === 0) { // Left click - break block
        keys.leftClick = true;
                const hit = getBlockAtRay();
                if (hit && hit.block) {
                    miningBlock = hit;
                    miningProgress = 0;
                    const blockType = hit.block;
                    const baseTime = MINING_TIMES[blockType] || 0.5;
                    const tool = inventory.getSelectedItem();
                    const efficiency = tool && tool.tool ? (tool.efficiency || 1) : 1;
                    miningTime = Math.max(0.1, baseTime / efficiency);
                    miningIndicator.style.display = 'block';
                    miningBar.style.width = '0%';
                } else {
                    miningBlock = null;
                    miningIndicator.style.display = 'none';
                }
    } else if (e.button === 2) { // Right click - place block
        keys.rightClick = true;
        e.preventDefault();
        const hit = getBlockAtRay();
        if (hit && hit.distance < maxReach) {
            const item = inventory.getSelectedItem();
            if (item && item.placeable) {
                // Calculate placement position (adjacent to hit face)
                const placePos = hit.position.clone();
                const normal = hit.face.normal;
                
                // Check if placement position is valid (not inside player, not solid)
                const checkX = placePos.x + Math.round(normal.x);
                const checkY = placePos.y + Math.round(normal.y);
                const checkZ = placePos.z + Math.round(normal.z);
                
                // Check collision with player
                const playerMinX = Math.floor(player.pos.x - player.width / 2);
                const playerMaxX = Math.floor(player.pos.x + player.width / 2);
                const playerMinY = Math.floor(player.pos.y);
                const playerMaxY = Math.floor(player.pos.y + player.height);
                const playerMinZ = Math.floor(player.pos.z - player.width / 2);
                const playerMaxZ = Math.floor(player.pos.z + player.width / 2);
                
                const inPlayerBounds = 
                    checkX >= playerMinX && checkX <= playerMaxX &&
                    checkY >= playerMinY && checkY <= playerMaxY &&
                    checkZ >= playerMinZ && checkZ <= playerMaxZ;
                
                if (!inPlayerBounds && !isSolid(checkX, checkY, checkZ)) {
                    // Convert item mat to block type
                    let blockType = item.mat;
                    // Map material keys to block types
                    if (blockType === 'GRASS') blockType = 'GRASS';
                    else if (blockType === 'DIRT') blockType = 'DIRT';
                    else if (blockType === 'STONE') blockType = 'STONE';
                    else if (blockType === 'WOOD') blockType = 'WOOD';
                    else if (blockType === 'LEAF') blockType = 'LEAVES';
                    else blockType = 'DIRT'; // Default
                    
                    setBlock(checkX, checkY, checkZ, blockType);
                    rebuildChunk(scene, checkX, checkZ);
                    inventory.useItem(1);
                }
            }
        }
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        keys.leftClick = false;
        miningBlock = null;
        miningProgress = 0;
        miningIndicator.style.display = 'none';
    } else if (e.button === 2) {
        keys.rightClick = false;
    }
});

document.addEventListener('wheel', (e) => {
    if (controls.isLocked) {
        e.preventDefault();
        if (e.deltaY > 0) {
            inventory.selectedSlot = (inventory.selectedSlot + 1) % 9;
        } else {
            inventory.selectedSlot = (inventory.selectedSlot - 1 + 9) % 9;
        }
        inventory.updateUI();
    }
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

// Update mining progress
function updateMining(delta) {
    if (miningBlock && keys.leftClick) {
        const hit = getBlockAtRay();
        if (!hit || 
            hit.position.x !== miningBlock.position.x ||
            hit.position.y !== miningBlock.position.y ||
            hit.position.z !== miningBlock.position.z) {
            // Player looked away or block changed
            miningBlock = null;
            miningProgress = 0;
            miningIndicator.style.display = 'none';
            return;
        }
        
        miningProgress += delta;
        const progress = Math.min(1, miningProgress / miningTime);
        miningBar.style.width = `${progress * 100}%`;
        
        if (progress >= 1) {
            // Block broken!
            const blockType = miningBlock.block;
            const dropKey = BLOCK_DROPS[blockType];
            
            if (dropKey && ITEMS[dropKey]) {
                inventory.addItem(dropKey, 1);
            }
            
            setBlock(miningBlock.position.x, miningBlock.position.y, miningBlock.position.z, null);
            rebuildChunk(scene, miningBlock.position.x, miningBlock.position.z);
            
            miningBlock = null;
            miningProgress = 0;
            miningIndicator.style.display = 'none';
        }
    } else {
        miningBlock = null;
        miningProgress = 0;
        miningIndicator.style.display = 'none';
    }
}

// Physics update
function updatePhysics(delta) {
    if (!controls.isLocked) return;
    
    // Movement
    player.sprinting = keys.shift && !keys.ctrl;
    player.sneaking = keys.ctrl;
    
    const moveSpeed = player.sneaking ? 1.0 : (player.sprinting ? 5.6 : 4.3); // Minecraft speeds
    
    const direction = new THREE.Vector3();
    if (keys.w) direction.z -= 1;
    if (keys.s) direction.z += 1;
    if (keys.a) direction.x -= 1;
    if (keys.d) direction.x += 1;
    
    if (direction.length() > 0) {
        direction.normalize();
        direction.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, camera.rotation.y, 0)));
        
        const move = direction.multiplyScalar(moveSpeed * delta);
        
        // Horizontal collision
        if (!checkCollision(player.pos.x + move.x, player.pos.y, player.pos.z)) {
            player.pos.x += move.x;
        }
        if (!checkCollision(player.pos.x, player.pos.y, player.pos.z + move.z)) {
            player.pos.z += move.z;
        }
    }
    
    // Gravity and jumping
    player.vel.y -= 32 * delta; // Gravity (Minecraft uses ~32 blocks/s²)
    
    if (keys.space && player.onGround) {
        player.vel.y = 8.0; // Jump velocity
        player.onGround = false;
        keys.space = false; // Prevent double jump
    }
    
    // Vertical movement
    const nextY = player.pos.y + player.vel.y * delta;
    
    // Check ground collision
    if (player.vel.y < 0) {
        const groundY = Math.floor(nextY);
        if (checkCollision(player.pos.x, groundY, player.pos.z)) {
            player.pos.y = groundY + 1;
            player.vel.y = 0;
            player.onGround = true;
        } else {
            player.pos.y = nextY;
            player.onGround = false;
        }
    } else {
        // Check ceiling collision
        const ceilingY = Math.floor(nextY + player.height);
        if (checkCollision(player.pos.x, ceilingY, player.pos.z)) {
            player.vel.y = 0;
            player.pos.y = ceilingY - player.height;
        } else {
            player.pos.y = nextY;
        }
    }
    
    // Update camera position
    camera.position.x = player.pos.x;
    camera.position.y = player.pos.y + player.eyeHeight;
    camera.position.z = player.pos.z;
    
    // Prevent falling into void
    if (player.pos.y < -64) {
        player.pos.y = getSurfaceHeight(player.pos.x, player.pos.z) + 2;
        player.vel.y = 0;
    }
}

// UI updates - ensure element exists
let coordsEl = document.getElementById('coords');
if (!coordsEl) {
    console.warn('Coords element not found!');
    // Create a fallback element
    coordsEl = document.createElement('div');
    coordsEl.id = 'coords';
    coordsEl.style.position = 'absolute';
    coordsEl.style.top = '10px';
    coordsEl.style.left = '10px';
    coordsEl.style.color = 'white';
    document.body.appendChild(coordsEl);
}
let lastUpdate = 0;

// Animation loop
const clock = new THREE.Clock();
let socket;
try { 
    socket = io(); 
} catch(e) {
    console.log('Socket.IO not available, continuing without multiplayer');
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    
    try {
        updateDayNight(delta);
        updatePhysics(delta);
        updateMining(delta);
        updateWorld(scene, player.pos);
        
        // Update UI every 0.1s
        lastUpdate += delta;
        if (lastUpdate > 0.1) {
            if (coordsEl) {
                coordsEl.textContent = `X: ${Math.floor(player.pos.x)} Y: ${Math.floor(player.pos.y)} Z: ${Math.floor(player.pos.z)} | FPS: ${Math.round(1/delta)}`;
            }
            lastUpdate = 0;
            
            if (socket && socket.connected) {
                socket.emit('playerMovement', {
                    x: player.pos.x,
                    y: player.pos.y,
                    z: player.pos.z,
                    r: camera.rotation.y
                });
            }
        }
        
        renderer.render(scene, camera);
    } catch (error) {
        console.error('Animation error:', error);
        if (coordsEl) {
            coordsEl.textContent = `Error: ${error.message}`;
        }
    }
}

// Window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Close crafting menu button
const closeCraftBtn = document.getElementById('close-craft');
if (closeCraftBtn) {
    closeCraftBtn.addEventListener('click', () => {
        inventory.toggle();
        controls.lock();
    });
}

// Initialize world and start game
console.log('Starting game initialization...');
try {
    console.log('Initializing world...');
    updateWorld(scene, player.pos);
    console.log('World initialized successfully');
    console.log('Starting animation loop...');
    animate();
    if (coordsEl) {
        coordsEl.textContent = `X: ${Math.floor(player.pos.x)} Y: ${Math.floor(player.pos.y)} Z: ${Math.floor(player.pos.z)}`;
    }
    console.log('Game started successfully!');
} catch (error) {
    console.error('Initialization error:', error);
    console.error('Stack:', error.stack);
    if (coordsEl) {
        coordsEl.textContent = `Error: ${error.message}`;
        coordsEl.style.color = 'red';
    }
    // Show error in console and on screen
    alert(`Game failed to initialize:\n${error.message}\n\nCheck browser console for details.`);
}
