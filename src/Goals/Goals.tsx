import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { Category, calculateScore, categories, categoryDescriptions } from '../game';

interface GoalsProps {
  dice: number[];
  usedGoals: Partial<Record<Category, number>>;
  onApproveRoll: (goal: Category, score: number) => void;
  canApprove: boolean;
  playerColor?: string;
}

const Goals: React.FC<GoalsProps> = ({ dice, usedGoals, onApproveRoll, canApprove, playerColor }) => {
  const handleApprove = (category: Category) => {
    if (usedGoals[category] !== undefined) return;
    onApproveRoll(category, calculateScore(category, dice));
  };

  return (
    <Box className="goals-panel">
      <div className="panel-heading">
        <span className="eyebrow">Score a category</span>
        <Typography variant="h2">Goals</Typography>
      </div>
      <div className="goal-list">
        {categories.map(category => {
          const score = calculateScore(category, dice);
          const isUsed = usedGoals[category] !== undefined;

          return (
            <article className={`goal-row ${isUsed ? 'used' : ''}`} key={category}>
              <div>
                <strong>{category}</strong>
                <small>{categoryDescriptions[category]}</small>
              </div>
              {isUsed ? (
                <Chip icon={<CheckCircleIcon />} label={usedGoals[category]} />
              ) : (
                <Button
                  variant="contained"
                  onClick={() => handleApprove(category)}
                  disabled={!canApprove}
                  sx={{ backgroundColor: playerColor }}
                >
                  {score}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </Box>
  );
};

export default Goals;
