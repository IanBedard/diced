import React, { useMemo, useState } from 'react';
import CasinoIcon from '@mui/icons-material/Casino';
import GroupsIcon from '@mui/icons-material/Groups';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Dices from './Dices/Dices';
import Goals from './Goals/Goals';
import {
  Category,
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
const roomCode = 'DICE-5821';

function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [dice, setDice] = useState(initialDice);
  const [held, setHeld] = useState(initialHeld);
  const [rolling, setRolling] = useState(false);
  const [rerollsLeft, setRerollsLeft] = useState(maxRerolls);
  const [canApprove, setCanApprove] = useState(false);

  const activePlayer = players[currentPlayer];
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

  const getRandomFace = () => Math.floor(Math.random() * 6) + 1;

  const resetTurn = () => {
    setDice(initialDice);
    setHeld(initialHeld);
    setRerollsLeft(maxRerolls);
    setCanApprove(false);
  };

  const startGame = (playerCount: number) => {
    setPlayers(buildPlayers(playerCount));
    setCurrentPlayer(0);
    resetTurn();
  };

  const rollDice = () => {
    if (rolling || rerollsLeft === 0) return;
    setRolling(true);
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
    if (rolling || rerollsLeft === maxRerolls) return;
    setHeld(currentHeld => currentHeld.map((isHeld, i) => (i === idx ? !isHeld : isHeld)));
  };

  const handleApproveRoll = (category: Category, score: number) => {
    setPlayers(prev => {
      const updated = prev.map(player => ({ ...player, scores: { ...player.scores } }));
      updated[currentPlayer].scores[category] = score;
      return updated;
    });
    setCurrentPlayer(prev => (prev + 1) % players.length);
    resetTurn();
  };

  if (players.length === 0) {
    return (
      <Box className="app-shell lobby">
        <header className="hero">
          <div>
            <Chip icon={<CasinoIcon />} label="Online game prototype" className="status-chip" />
            <h1>Diced</h1>
            <p>
              A quick five-dice score chase built for pass-and-play today, with a room
              flow ready for sockets, matchmaking, and shared turns next.
            </p>
          </div>
          <div className="room-panel">
            <span>Room Code</span>
            <strong>{roomCode}</strong>
            <small>Local preview mode</small>
          </div>
        </header>

        <section className="setup-grid" aria-label="Start a Diced game">
          {[2, 3, 4].map(num => (
            <button className="player-option" key={num} onClick={() => startGame(num)}>
              <GroupsIcon />
              <span>{num} Players</span>
              <small>Start table</small>
            </button>
          ))}
        </section>

        <section className="rules-strip">
          <span>Roll up to three times</span>
          <span>Hold dice between rolls</span>
          <span>Fill every scoring category once</span>
          <span>Highest total wins</span>
        </section>
      </Box>
    );
  }

  return (
    <Box className="app-shell game-board">
      <header className="topbar">
        <div>
          <Chip label={`Room ${roomCode}`} className="status-chip" />
          <h1>Diced</h1>
        </div>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<RestartAltIcon />}
          onClick={() => setPlayers([])}
        >
          New Game
        </Button>
      </header>

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
          <Button variant="contained" startIcon={<RestartAltIcon />} onClick={() => startGame(players.length)}>
            Play Again
          </Button>
        </section>
      ) : (
        <main className="play-grid">
          <section className="turn-panel">
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
              <div>
                <span className="eyebrow">Current turn</span>
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
            />
          </section>

          <Goals
            dice={dice}
            usedGoals={activePlayer.scores}
            onApproveRoll={handleApproveRoll}
            canApprove={canApprove && rerollsLeft < maxRerolls}
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
