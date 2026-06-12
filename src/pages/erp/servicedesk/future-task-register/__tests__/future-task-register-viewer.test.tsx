import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FutureTaskRegisterViewer } from '../FutureTaskRegisterViewer';

describe('RPT-8a · sd-future-tasks (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<FutureTaskRegisterViewer />);
    expect(screen.getByTestId('sd-future-tasks-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('sd-future-tasks-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('sd-future-tasks-chart-host')).toBeInTheDocument();
  });
});
