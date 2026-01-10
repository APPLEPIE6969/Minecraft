const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'] // Fallback to polling if WebSocket fails
});

// 1. Serve the Game File
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// 2. Serve Static Files (if you have images/scripts in folders)
app.use(express.static(__dirname));

// 3. STORE PLAYERS HERE (The Server Memory)
const players = {};

// Helper function to get surface height (simplified version)
function getSurfaceHeight(x, z) {
    // Simple height calculation - in a real implementation, 
    // you'd use the same noise generation as the client
    const baseHeight = 64;
    const variation = Math.sin(x * 0.05) * 5 + Math.cos(z * 0.05) * 5;
    return Math.floor(baseHeight + variation);
}

io.on('connection', (socket) => {
    console.log('Player Joined:', socket.id);

    // Create new player entry with proper spawn position
    const spawnX = 0;
    const spawnZ = 0;
    const spawnY = getSurfaceHeight(spawnX, spawnZ) + 2;
    players[socket.id] = { x: spawnX, y: spawnY, z: spawnZ, r: 0 };
    console.log(`Player ${socket.id} spawning at height: ${spawnY}`);

    // A. Send the new player the list of CURRENT players
    socket.emit('currentPlayers', players);

    // B. Tell everyone else a NEW player has joined
    socket.broadcast.emit('newPlayer', { 
        id: socket.id, 
        player: players[socket.id] 
    });

    // C. Listen for Movement
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            players[socket.id].r = movementData.r; // Rotation
            
            // Tell everyone else this player moved
            socket.broadcast.emit('playerMoved', { 
                id: socket.id, 
                pos: movementData 
            });
        }
    });

    // D. Handle block placement
    socket.on('blockPlace', (data) => {
        console.log(`Block placed by ${socket.id}:`, data);
        // Broadcast to all other players
        socket.broadcast.emit('blockPlace', data);
    });

    // E. Handle block breaking
    socket.on('blockBreak', (data) => {
        console.log(`Block broken by ${socket.id}:`, data);
        // Broadcast to all other players
        socket.broadcast.emit('blockBreak', data);
    });

    // F. Handle Disconnect
    socket.on('disconnect', () => {
        console.log('Player Left:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// 4. Start the Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Minecraft Server running on port ${PORT}`);
});
