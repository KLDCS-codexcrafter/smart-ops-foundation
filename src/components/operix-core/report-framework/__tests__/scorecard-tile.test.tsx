/**
 * @file        scorecard-tile.test.tsx
 * @sprint      RPT-2a-i · Dashboard primitive
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScorecardTile } from '@/components/operix-core/report-framework/ScorecardTile';

describe('RPT-2a-i · ScorecardTile', () => {
  it('renders label and value', () => {
    render(<ScorecardTile label="Fire compliance %" value="92%" />);
    expect(screen.getByText('Fire compliance %')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('applies a RAG accent class to the value when rag prop is set', () => {
    render(<ScorecardTile label="K" value="50" rag="red" />);
    const tile = screen.getByTestId('scorecard-tile');
    expect(tile.getAttribute('data-rag')).toBe('red');
    expect(tile.querySelector('.text-destructive')).not.toBeNull();
  });

  it('renders an optional delta chip', () => {
    render(<ScorecardTile label="X" value={10} delta={{ value: 3, direction: 'up' }} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
