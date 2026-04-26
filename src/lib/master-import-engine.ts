/**
 * @file     master-import-engine.ts
 * @purpose  Generic CSV/Excel import for master data entities. Parses file,
 *           validates rows per provided schema, upserts records into localStorage
 *           with dedup by primary key.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Z9
 * @iso      Functional Suitability (HIGH+ bulk-import baseline capability)
 *           Maintainability (HIGH+ generic engine · per-master schema inline)
 *           Compatibility (HIGH+ CSV/Excel formats are universal · Phase 2 swap-friendly)
 * @whom     CustomerMaster · VendorMaster · LedgerMaster · LogisticMaster · SchemeMaster
 *           · Phase 2 onboarding flows
 * @depends  xlsx@0.18.5 · csvEscapeCell from export-helpers (none required for parsing)
 *
 * D-127 STORAGE-KEY CONVENTION:
 *   Engine does NOT define new storage keys · uses each master's existing
 *   STORAGE_KEY constant (passed via schema.storageKey).
 */

import * as XLSX from 'xlsx';

export interface ImportSchema<T> {
  /** Display name for error messages (e.g., 'Customer', 'Vendor') */
  entityName: string;
  /** localStorage key where records are stored (each master's existing key) */
  storageKey: string;
  /** Column definitions · order matches CSV header order */
  columns: ImportColumn[];
  /** Field that uniquely identifies a record (for dedup) */
  primaryKey: keyof T & string;
  /** Custom row-level validation · returns error messages or empty array */
  validateRow?: (row: T, lineNumber: number) => string[];
  /** Transform raw parsed values into typed record · runs after column-level validation */
  rowToRecord: (row: Record<string, unknown>) => T;
}

export interface ImportColumn {
  /** Header text shown in CSV/Excel template */
  header: string;
  /** Field name in the typed record */
  field: string;
  /** Required · empty value triggers validation error */
  required: boolean;
  /** Type for parsing: 'string' | 'number' | 'boolean' | 'date' (YYYY-MM-DD) */
  type: 'string' | 'number' | 'boolean' | 'date';
  /** Optional default value if field is empty and not required */
  defaultValue?: unknown;
}

export interface ImportResult {
  /** Total rows in file (excluding header) */
  totalRows: number;
  /** Successfully imported records */
  importedCount: number;
  /** Records that already existed and were updated (dedup hit) */
  updatedCount: number;
  /** Per-row errors blocking import */
  errors: Array<{ line: number; field?: string; message: string }>;
}

/**
 * Parse CSV or Excel file → array of row objects (header-keyed).
 */
export async function parseImportFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No sheet found in file');
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
}

/**
 * Validate parsed rows against schema · produces typed records + error list.
 */
export function validateRows<T>(
  rows: Record<string, unknown>[],
  schema: ImportSchema<T>,
): { valid: T[]; errors: ImportResult['errors'] } {
  const valid: T[] = [];
  const errors: ImportResult['errors'] = [];

  rows.forEach((row, idx) => {
    const lineNumber = idx + 2; // +1 for 0-index, +1 for header row
    const rowErrors: string[] = [];

    // Skip wholly-empty rows (all values blank)
    const hasAnyValue = schema.columns.some(c => {
      const v = row[c.header];
      return v !== '' && v !== null && v !== undefined;
    });
    if (!hasAnyValue) return;

    // Column-level validation
    for (const col of schema.columns) {
      const raw = row[col.header];
      const isEmpty = raw === '' || raw === null || raw === undefined;
      if (col.required && isEmpty) {
        rowErrors.push(`${col.header} is required`);
        continue;
      }
      if (isEmpty) continue;
      // Type coercion (light validation)
      if (col.type === 'number' && Number.isNaN(Number(raw))) {
        rowErrors.push(`${col.header} must be a number`);
      }
      if (col.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) {
        rowErrors.push(`${col.header} must be YYYY-MM-DD format`);
      }
    }

    if (rowErrors.length > 0) {
      rowErrors.forEach(msg => errors.push({ line: lineNumber, message: msg }));
      return;
    }

    // Build typed record
    try {
      const record = schema.rowToRecord(row);
      // Custom row validation
      if (schema.validateRow) {
        const customErrors = schema.validateRow(record, lineNumber);
        if (customErrors.length > 0) {
          customErrors.forEach(msg => errors.push({ line: lineNumber, message: msg }));
          return;
        }
      }
      valid.push(record);
    } catch (e) {
      errors.push({ line: lineNumber, message: `Row parse failed: ${(e as Error).message}` });
    }
  });

  return { valid, errors };
}

/**
 * Upsert valid records into localStorage with dedup by primary key.
 * Returns import + update counts.
 */
export function upsertRecords<T extends Record<string, unknown>>(
  records: T[],
  schema: ImportSchema<T>,
): { importedCount: number; updatedCount: number } {
  // [JWT] GET /api/masters/:entity (read existing for dedup merge)
  const raw = localStorage.getItem(schema.storageKey);
  const existing: T[] = raw ? (JSON.parse(raw) as T[]) : [];
  const existingMap = new Map<unknown, number>();
  existing.forEach((rec, idx) => existingMap.set(rec[schema.primaryKey], idx));

  let imported = 0;
  let updated = 0;
  for (const rec of records) {
    const pk = rec[schema.primaryKey];
    const existingIdx = existingMap.get(pk);
    if (existingIdx !== undefined) {
      existing[existingIdx] = { ...existing[existingIdx], ...rec };
      updated++;
    } else {
      existing.push(rec);
      existingMap.set(pk, existing.length - 1);
      imported++;
    }
  }

  // [JWT] PUT /api/masters/:entity (write merged set)
  localStorage.setItem(schema.storageKey, JSON.stringify(existing));
  return { importedCount: imported, updatedCount: updated };
}

/**
 * High-level import function · combines parse + validate + upsert.
 */
export async function importMasterFile<T extends Record<string, unknown>>(
  file: File,
  schema: ImportSchema<T>,
): Promise<ImportResult> {
  const rows = await parseImportFile(file);
  const { valid, errors } = validateRows(rows, schema);
  const { importedCount, updatedCount } = errors.length === 0
    ? upsertRecords(valid, schema)
    : { importedCount: 0, updatedCount: 0 };
  return {
    totalRows: rows.length,
    importedCount,
    updatedCount,
    errors,
  };
}
