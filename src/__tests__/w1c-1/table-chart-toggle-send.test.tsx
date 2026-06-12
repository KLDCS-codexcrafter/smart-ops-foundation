/**
 * @sprint W1C-1 · TableChartToggle send affordance + hideSend
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TableChartToggle } from '@/components/operix-core/report-framework/TableChartToggle';

vi.mock('@/components/shared/DocSendBar', () => ({
  DocSendBar: () => <div data-testid="docsendbar-mock" />,
}));

const rows = [{ name: 'A', value: 10 }, { name: 'B', value: 5 }];
const cols = [
  { key: 'name', label: 'Name' },
  { key: 'value', label: 'Value', align: 'right' as const },
];
const cfg = { chartType: 'bar' as const, xKey: 'name', series: [{ key: 'value', label: 'Value' }], title: 'My Report' };

describe('W1C-1 · TableChartToggle DocSendBar floor', () => {
  it('renders the ReportSendHeader by default (covers the 106-page floor)', () => {
    render(<TableChartToggle rows={rows} columns={cols} chartConfig={cfg} />);
    expect(screen.getByTestId('report-send-header')).toBeInTheDocument();
    const header = screen.getByTestId('report-send-header');
    expect(header.getAttribute('data-report-title')).toBe('My Report');
  });

  it('hideSend escape hatch suppresses the floor', () => {
    render(<TableChartToggle rows={rows} columns={cols} chartConfig={cfg} hideSend />);
    expect(screen.queryByTestId('report-send-header')).toBeNull();
  });

  it('derives title from document.title when chartConfig.title absent', () => {
    document.title = 'Fallback Title';
    const cfgNoTitle = { chartType: 'bar' as const, xKey: 'name', series: [{ key: 'value', label: 'Value' }] };
    render(<TableChartToggle rows={rows} columns={cols} chartConfig={cfgNoTitle} />);
    expect(screen.getByTestId('report-send-header').getAttribute('data-report-title')).toBe('Fallback Title');
  });
});
