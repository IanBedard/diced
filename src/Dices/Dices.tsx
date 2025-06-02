import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

interface DicesProps {
  dice: number[];
  held: boolean[];
  rolling: boolean;
  rerollsLeft: number;
  rollDice: () => void;
  toggleHold: (idx: number) => void;
  resetGame: () => void;
}

const maxRerolls = 3;

const Dices: React.FC<DicesProps> = ({
  dice,
  held,
  rolling,
  rerollsLeft,
  rollDice,
  toggleHold,
  resetGame,
}) => {
  // Only allow holding dice after the first roll
  const canHold = rerollsLeft < maxRerolls;
  const letterDice = ['D', 'I', 'C', 'E', 'D'];

  return (
    <Box className="Dices" sx={{ textAlign: 'center', mt: 4 }}>
      <Box
        className="dice-container"
        sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}
      >
        {dice.map((face, idx) => (
          <motion.div
            key={idx}
            className="dice"
            animate={rolling && !held[idx] ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.6 }}
            onClick={() => {
              if (!rolling && canHold) toggleHold(idx);
            }}
            style={{
              width: 60,
              height: 60,
              background: held[idx] ? '#c8e6c9' : '#fff', 
              border: held[idx] ? '3px solid #388e3c' : '2px solid #333',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 'bold',
              boxShadow: '2px 2px 8px #aaa',
              cursor: rolling || !canHold ? 'not-allowed' : 'pointer',
              userSelect: 'none',
              opacity: rerollsLeft === maxRerolls ? 0.5 : 1,
            }}
            title={
              rerollsLeft === maxRerolls
                ? 'Roll first!'
                : held[idx]
                ? 'Click to release'
                : 'Click to hold'
            }
          >
            {rerollsLeft === maxRerolls ? letterDice[idx] : face}
          </motion.div>
        ))}
      </Box>
      <Button
        variant="contained"
        color="primary"
        onClick={rollDice}
        disabled={rolling || rerollsLeft === 0}
        sx={{ mr: 2 }}
      >
        {rolling
          ? 'Rolling...'
          : rerollsLeft === maxRerolls
            ? 'Roll'
            : rerollsLeft === 0
              ? 'No rerolls left'
              : `Reroll (${rerollsLeft})`}
      </Button>
      <Button
        variant="outlined"
        color="secondary"
        onClick={resetGame}
        disabled={rolling}
      > 
        Reset
      </Button>
      <Box sx={{ mt: 3, fontSize: 24 }}>
        Sum: {rerollsLeft === maxRerolls ? '-' : dice.reduce((a, b) => a + b, 0)}
      </Box>
    </Box>
  );
};

export default Dices;