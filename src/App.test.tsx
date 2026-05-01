import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /diced/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /2 players/i })).toBeInTheDocument();
});
