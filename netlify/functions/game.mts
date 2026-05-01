import { getDeployStore, getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';

type Category =
  | 'Ones'
  | 'Twos'
  | 'Threes'
  | 'Fours'
  | 'Fives'
  | 'Sixes'
  | 'Three of a Kind'
  | 'Four of a Kind'
  | 'Full House'
  | 'Small Straight'
  | 'Large Straight'
  | 'Five of a Kind'
  | 'Chance';

interface Player {
  id: string;
  name: string;
  color: string;
  scores: Partial<Record<Category, number>>;
  connected?: boolean;
}

interface Room {
  roomCode: string;
  maxPlayers: number;
  players: Player[];
  currentPlayer: number;
  dice: number[];
  held: boolean[];
  rerollsLeft: number;
  canScore: boolean;
  started: boolean;
  hostId: string;
  updatedAt: string;
}

const initialDice = [1, 1, 1, 1, 1];
const initialHeld = [false, false, false, false, false];
const maxRerolls = 3;
const categories: Category[] = [
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

export const config: Config = {
  path: '/api/game',
};

export default async (req: Request, context: Context) => {
  try {
    const url = new URL(req.url);
    const store = getRoomStore(context);

    if (req.method === 'GET') {
      const roomCode = normalizeRoomCode(url.searchParams.get('roomCode'));
      const room = await getRoom(store, roomCode);
      return json({ room });
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const body = await req.json();
    const result = await handleAction(store, body);
    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 400);
  }
};

function getRoomStore(context: Context) {
  if (context.deploy?.context === 'production') {
    return getStore({ name: 'diced-rooms', consistency: 'strong' });
  }

  return getDeployStore({ name: 'diced-rooms' });
}

async function handleAction(store: ReturnType<typeof getStore>, body: any) {
  switch (body?.action) {
    case 'createRoom':
      return createRoom(store, body);
    case 'joinRoom':
      return joinRoom(store, body);
    case 'rollDice':
      return updateRoom(store, body.roomCode, body.playerId, room => {
        requireTurn(room, body.playerId);
        if (room.rerollsLeft <= 0) throw new Error('No rerolls left.');
        room.dice = room.dice.map((face, index) =>
          room.held[index] ? face : randomFace()
        );
        room.rerollsLeft -= 1;
        room.canScore = true;
      });
    case 'toggleHold':
      return updateRoom(store, body.roomCode, body.playerId, room => {
        requireTurn(room, body.playerId);
        if (!room.canScore) throw new Error('Roll before holding dice.');
        const index = Number(body.index);
        if (index < 0 || index > 4) throw new Error('Invalid die.');
        room.held[index] = !room.held[index];
      });
    case 'scoreCategory':
      return updateRoom(store, body.roomCode, body.playerId, room => {
        requireTurn(room, body.playerId);
        if (!room.canScore) throw new Error('Roll before scoring.');
        if (!categories.includes(body.category)) throw new Error('Invalid category.');
        const player = room.players[room.currentPlayer];
        if (player.scores[body.category as Category] !== undefined) {
          throw new Error('Category already scored.');
        }
        player.scores[body.category as Category] = calculateScore(body.category, room.dice);
        room.currentPlayer = (room.currentPlayer + 1) % room.players.length;
        resetTurn(room);
      });
    case 'resetTurn':
      return updateRoom(store, body.roomCode, body.playerId, room => {
        requireTurn(room, body.playerId);
        resetTurn(room);
      });
    case 'restartGame':
      return updateRoom(store, body.roomCode, body.playerId, room => {
        if (room.hostId !== body.playerId) throw new Error('Only the host can restart.');
        room.players = room.players.map(player => ({ ...player, scores: {} }));
        room.currentPlayer = 0;
        room.started = room.players.length >= 2;
        resetTurn(room);
      });
    default:
      throw new Error('Unknown action.');
  }
}

async function createRoom(store: ReturnType<typeof getStore>, body: any) {
  const roomCode = await createRoomCode(store);
  const playerId = createPlayerId();
  const room: Room = {
    roomCode,
    maxPlayers: clampPlayerCount(body.maxPlayers),
    players: [
      {
        id: playerId,
        name: sanitizeName(body.playerName, 'Player 1'),
        color: playerPresets[0].color,
        scores: {},
        connected: true,
      },
    ],
    currentPlayer: 0,
    dice: [...initialDice],
    held: [...initialHeld],
    rerollsLeft: maxRerolls,
    canScore: false,
    started: false,
    hostId: playerId,
    updatedAt: new Date().toISOString(),
  };

  await saveRoom(store, room);
  return { room, playerId };
}

async function joinRoom(store: ReturnType<typeof getStore>, body: any) {
  const room = await getRoom(store, normalizeRoomCode(body.roomCode));
  if (room.players.length >= room.maxPlayers) throw new Error('That room is full.');

  const existing = room.players.find(player => player.name === sanitizeName(body.playerName, ''));
  if (existing) return { room, playerId: existing.id };

  const index = room.players.length;
  const playerId = createPlayerId();
  room.players.push({
    id: playerId,
    name: sanitizeName(body.playerName, `Player ${index + 1}`),
    color: playerPresets[index].color,
    scores: {},
    connected: true,
  });
  room.started = room.players.length >= 2;
  await saveRoom(store, room);
  return { room, playerId };
}

async function updateRoom(
  store: ReturnType<typeof getStore>,
  roomCode: string,
  playerId: string,
  update: (room: Room) => void
) {
  const room = await getRoom(store, normalizeRoomCode(roomCode));
  update(room);
  await saveRoom(store, room);
  return { room, playerId };
}

async function createRoomCode(store: ReturnType<typeof getStore>) {
  let roomCode = '';
  let exists: Room | null = null;

  do {
    roomCode = `DICE-${Math.floor(1000 + Math.random() * 9000)}`;
    exists = await store.get(roomCode, { type: 'json' });
  } while (exists);

  return roomCode;
}

async function getRoom(store: ReturnType<typeof getStore>, roomCode: string) {
  if (!roomCode) throw new Error('Room code is required.');
  const room = await store.get(roomCode, { type: 'json' });
  if (!room) throw new Error('Room not found.');
  return room as Room;
}

async function saveRoom(store: ReturnType<typeof getStore>, room: Room) {
  room.updatedAt = new Date().toISOString();
  await store.setJSON(room.roomCode, room);
}

function normalizeRoomCode(roomCode: string | null) {
  return String(roomCode || '').trim().toUpperCase();
}

function createPlayerId() {
  return `player-${crypto.randomUUID()}`;
}

function clampPlayerCount(count: number) {
  return Math.min(Math.max(Number(count) || 4, 2), 4);
}

function sanitizeName(name: string, fallback: string) {
  const clean = String(name || '').trim().slice(0, 16);
  return clean || fallback;
}

function requireTurn(room: Room, playerId: string) {
  if (!room.started) throw new Error('Waiting for another player.');
  if (room.players[room.currentPlayer]?.id !== playerId) {
    throw new Error('It is not your turn.');
  }
}

function resetTurn(room: Room) {
  room.dice = [...initialDice];
  room.held = [...initialHeld];
  room.rerollsLeft = maxRerolls;
  room.canScore = false;
}

function randomFace() {
  return Math.floor(Math.random() * 6) + 1;
}

function totalScore(dice: number[]) {
  return dice.reduce((sum, value) => sum + value, 0);
}

function faceTotal(dice: number[], face: number) {
  return dice.filter(value => value === face).length * face;
}

function hasSet(dice: number[], size: number) {
  return dice.some(value => dice.filter(item => item === value).length >= size);
}

function hasStraight(dice: number[], straight: number[]) {
  return straight.every(value => dice.includes(value));
}

function calculateScore(category: Category, dice: number[]) {
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
        dice.reduce<Record<number, number>>((acc, value) => {
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

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}
