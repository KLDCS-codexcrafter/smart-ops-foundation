/**
 * @sprint W1C-6 · Block 2 — FirstRunOnboardingBanner conditional render
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FirstRunOnboardingBanner } from '@/components/dashboard/FirstRunOnboardingBanner';

function renderBanner() {
  return render(
    <MemoryRouter><FirstRunOnboardingBanner /></MemoryRouter>,
  );
}

describe('W1C-6 · onboarding banner conditional', () => {
  beforeEach(() => localStorage.clear());

  it('renders when erp_group_entities is absent', () => {
    renderBanner();
    expect(screen.getByText(/Welcome to Operix/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Load Demo/i })).toBeInTheDocument();
  });

  it('does NOT render when entities exist', () => {
    localStorage.setItem('erp_group_entities', JSON.stringify([
      { id: 'e1', name: 'Acme', shortCode: 'ACME', type: 'parent' },
    ]));
    const { container } = renderBanner();
    expect(container.textContent ?? '').not.toMatch(/Welcome to Operix/i);
  });

  it('does NOT render when previously dismissed', () => {
    localStorage.setItem('erp_first_run_banner_dismissed', '1');
    const { container } = renderBanner();
    expect(container.textContent ?? '').not.toMatch(/Welcome to Operix/i);
  });
});
