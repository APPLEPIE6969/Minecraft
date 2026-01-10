import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { updateWorld, rebuildChunk, setBlock, getBlock, isSolid, getSurfaceHeight, RENDER_DISTANCE } from './world.js';
import { Inventory } from './inventory.js';
import { ITEMS, BLOCK_DROPS, MINING_TIMES } from './items.js';
import { Minimap } from './minimap.js';
import { MobController } from './mobs.js';

console.log('Game module loaded successfully');

// Scene setup
const scene = new THREE.Scene();

// Get optimal resolution for balanced performance (capped at 2K)
function getOptimalResolution() {
    const maxWidth = 3840; // 4K width
    const maxHeight = 2160; // 4K height
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2); // Limit pixel ratio for performance
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // Scale down if exceeding 4K
    if (width > maxWidth) {
        const scale = maxWidth / width;
        width = maxWidth;
        height = height * scale;
    }
    
    if (height > maxHeight) {
        const scale = maxHeight / height;
        height = maxHeight;
        width = width * scale;
    }
    
    return { width, height, pixelRatio };
}

const resolution = getOptimalResolution();
const camera = new THREE.PerspectiveCamera(75, resolution.width / resolution.height, 0.1, 1000);

// Balanced renderer setup
const renderer = new THREE.WebGLRenderer({ 
    antialias: true, // Enable for 4K quality
    alpha: false,
    powerPreference: "high-performance"
});

renderer.setSize(resolution.width, resolution.height);
renderer.setPixelRatio(resolution.pixelRatio);

// Advanced rendering features for 4K quality
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = true;
renderer.shadowMap.needsUpdate = true;

// Tone mapping for better lighting
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Color space and output encoding
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.useLegacyLights = false;

// Enable physically correct lighting
renderer.physicallyCorrectLights = true;

// High-quality rendering settings
renderer.info.autoReset = false;

document.body.appendChild(renderer.domElement);

// Simple lighting for performance
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(100, 200, 50);
sun.castShadow = true; // Re-enable shadows for 4K quality
scene.add(sun);

// Add moon light for nighttime
const moon = new THREE.DirectionalLight(0x4444ff, 0.1);
moon.position.set(-100, 200, -50);
moon.castShadow = false;
scene.add(sun);
scene.add(moon);

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
    
    // Update moon position (opposite to sun)
    moon.position.set(
        -100 * Math.cos(angle),
        Math.max(0, 200 * Math.max(0, -sunHeight)),
        -100 * Math.sin(angle)
    );
    
    // Update lighting
    if (sunHeight > 0) {
        // Daytime
        const dayIntensity = sunHeight;
        ambientLight.intensity = 0.3 + dayIntensity * 0.4;
        sun.intensity = 1.2 * dayIntensity;
        sun.castShadow = true;
        moon.intensity = 0;
        scene.fog = dayFog;
        scene.background = dayBackground;
    } else {
        // Nighttime
        const nightIntensity = Math.abs(sunHeight);
        ambientLight.intensity = 0.05 + nightIntensity * 0.1;
        sun.intensity = 0;
        sun.castShadow = false;
        moon.intensity = 0.2 * nightIntensity;
        scene.fog = nightFog;
        scene.background = nightBackground;
    }
}

// Sky gradient
scene.background = dayBackground;
scene.fog = dayFog;

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
    console.log(`Spawning player at surface height: ${startY}`);
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

