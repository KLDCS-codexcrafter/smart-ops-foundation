import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjxDocumentsRegisterPanel } from '../ProjxDocumentsRegister';

describe('RPT-7b · px-documents (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<MemoryRouter><ProjxDocumentsRegisterPanel onNavigate={vi.fn()} /></MemoryRouter>);
    expect(screen.getByTestId('px-documents-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('px-documents-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
