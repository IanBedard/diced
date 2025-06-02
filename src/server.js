const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const lobbies = {};

io.on('connection', (socket) => {
  socket.on('createLobby', (cb) => {
    const lobbyId = Math.random().toString(36).substr(2, 6);
    lobbies[lobbyId] = { players: [socket.id], state: null };
    socket.join(lobbyId);
    cb(lobbyId);
    io.to(lobbyId).emit('players', lobbies[lobbyId].players);
  });

  socket.on('joinLobby', (lobbyId, cb) => {
    if (lobbies[lobbyId]) {
      lobbies[lobbyId].players.push(socket.id);
      socket.join(lobbyId);
      cb(true);
      io.to(lobbyId).emit('players', lobbies[lobbyId].players);
    } else { 
      cb(false);
    }
  });
 
  socket.on('gameAction', ({ lobbyId, action }) => {
    lobbies[lobbyId].state = action.state;
    io.to(lobbyId).emit('gameState', lobbies[lobbyId].state);
  });

  socket.on('disconnect', () => {
    for (const lobbyId in lobbies) {
      lobbies[lobbyId].players = lobbies[lobbyId].players.filter(id => id !== socket.id);
      if (lobbies[lobbyId].players.length === 0) delete lobbies[lobbyId];
      else io.to(lobbyId).emit('players', lobbies[lobbyId].players);
    }
  });
});

server.listen(3001, () => console.log('Socket.IO server running on port 3001'));
