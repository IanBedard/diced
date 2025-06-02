import React, { useState } from 'react';
import { useSocketGame } from './useSocketGame'; // <-- see previous guide for this hook
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

const playerColors = ['red', 'blue', 'green', 'gold'];
const playerNames = ['Red', 'Blue', 'Green', 'Yellow'];

const Lobby: React.FC<{ onStart: (lobbyId: string, players: string[]) => void }> = ({ onStart }) => {
  const { lobbyId, players, createLobby, joinLobby } = useSocketGame();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    createLobby();
    setError('');
  };

  const handleJoin = () => {
    joinLobby(joinCode.trim().toLowerCase());
    setError('');
  };

  // Start game when enough players (2-4) are present and you are the host
  React.useEffect(() => {
    if (lobbyId && players.length >= 2 && players.length <= 4) {
      // You can add a "Start Game" button for the host if you want manual start
      onStart(lobbyId, players);
    }
  }, [lobbyId, players, onStart]);

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <h2>Online Lobby</h2>
      {!lobbyId && (
        <>
          <Button variant="contained" color="primary" sx={{ m: 2 }} onClick={handleCreate}>
            Create Lobby
          </Button>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Lobby Code"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              sx={{ mr: 2 }}
            />
            <Button variant="outlined" onClick={handleJoin}>
              Join Lobby
            </Button>
          </Box>
          {error && <Box sx={{ color: 'red', mt: 2 }}>{error}</Box>}
        </>
      )}
      {lobbyId && ( 
        <Box sx={{ mt: 4 }}>
          <div>
            <strong>Lobby Code:</strong>
            <span style={{ fontSize: 32, fontWeight: 'bold', letterSpacing: 2, marginLeft: 8 }}>
              {lobbyId.toUpperCase()}
            </span>
          </div>
          <div style={{ marginTop: 16 }}>
            <strong>Players:</strong>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {players.map((id, idx) => (
                <li key={id} style={{ color: playerColors[idx % playerColors.length], fontWeight: 'bold' }}>
                  {playerNames[idx] || `Player ${idx + 1}`}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: 24 }}>
            <em>Waiting for players... (2-4 required)</em>
          </div>
          <Button
            size="small"
            variant="outlined"
            sx={{ ml: 2 }}
            onClick={() => navigator.clipboard.writeText(lobbyId)}
          >
            Copy
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Lobby;