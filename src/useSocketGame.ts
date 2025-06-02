import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const socket = io('http://localhost:3001');

export function useSocketGame() {
  const [lobbyId, setLobbyId] = useState('');
  const [players, setPlayers] = useState<string[]>([]);
  const [gameState, setGameState] = useState<any>(null);

  useEffect(() => {
    socket.on('players', setPlayers);
    socket.on('gameState', setGameState);
    return () => { socket.disconnect(); };
  }, []);

  const createLobby = () => socket.emit('createLobby', (id: string) => {
    setLobbyId(id);
  });
  const joinLobby = (id: string) => socket.emit('joinLobby', id, (ok: boolean) => ok && setLobbyId(id));
  const sendAction = (action: any) => socket.emit('gameAction', { lobbyId, action });

  return { lobbyId, players, gameState, createLobby, joinLobby, sendAction };
}

