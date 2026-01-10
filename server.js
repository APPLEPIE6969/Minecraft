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

io.on('connection', (socket) => {
    console.log('Player Joined:', socket.id);

    // Create new player entry
    players[socket.id] = { x: 0, y: 30, z: 0, r: 0 };

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

    // D. Handle Disconnect
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
