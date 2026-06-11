import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SnagRegister } from '../SnagRegister';

describe('RPT-6c · site-snags (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<SnagRegister onNavigate={() => {}} />);
    expect(screen.getByTestId('site-snags-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('site-snags-integrity-badge')).toBeInTheDocument();
  });
});
