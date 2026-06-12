import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CustomerCommLog } from '../CustomerCommLog';

describe('RPT-8a · sd-comm-log (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<CustomerCommLog />);
    expect(screen.getByTestId('sd-comm-log-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sd-comm-log-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('sd-comm-log-chart-host')).toBeInTheDocument();
  });
});
