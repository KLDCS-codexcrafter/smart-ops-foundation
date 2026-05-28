/**
 * @file        src/test/sprint-70b/comply360-ims-panel.test.tsx
 * @purpose     Component tests · Sprint 70b Cycle-2 Block 9 · IMSPanelPage
 * @sprint      Sprint 70b · T-Phase-5.A.1.2-PASS-B · Cycle-2 · MB-3b
 * @lesson-23   Default export signature grepped from src/pages/erp/comply360/tax-gst/IMSPanelPage.tsx pre-write
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import IMSPanelPage from '@/pages/erp/comply360/tax-gst/IMSPanelPage';

beforeEach(() => {
  localStorage.clear();
});

describe('Sprint 70b · IMSPanelPage · component tests (FR-43)', () => {
  it('renders the empty-entity gate when no company selected', () => {
    render(<IMSPanelPage />);
    expect(screen.getByText(/Select a company to continue/i)).toBeInTheDocument();
  });

  it('empty-entity gate copy references IMS', () => {
    render(<IMSPanelPage />);
    expect(screen.getByText(/use IMS/i)).toBeInTheDocument();
  });

  it('does not crash on empty localStorage', () => {
    expect(() => render(<IMSPanelPage />)).not.toThrow();
  });

  it('default export is a function component', () => {
    expect(typeof IMSPanelPage).toBe('function');
  });

  it('renders header-dropdown affordance in empty state', () => {
    render(<IMSPanelPage />);
    expect(screen.getByText(/header dropdown/i)).toBeInTheDocument();
  });

  it('renders a single Card container in empty state', () => {
    const { container } = render(<IMSPanelPage />);
    expect(container.querySelectorAll('h2').length).toBeGreaterThanOrEqual(1);
  });
});
