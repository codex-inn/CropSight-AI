import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('completes scan flow and records analysis in history', async () => {
    render(<App />);

    expect(screen.getByText(/good morning, alex/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /scan crop/i }));

    const uploadInput = screen.getByLabelText(/upload crop image/i);
    const file = new File(['binary'], 'scan-ready.png', { type: 'image/png' });
    fireEvent.change(uploadInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /analyze crop/i }));

    await waitFor(() => expect(screen.getByText(/maturity overview/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /scan history/i }));
    expect(screen.getByRole('heading', { name: /scan history/i })).toBeInTheDocument();
    expect(screen.getAllByText(/demo|api/i).length).toBeGreaterThan(0);
  });
});
