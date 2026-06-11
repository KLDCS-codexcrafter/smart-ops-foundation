/**
 * @file itc04-export.test.tsx — RPT-6a toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ITC04ExportPanel as Comp } from '../ITC04Export';

describe('RPT-6a · prod-itc04 (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-itc04-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-itc04-integrity-badge')).toBeInTheDocument();
  });
});
