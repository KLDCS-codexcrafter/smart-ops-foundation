/**
 * @file gstr1.test.tsx · RPT-2e-i toggle-wrap presence
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GSTR1Panel } from '../GSTR1';

describe('RPT-2e-i · GSTR1', () => {
  it('preserves existing header and adds toggle-host + period chip + integrity badge', () => {
    render(<GSTR1Panel entityCode="ENT001" />);
    expect(screen.queryAllByText(/GSTR-1 Return/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('fc-gstr1-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-gstr1-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-gstr1-integrity-badge')).toBeInTheDocument();
  });
});
