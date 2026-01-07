import { getSurfaceHeight } from './world.js';

export class Minimap {
    constructor(player) {
        this.player = player;
        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.size = 100; // Map radius
        this.zoom = 2; // Pixels per block
        
        // Waypoints
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // Logic to set waypoint could go here
            console.log("Waypoint clicked");
        });
    }

    update() {
        if (!this.canvas) return;
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const px = Math.floor(this.player.pos.x);
        const pz = Math.floor(this.player.pos.z);

        // Clear Black
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        // Draw Terrain (Top Down)
        // Optimization: We scan a grid around the player
        const range = Math.floor(width / 2 / this.zoom);
        
        for (let y = -range; y <= range; y+=2) { // Step 2 for speed
            for (let x = -range; x <= range; x+=2) {
                const wx = px + x;
                const wz = pz + y;
                const h = getSurfaceHeight(wx, wz);

                // Colors
                if (h < -2) ctx.fillStyle = '#0000AA'; // Water
                else if (h < 0) ctx.fillStyle = '#DDDD88'; // Sand
                else if (h > 15) ctx.fillStyle = '#888888'; // Stone
                else ctx.fillStyle = '#228822'; // Grass

                // Draw pixel
                ctx.fillRect((width/2) + x*this.zoom, (height/2) + y*this.zoom, this.zoom*2, this.zoom*2);
            }
        }

        // Draw Player Arrow
        ctx.save();
        ctx.translate(width/2, height/2);
        // We don't have rotation in player obj passed here easily, so just a red dot
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}
