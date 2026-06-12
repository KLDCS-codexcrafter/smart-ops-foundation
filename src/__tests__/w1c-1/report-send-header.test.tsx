/**
 * @sprint W1C-1 · ReportSendHeader unit test
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportSendHeader } from '@/components/operix-core/report-framework/ReportSendHeader';

vi.mock('@/components/shared/DocSendBar', () => ({
  DocSendBar: (props: { objectType: string; sourceRecord: Record<string, unknown> }) => (
    <div
      data-testid="docsendbar-mock"
      data-object-type={props.objectType}
      data-narrative={String(props.sourceRecord.narrative ?? '')}
      data-doc-no={String(props.sourceRecord.doc_no ?? '')}
    />
  ),
}));

describe('W1C-1 · ReportSendHeader', () => {
  it('renders DocSendBar with title only when no rows', () => {
    render(<ReportSendHeader title="Empty Report" />);
    expect(screen.getByTestId('report-send-header')).toBeInTheDocument();
    const bar = screen.getByTestId('docsendbar-mock');
    expect(bar.getAttribute('data-object-type')).toBe('report');
    expect(bar.getAttribute('data-doc-no')).toBe('Empty Report');
    expect(bar.getAttribute('data-narrative')).toBe('');
  });

  it('computes narrative from REAL row numbers (rule-based provider)', () => {
    const rows = [
      { region: 'North', sales: 100 },
      { region: 'South', sales: 50 },
      { region: 'East', sales: 10 },
    ];
    render(<ReportSendHeader title="Sales Report" rows={rows} />);
    const bar = screen.getByTestId('docsendbar-mock');
    const narrative = bar.getAttribute('data-narrative') ?? '';
    // numbers are derived: top=100, total=160 — must appear
    expect(narrative).toContain('North');
    expect(narrative).toMatch(/100/);
    expect(narrative).toMatch(/160/);
  });

  it('does NOT pass printPayload (PDF uses DocSendBar honest toast)', () => {
    render(<ReportSendHeader title="X" rows={[{ a: 1 }]} />);
    const bar = screen.getByTestId('docsendbar-mock');
    expect(bar.getAttribute('data-print-payload')).toBeNull();
  });
});
