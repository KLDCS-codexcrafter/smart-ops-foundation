/**
 * @file gstr3b.test.tsx · RPT-2e-i toggle-wrap presence
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GSTR3BPanel } from '../GSTR3B';

describe('RPT-2e-i · GSTR3B', () => {
  it('preserves header and adds toggle-host + period chip + integrity badge', () => {
    render(<GSTR3BPanel entityCode="ENT001" />);
    expect(screen.queryAllByText(/GSTR-3B/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('fc-gstr3b-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-gstr3b-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-gstr3b-integrity-badge')).toBeInTheDocument();
  });
});
