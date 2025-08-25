import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Tic-Tac-Toe title and controls', () => {
  render(<App />);
  expect(screen.getByText(/Tic-Tac-Toe/i)).toBeInTheDocument();
  expect(screen.getByText(/vs AI/i)).toBeInTheDocument();
  expect(screen.getByText(/vs Friend/i)).toBeInTheDocument();
  expect(screen.getByText(/New Game/i)).toBeInTheDocument();
});
