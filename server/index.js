const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.CLIENT_ORIGIN || '*';
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 4000;
const MAX_REROLLS = 3;
const initialDice = [1, 1, 1, 1, 1];
const initialHeld = [false, false, false, false, false];
const rooms = new Map();

const categories = [
  'Ones',
  'Twos',
  'Threes',
  'Fours',
  'Fives',
  'Sixes',
  'Three of a Kind',
  'Four of a Kind',
  'Full House',
  'Small Straight',
  'Large Straight',
  'Five of a Kind',
  'Chance',
];

const playerPresets = [
  { color: '#d64045' },
  { color: '#2f80ed' },
  { color: '#219653' },
  { color: '#d49a00' },
];

app.use(cors({ origin: allowedOrigin }));
app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

function createRoomCode() {
  let code = '';

  do {
    code = `DICE-${Math.floor(1000 + Math.random() * 9000)}`;
  } while (rooms.has(code));

  return code;
}

function createRoom(maxPlayers) {
  const roomCode = createRoomCode();
  const room = {
    roomCode,
    maxPlayers,
    players: [],
    currentPlayer: 0,
    dice: [...initialDice],
    held: [...initialHeld],
    rerollsLeft: MAX_REROLLS,
    canScore: false,
    started: false,
    hostId: '',
  };

  rooms.set(roomCode, room);
  return room;
}

function sanitizeName(name, fallback) {
  const clean = String(name || '').trim().slice(0, 16);
  return clean || fallback;
}

function addPlayer(room, socket, playerName) {
  if (room.players.length >= room.maxPlayers) {
    throw new Error('That room is full.');
  }

  const index = room.players.length;
  const player = {
    id: socket.id,
    name: sanitizeName(playerName, `Player ${index + 1}`),
    color: playerPresets[index].color,
    scores: {},
    connected: true,
  };

  room.players.push(player);
  if (!room.hostId) room.hostId = player.id;
  if (room.players.length >= 2) room.started = true;
  socket.join(room.roomCode);
  socket.data.roomCode = room.roomCode;
  socket.data.playerId = player.id;
  return player;
}

function resetTurn(room) {
  room.dice = [...initialDice];
  room.held = [...initialHeld];
  room.rerollsLeft = MAX_REROLLS;
  room.canScore = false;
}

function emitRoom(room) {
  io.to(room.roomCode).emit('gameState', serializeRoom(room));
}

function serializeRoom(room) {
  return {
    roomCode: room.roomCode,
    maxPlayers: room.maxPlayers,
    players: room.players,
    currentPlayer: room.currentPlayer,
    dice: room.dice,
    held: room.held,
    rerollsLeft: room.rerollsLeft,
    canScore: room.canScore,
    started: room.started,
    hostId: room.hostId,
  };
}

function currentPlayer(room) {
  return room.players[room.currentPlayer];
}

function requireTurn(room, socket) {
  if (!room.started) throw new Error('Waiting for another player.');
  if (!currentPlayer(room) || currentPlayer(room).id !== socket.id) {
    throw new Error('It is not your turn.');
  }
}

function totalScore(dice) {
  return dice.reduce((sum, value) => sum + value, 0);
}

function faceTotal(dice, face) {
  return dice.filter(value => value === face).length * face;
}

function hasSet(dice, size) {
  return dice.some(value => dice.filter(item => item === value).length >= size);
}

function hasStraight(dice, straight) {
  return straight.every(value => dice.includes(value));
}

