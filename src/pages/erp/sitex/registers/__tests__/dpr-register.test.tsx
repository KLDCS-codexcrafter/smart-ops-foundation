import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DPRRegister } from '../DPRRegister';

describe('RPT-6c · site-dpr (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<DPRRegister onNavigate={() => {}} />);
    expect(screen.getByTestId('site-dpr-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('site-dpr-integrity-badge')).toBeInTheDocument();
  });
});
