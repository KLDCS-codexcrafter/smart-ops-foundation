/**
 * @file        ReportSendHeader.tsx
 * @sprint      W1C-1 · DocSendBar-Reports rollout · thin wrapper
 * @purpose     Compose the FROZEN DocSendBar onto a report surface.
 *              When real rows are present, computes the rule-based narrative
 *              line via the existing narrative provider (every number real)
 *              and exposes it in the source record so it flows through the
 *              standard communication-engine merge path. NO printPayload —
 *              the PDF button uses DocSendBar's own honest "no payload" toast.
 * @[JWT]       N/A — pure presentation · consumes frozen primitives only.
 */
import { useMemo } from 'react';
import { DocSendBar } from '@/components/shared/DocSendBar';
import { describeReport } from '@/lib/report-framework/narrative';
import type { QuerySpec } from '@/lib/report-framework/report-builder-engine';

export interface ReportSendHeaderProps {
  title: string;
  rows?: ReadonlyArray<Record<string, unknown>>;
  spec?: QuerySpec;
  className?: string;
}

/** Derive a minimal QuerySpec from the first row when caller did not supply one. */
function inferSpec(rows: ReadonlyArray<Record<string, unknown>>): QuerySpec | null {
  const sample = rows[0];
  if (!sample) return null;
  const keys = Object.keys(sample);
  const numericKey = keys.find((k) => typeof sample[k] === 'number');
  const dimKey = keys.find((k) => typeof sample[k] === 'string');
  if (!numericKey) return null;
  return {
    groupBy: dimKey ? [dimKey] : [],
    measures: [{ field: numericKey, agg: 'sum', alias: numericKey }],
  } as QuerySpec;
}

export function ReportSendHeader({ title, rows, spec, className }: ReportSendHeaderProps): JSX.Element {
  const narrative = useMemo(() => {
    if (!rows || rows.length === 0) return '';
    const effectiveSpec = spec ?? inferSpec(rows);
    if (!effectiveSpec) return '';
    try { return describeReport(rows, effectiveSpec); } catch { return ''; }
  }, [rows, spec]);

  const sourceRecord = useMemo(() => ({
    id: title,
    doc_no: title,
    doc_date: new Date().toISOString().slice(0, 10),
    narrative,
    row_count: rows?.length ?? 0,
  }), [title, narrative, rows]);

  return (
    <span
      className={className}
      data-testid="report-send-header"
      data-report-title={title}
      data-report-narrative={narrative}
    >
      <DocSendBar
        objectType="report"
        sourceCard="reports"
        sourceRecord={sourceRecord}
      />
    </span>
  );
}

export default ReportSendHeader;