function calculateScore(category, dice) {
  switch (category) {
    case 'Ones':
      return faceTotal(dice, 1);
    case 'Twos':
      return faceTotal(dice, 2);
    case 'Threes':
      return faceTotal(dice, 3);
    case 'Fours':
      return faceTotal(dice, 4);
    case 'Fives':
      return faceTotal(dice, 5);
    case 'Sixes':
      return faceTotal(dice, 6);
    case 'Three of a Kind':
      return hasSet(dice, 3) ? totalScore(dice) : 0;
    case 'Four of a Kind':
      return hasSet(dice, 4) ? totalScore(dice) : 0;
    case 'Full House': {
      const counts = Object.values(
        dice.reduce((acc, value) => {
          acc[value] = (acc[value] || 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => a - b);

      return counts.join(',') === '2,3' ? 25 : 0;
    }
    case 'Small Straight':
      return hasStraight(dice, [1, 2, 3, 4]) ||
        hasStraight(dice, [2, 3, 4, 5]) ||
        hasStraight(dice, [3, 4, 5, 6])
        ? 30
        : 0;
    case 'Large Straight':
      return hasStraight(dice, [1, 2, 3, 4, 5]) ||
        hasStraight(dice, [2, 3, 4, 5, 6])
        ? 40
        : 0;
    case 'Five of a Kind':
      return dice.every(value => value === dice[0]) ? 50 : 0;
    case 'Chance':
      return totalScore(dice);
    default:
      return 0;
  }
}

function handleAction(socket, fn) {
  try {
    fn();
  } catch (error) {
    socket.emit('gameError', error.message);
  }
}

io.on('connection', socket => {
  socket.on('createRoom', ({ playerName, maxPlayers = 4 } = {}) => {
    handleAction(socket, () => {
      const room = createRoom(Math.min(Math.max(Number(maxPlayers) || 4, 2), 4));
      const player = addPlayer(room, socket, playerName);
      socket.emit('roomJoined', { roomCode: room.roomCode, playerId: player.id });
      emitRoom(room);
    });
  });

  socket.on('joinRoom', ({ roomCode, playerName } = {}) => {
    handleAction(socket, () => {
      const room = rooms.get(String(roomCode || '').trim().toUpperCase());
      if (!room) throw new Error('Room not found.');
      const player = addPlayer(room, socket, playerName);
      socket.emit('roomJoined', { roomCode: room.roomCode, playerId: player.id });
      emitRoom(room);
    });
  });

  socket.on('rollDice', () => {
    handleAction(socket, () => {
      const room = rooms.get(socket.data.roomCode);
      if (!room) throw new Error('Room not found.');
      requireTurn(room, socket);
      if (room.rerollsLeft <= 0) throw new Error('No rerolls left.');

      room.dice = room.dice.map((face, index) =>
        room.held[index] ? face : Math.floor(Math.random() * 6) + 1
      );
      room.rerollsLeft -= 1;
      room.canScore = true;
      emitRoom(room);
    });
  });

  socket.on('toggleHold', ({ index } = {}) => {
    handleAction(socket, () => {
      const room = rooms.get(socket.data.roomCode);
      if (!room) throw new Error('Room not found.');
      requireTurn(room, socket);
      if (!room.canScore) throw new Error('Roll before holding dice.');
      const diceIndex = Number(index);
      if (diceIndex < 0 || diceIndex > 4) throw new Error('Invalid die.');

      room.held[diceIndex] = !room.held[diceIndex];
      emitRoom(room);
    });
  });

  socket.on('scoreCategory', ({ category } = {}) => {
    handleAction(socket, () => {
      const room = rooms.get(socket.data.roomCode);
      if (!room) throw new Error('Room not found.');
      requireTurn(room, socket);
      if (!room.canScore) throw new Error('Roll before scoring.');
      if (!categories.includes(category)) throw new Error('Invalid category.');
      const player = currentPlayer(room);
      if (player.scores[category] !== undefined) throw new Error('Category already scored.');

      player.scores[category] = calculateScore(category, room.dice);
      room.currentPlayer = (room.currentPlayer + 1) % room.players.length;
      resetTurn(room);
      emitRoom(room);
    });
  });

  socket.on('resetTurn', () => {
    handleAction(socket, () => {
      const room = rooms.get(socket.data.roomCode);
      if (!room) throw new Error('Room not found.');
      requireTurn(room, socket);
      resetTurn(room);
      emitRoom(room);
    });
  });

  socket.on('restartGame', () => {
    handleAction(socket, () => {
      const room = rooms.get(socket.data.roomCode);
      if (!room) throw new Error('Room not found.');
      if (socket.id !== room.hostId) throw new Error('Only the host can restart.');
      room.players = room.players.map(player => ({ ...player, scores: {} }));
      room.currentPlayer = 0;
      room.started = room.players.length >= 2;
      resetTurn(room);
      emitRoom(room);
    });
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;

    room.players = room.players.map(player =>
      player.id === socket.id ? { ...player, connected: false } : player
    );

    if (room.players.every(player => !player.connected)) {
      rooms.delete(room.roomCode);
      return;
    }

    emitRoom(room);
  });
});

server.listen(PORT, () => {
  console.log(`Diced realtime server listening on ${PORT}`);
});
