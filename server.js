const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Serve the game files
app.use(express.static(__dirname));

// Store players: { id: { x, y, z, rotation } }
const players = {};

io.on('connection', (socket) => {
    console.log('New Player Connected:', socket.id);

    // 1. Create new player data
    players[socket.id] = { x: 0, y: 30, z: 0, r: 0 };

    // 2. Send CURRENT players to the NEW player
    socket.emit('currentPlayers', players);

    // 3. Tell EVERYONE ELSE about the NEW player
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // 4. Handle Movement
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            players[socket.id].r = movementData.r; // Rotation
            
            // Broadcast move to everyone else
            socket.broadcast.emit('playerMoved', { id: socket.id, pos: movementData });
        }
    });

    // 5. Handle Disconnect
    socket.on('disconnect', () => {
        console.log('Player Disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
