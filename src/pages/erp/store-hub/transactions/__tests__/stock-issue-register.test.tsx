import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StockIssueRegisterPanel } from '../StockIssueRegister';

describe('RPT-6b · st-issue (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><StockIssueRegisterPanel onModuleChange={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId('st-issue-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('st-issue-integrity-badge')).toBeInTheDocument();
  });
});