// Initialize minimap and mobs
let mobController;
try {
    mobController = new MobController(scene);
    console.log('MobController initialized');
} catch (error) {
    console.error('Error initializing mobs:', error);
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
        
        // Check if this is a block mesh (instanced or regular)
        let isBlockMesh = false;
        let object = intersect.object;
        
        // Traverse up to find the actual mesh with userData
        while (object && !object.userData) {
            object = object.parent;
        }
        
        if (object && object.userData && object.userData.isBlock) {
            isBlockMesh = true;
        }
        
        if (!isBlockMesh) continue;
        
        const point = intersect.point.clone();
        
        // Get block position from intersection point
        const blockPos = new THREE.Vector3(
            Math.floor(point.x + (intersect.face.normal.x > 0 ? -0.01 : intersect.face.normal.x < 0 ? 0.01 : 0)),
            Math.floor(point.y + (intersect.face.normal.y > 0 ? -0.01 : intersect.face.normal.y < 0 ? 0.01 : 0)),
            Math.floor(point.z + (intersect.face.normal.z > 0 ? -0.01 : intersect.face.normal.z < 0 ? 0.01 : 0))
        );
        
        const block = getBlock(blockPos.x, blockPos.y, blockPos.z);
        if (block) {
            return {
                block: block,
                position: blockPos,
                face: intersect.face,
                normal: intersect.face.normal,
                distance: intersect.distance,
                point: point
            };
        }
    }
    return null;
}

