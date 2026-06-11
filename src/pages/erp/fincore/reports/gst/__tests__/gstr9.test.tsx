/**
 * @file gstr9.test.tsx · RPT-2e-i toggle-wrap presence
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GSTR9Panel } from '../GSTR9';

describe('RPT-2e-i · GSTR9', () => {
  it('preserves header and adds toggle-host + FY chip + integrity badge', () => {
    render(<GSTR9Panel entityCode="ENT001" />);
    expect(screen.queryAllByText(/GSTR-9 Annual Return/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('fc-gstr9-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-gstr9-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-gstr9-integrity-badge')).toBeInTheDocument();
  });
});
