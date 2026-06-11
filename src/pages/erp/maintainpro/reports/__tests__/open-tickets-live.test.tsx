import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OpenTicketsLive } from '../OpenTicketsLive';

describe('RPT-6c · mnt-open-tickets (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<OpenTicketsLive />);
    expect(screen.getByTestId('mnt-open-tickets-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('mnt-open-tickets-integrity-badge')).toBeInTheDocument();
  });
});
