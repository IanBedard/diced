import React, { useCallback, useEffect, useMemo, useState } from 'react';
import CasinoIcon from '@mui/icons-material/Casino';
import GroupsIcon from '@mui/icons-material/Groups';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Dices from './Dices/Dices';
import Goals from './Goals/Goals';
import {
  Category,
  GameState,
  Player,
  buildPlayers,
  categories,
  isPlayerComplete,
  playerTotal,
  totalScore,
} from './game';
import './App.css';

const initialDice = [1, 1, 1, 1, 1];
const initialHeld = [false, false, false, false, false];
const maxRerolls = 3;
const apiUrl = process.env.REACT_APP_GAME_API_URL || '/api/game';

type PlayMode = 'lobby' | 'local' | 'online';

function App() {
  const [mode, setMode] = useState<PlayMode>('lobby');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [dice, setDice] = useState(initialDice);
  const [held, setHeld] = useState(initialHeld);
  const [rolling, setRolling] = useState(false);
  const [rerollsLeft, setRerollsLeft] = useState(maxRerolls);
  const [canApprove, setCanApprove] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('Player');
  const [joinCode, setJoinCode] = useState('');
  const [onlinePlayerId, setOnlinePlayerId] = useState('');
  const [syncStatus, setSyncStatus] = useState('Netlify ready');
  const [onlineError, setOnlineError] = useState('');

  const activePlayer = players[currentPlayer];
  const isOnline = mode === 'online';
  const isMyOnlineTurn = isOnline && activePlayer?.id === onlinePlayerId;
  const canAct = !isOnline || isMyOnlineTurn;
  const completedTurns = players.reduce(
    (sum, player) => sum + Object.keys(player.scores).length,
    0
  );
  const totalTurns = players.length * categories.length || 1;
  const gameComplete = players.length > 0 && players.every(isPlayerComplete);
  const leaders = useMemo(() => {
    if (players.length === 0) return [];
    const highScore = Math.max(...players.map(playerTotal));
    return players.filter(player => playerTotal(player) === highScore);
  }, [players]);

  function syncOnlineGame(state: GameState) {
    setRoomCode(state.roomCode);
    setPlayers(state.players);
    setCurrentPlayer(state.currentPlayer);
    setDice(state.dice);
    setHeld(state.held);
    setRerollsLeft(state.rerollsLeft);
    setCanApprove(state.canScore);
    setRolling(false);
  }

  async function callGameApi(action: string, payload: Record<string, unknown> = {}) {
    setOnlineError('');
    setSyncStatus('Syncing');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        roomCode,
        playerId: onlinePlayerId,
        ...payload,
      }),
    });
    const data = await response.json();

    if (!response.ok || data.error) {
      setSyncStatus('Needs attention');
      throw new Error(data.error || 'Game sync failed.');
    }

    if (data.playerId) setOnlinePlayerId(data.playerId);
    if (data.room) {
      syncOnlineGame(data.room);
      setMode('online');
    }
    setSyncStatus('Synced');
    return data;
  }

  const refreshRoom = useCallback(async (nextRoomCode: string) => {
    try {
      const response = await fetch(`${apiUrl}?roomCode=${encodeURIComponent(nextRoomCode)}`);
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Refresh failed.');
      syncOnlineGame(data.room);
      setSyncStatus('Synced');
    } catch (error) {
      setSyncStatus('Disconnected');
    }
  }, []);

  useEffect(() => {
    if (mode !== 'online' || !roomCode) return;

    const interval = window.setInterval(() => {
      refreshRoom(roomCode);
    }, 1500);

    return () => window.clearInterval(interval);
  }, [mode, roomCode, refreshRoom]);

  const getRandomFace = () => Math.floor(Math.random() * 6) + 1;

  const resetTurn = () => {
    if (isOnline) {
      callGameApi('resetTurn').catch(error => setOnlineError(error.message));
      return;
    }

    setDice(initialDice);
    setHeld(initialHeld);
    setRerollsLeft(maxRerolls);
    setCanApprove(false);
  };

  const startLocalGame = (playerCount: number) => {
    setMode('local');
    setRoomCode('LOCAL');
    setPlayers(buildPlayers(playerCount));
    setCurrentPlayer(0);
    setDice(initialDice);
    setHeld(initialHeld);
    setRerollsLeft(maxRerolls);
    setCanApprove(false);
  };

  const createOnlineRoom = (maxPlayers: number) => {
    callGameApi('createRoom', { playerName, maxPlayers }).catch(error =>
      setOnlineError(error.message)
    );
  };

  const joinOnlineRoom = () => {
    callGameApi('joinRoom', { roomCode: joinCode, playerName }).catch(error =>
      setOnlineError(error.message)
    );
  };

  const rollDice = () => {
    if (rolling || rerollsLeft === 0 || !canAct) return;
    setRolling(true);

    if (isOnline) {
      callGameApi('rollDice')
        .catch(error => setOnlineError(error.message))
        .finally(() => setRolling(false));
      return;
    }

    setTimeout(() => {
      setDice(currentDice =>
        currentDice.map((face, idx) => (held[idx] ? face : getRandomFace()))
      );
      setRerollsLeft(current => current - 1);
      setRolling(false);
      setCanApprove(true);
    }, 600);
  };

  const toggleHold = (idx: number) => {
    if (rolling || rerollsLeft === maxRerolls || !canAct) return;

    if (isOnline) {
      callGameApi('toggleHold', { index: idx }).catch(error => setOnlineError(error.message));
      return;
    }

    setHeld(currentHeld => currentHeld.map((isHeld, i) => (i === idx ? !isHeld : isHeld)));
  };

  const handleApproveRoll = (category: Category, score: number) => {
    if (!canAct) return;

    if (isOnline) {
      callGameApi('scoreCategory', { category }).catch(error => setOnlineError(error.message));
      return;
    }

    setPlayers(prev => {
      const updated = prev.map(player => ({ ...player, scores: { ...player.scores } }));
      updated[currentPlayer].scores[category] = score;
      return updated;
    });
    setCurrentPlayer(prev => (prev + 1) % players.length);
    resetTurn();
  };

  const leaveGame = () => {
    setMode('lobby');
    setPlayers([]);
    setCurrentPlayer(0);
    setRoomCode('');
    setOnlinePlayerId('');
    setOnlineError('');
    resetTurn();
  };

  const restartGame = () => {
    if (isOnline) {
      callGameApi('restartGame').catch(error => setOnlineError(error.message));
      return;
    }

    startLocalGame(players.length);
  };

  if (mode === 'lobby') {
    return (
      <Box className="app-shell lobby">
        <header className="hero">
          <div>
            <Chip
              icon={syncStatus === 'Disconnected' ? <WifiOffIcon /> : <WifiIcon />}
              label={syncStatus}
              className="status-chip"
            />
            <h1>Diced</h1>
            <p>
              Start a quick local table, or create a live room that syncs turns,
              dice, held rolls, and scorecards between browsers.
            </p>
          </div>
          <div className="room-panel">
            <span>Netlify Rooms</span>
            <strong>Ready</strong>
            <small>{apiUrl}</small>
          </div>
        </header>

        <section className="online-setup" aria-label="Online game setup">
          <div>
            <span className="eyebrow">Player name</span>
            <TextField
              value={playerName}
              onChange={event => setPlayerName(event.target.value)}
              fullWidth
              size="small"
              inputProps={{ maxLength: 16 }}
            />
          </div>
          <div>
            <span className="eyebrow">Create online room</span>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
              {[2, 3, 4].map(num => (
                <Button key={num} variant="contained" onClick={() => createOnlineRoom(num)}>
                  {num} Players
                </Button>
              ))}
            </Stack>
          </div>
          <div>
            <span className="eyebrow">Join online room</span>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
              <TextField
                placeholder="DICE-5821"
                value={joinCode}
                onChange={event => setJoinCode(event.target.value.toUpperCase())}
                size="small"
                fullWidth
              />
              <Button variant="outlined" onClick={joinOnlineRoom}>
                Join
              </Button>
            </Stack>
          </div>
          {onlineError && <p className="error-text">{onlineError}</p>}
        </section>

        <section className="setup-grid" aria-label="Start a local Diced game">
          {[2, 3, 4].map(num => (
            <button className="player-option" key={num} onClick={() => startLocalGame(num)}>
              <GroupsIcon />
              <span>{num} Local Players</span>
              <small>Pass-and-play</small>
            </button>
          ))}
        </section>

        <section className="rules-strip">
          <span>Create or join a room</span>
          <span>Server validates rolls</span>
          <span>Every browser gets the same scorecard</span>
          <span>Local mode still works offline</span>
        </section>
      </Box>
    );
  }

  return (
    <Box className="app-shell game-board">
      <header className="topbar">
        <div>
          <Chip
            icon={isOnline ? <WifiIcon /> : <CasinoIcon />}
            label={`${isOnline ? 'Room' : 'Mode'} ${roomCode}`}
            className="status-chip"
          />
          <h1>Diced</h1>
        </div>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<RestartAltIcon />}
          onClick={leaveGame}
        >
          Leave Game
        </Button>
      </header>

      {isOnline && players.length < 2 && (
        <section className="waiting-panel">
          <span className="eyebrow">Waiting room</span>
          <h2>{roomCode}</h2>
          <p>Share this room code with another player to start the game.</p>
        </section>
      )}

      <section className="score-summary" aria-label="Player scores">
        {players.map((player, index) => (
          <article
            className={`score-card ${index === currentPlayer && !gameComplete ? 'active' : ''}`}
            key={player.id}
            style={{ borderColor: player.color }}
          >
            <span style={{ color: player.color }}>{player.name}</span>
            <strong>{playerTotal(player)}</strong>
            <small>
              {Object.keys(player.scores).length} / {categories.length} goals
              {isOnline && player.connected === false ? ' - offline' : ''}
            </small>
          </article>
        ))}
      </section>

      <LinearProgress
        variant="determinate"
        value={(completedTurns / totalTurns) * 100}
        className="turn-progress"
      />

      {gameComplete ? (
        <section className="winner-panel">
          <Chip label="Game complete" className="status-chip" />
          <h2>
            {leaders.length === 1
              ? `${leaders[0].name} wins with ${playerTotal(leaders[0])}!`
              : `Tie game at ${playerTotal(leaders[0])}!`}
          </h2>
          <Button variant="contained" startIcon={<RestartAltIcon />} onClick={restartGame}>
            Play Again
          </Button>
        </section>
      ) : (
        <main className="play-grid">
          <section className="turn-panel">
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
              <div>
                <span className="eyebrow">
                  {isOnline && !canAct ? 'Watching turn' : 'Current turn'}
                </span>
                <h2 style={{ color: activePlayer.color }}>{activePlayer.name} Player</h2>
              </div>
              <Chip label={`Dice total ${rerollsLeft === maxRerolls ? '-' : totalScore(dice)}`} />
            </Stack>

            <Dices
              dice={dice}
              held={held}
              rolling={rolling}
              rerollsLeft={rerollsLeft}
              rollDice={rollDice}
              toggleHold={toggleHold}
              resetTurn={resetTurn}
              disabled={!canAct || (isOnline && players.length < 2)}
            />
          </section>

          <Goals
            dice={dice}
            usedGoals={activePlayer.scores}
            onApproveRoll={handleApproveRoll}
            canApprove={canApprove && rerollsLeft < maxRerolls && canAct}
            playerColor={activePlayer.color}
          />
        </main>
      )}

      <section className="score-table-wrap">
        <table className="score-table">
          <thead>
            <tr>
              <th>Goal</th>
              {players.map(player => (
                <th key={player.id} style={{ color: player.color }}>
                  {player.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category}>
                <td>{category}</td>
                {players.map(player => (
                  <td key={player.id} className={player.scores[category] !== undefined ? 'filled' : ''}>
                    {player.scores[category] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Box>
  );
}

export default App;
