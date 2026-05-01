import React from 'react';
import { motion } from 'framer-motion';
import CasinoIcon from '@mui/icons-material/Casino';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

interface DicesProps {
  dice: number[];
  held: boolean[];
  rolling: boolean;
  rerollsLeft: number;
  rollDice: () => void;
  toggleHold: (idx: number) => void;
  resetTurn: () => void;
  disabled?: boolean;
}

const maxRerolls = 3;

const diceVariants = {
  initial: { rotate: 0 },
  rolling: { rotate: 360 },
};

const containerVariants = {
  rolling: {
    transition: {
      staggerChildren: 0.15,
    },
  },
  initial: {},
};

const Dices: React.FC<DicesProps> = ({
  dice,
  held,
  rolling,
  rerollsLeft,
  rollDice,
  toggleHold,
  resetTurn,
  disabled = false,
}) => {
  const canHold = rerollsLeft < maxRerolls;
  const letterDice = ['D', 'I', 'C', 'E', 'D'];

  return (
    <Box className="Dices">
      <motion.div
        className="dice-container"
        variants={containerVariants}
        animate={rolling ? 'rolling' : 'initial'}
      >
        {dice.map((face, idx) => (
          <motion.div
            key={idx}
            className={`dice ${held[idx] ? 'held' : ''}`}
            variants={diceVariants}
            animate={rolling && !held[idx] ? 'rolling' : 'initial'}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            onClick={() => {
              if (!disabled && !rolling && canHold) toggleHold(idx);
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
      </motion.div>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<CasinoIcon />}
          onClick={rollDice}
          disabled={disabled || rolling || rerollsLeft === 0}
          fullWidth
        >
          {rolling
            ? 'Rolling...'
            : rerollsLeft === maxRerolls
              ? 'Roll Dice'
              : rerollsLeft === 0
                ? 'No rerolls left'
                : `Reroll (${rerollsLeft} left)`}
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<RestartAltIcon />}
          onClick={resetTurn}
          disabled={disabled || rolling}
          fullWidth
        >
          Reset Turn
        </Button>
      </Stack>
    </Box>
  );
};

export default Dices;
