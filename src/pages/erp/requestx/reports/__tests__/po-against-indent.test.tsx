import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { POAgainstIndentPanel } from '../POAgainstIndent';

describe('RPT-6b · rq-po-against (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><POAgainstIndentPanel /></MemoryRouter>);
    expect(screen.getByTestId('rq-po-against-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('rq-po-against-integrity-badge')).toBeInTheDocument();
  });
});
