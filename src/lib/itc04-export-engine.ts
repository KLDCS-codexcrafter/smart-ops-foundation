/**
 * @file     itc04-export-engine.ts
 * @sprint   T-Phase-1.3-3a-pre-3 · Block I · D-564 · Q20=c
 * @purpose  ITC-04 quarterly GST export · auto-quarter from JWO date · CSV format.
 */
import type { JobWorkOutOrder } from '@/types/job-work-out-order';
import type { JobWorkReceipt } from '@/types/job-work-receipt';
import { downloadBlob, csvEscapeCell } from '@/lib/export-helpers';

export interface ITC04Row {
  jwo_no: string;
  jwo_date: string;
  vendor_gstin: string;
  vendor_name: string;
  item_code: string;
  item_hsn: string;
  qty_sent: number;
  uom: string;
  qty_received: number;
  qty_pending: number;
  jw_value: number;
  quarter: string;
  fy_year: string;
  status: string;
}

/**
 * Indian fiscal year: Apr-Mar.
 * Q1: Apr-Jun · Q2: Jul-Sep · Q3: Oct-Dec · Q4: Jan-Mar
 */
export function autoComputeQuarter(jwoDate: string): { quarter: string; fyYear: string } {
  const d = new Date(jwoDate);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const fyStartYear = month >= 4 ? year : year - 1;
  const fyShort = `${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;
  const fyYear = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;

  let quarter: string;
  if (month >= 4 && month <= 6) quarter = `Q1-${fyShort}`;
  else if (month >= 7 && month <= 9) quarter = `Q2-${fyShort}`;
  else if (month >= 10 && month <= 12) quarter = `Q3-${fyShort}`;
  else quarter = `Q4-${fyShort}`;

  return { quarter, fyYear };
}

export function buildITC04Rows(
  jwos: JobWorkOutOrder[],
  jwrs: JobWorkReceipt[],
  filterQuarter?: string,
): ITC04Row[] {
  const rows: ITC04Row[] = [];
  for (const jwo of jwos) {
    const { quarter, fyYear } = autoComputeQuarter(jwo.jwo_date);
    if (filterQuarter && quarter !== filterQuarter) continue;
    const relatedJWRs = jwrs.filter(r => r.job_work_out_order_id === jwo.id);
    for (const line of jwo.lines) {
      const receivedQty = relatedJWRs.reduce((s, jwr) => {
        const ml = jwr.lines.find(l => l.job_work_out_order_line_id === line.id);
        return s + (ml?.received_qty ?? 0);
      }, 0);
      rows.push({
        jwo_no: jwo.doc_no,
        jwo_date: jwo.jwo_date,
        vendor_gstin: jwo.vendor_gstin || '',
        vendor_name: jwo.vendor_name,
        item_code: line.item_code,
        item_hsn: '',
        qty_sent: line.sent_qty,
        uom: line.uom,
        qty_received: receivedQty,
        qty_pending: Math.max(0, line.sent_qty - receivedQty),
        jw_value: line.job_work_value,
        quarter,
        fy_year: fyYear,
        status: jwo.status,
      });
    }
  }
  return rows;
}

export function exportITC04CSV(rows: ITC04Row[], filename: string): void {
  const headers = [
    'JWO No', 'JWO Date', 'Vendor GSTIN', 'Vendor Name', 'Item Code', 'Item HSN',
    'Qty Sent', 'UOM', 'Qty Received', 'Qty Pending', 'JW Value',
    'Quarter', 'FY Year', 'Status',
  ];
  const csv = [headers.join(',')];
  for (const r of rows) {
    csv.push([
      r.jwo_no, r.jwo_date, r.vendor_gstin, r.vendor_name, r.item_code, r.item_hsn,
      r.qty_sent, r.uom, r.qty_received, r.qty_pending, r.jw_value,
      r.quarter, r.fy_year, r.status,
    ].map(csvEscapeCell).join(','));
  }
  const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
}

export function listAvailableQuarters(jwos: JobWorkOutOrder[]): string[] {
  const set = new Set<string>();
  for (const jwo of jwos) set.add(autoComputeQuarter(jwo.jwo_date).quarter);
  return Array.from(set).sort();
}
