import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DrawingRegister } from '../DrawingRegister';

describe('RPT-6c · eng-drawings (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<DrawingRegister />);
    expect(screen.getByTestId('eng-drawings-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('eng-drawings-integrity-badge')).toBeInTheDocument();
  });
});
