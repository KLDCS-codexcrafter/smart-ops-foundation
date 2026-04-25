/**
 * @file     InvoiceUploadWizard.helpers.ts
 * @purpose  Pure parsing helper extracted from InvoiceUploadWizard.tsx to satisfy
 *           react-refresh/only-export-components.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Performance (HIGH+ HMR fast-refresh works correctly)
 *           Testability (HIGH+ pure function isolated for unit tests)
 * @whom     InvoiceUploadWizard.tsx
 * @depends  @/types/transporter-invoice
 */
import type {
  TransporterInvoiceLine, MappableField,
} from '@/types/transporter-invoice';

export interface ParsedRow { [col: string]: string | number | null }

/**
 * Pure helper — parse a list of rows + mapping into TransporterInvoiceLines.
 * Exported for testability.
 */
export function parseInvoiceFile(rows: ParsedRow[], mapping: Record<string, string>):
  { lines: TransporterInvoiceLine[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines: TransporterInvoiceLine[] = [];
  const seenLR = new Set<string>();

  rows.forEach((row, idx) => {
    const get = (field: MappableField): string | number | null => {
      const col = Object.keys(mapping).find(c => mapping[c] === field);
      if (!col) return null;
      return row[col] ?? null;
    };
    const num = (v: string | number | null): number => {
      if (v == null || v === '') return 0;
      const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '').trim());
      return Number.isFinite(n) ? n : 0;
    };
    const lrRaw = get('lr_no');
    const lr = lrRaw == null ? '' : String(lrRaw).trim();
    if (!lr) {
      warnings.push(`Row ${idx + 2}: missing LR number, skipped`);
      return;
    }
    if (seenLR.has(lr)) warnings.push(`Row ${idx + 2}: duplicate LR ${lr}`);
    seenLR.add(lr);

    const total = num(get('total'));
    const amt = num(get('transporter_declared_amount'));
    if (total <= 0 && amt <= 0) warnings.push(`Row ${idx + 2}: total/amount is zero`);

    const lrDateRaw = get('lr_date');
    const lrDate = lrDateRaw == null ? null : String(lrDateRaw);
    const notesRaw = get('notes');
    const notes = notesRaw == null ? undefined : String(notesRaw);

    lines.push({
      id: `til-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      invoice_id: 'pending',
      line_no: idx + 1,
      lr_no: lr,
      lr_date: lrDate,
      transporter_declared_weight_kg: num(get('transporter_declared_weight_kg')),
      transporter_declared_rate: num(get('transporter_declared_rate')),
      transporter_declared_amount: amt,
      fuel_surcharge: num(get('fuel_surcharge')),
      fov: num(get('fov')),
      statistical: num(get('statistical')),
      cod: num(get('cod')),
      demurrage: num(get('demurrage')),
      oda: num(get('oda')),
      gst_amount: num(get('gst_amount')),
      total: total > 0 ? total : amt,
      notes,
    });
  });

  return { lines, warnings };
}
