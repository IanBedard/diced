import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import Typography from '@mui/material/Typography';

const goals = [
  'Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes',
  'Three of a Kind', 'Four of a Kind', 'Full House',
  'Small Straight', 'Large Straight', 'Five of a Kind', 'Chance'
];

function calculateScore(goal: string, dice: number[]): number {
  // Simple scoring logic for demonstration
  switch (goal) {
    case 'Ones': return dice.filter(d => d === 1).length * 1;
    case 'Twos': return dice.filter(d => d === 2).length * 2;
    case 'Threes': return dice.filter(d => d === 3).length * 3;
    case 'Fours': return dice.filter(d => d === 4).length * 4;
    case 'Fives': return dice.filter(d => d === 5).length * 5;
    case 'Sixes': return dice.filter(d => d === 6).length * 6;
    case '3 of a Kind':
      return dice.some(val => dice.filter(d => d === val).length >= 3) ? dice.reduce((a, b) => a + b, 0) : 0;
    case '4 of a Kind':
      return dice.some(val => dice.filter(d => d === val).length >= 4) ? dice.reduce((a, b) => a + b, 0) : 0;
    case 'Full House':
      const counts = dice.reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {} as Record<number, number>);
      return Object.values(counts).sort().join(',') === '2,3' ? 25 : 0;
    case 'Small Straight':
      return [1,2,3,4].every(n => dice.includes(n)) ||
             [2,3,4,5].every(n => dice.includes(n)) ||
             [3,4,5,6].every(n => dice.includes(n)) ? 30 : 0;
    case 'Large Straight':
      return [1,2,3,4,5].every(n => dice.includes(n)) ||
             [2,3,4,5,6].every(n => dice.includes(n)) ? 40 : 0;
    case 'Five of a Kind':
      return dice.every(d => d === dice[0]) ? 50 : 0;
    case 'Chance':
      return dice.reduce((a, b) => a + b, 0);
    default: return 0;
  }
}

interface GoalsProps {
  dice: number[];
  usedGoals: { [goal: string]: number };
  onApproveRoll: (goal: string, score: number) => void;
  canApprove: boolean;
  playerColor?: string;
  playerName?: string;
}

const Goals: React.FC<GoalsProps> = ({ dice, usedGoals, onApproveRoll, canApprove, playerColor, playerName }) => {
  const [selectedGoal, setSelectedGoal] = useState<string>('');

  const handleApprove = () => {
    if (!selectedGoal || usedGoals[selectedGoal] !== undefined) return;
    const score = calculateScore(selectedGoal, dice);
    onApproveRoll(selectedGoal, score);
    setSelectedGoal('');
  };

  return (
    <Box sx={{ mt: 4 }}>
      {playerName && (
        <Typography variant="h6" gutterBottom sx={{ color: playerColor, fontWeight: 'bold' }}>
          {playerName} Player
        </Typography>
      )}
      <Typography variant="h5" gutterBottom>Diced Goals</Typography>
      <FormControl component="fieldset">
        <RadioGroup 
          value={selectedGoal}
          onChange={e => setSelectedGoal(e.target.value)}
        >
          {goals.map(goal =>
            usedGoals[goal] !== undefined ? (
              <Box key={goal} sx={{ ml: 2, mb: 1 }}>
                <span style={{ textDecoration: 'line-through', color: '#888' }}>
                  {goal}: {usedGoals[goal]}
                </span>
              </Box>
            ) : (
              <FormControlLabel
                key={goal}
                value={goal}
                control={<Radio />}
                label={`${goal} (score: ${calculateScore(goal, dice)})`}
                disabled={!canApprove}
              />
            )
          )}
        </RadioGroup>
      </FormControl>
      <Button
        variant="contained"
        color="primary"
        onClick={handleApprove}
        disabled={!selectedGoal || usedGoals[selectedGoal] !== undefined || !canApprove}
        sx={{ mt: 2 }}
      >
        Approve Roll for Goal
      </Button>
    </Box>
  );
};

export default Goals;