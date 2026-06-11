import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopReportersByDepartment } from '../TopReportersByDepartment';

describe('RPT-6c · mnt-top-reporters (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<TopReportersByDepartment />);
    expect(screen.getByTestId('mnt-top-reporters-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('mnt-top-reporters-integrity-badge')).toBeInTheDocument();
  });
});
