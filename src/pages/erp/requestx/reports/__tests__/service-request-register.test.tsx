import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServiceRequestRegisterPanel } from '../ServiceRequestRegister';

describe('RPT-6b · rq-service-request (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><ServiceRequestRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('rq-service-request-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('rq-service-request-integrity-badge')).toBeInTheDocument();
  });
});
