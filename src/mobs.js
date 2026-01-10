import * as THREE from 'three';
import { getSurfaceHeight, isSolid } from './world.js';

// High-quality mob definitions with behaviors
const MOB_TYPES = {
    ZOMBIE: {
        name: 'Zombie',
        health: 20,
        speed: 1.2,
        damage: 2,
        viewDistance: 16,
        attackRange: 1.5,
        size: { width: 0.6, height: 1.8, depth: 0.6 },
        colors: { skin: '#4B6F44', clothes: '#2d4a2b' },
        behaviors: ['aggressive', 'nocturnal', 'group_ai'],
        drops: [{ item: 'ROTTEN_FLESH', chance: 0.8 }, { item: 'BONE', chance: 0.3 }],
        spawnWeight: 15
    },
    SKELETON: {
        name: 'Skeleton',
        health: 10,
        speed: 1.5,
        damage: 3,
        viewDistance: 20,
        attackRange: 8,
        size: { width: 0.5, height: 1.8, depth: 0.5 },
        colors: { bones: '#f5f5f5', bow: '#8b4513' },
        behaviors: ['aggressive', 'ranged', 'accurate'],
        drops: [{ item: 'BONE', chance: 0.9 }, { item: 'ARROW', chance: 0.7 }],
        spawnWeight: 10
    },
    CREEPER: {
        name: 'Creeper',
        health: 10,
        speed: 1.0,
        damage: 0,
        viewDistance: 12,
        attackRange: 3,
        size: { width: 0.6, height: 1.7, depth: 0.6 },
        colors: { skin: '#00ff00', dark: '#008800' },
        behaviors: ['aggressive', 'explosive', 'silent'],
        drops: [{ item: 'GUNPOWDER', chance: 1.0, count: 3 }],
        spawnWeight: 5
    },
    SPIDER: {
        name: 'Spider',
        health: 8,
        speed: 1.8,
        damage: 1,
        viewDistance: 14,
        attackRange: 1.2,
        size: { width: 1.0, height: 0.9, depth: 1.0 },
        colors: { body: '#4a4a4a', legs: '#2a2a2a', eyes: '#ff0000' },
        behaviors: ['aggressive', 'climbing', 'jumping'],
        drops: [{ item: 'STRING', chance: 0.8 }, { item: 'SPIDER_EYE', chance: 0.3 }],
        spawnWeight: 12
    },
    COW: {
        name: 'Cow',
        health: 15,
        speed: 0.8,
        damage: 0,
        viewDistance: 8,
        attackRange: 0,
        size: { width: 0.9, height: 1.4, depth: 0.9 },
        colors: { body: '#ffffff', spots: '#000000', udder: '#ff69b4' },
        behaviors: ['passive', 'herd', 'grazing'],
        drops: [{ item: 'LEATHER', chance: 0.9 }, { item: 'BEEF', chance: 0.8, count: 3 }],
        spawnWeight: 20
    },
    PIG: {
        name: 'Pig',
        health: 10,
        speed: 1.0,
        damage: 0,
        viewDistance: 6,
        attackRange: 0,
        size: { width: 0.9, height: 0.9, depth: 0.9 },
        colors: { body: '#ff69b4', snout: '#ff1493' },
        behaviors: ['passive', 'food_seeker', 'oink'],
        drops: [{ item: 'PORKCHOP', chance: 0.9, count: 2 }],
        spawnWeight: 18
    },
    SHEEP: {
        name: 'Sheep',
        health: 12,
        speed: 0.9,
        damage: 0,
        viewDistance: 8,
        attackRange: 0,
        size: { width: 0.9, height: 1.3, depth: 0.9 },
        colors: { wool: '#ffffff', face: '#ffc0cb', legs: '#4a4a4a' },
        behaviors: ['passive', 'herd', 'grazing', 'wool_growth'],
        drops: [{ item: 'WOOL', chance: 1.0 }, { item: 'MUTTON', chance: 0.8, count: 2 }],
        spawnWeight: 16
    }
};

