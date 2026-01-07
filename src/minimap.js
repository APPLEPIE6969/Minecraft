import * as THREE from 'three';
import { getSurfaceHeight } from './world.js';

export class Minimap {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.size = 150; // Map radius in blocks
        this.expanded = false;
        
        // Waypoint Marker in 3D World
        this.waypointMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 256, 1),
            new THREE.MeshBasicMaterial({ color: 0xFF0000, opacity: 0.5, transparent: true })
        );
        this.waypointMesh.visible = false;
        scene.add(this.waypointMesh);

        // Fake Players for Multiplayer simulation
        this.fakePlayers = [
            { x: 20, z: -40, name: "Steve" },
            { x: -50, z: 30, name: "Alex" },
            { x: 100, z: 100, name: "Herobrine" }
        ];

        // Click Logic
        this.canvas.addEventListener('click', () => this.toggleExpand());
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.expanded) this.setWaypoint(e);
        });
    }

    toggleExpand() {
        this.expanded = !this.expanded;
        const container = document.getElementById('minimap-container');
        if (this.expanded) {
            container.style.width = '500px';
            container.style.height = '500px';
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            this.canvas.width = 500; this.canvas.height = 500;
        } else {
            container.style.width = '150px';
            container.style.height = '150px';
            container.style.top = '10px';
            container.style.left = '';
            container.style.right = '10px'; // Top Right
            container.style.transform = '';
            this.canvas.width = 150; this.canvas.height = 150;
        }
    }

    setWaypoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Convert screen X/Y to World X/Z
        const scale = this.canvas.width / (this.size * 2);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        const worldX = this.player.pos.x + (clickX - centerX) / scale;
        const worldZ = this.player.pos.z + (clickY - centerY) / scale;

        this.waypointMesh.position.set(worldX, 50, worldZ);
        this.waypointMesh.visible = true;
        alert(`Waypoint set at X:${Math.floor(worldX)} Z:${Math.floor(worldZ)}`);
    }

    update() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const px = Math.floor(this.player.pos.x);
        const pz = Math.floor(this.player.pos.z);
        
        // 1. Clear
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Terrain
        // We scan pixels relative to player position
        // Optimization: Don't scan every single block, skip steps for speed
        const scale = width / (this.size * 2); // pixels per block
        const step = this.expanded ? 2 : 4; // Resolution

        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                // Map pixel to world coordinate
                const wx = px + (x - width/2) / scale;
                const wz = pz + (y - height/2) / scale;
                
                const h = getSurfaceHeight(wx, wz);
                
                // Colors based on height (Biome-like)
                if (h < -2) ctx.fillStyle = '#000088'; // Water
                else if (h < 0) ctx.fillStyle = '#E6C288'; // Sand
                else if (h > 15) ctx.fillStyle = '#888888'; // Stone/Mountain
                else ctx.fillStyle = '#228B22'; // Grass

                ctx.fillRect(x, y, step, step);
            }
        }

        // 3. Draw Player (Center)
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(width/2, height/2, 4, 0, Math.PI*2);
        ctx.fill();

        // 4. Draw Fake Players
        this.fakePlayers.forEach(p => {
            // Calculate screen position relative to us
            const sx = width/2 + (p.x - px) * scale;
            const sy = height/2 + (p.z - pz) * scale;
            
            // Only draw if on screen
            if (sx > 0 && sx < width && sy > 0 && sy < height) {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(sx, sy, 3, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = 'yellow';
                ctx.font = '10px Arial';
                ctx.fillText(p.name, sx + 5, sy);
            }
        });

        // 5. Draw Waypoint
        if (this.waypointMesh.visible) {
            const wx = width/2 + (this.waypointMesh.position.x - px) * scale;
            const wy = height/2 + (this.waypointMesh.position.z - pz) * scale;
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(wx-5, wy-5); ctx.lineTo(wx+5, wy+5);
            ctx.moveTo(wx+5, wy-5); ctx.lineTo(wx-5, wy+5);
            ctx.stroke();
        }
    }
}