// Collision detection (AABB) - optimized with early exit
function checkCollision(x, y, z) {
    const minX = Math.floor(x - player.width / 2);
    const maxX = Math.floor(x + player.width / 2);
    const minY = Math.floor(y);
    const maxY = Math.floor(y + player.height);
    const minZ = Math.floor(z - player.width / 2);
    const maxZ = Math.floor(z + player.width / 2);
    
    // Quick vertical check first
    if (minY < -50 || maxY > 200) return false;
    
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
const keys = {};
let lastWTap = 0;
let sprinting = false;
const keyBindings = {
    w: false, a: false, s: false, d: false,
    space: false, shift: false, ctrl: false,
    leftClick: false, rightClick: false
};

document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': 
            keys.w = true;
            // Double-tap W for sprint
            const now = Date.now();
            if (now - lastWTap < 300) { // 300ms window for double-tap
                sprinting = true;
                setTimeout(() => sprinting = false, 3000); // Sprint for 3 seconds
            }
            lastWTap = now;
            break;
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
        case 'KeyO':
            e.preventDefault();
            toggleOptionsMenu();
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
        // Minimap and mob controls
        case 'KeyM': 
            if (minimap) minimap.showGrid = !minimap.showGrid; 
            console.log('Minimap grid toggled'); 
            break;
        case 'KeyG': 
            if (mobController) {
                const difficulties = ['peaceful', 'easy', 'normal', 'hard'];
                const currentIndex = difficulties.indexOf(mobController.difficulty);
                const nextIndex = (currentIndex + 1) % difficulties.length;
                mobController.setDifficulty(difficulties[nextIndex]);
            }
            break;
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
                const normal = hit.normal;
                
                // Calculate the position to place the new block
                // Use exact normal direction for precise placement
                const placeX = Math.floor(placePos.x + normal.x + 0.5);
                const placeY = Math.floor(placePos.y + normal.y + 0.5);
                const placeZ = Math.floor(placePos.z + normal.z + 0.5);
                
                // Check collision with player (expanded bounds)
                const playerMinX = Math.floor(player.pos.x - player.width / 2) - 1;
                const playerMaxX = Math.floor(player.pos.x + player.width / 2) + 1;
                const playerMinY = Math.floor(player.pos.y) - 1;
                const playerMaxY = Math.floor(player.pos.y + player.height) + 1;
                const playerMinZ = Math.floor(player.pos.z - player.width / 2) - 1;
                const playerMaxZ = Math.floor(player.pos.z + player.width / 2) + 1;
                
                const inPlayerBounds = 
                    placeX >= playerMinX && placeX <= playerMaxX &&
                    placeY >= playerMinY && placeY <= playerMaxY &&
                    placeZ >= playerMinZ && placeZ <= playerMaxZ;
                
                if (!inPlayerBounds && !isSolid(placeX, placeY, placeZ)) {
                    // Convert item mat to block type
                    let blockType = item.mat;
                    // Map material keys to block types
                    if (blockType === 'GRASS') blockType = 'GRASS';
                    else if (blockType === 'DIRT') blockType = 'DIRT';
                    else if (blockType === 'STONE') blockType = 'STONE';
                    else if (blockType === 'WOOD') blockType = 'WOOD';
                    else if (blockType === 'LEAF') blockType = 'LEAVES';
                    else blockType = 'DIRT'; // Default
                    
                    setBlock(placeX, placeY, placeZ, blockType);
                    rebuildChunk(scene, placeX, placeZ);
                    inventory.useItem(1);
                    
                    // Send block placement to server for multiplayer
                    if (socket && socket.connected) {
                        socket.emit('blockPlace', {
                            x: placeX,
                            y: placeY,
                            z: placeZ,
                            type: blockType
                        });
                    }
                    
                    console.log(`Placed ${blockType} at (${placeX}, ${placeY}, ${placeZ})`);
                } else {
                    console.log('Cannot place block: invalid position');
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

// Update mining progress with performance optimization
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
            
            // Remove block from world data first
            const blockX = Math.floor(miningBlock.position.x);
            const blockY = Math.floor(miningBlock.position.y);
            const blockZ = Math.floor(miningBlock.position.z);
            
            setBlock(blockX, blockY, blockZ, null);
            
            // Throttle chunk rebuilds to prevent FPS drops
            requestAnimationFrame(() => {
                rebuildChunk(scene, blockX, blockZ);
            });
            
            // Send block breaking to server for multiplayer
            if (socket && socket.connected) {
                socket.emit('blockBreak', {
                    x: blockX,
                    y: blockY,
                    z: blockZ
                });
            }
            
            console.log(`Broke ${blockType} at (${blockX}, ${blockY}, ${blockZ})`);
            
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
    player.sprinting = sprinting;
    player.sneaking = keys.ctrl; // Changed from shift to ctrl
    
    const moveSpeed = player.sneaking ? 1.0 : (player.sprinting ? 5.6 : 4.3); // Minecraft speeds
    
    const direction = new THREE.Vector3();
    if (keys.w) direction.z -= 1;
    if (keys.s) direction.z += 1;
    if (keys.a) direction.x -= 1;
    if (keys.d) direction.x += 1;
    
    if (direction.length() > 0) {
        direction.normalize();
        
        // Get camera direction for movement
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0; // Keep movement on horizontal plane
        cameraDirection.normalize();
        
        // Create right vector for strafing
        const rightVector = new THREE.Vector3();
        rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
        
        // Calculate movement direction based on input
        const moveDirection = new THREE.Vector3();
        if (keys.w) moveDirection.add(cameraDirection);
        if (keys.s) moveDirection.sub(cameraDirection);
        if (keys.a) moveDirection.sub(rightVector);
        if (keys.d) moveDirection.add(rightVector);
        
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            const move = moveDirection.multiplyScalar(moveSpeed * delta);
            
            // Horizontal collision
            if (!checkCollision(player.pos.x + move.x, player.pos.y, player.pos.z)) {
                player.pos.x += move.x;
            }
            if (!checkCollision(player.pos.x, player.pos.y, player.pos.z + move.z)) {
                player.pos.z += move.z;
            }
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
let worldUpdateTimer = 0;
let minimapUpdateTimer = 0;

// Animation loop
const clock = new THREE.Clock();
let socket;
try { 
    socket = io(); 
    
    // Store other players' models
    const otherPlayers = {};
    
    // Create player model function
    function createPlayerModel(id, color = 0xff0000) {
        const group = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.9;
        group.add(body);
        
        // Head
        const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2.1;
        group.add(head);
        
        // Name tag
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText(id.substring(0, 8), 10, 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.y = 2.8;
        sprite.scale.set(2, 0.5, 1);
        group.add(sprite);
        
        group.userData.isPlayer = true;
        return group;
    }

    function disposeObject3D(root) {
        const geometries = new Set();
        const materials = new Set();
        const textures = new Set();

        root.traverse(obj => {
            if (obj.geometry) geometries.add(obj.geometry);
            if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach(m => { if (m) materials.add(m); });
            }
        });

        materials.forEach(mat => {
            if (mat.map) textures.add(mat.map);
            if (typeof mat.dispose === 'function') mat.dispose();
        });

        textures.forEach(tex => {
            if (tex && typeof tex.dispose === 'function') tex.dispose();
        });

        geometries.forEach(geo => {
            if (geo && typeof geo.dispose === 'function') geo.dispose();
        });
    }
    
    // Handle multiplayer events
    socket.on('blockPlace', (data) => {
        setBlock(data.x, data.y, data.z, data.type);
        rebuildChunk(scene, data.x, data.z);
    });
    
    socket.on('blockBreak', (data) => {
        setBlock(data.x, data.y, data.z, null);
        rebuildChunk(scene, data.x, data.z);
    });
    
    socket.on('currentPlayers', (players) => {
        // Handle existing players when joining
        Object.keys(players).forEach(id => {
            if (id !== socket.id && !otherPlayers[id]) {
                const playerModel = createPlayerModel(id, 0x00ff00);
                playerModel.position.set(players[id].x, players[id].y, players[id].z);
                scene.add(playerModel);
                otherPlayers[id] = playerModel;
            }
        });
    });
    
    socket.on('newPlayer', (data) => {
        console.log('New player joined:', data.id);
        if (data.id !== socket.id && !otherPlayers[data.id]) {
            const playerModel = createPlayerModel(data.id, 0x0000ff);
            playerModel.position.set(data.player.x, data.player.y, data.player.z);
            scene.add(playerModel);
            otherPlayers[data.id] = playerModel;
        }
    });
    
    socket.on('playerMoved', (data) => {
        // Update other player positions
        if (otherPlayers[data.id]) {
            otherPlayers[data.id].position.set(data.pos.x, data.pos.y, data.pos.z);
            otherPlayers[data.id].rotation.y = data.pos.r;
        }
    });
    
    socket.on('playerDisconnected', (playerId) => {
        console.log('Player disconnected:', playerId);
        if (otherPlayers[playerId]) {
            scene.remove(otherPlayers[playerId]);
            disposeObject3D(otherPlayers[playerId]);
            delete otherPlayers[playerId];
        }
    });
    
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
        
        // Optimize world updates - only update every few frames
        worldUpdateTimer += delta;
        if (worldUpdateTimer >= 2.0) {
            updateWorld(scene, player.pos);
            worldUpdateTimer = 0;
        }
        
        // Update mobs (throttled)
        if (mobController) mobController.update(delta, player.pos);
        
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

// Window resize with dynamic resolution support
window.addEventListener('resize', () => {
    const newResolution = getOptimalResolution();
    camera.aspect = newResolution.width / newResolution.height;
    camera.updateProjectionMatrix();
    renderer.setSize(newResolution.width, newResolution.height);
    renderer.setPixelRatio(newResolution.pixelRatio);
});

// Options menu functionality
function toggleOptionsMenu() {
    const optionsMenu = document.getElementById('options-menu');
    const isOpen = optionsMenu && optionsMenu.style.display !== 'none' && optionsMenu.style.display !== '';
    
    if (isOpen) {
        optionsMenu.style.display = 'none';
        controls.lock();
    } else {
        optionsMenu.style.display = 'block';
        controls.unlock();
    }
}

// Render distance slider
const renderDistanceSlider = document.getElementById('render-distance');
const renderDistanceValue = document.getElementById('render-distance-value');

if (renderDistanceSlider && renderDistanceValue) {
    renderDistanceSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        renderDistanceValue.textContent = value;
        // Update render distance in world.js
        window.RENDER_DISTANCE = value;
    });
}

// Close options menu button
const closeOptionsBtn = document.getElementById('close-options');
if (closeOptionsBtn) {
    closeOptionsBtn.addEventListener('click', toggleOptionsMenu);
}

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