// High-quality texture creation
function createMobTexture(type, colors) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = false; // Keep pixelated look
    
    switch(type) {
        case 'ZOMBIE':
            // Zombie skin
            ctx.fillStyle = colors.skin;
            ctx.fillRect(0, 0, 64, 64);
            
            // Clothes
            ctx.fillStyle = colors.clothes;
            ctx.fillRect(8, 20, 48, 28);
            
            // Face details
            ctx.fillStyle = '#000000';
            ctx.fillRect(20, 16, 8, 4); // Eyes
            ctx.fillRect(24, 24, 4, 2); // Mouth
            
            // Blood stains
            ctx.fillStyle = 'rgba(139, 0, 0, 0.5)';
            ctx.fillRect(10, 25, 5, 3);
            ctx.fillRect(45, 30, 8, 4);
            break;
            
        case 'SKELETON':
            // Skeleton bones
            ctx.fillStyle = colors.bones;
            ctx.fillRect(0, 0, 64, 64);
            
            // Bone details
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(20, 16, 8, 4); // Eye sockets
            ctx.fillRect(24, 24, 4, 1); // Teeth
            
            // Bow
            ctx.fillStyle = colors.bow;
            ctx.fillRect(48, 10, 12, 4);
            break;
            
        case 'CREEPER':
            // Creeper body
            ctx.fillStyle = colors.skin;
            ctx.fillRect(0, 0, 64, 64);
            
            // Face
            ctx.fillStyle = '#000000';
            ctx.fillRect(16, 16, 8, 8); // Eyes
            ctx.fillRect(20, 24, 4, 4); // Nose
            ctx.fillRect(18, 32, 8, 2); // Mouth
            
            // Dark patches
            ctx.fillStyle = colors.dark;
            ctx.fillRect(0, 0, 16, 64);
            ctx.fillRect(48, 0, 16, 64);
            break;
            
        case 'SPIDER':
            // Spider body
            ctx.fillStyle = colors.body;
            ctx.fillRect(16, 16, 32, 32);
            
            // Legs
            ctx.fillStyle = colors.legs;
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI * 2) / 8;
                const x = 32 + Math.cos(angle) * 24;
                const y = 32 + Math.sin(angle) * 24;
                ctx.fillRect(x - 2, y - 2, 4, 12);
            }
            
            // Eyes
            ctx.fillStyle = colors.eyes;
            ctx.fillRect(24, 24, 4, 4);
            ctx.fillRect(36, 24, 4, 4);
            break;
            
        case 'COW':
            // Cow body
            ctx.fillStyle = colors.body;
            ctx.fillRect(0, 20, 64, 32);
            
            // Spots
            ctx.fillStyle = colors.spots;
            for (let i = 0; i < 8; i++) {
                const x = Math.random() * 56 + 4;
                const y = Math.random() * 24 + 24;
                ctx.fillRect(x, y, 8, 6);
            }
            
            // Head
            ctx.fillStyle = colors.body;
            ctx.fillRect(20, 8, 24, 16);
            
            // Udder
            ctx.fillStyle = colors.udder;
            ctx.fillRect(28, 32, 8, 4);
            break;
            
        case 'PIG':
            // Pig body
            ctx.fillStyle = colors.body;
            ctx.fillRect(8, 20, 48, 28);
            
            // Snout
            ctx.fillStyle = colors.snout;
            ctx.fillRect(20, 16, 12, 8);
            
            // Eyes
            ctx.fillStyle = '#000000';
            ctx.fillRect(24, 18, 4, 4);
            
            // Tail
            ctx.fillStyle = colors.body;
            ctx.fillRect(52, 30, 8, 4);
            break;
            
        case 'SHEEP':
            // Sheep body
            ctx.fillStyle = colors.wool;
            ctx.fillRect(0, 16, 64, 32);
            
            // Wool texture
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (let i = 0; i < 16; i++) {
                const x = Math.random() * 64;
                const y = Math.random() * 32 + 16;
                ctx.fillRect(x, y, 4, 4);
            }
            
            // Face
            ctx.fillStyle = colors.face;
            ctx.fillRect(24, 20, 16, 12);
            
            // Legs
            ctx.fillStyle = colors.legs;
            ctx.fillRect(16, 36, 4, 12);
            ctx.fillRect(28, 36, 4, 12);
            ctx.fillRect(40, 36, 4, 12);
            ctx.fillRect(52, 36, 4, 12);
            break;
    }
    
    return new THREE.CanvasTexture(canvas);
}

// Pathfinding AI
class PathFinder {
    constructor() {
        this.gridSize = 1;
        this.maxDistance = 50;
    }
    
