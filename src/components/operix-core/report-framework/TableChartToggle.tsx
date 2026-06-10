/**
 * @file        TableChartToggle.tsx
 * @purpose     Universal Table ⇄ Chart toggle · default Table (zero visual regression on wrap).
 * @sprint      RPT-1a · Reporting Framework Foundation
 * @[JWT]       N/A — pure presentation
 */
import { useState, type ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReportChart } from './ChartLibrary';
import type { ReportChartConfig } from '@/lib/report-framework/chart-config';

export interface TableChartColumn<TRow> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: TRow) => ReactNode;
}

export interface TableChartToggleProps<TRow extends Record<string, unknown>> {
  rows: TRow[];
  columns: TableChartColumn<TRow>[];
  chartConfig: ReportChartConfig;
  defaultView?: 'table' | 'chart';
  chartRows?: Record<string, unknown>[];
  emptyLabel?: string;
}

export function TableChartToggle<TRow extends Record<string, unknown>>({
  rows,
  columns,
  chartConfig,
  defaultView = 'table',
  chartRows,
  emptyLabel = 'No data',
}: TableChartToggleProps<TRow>) {
  const [view, setView] = useState<'table' | 'chart'>(defaultView);
  const chartData = chartRows ?? (rows as Record<string, unknown>[]);

  return (
    <Tabs value={view} onValueChange={(v) => setView(v as 'table' | 'chart')} data-testid="table-chart-toggle">
      <TabsList className="h-8">
        <TabsTrigger value="table" className="text-xs h-7" data-testid="tct-tab-table">Table</TabsTrigger>
        <TabsTrigger value="chart" className="text-xs h-7" data-testid="tct-tab-chart">Chart</TabsTrigger>
      </TabsList>

      <TabsContent value="table">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={`text-xs ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}
                >
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-xs text-center text-muted-foreground py-6">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, ri) => (
                <TableRow key={`tct-r-${ri}`}>
                  {columns.map((c) => (
                    <TableCell
                      key={`tct-r-${ri}-${c.key}`}
                      className={`text-xs ${c.align === 'right' ? 'text-right font-mono' : c.align === 'center' ? 'text-center' : ''}`}
                    >
                      {c.render ? c.render(row) : String(row[c.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="chart">
        <div className="w-full h-80" data-testid="tct-chart-host">
          <ReportChart data={chartData} config={chartConfig} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
