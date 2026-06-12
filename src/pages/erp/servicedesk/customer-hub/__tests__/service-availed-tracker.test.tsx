import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServiceAvailedTracker } from '../ServiceAvailedTracker';

describe('RPT-8a · sd-service-availed (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<ServiceAvailedTracker />);
    expect(screen.getByTestId('sd-service-availed-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sd-service-availed-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('sd-service-availed-chart-host')).toBeInTheDocument();
  });
});
