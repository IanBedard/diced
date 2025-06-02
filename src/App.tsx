import React, { useState } from 'react';
import Dices from './Dices/Dices';
import Goals from './Goals/Goals';
import Lobby from './Lobby';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import './App.css';
import { useSocketGame } from './useSocketGame';

const initialDice = [1, 1, 1, 1, 1];
const initialHeld = [false, false, false, false, false];
const maxRerolls = 3;
const playerColors = ['red', 'blue', 'green', 'gold'];
const playerNames = ['Red', 'Blue', 'Green', 'Yellow'];

function App() {
  // All hooks at the top!
  const { lobbyId, players, gameState, sendAction } = useSocketGame();
  const [gameStarted, setGameStarted] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [dice, setDice] = useState(initialDice);
  const [held, setHeld] = useState(initialHeld);
  const [rolling, setRolling] = useState(false); 
  const [rerollsLeft, setRerollsLeft] = useState(maxRerolls);
  const [usedGoals, setUsedGoals] = useState<Array<{ [goal: string]: number }>>(players.map(() => ({})));
  const [canApprove, setCanApprove] = useState(false);

  // Always call hooks before any return!
  React.useEffect(() => {
    if (players.length) {
      setUsedGoals(Array(players.length).fill(null).map(() => ({})));
      setCurrentPlayer(0);
      setDice(initialDice);
      setHeld(initialHeld);
      setRerollsLeft(maxRerolls);
      setCanApprove(false);
    }
  }, [players]);

  const handleStart = (lobbyId: string, players: string[]) => {
    setGameStarted(true);
    // Optionally: sendAction({ type: 'startGame' });
  };

  // Now you can return conditionally
  if (!gameStarted) {
    return <Lobby onStart={handleStart} />;
  }

  const getRandomFace = () => Math.floor(Math.random() * 6) + 1; 

  const rollDice = () => {
    if (rolling || rerollsLeft === 0) return;
    setRolling(true);
    setTimeout(() => {
      setDice(dice.map((face, idx) => (held[idx] ? face : getRandomFace())));
      setRerollsLeft(rerollsLeft - 1);
      setRolling(false);
      setCanApprove(true);
    }, 600);
  };

  const toggleHold = (idx: number) => {
    if (rolling || rerollsLeft === maxRerolls) return;
    setHeld(held => held.map((h, i) => (i === idx ? !h : h)));
  };

  const resetTurn = () => {
    setDice(initialDice);
    setHeld(initialHeld);
    setRerollsLeft(maxRerolls);
    setCanApprove(false);
  };

  const handleApproveRoll = (goal: string, score: number) => {
    setUsedGoals(prev => {
      const updated = [...prev];
      updated[currentPlayer] = { ...updated[currentPlayer], [goal]: score };
      return updated;
    });
    // Next player's turn
    setCurrentPlayer((prev) => (prev + 1) % (players.length || 1));
    resetTurn();
  };

  // Calculate turn number for each player (number of goals they've filled + 1)
  const playerTurnNumber = usedGoals[currentPlayer]
    ? Object.keys(usedGoals[currentPlayer]).length + 1
    : 1;

  // Calculate total score for each player
  const playerScores = usedGoals.map(
    goals => Object.values(goals).reduce((a, b) => a + b, 0)
  );

  return (
    <Box className="App" sx={{ p: 4 }}>
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <span
          style={{
            color: playerColors[currentPlayer],
            fontWeight: 'bold',
            fontSize: 24,
            letterSpacing: 2,
          }}
        >
          {playerNames[currentPlayer]} Player's Turn
        </span>
      </Box>
      <Dices
        dice={dice}
        held={held}
        rolling={rolling}
        rerollsLeft={rerollsLeft}
        rollDice={() => {/* sendAction({type: 'rollDice'}) */}}
        toggleHold={(idx) => {/* sendAction({type: 'toggleHold', idx}) */}}
        resetGame={() => {/* sendAction({type: 'resetTurn'}) */}}
      />
      <Goals
        dice={dice}
        usedGoals={usedGoals[currentPlayer] || {}}
        onApproveRoll={(goal, score) => {/* sendAction({type: 'approveRoll', goal, score}) */}}
        canApprove={canApprove && rerollsLeft < maxRerolls}
        playerColor={playerColors[currentPlayer]}
        playerName={playerNames[currentPlayer]}
      />
      <Box sx={{ mt: 4, fontSize: 20 }}>
        <strong>Turn:</strong> {playerTurnNumber} / 13
      </Box>
      <Box sx={{ mt: 2, fontSize: 20 }}>
        {playerScores.map((score, idx) => (
          <span key={idx} style={{ color: playerColors[idx], marginRight: 16 }}>
            <strong>{playerNames[idx]}:</strong> {score}
          </span>
        ))}
      </Box>
      {/* Score Table ... */}
    </Box>
  );
}

export default App;
