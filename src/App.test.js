import { render, screen } from '@testing-library/react';
import App from './App';

test('renders trek bridge interface', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /sensor readout/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /command panel/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/short range sensor grid/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/long range sensor grid/i)).toBeInTheDocument();
});
