/**
 * @file reco-panel.test.tsx · RPT-2e-i toggle-wrap presence
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecoPanelGST } from '../RecoPanel';

describe('RPT-2e-i · RecoPanel', () => {
  it('preserves header and adds toggle-host + period chip + integrity badge', () => {
    render(<RecoPanelGST entityCode="ENT001" />);
    expect(screen.queryAllByText(/Reconciliation/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('fc-reco-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-reco-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-reco-integrity-badge')).toBeInTheDocument();
  });
});
