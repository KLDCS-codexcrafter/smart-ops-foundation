/**
 * @file abc-classification-master.test.tsx — RPT-5b wrap
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AbcClassificationMasterPanel } from '../AbcClassificationMaster';

describe('RPT-5b · AbcClassificationMaster wrap', () => {
  it('mounts toggle host + integrity badge + chart toggle', () => {
    render(<AbcClassificationMasterPanel />);
    expect(screen.getByTestId('inv-abc-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('inv-abc-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
  it('preserves ABC Classification heading', () => {
    render(<AbcClassificationMasterPanel />);
    expect(screen.getAllByText(/ABC Classification/i).length).toBeGreaterThan(0);
  });
});
