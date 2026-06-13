/**
 * @sprint W1C-6 · Block 1 — SelectCompanyGate "Load Demo" CTA seeds erp_group_entities
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { ERPCompanyProvider } from '@/components/layout/ERPCompanyProvider';

// Suppress the reload jsdom navigation noise.
Object.defineProperty(window, 'location', {
  configurable: true,
  value: { ...window.location, reload: () => {} },
});

function renderGate() {
  return render(
    <MemoryRouter>
      <ERPCompanyProvider>
        <SelectCompanyGate />
      </ERPCompanyProvider>
    </MemoryRouter>,
  );
}

describe('W1C-6 · gate · Load Demo CTA', () => {
  beforeEach(() => localStorage.clear());

  it('renders Load demo + Quick add buttons in the empty-state branch', () => {
    renderGate();
    expect(screen.getByRole('button', { name: /Load demo company/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick add company/i })).toBeInTheDocument();
  });

  it('clicking Load demo seeds erp_group_entities + erp_parent_company', () => {
    renderGate();
    fireEvent.click(screen.getByRole('button', { name: /Load demo company/i }));
    const raw = localStorage.getItem('erp_group_entities');
    expect(raw).toBeTruthy();
    const list = JSON.parse(raw!);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(localStorage.getItem('erp_parent_company')).toBeTruthy();
  });
});
