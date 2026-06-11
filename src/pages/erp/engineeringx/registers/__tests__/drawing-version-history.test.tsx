import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DrawingVersionHistory } from '../DrawingVersionHistory';

describe('RPT-6c · eng-versions (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<DrawingVersionHistory />);
    expect(screen.getByTestId('eng-versions-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('eng-versions-integrity-badge')).toBeInTheDocument();
  });
});
