import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FollowUpRegisterReportPanel } from '../FollowUpRegisterReport';

describe('RPT-7a · sx-followups (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><FollowUpRegisterReportPanel entityCode="SMRT" /></MemoryRouter>);
    expect(screen.getByTestId('sx-followups-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sx-followups-integrity-badge')).toBeInTheDocument();
  });
});
