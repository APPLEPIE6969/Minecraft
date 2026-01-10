import { getSurfaceHeight, isSolid, RENDER_DISTANCE, CHUNK_SIZE } from './world.js';

export class Minimap {
    constructor(player) {
        this.player = player;
        this.canvas = document.getElementById('minimap-canvas');
        if (!this.canvas) {
            console.warn('Minimap canvas not found!');
            this.ctx = null;
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.size = 150; // Map radius
        this.zoom = 1.5; // Pixels per block
        
        // Minimap settings
        this.showGrid = true;
        this.showHeightMap = true;
        this.showMobs = true;
        this.showWaypoints = true;
        this.waypoints = [];
        
        // High-quality rendering settings
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Minimap controls
        this.setupControls();
        
        // Performance optimization
        this.lastUpdatePos = { x: 0, z: 0 };
        this.terrainCache = new Map();
    }
    
    setupControls() {
        // Zoom controls
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.zoom = Math.max(0.5, Math.min(5, this.zoom - e.deltaY * 0.001));
        });
        
        // Waypoint management
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.addWaypoint(x, y);
        });
        
        // Click to center
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.centerOnPosition(x, y);
        });
    }
    
    addWaypoint(screenX, screenY) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const worldX = Math.floor(this.player.pos.x + (screenX - centerX) / this.zoom);
        const worldZ = Math.floor(this.player.pos.z + (screenY - centerY) / this.zoom);
        
        this.waypoints.push({
            x: worldX,
            z: worldZ,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            name: `Waypoint ${this.waypoints.length + 1}`
        });
        
        console.log(`Added waypoint at (${worldX}, ${worldZ})`);
    }
    
    centerOnPosition(screenX, screenY) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const worldX = Math.floor(this.player.pos.x + (screenX - centerX) / this.zoom);
        const worldZ = Math.floor(this.player.pos.z + (screenY - centerY) / this.zoom);
        
        // Smooth movement to clicked position (could be implemented)
        console.log(`Center on position (${worldX}, ${worldZ})`);
    }
    
    createGradient(height) {
        // High-quality terrain coloring with gradients
        if (height < -2) {
            return { main: '#1e3a8a', light: '#2e5cb8', dark: '#0f1f4d' }; // Deep water
        } else if (height < 0) {
            return { main: '#f4a460', light: '#ffd700', dark: '#8b4513' }; // Sand
        } else if (height > 15) {
            return { main: '#696969', light: '#a9a9a9', dark: '#2f2f2f' }; // Stone mountain
        } else if (height > 10) {
            return { main: '#8fbc8f', light: '#90ee90', dark: '#556b2f' }; // Forest
        } else {
            return { main: '#228b22', light: '#32cd32', dark: '#006400' }; // Grass
        }
    }
    
    drawTerrain(ctx, width, height, playerX, playerZ) {
        const range = Math.floor(Math.min(width, height) / 2 / this.zoom);
        
        // Limit drawing to loaded chunks
        const playerChunkX = Math.floor(playerX / CHUNK_SIZE);
        const playerChunkZ = Math.floor(playerZ / CHUNK_SIZE);
        const loadedRange = RENDER_DISTANCE * CHUNK_SIZE;
        
        // Check if player moved significantly
        const playerKey = `${Math.floor(playerX / 10)},${Math.floor(playerZ / 10)}`;
        const needsUpdate = Math.abs(this.lastUpdatePos.x - playerX) > 1 || 
                          Math.abs(this.lastUpdatePos.z - playerZ) > 1;
        
        for (let y = -range; y <= range; y++) {
            for (let x = -range; x <= range; x++) {
                const wx = playerX + x;
                const wz = playerZ + y;
                
                // Skip drawing outside loaded chunks
                const chunkX = Math.floor(wx / CHUNK_SIZE);
                const chunkZ = Math.floor(wz / CHUNK_SIZE);
                if (Math.abs(chunkX - playerChunkX) > RENDER_DISTANCE || 
                    Math.abs(chunkZ - playerChunkZ) > RENDER_DISTANCE) {
                    continue;
                }
                
                const cacheKey = `${Math.floor(wx)},${Math.floor(wz)}`;
                
                let colors;
                if (this.terrainCache.has(cacheKey) && !needsUpdate) {
                    colors = this.terrainCache.get(cacheKey);
                } else {
                    const h = getSurfaceHeight(wx, wz);
                    colors = this.createGradient(h);
                    this.terrainCache.set(cacheKey, colors);
                }
                
                const screenX = (width / 2) + x * this.zoom;
                const screenY = (height / 2) + y * this.zoom;
                const size = Math.ceil(this.zoom);
                
                // Draw with gradient effect
                const gradient = ctx.createRadialGradient(
                    screenX + size/2, screenY + size/2, 0,
                    screenX + size/2, screenY + size/2, size
                );
                gradient.addColorStop(0, colors.light);
                gradient.addColorStop(0.7, colors.main);
                gradient.addColorStop(1, colors.dark);
                
                ctx.fillStyle = gradient;
                ctx.fillRect(screenX, screenY, size, size);
                
                // Add texture details
                if (this.zoom > 1.5) {
                    ctx.fillStyle = `rgba(0, 0, 0, 0.1)`;
                    ctx.fillRect(screenX, screenY, size, size);
                }
            }
        }
        
        this.lastUpdatePos = { x: playerX, z: playerZ };
    }
    
    drawGrid(ctx, width, height) {
        if (!this.showGrid) return;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 0.5;
        
        const centerX = width / 2;
        const centerY = height / 2;
        const gridSize = this.zoom * 10;
        
        // Vertical lines
        for (let x = centerX % gridSize; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = centerY % gridSize; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Center crosshair
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX - 5, centerY);
        ctx.lineTo(centerX + 5, centerY);
        ctx.moveTo(centerX, centerY - 5);
        ctx.lineTo(centerX, centerY + 5);
        ctx.stroke();
    }
    
    drawPlayer(ctx, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Player direction indicator
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.player.rotation || 0);
        
        // Draw player with gradient
        const playerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
        playerGradient.addColorStop(0, '#ff6b6b');
        playerGradient.addColorStop(0.7, '#ee5a24');
        playerGradient.addColorStop(1, '#c92a2a');
        
        ctx.fillStyle = playerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Direction arrow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -8);
        ctx.stroke();
        
        ctx.restore();
        
        // Player view range
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30 * this.zoom, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    drawWaypoints(ctx, width, height) {
        if (!this.showWaypoints || this.waypoints.length === 0) return;
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        this.waypoints.forEach((waypoint, index) => {
            const screenX = centerX + (waypoint.x - this.player.pos.x) * this.zoom;
            const screenY = centerY + (waypoint.z - this.player.pos.z) * this.zoom;
            
            // Waypoint marker
            ctx.fillStyle = waypoint.color;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Waypoint label
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.fillText(waypoint.name, screenX + 8, screenY - 8);
        });
    }
    
    drawBorder(ctx, width, height) {
        // Outer border with gradient
        const borderGradient = ctx.createLinearGradient(0, 0, width, 0);
        borderGradient.addColorStop(0, '#2c3e50');
        borderGradient.addColorStop(0.5, '#34495e');
        borderGradient.addColorStop(1, '#2c3e50');
        
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, width - 3, height - 3);
        
        // Inner border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(2.5, 2.5, width - 5, height - 5);
    }
    
    update() {
        if (!this.canvas) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const playerX = Math.floor(this.player.pos.x);
        const playerZ = Math.floor(this.player.pos.z);
        
        // Clear with gradient background
        const bgGradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) / 2
        );
        bgGradient.addColorStop(0, '#0a0a0a');
        bgGradient.addColorStop(1, '#000000');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Draw layers
        this.drawTerrain(ctx, width, height, playerX, playerZ);
        this.drawGrid(ctx, width, height);
        this.drawWaypoints(ctx, width, height);
        this.drawPlayer(ctx, width, height);
        this.drawBorder(ctx, width, height);
        
        // Coordinates display
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`X: ${playerX} Z: ${playerZ}`, 5, height - 5);
        ctx.fillText(`Zoom: ${this.zoom.toFixed(1)}x`, 5, 15);
    }
}