    findPath(start, end, worldData) {
        // Simple A* pathfinding implementation
        const openSet = [start];
        const closedSet = [];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const key = (pos) => `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
        
        gScore.set(key(start), 0);
        fScore.set(key(start), this.heuristic(start, end));
        
        while (openSet.length > 0) {
            let current = openSet[0];
            let currentIndex = 0;
            
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(key(openSet[i])) < fScore.get(key(current))) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }
            
            if (current.distanceTo(end) < 2) {
                return this.reconstructPath(cameFrom, current);
            }
            
            openSet.splice(currentIndex, 1);
            closedSet.push(current);
            
            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                if (closedSet.some(p => p.equals(neighbor))) continue;
                
                const tentativeGScore = gScore.get(key(current)) + current.distanceTo(neighbor);
                
                if (!openSet.some(p => p.equals(neighbor))) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= gScore.get(key(neighbor))) {
                    continue;
                }
                
                cameFrom.set(key(neighbor), current);
                gScore.set(key(neighbor), tentativeGScore);
                fScore.set(key(neighbor), tentativeGScore + this.heuristic(neighbor, end));
            }
        }
        
        return [];
    }
    
    heuristic(a, b) {
        return a.distanceTo(b);
    }
    
    getNeighbors(pos) {
        const neighbors = [];
        const directions = [
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
        ];
        
        for (const dir of directions) {
            const neighbor = pos.clone().add(dir);
            if (!isSolid(neighbor.x, neighbor.y, neighbor.z)) {
                neighbors.push(neighbor);
            }
        }
        
        return neighbors;
    }
    
    reconstructPath(cameFrom, current) {
        const path = [current];
        while (cameFrom.has(`${current.x},${current.y},${current.z}`)) {
            current = cameFrom.get(`${current.x},${current.y},${current.z}`);
            path.unshift(current);
        }
        return path;
    }
}

export class MobController {
    constructor(scene) {
        this.scene = scene;
        this.mobs = [];
        this.spawnTimer = 0;
        this.pathFinder = new PathFinder();
        this.difficulty = 'normal'; // peaceful, easy, normal, hard
        this.maxMobs = this.getMaxMobs();
        
        // Mob spawning zones
        this.spawnZones = [];
        this.initializeSpawnZones();
    }
    
    getMaxMobs() {
        switch(this.difficulty) {
            case 'peaceful': return 0;
            case 'easy': return 8;
            case 'normal': return 12;
            case 'hard': return 20;
            default: return 25;
        }
    }
    
    initializeSpawnZones() {
        // Create spawn zones around the world
        for (let x = -100; x <= 100; x += 50) {
            for (let z = -100; z <= 100; z += 50) {
                this.spawnZones.push({
                    center: new THREE.Vector3(x, 0, z),
                    radius: 25,
                    lastSpawn: 0
                });
            }
        }
    }
    
    createMobModel(type, position) {
        const mobData = MOB_TYPES[type];
        const group = new THREE.Group();
        
        // Create body parts
        const bodyGeometry = new THREE.BoxGeometry(
            mobData.size.width,
            mobData.size.height,
            mobData.size.depth
        );
        
        const texture = createMobTexture(type, mobData.colors);
        const material = new THREE.MeshLambertMaterial({ 
            map: texture,
            transparent: type === 'SPIDER'
        });
        
        const body = new THREE.Mesh(bodyGeometry, material);
        body.position.y = mobData.size.height / 2;
        group.add(body);
        
        // Add special features for certain mobs
        if (type === 'CREEPER') {
            // Add explosive particles
            const particleGeometry = new THREE.SphereGeometry(0.1);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ff00,
                transparent: true,
                opacity: 0.6
            });
            
            for (let i = 0; i < 4; i++) {
                const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                particle.position.set(
                    (Math.random() - 0.5) * mobData.size.width,
                    Math.random() * mobData.size.height,
                    (Math.random() - 0.5) * mobData.size.depth
                );
                group.add(particle);
            }
        }
        
        if (type === 'SKELETON') {
            // Add bow
            const bowGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.1);
            const bowMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
            const bow = new THREE.Mesh(bowGeometry, bowMaterial);
            bow.position.set(0.5, mobData.size.height, 0);
            bow.rotation.z = Math.PI / 4;
            group.add(bow);
        }
        
        // Shadow
        const shadowGeometry = new THREE.CircleGeometry(mobData.size.width / 2);
        const shadowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.3
        });
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.01;
        group.add(shadow);
        
        group.position.copy(position);
        group.userData = {
            type: type,
            health: mobData.health,
            maxHealth: mobData.health,
            state: 'idle',
            target: null,
            path: [],
            pathIndex: 0,
            lastAttack: 0,
            behaviors: mobData.behaviors,
            stats: { ...mobData }
        };
        
        return group;
    }
    
    spawnMob(type, playerPos) {
        if (this.mobs.length >= this.maxMobs) return;
        
        const mobData = MOB_TYPES[type];
        if (!mobData) return;
        
        // Find suitable spawn location
        let spawnPos = null;
        let attempts = 0;
        
        while (!spawnPos && attempts < 10) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 30;
            
            const x = Math.floor(playerPos.x + Math.cos(angle) * distance);
            const z = Math.floor(playerPos.z + Math.sin(angle) * distance);
            const y = getSurfaceHeight(x, z) + 2;
            
            // Check if spawn location is valid
            if (!isSolid(x, y, z)) {
                spawnPos = new THREE.Vector3(x, y, z);
            }
            
            attempts++;
        }
        
        if (spawnPos) {
            const mob = this.createMobModel(type, spawnPos);
            this.scene.add(mob);
            this.mobs.push(mob);
            
            console.log(`Spawned ${mobData.name} at (${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z})`);
        }
    }
    
    updateMobAI(mob, delta, playerPos) {
        const data = mob.userData;
        const pos = mob.position;
        const distToPlayer = pos.distanceTo(playerPos);
        
        // Skip AI for distant mobs (LOD)
        if (distToPlayer > 64) return;
        
        // State machine
        switch (data.state) {
            case 'idle':
                this.handleIdleState(mob, delta, playerPos, distToPlayer);
                break;
            case 'wandering':
                this.handleWanderingState(mob, delta, playerPos, distToPlayer);
                break;
            case 'chasing':
                this.handleChasingState(mob, delta, playerPos, distToPlayer);
                break;
            case 'attacking':
                this.handleAttackingState(mob, delta, playerPos, distToPlayer);
                break;
            case 'fleeing':
                this.handleFleeingState(mob, delta, playerPos, distToPlayer);
                break;
        }
        
        // Apply physics
        this.applyMobPhysics(mob, delta);
    }
    
    handleIdleState(mob, delta, playerPos, distToPlayer) {
        const data = mob.userData;
        
        // Check if player is detected
        if (data.behaviors.includes('aggressive') && distToPlayer < data.stats.viewDistance) {
            data.state = 'chasing';
            data.target = playerPos.clone();
            return;
        }
        
        // Random wandering
        if (Math.random() < 0.01) {
            data.state = 'wandering';
            data.wanderTarget = new THREE.Vector3(
                mob.position.x + (Math.random() - 0.5) * 10,
                mob.position.y,
                mob.position.z + (Math.random() - 0.5) * 10
            );
        }
    }
    
    handleWanderingState(mob, delta, playerPos, distToPlayer) {
        const data = mob.userData;
        
        // Check if player is detected
        if (data.behaviors.includes('aggressive') && distToPlayer < data.stats.viewDistance) {
            data.state = 'chasing';
            data.target = playerPos.clone();
            return;
        }
        
        // Move towards wander target
        if (data.wanderTarget) {
            const direction = data.wanderTarget.clone().sub(mob.position).normalize();
            const speed = data.stats.speed * delta;
            
            mob.position.x += direction.x * speed;
            mob.position.z += direction.z * speed;
            
            // Check if reached target
            if (mob.position.distanceTo(data.wanderTarget) < 1) {
                data.state = 'idle';
                data.wanderTarget = null;
            }
        }
    }
    
    handleChasingState(mob, delta, playerPos, distToPlayer) {
        const data = mob.userData;
        
        // Check if lost player
        if (distToPlayer > data.stats.viewDistance * 1.5) {
            data.state = 'wandering';
            data.target = null;
            return;
        }
        
        // Move towards player
        const direction = playerPos.clone().sub(mob.position).normalize();
        const speed = data.stats.speed * delta;
        
        mob.position.x += direction.x * speed;
        mob.position.z += direction.z * speed;
        
        // Look at player
        mob.lookAt(playerPos);
        
        // Check if in attack range
        if (distToPlayer < data.stats.attackRange) {
            data.state = 'attacking';
        }
        
        // Special behaviors
        if (data.type === 'SPIDER' && data.behaviors.includes('jumping')) {
            if (Math.random() < 0.05) {
                mob.position.y += 2;
            }
        }
    }
    
    handleAttackingState(mob, delta, playerPos, distToPlayer) {
        const data = mob.userData;
        const now = Date.now();
        
        // Check if still in attack range
        if (distToPlayer > data.stats.attackRange) {
            data.state = 'chasing';
            return;
        }
        
        // Attack cooldown
        if (now - data.lastAttack < 1000 / data.stats.speed) {
            return;
        }
        
        // Perform attack
        if (distToPlayer <= data.stats.attackRange) {
            console.log(`${data.type} attacks player for ${data.stats.damage} damage!`);
            data.lastAttack = now;
            
            // Special attack effects
            if (data.type === 'CREEPER') {
                this.explodeCreeper(mob);
            }
        }
    }
    
    handleFleeingState(mob, delta, playerPos, distToPlayer) {
        const data = mob.userData;
        
        // Run away from player
        const direction = mob.position.clone().sub(playerPos).normalize();
        const speed = data.stats.speed * 1.5 * delta; // Run faster when fleeing
        
        mob.position.x += direction.x * speed;
        mob.position.z += direction.z * speed;
        
        // Stop fleeing when far enough
        if (distToPlayer > data.stats.viewDistance * 2) {
            data.state = 'idle';
        }
    }
    
    explodeCreeper(mob) {
        const pos = mob.position.clone();
        const data = mob.userData;
        
        // Create explosion effect
        const explosionGeometry = new THREE.SphereGeometry(3);
        const explosionMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffaa00,
            transparent: true,
            opacity: 0.8
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(pos);
        this.scene.add(explosion);
        
        // Remove explosion after animation
        setTimeout(() => {
            this.scene.remove(explosion);
            explosionGeometry.dispose();
            explosionMaterial.dispose();
        }, 500);
        
        // Remove creeper
        this.removeMob(mob);
        
        // Damage nearby blocks and player
        console.log('CREEPER EXPLOSION!');
    }
    
    applyMobPhysics(mob, delta) {
        const data = mob.userData;
        const pos = mob.position;
        
        // Gravity
        if (!data.behaviors.includes('climbing')) {
            data.velocity = data.velocity || new THREE.Vector3();
            data.velocity.y -= 15 * delta;
            pos.y += data.velocity.y * delta;
        }
        
        // Ground collision
        const groundY = getSurfaceHeight(pos.x, pos.z) + data.stats.size.height / 2;
        if (pos.y < groundY) {
            pos.y = groundY;
            if (data.velocity) data.velocity.y = 0;
        }
        
        // Prevent falling into void
        if (pos.y < -50) {
            pos.y = 100;
            data.velocity = new THREE.Vector3();
        }
    }
    
    removeMob(mob) {
        const index = this.mobs.indexOf(mob);
        if (index > -1) {
            this.scene.remove(mob);
            this.disposeMobResources(mob);
            this.mobs.splice(index, 1);
        }
    }

    disposeMobResources(mob) {
        const geometries = new Set();
        const materials = new Set();
        const textures = new Set();

        mob.traverse(obj => {
            if (obj.geometry) geometries.add(obj.geometry);
            if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach(m => { if (m) materials.add(m); });
            }
        });

        materials.forEach(mat => {
            if (mat.map) textures.add(mat.map);
            if (mat.dispose) mat.dispose();
        });

        textures.forEach(tex => {
            if (tex.dispose) tex.dispose();
        });

        geometries.forEach(geo => {
            if (geo.dispose) geo.dispose();
        });
    }
    
    update(delta, playerPos) {
        // Spawn mobs
        this.updateSpawning(delta, playerPos);
        
        // Update all mobs
        for (const mob of [...this.mobs]) {
            if (this.mobs.indexOf(mob) === -1) continue;
            this.updateMobAI(mob, delta, playerPos);
        }
        
        // Clean up dead mobs
        for (const mob of [...this.mobs]) {
            if (mob.userData.health <= 0) {
                this.handleMobDeath(mob);
            }
        }
    }
    
    updateSpawning(delta, playerPos) {
        this.spawnTimer += delta;
        
        // Spawn based on difficulty and time
        if (this.spawnTimer > 10 && this.mobs.length < this.maxMobs) {
            const mobTypes = Object.keys(MOB_TYPES).filter(type => {
                const mobData = MOB_TYPES[type];
                return Math.random() < mobData.spawnWeight / 100;
            });
            
            if (mobTypes.length > 0) {
                const randomType = mobTypes[Math.floor(Math.random() * mobTypes.length)];
                this.spawnMob(randomType, playerPos);
                this.spawnTimer = 0;
            }
        }
    }
    
    handleMobDeath(mob) {
        const data = mob.userData;
        console.log(`${data.type} died`);
        
        // Create death particles
        for (let i = 0; i < 5; i++) {
            const particleGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(mob.position);
            particle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            ));
            this.scene.add(particle);
            
            // Remove particle after animation
            setTimeout(() => {
                this.scene.remove(particle);
                particleGeometry.dispose();
                particleMaterial.dispose();
            }, 1000);
        }
        
        this.removeMob(mob);
    }
    
    setDifficulty(level) {
        this.difficulty = level;
        this.maxMobs = this.getMaxMobs();
        console.log(`Difficulty set to ${level}, max mobs: ${this.maxMobs}`);
    }
}
