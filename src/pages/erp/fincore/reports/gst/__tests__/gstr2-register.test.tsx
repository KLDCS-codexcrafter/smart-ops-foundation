/**
 * @file gstr2-register.test.tsx · RPT-2e-i toggle-wrap presence
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GSTR2RegisterPanel } from '../GSTR2Register';

describe('RPT-2e-i · GSTR2Register', () => {
  it('preserves header and adds toggle-host + period chip + integrity badge', () => {
    render(<GSTR2RegisterPanel entityCode="ENT001" />);
    expect(screen.queryAllByText(/GSTR-2 Purchase Register/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('fc-gstr2-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-gstr2-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-gstr2-integrity-badge')).toBeInTheDocument();
  });
});
