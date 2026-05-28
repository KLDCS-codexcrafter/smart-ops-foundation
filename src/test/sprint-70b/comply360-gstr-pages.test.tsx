/**
 * @file        src/test/sprint-70b/comply360-gstr-pages.test.tsx
 * @purpose     Component tests · Sprint 70b Cycle-2 Block 9 · GSTR-1 / 1A / 2B + TaxGstPage tab-shell
 * @sprint      Sprint 70b · T-Phase-5.A.1.2-PASS-B · Cycle-2 · MB-3a
 * @lesson-23   Signatures grepped from src/pages/erp/comply360/tax-gst/*.tsx pre-write
 * @decisions   PATTERN-S70b-NAVIGATION-CANONICAL · asserts the ratified tab-shell pattern
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GSTR1NativePage from '@/pages/erp/comply360/tax-gst/GSTR1NativePage';
import GSTR1ANativePage from '@/pages/erp/comply360/tax-gst/GSTR1ANativePage';
import GSTR2BNativePage from '@/pages/erp/comply360/tax-gst/GSTR2BNativePage';
import TaxGstPage from '@/pages/erp/comply360/tax-gst/TaxGstPage';

beforeEach(() => {
  localStorage.clear();
});

describe('Sprint 70b · TaxGstPage shell · PATTERN-S70b-NAVIGATION-CANONICAL', () => {
  it('renders all 4 sub-tab triggers (GSTR-1 · GSTR-1A · GSTR-2B · IMS)', () => {
    render(<TaxGstPage />);
    expect(screen.getByRole('tab', { name: 'GSTR-1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'GSTR-1A' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'GSTR-2B' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'IMS' })).toBeInTheDocument();
  });

  it('defaults to GSTR-1 tab active (data-state=active)', () => {
    render(<TaxGstPage />);
    const gstr1Tab = screen.getByRole('tab', { name: 'GSTR-1' });
    expect(gstr1Tab.getAttribute('data-state')).toBe('active');
  });

  it('renders without crashing when no ERPCompanyProvider mounted', () => {
    expect(() => render(<TaxGstPage />)).not.toThrow();
  });
});

describe('Sprint 70b · GSTR1NativePage · component tests (FR-43)', () => {
  it('renders the empty-entity gate by default ("Select a company to continue")', () => {
    render(<GSTR1NativePage />);
    expect(screen.getByText(/Select a company to continue/i)).toBeInTheDocument();
  });

  it('empty-entity gate references the header dropdown', () => {
    render(<GSTR1NativePage />);
    expect(screen.getByText(/header dropdown/i)).toBeInTheDocument();
  });

  it('does not crash on empty localStorage', () => {
    expect(() => render(<GSTR1NativePage />)).not.toThrow();
  });

  it('default export is a function component returning JSX', () => {
    expect(typeof GSTR1NativePage).toBe('function');
  });
});

describe('Sprint 70b · GSTR1ANativePage · component tests (FR-43)', () => {
  it('renders the empty-entity gate by default', () => {
    render(<GSTR1ANativePage />);
    expect(screen.getByText(/Select a company to continue/i)).toBeInTheDocument();
  });

  it('does not crash on empty localStorage', () => {
    expect(() => render(<GSTR1ANativePage />)).not.toThrow();
  });

  it('default export is a function component', () => {
    expect(typeof GSTR1ANativePage).toBe('function');
  });
});

describe('Sprint 70b · GSTR2BNativePage · component tests (FR-43)', () => {
  it('renders the empty-entity gate by default', () => {
    render(<GSTR2BNativePage />);
    expect(screen.getByText(/Select a company to continue/i)).toBeInTheDocument();
  });

  it('does not crash on empty localStorage', () => {
    expect(() => render(<GSTR2BNativePage />)).not.toThrow();
  });

  it('default export is a function component', () => {
    expect(typeof GSTR2BNativePage).toBe('function');
  });

  it('empty-entity gate copy mentions GSTR-2B', () => {
    render(<GSTR2BNativePage />);
    expect(screen.getByText(/GSTR-2B/i)).toBeInTheDocument();
  });
});
