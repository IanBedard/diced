import React, { useState } from 'react';
import Dices from './Dices/Dices';
import Goals from './Goals/Goals';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import './App.css';

const initialDice = [1, 1, 1, 1, 1];
const initialHeld = [false, false, false, false, false];
const maxRerolls = 3;
const playerColors = ['red', 'blue', 'green', 'gold'];
const playerNames = ['Red', 'Blue', 'Green', 'Yellow'];

function App() {
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [dice, setDice] = useState(initialDice);
  const [held, setHeld] = useState(initialHeld);
  const [rolling, setRolling] = useState(false);
  const [rerollsLeft, setRerollsLeft] = useState(maxRerolls);
  const [usedGoals, setUsedGoals] = useState<Array<{ [goal: string]: number }>>([]);
  const [canApprove, setCanApprove] = useState(false);

  // Initialize usedGoals for each player after selection
  React.useEffect(() => {
    if (playerCount) {
      setUsedGoals(Array(playerCount).fill(null).map(() => ({})));
      setCurrentPlayer(0);
      setDice(initialDice);
      setHeld(initialHeld);
      setRerollsLeft(maxRerolls);
      setCanApprove(false);
    }
  }, [playerCount]);

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
    setCurrentPlayer((prev) => (prev + 1) % (playerCount || 1));
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

  // --- Instruction screen ---
  if (!playerCount) {
    return (
      <Box sx={{ p: 4, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <h2>How to Play Diced</h2>
        <Box sx={{ textAlign: 'left', mb: 3, fontSize: 18 }}>
          <ul>
            <li>
              <strong>Roll Dice:</strong> On your turn, click <b>Roll</b> to roll all five dice.
            </li>
            <li>
              <strong>Keep Dice:</strong> Click on any die to <b>hold</b> it (keep its value) for your next roll. Click again to release.
            </li>
            <li>
              <strong>Rerolls:</strong> You can roll up to <b>3 times</b> per turn. After each roll, choose which dice to keep and which to reroll.
            </li>
            <li>
              <strong>Scoring:</strong> After your rolls, select a scoring category (goal) and approve your score. Each category can only be used once per player.
            </li>
            <li>
              <strong>Points:</strong> Your score for each category depends on your dice and the rules for that category (e.g., sum of all Fives, Full House, etc.).
            </li>
            <li>
              <strong>Turn Order:</strong> Players take turns. The game ends when all categories are filled.
            </li>
            <li>
              <strong>Winner:</strong> The player with the highest total score wins!
            </li>
          </ul>
        </Box>
        <h2>Select Number of Players</h2>
        {[2, 3, 4].map(num => ( 
          <Button
            key={num}
            variant="contained"
            color="primary"
            sx={{ m: 2, minWidth: 100 }}
            onClick={() => setPlayerCount(num)}
          >
            {num} Players
          </Button>
        ))}
      </Box>
    );
  }

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
        rollDice={rollDice}
        toggleHold={toggleHold}
        resetGame={resetTurn}
      />
      <Goals
        dice={dice}
        usedGoals={usedGoals[currentPlayer] || {}}
        onApproveRoll={handleApproveRoll}
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

      {/* Diced Score Table */}
      <Box sx={{ mt: 4, overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 500 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: 8, background: '#f5f5f5' }}>Goal</th>
              {playerNames.slice(0, playerCount).map((name, idx) => (
                <th
                  key={name}
                  style={{
                    border: '1px solid #ccc',
                    padding: 8,
                    color: playerColors[idx],
                    background: '#f5f5f5'
                  }}
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              'Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
              'Three of a Kind', 'Four of a Kind', 'Full House',
              'Small Straight', 'Large Straight', 'Five of a Kind', 'Chance'
            ].map(goal => ( 
              <tr key={goal}>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{goal}</td>
                {usedGoals.slice(0, playerCount).map((goals, idx) => (
                  <td
                    key={idx}
                    style={{
                      border: '1px solid #ccc',
                      padding: 8,
                      textAlign: 'center',
                      color: playerColors[idx],
                      background: goals[goal] !== undefined ? '#e8f5e9' : '#fff'
                    }}
                  >
                    {goals[goal] !== undefined ? goals[goal] : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}

export default App;