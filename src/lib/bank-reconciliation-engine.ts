/**
 * @file        src/lib/bank-reconciliation-engine.ts
 * @purpose     Bank statement reconciliation · matches bank statements to fincore vouchers · 26th SIBLING ⭐
 * @sprint      T-Phase-2.HK-6 · Theme 1 · Q-LOCK-3
 * @decisions   D-NEW · per Path A 50-year-architect Decision LOCKED May 23
 * @disciplines FR-19 SIBLING (single-source: bank statements) · FR-26 entity-scoped · FR-73.1 absolute
 * @reuses      fincore-engine (listVouchers — PURE QUERY)
 * @[JWT]       Phase 2: POST /api/fincore/bank-reconciliation/match
 */

import type { Voucher } from '@/types/voucher';
import { listVouchers } from './fincore-engine';

// ============================================================================
// TYPES
// ============================================================================

export type BankLineMatchStatus = 'unmatched' | 'auto_matched' | 'manual_matched' | 'ignored';

export interface BankStatementLine {
  id: string;
  statement_id: string;
  date: string;                          // YYYY-MM-DD
  description: string;
  reference: string;                     // cheque no · UTR · NEFT ref
  debit_amount: number;                  // outgoing (payments)
  credit_amount: number;                 // incoming (receipts)
  balance_after: number;
  matched_voucher_id: string | null;
  match_status: BankLineMatchStatus;
  match_confidence: number;              // 0-100
  matched_at: string | null;
  matched_by: string | null;
}

export interface BankStatement {
  id: string;
  entity_id: string;
  bank_account_id: string;
  bank_name: string;
  account_number: string;
  statement_period_from: string;
  statement_period_to: string;
  opening_balance: number;
  closing_balance: number;
  source_format: 'csv' | 'mt940' | 'xml' | 'manual';
  uploaded_at: string;
  uploaded_by: string;
  lines: BankStatementLine[];
}

export interface MatchSuggestion {
  bank_line_id: string;
  voucher_id: string;
  voucher_no: string;
  voucher_date: string;
  voucher_amount: number;
  match_score: number;                   // 0-100
  match_reasons: string[];
}

export interface ReconciliationRecord {
  id: string;
  entity_id: string;
  statement_id: string;
  voucher_id: string;
  bank_line_id: string;
  matched_at: string;
  matched_by: string;
  match_type: 'auto' | 'manual';
  notes: string;
  created_at: string;
}

export interface ReconciliationSummary {
  total_lines: number;
  matched_count: number;
  unmatched_count: number;
  ignored_count: number;
  match_rate_pct: number;
  oldest_unmatched_date: string | null;
}

// ============================================================================
// STORAGE KEYS (FR-26 entity-scoped)
// ============================================================================

export const bankStatementsKey = (e: string): string => `erp_bank_statements_${e}`;
export const reconciliationsKey = (e: string): string => `erp_bank_reconciliations_${e}`;

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ============================================================================
// STORAGE I/O
// ============================================================================

function readStatements(entityCode: string): BankStatement[] {
  try {
    // [JWT] GET /api/fincore/bank-statements?entityCode=...
    const raw = localStorage.getItem(bankStatementsKey(entityCode));
    return raw ? (JSON.parse(raw) as BankStatement[]) : [];
  } catch { return []; }
}

function writeStatements(entityCode: string, list: BankStatement[]): void {
  try {
    // [JWT] POST /api/fincore/bank-statements
    localStorage.setItem(bankStatementsKey(entityCode), JSON.stringify(list));
  } catch { /* quota */ }
}

function readRecons(entityCode: string): ReconciliationRecord[] {
  try {
    const raw = localStorage.getItem(reconciliationsKey(entityCode));
    return raw ? (JSON.parse(raw) as ReconciliationRecord[]) : [];
  } catch { return []; }
}

function writeRecons(entityCode: string, list: ReconciliationRecord[]): void {
  try {
    localStorage.setItem(reconciliationsKey(entityCode), JSON.stringify(list));
  } catch { /* quota */ }
}

// ============================================================================
// PUBLIC API · READS
// ============================================================================

/** List all statements for entity */
export function listBankStatements(entityCode: string): BankStatement[] {
  return readStatements(entityCode);
}

export function getBankStatement(entityCode: string, statementId: string): BankStatement | null {
  return readStatements(entityCode).find(s => s.id === statementId) ?? null;
}

/** Get reconciliation record by bank line · null if unmatched */
export function getReconciliationRecord(
  entityCode: string,
  bankLineId: string,
): ReconciliationRecord | null {
  return readRecons(entityCode).find(r => r.bank_line_id === bankLineId) ?? null;
}

/** Summary KPIs for FinCore dashboard / bank account view */
export function getReconciliationSummary(
  entityCode: string,
  bankAccountId: string,
): ReconciliationSummary {
  const statements = readStatements(entityCode).filter(s => s.bank_account_id === bankAccountId);
  let total = 0, matched = 0, unmatched = 0, ignored = 0;
  let oldestUnmatched: string | null = null;
  for (const st of statements) {
    for (const l of st.lines) {
      total++;
      if (l.match_status === 'auto_matched' || l.match_status === 'manual_matched') matched++;
      else if (l.match_status === 'ignored') ignored++;
      else {
        unmatched++;
        if (!oldestUnmatched || l.date < oldestUnmatched) oldestUnmatched = l.date;
      }
    }
  }
  return {
    total_lines: total,
    matched_count: matched,
    unmatched_count: unmatched,
    ignored_count: ignored,
    match_rate_pct: total > 0 ? Math.round((matched / total) * 1000) / 10 : 0,
    oldest_unmatched_date: oldestUnmatched,
  };
}

// ============================================================================
// PUBLIC API · MATCHING
// ============================================================================

/**
 * Auto-match bank statement lines to fincore vouchers.
 * Scoring:
 *   amount_exact:        +50  (decisive)
 *   amount_within_1pct:  +30
 *   date_within_3d:      +20
 *   date_within_7d:      +10
 *   ref_match:           +30  (cheque no / UTR substring on either side)
 *   description_has_vno: +20
 *
 * Returns top-3 suggestions per unmatched bank line, sorted by score desc.
 */
export function autoMatchStatement(
  entityCode: string,
  statementId: string,
): MatchSuggestion[] {
  const statement = getBankStatement(entityCode, statementId);
  if (!statement) return [];

  const vouchers = listVouchers(entityCode).filter(v =>
    v.base_voucher_type === 'Payment' || v.base_voucher_type === 'Receipt',
  );

  const suggestions: MatchSuggestion[] = [];

  for (const line of statement.lines) {
    if (line.match_status !== 'unmatched') continue;
    const lineAmount = line.debit_amount > 0 ? line.debit_amount : line.credit_amount;
    const lineIsOutgoing = line.debit_amount > 0;

    const candidates: MatchSuggestion[] = [];

    for (const v of vouchers) {
      // Payment is outgoing (debit on bank statement); Receipt is incoming (credit)
      const vIsOutgoing = v.base_voucher_type === 'Payment';
      if (vIsOutgoing !== lineIsOutgoing) continue;

      const reasons: string[] = [];
      let score = 0;

      // Amount match
      const diff = Math.abs(v.net_amount - lineAmount);
      if (diff < 0.01) { score += 50; reasons.push('amount_exact'); }
      else if (lineAmount > 0 && diff / lineAmount <= 0.01) { score += 30; reasons.push('amount_within_1pct'); }
      else continue; // amount too far · skip

      // Date proximity
      const days = Math.abs(daysBetween(v.date, line.date));
      if (days <= 3) { score += 20; reasons.push('date_within_3d'); }
      else if (days <= 7) { score += 10; reasons.push('date_within_7d'); }

      // Reference match (cheque / UTR / NEFT ref)
      const ref = (line.reference || '').toLowerCase().trim();
      const desc = (line.description || '').toLowerCase();
      const vno = (v.voucher_no || '').toLowerCase();
      const vRef = ((v as Voucher & { ref_voucher_no?: string }).ref_voucher_no || '').toLowerCase();
      if (ref && (ref === vno || (vRef && ref === vRef))) {
        score += 30;
        reasons.push('ref_match');
      }
      if (vno && desc.includes(vno)) {
        score += 20;
        reasons.push('description_has_vno');
      }

      candidates.push({
        bank_line_id: line.id,
        voucher_id: v.id,
        voucher_no: v.voucher_no,
        voucher_date: v.date,
        voucher_amount: v.net_amount,
        match_score: score,
        match_reasons: reasons,
      });
    }

    candidates.sort((a, b) => b.match_score - a.match_score);
    suggestions.push(...candidates.slice(0, 3));
  }

  return suggestions;
}

/** Apply a match · creates ReconciliationRecord + updates bank line status */
export function applyMatch(
  entityCode: string,
  bankLineId: string,
  voucherId: string,
  matchType: 'auto' | 'manual',
  notes: string,
  byUserId = 'system',
): ReconciliationRecord {
  const statements = readStatements(entityCode);
  let statementId = '';
  let confidence = matchType === 'auto' ? 80 : 100;

  for (const st of statements) {
    const idx = st.lines.findIndex(l => l.id === bankLineId);
    if (idx >= 0) {
      st.lines[idx] = {
        ...st.lines[idx],
        matched_voucher_id: voucherId,
        match_status: matchType === 'auto' ? 'auto_matched' : 'manual_matched',
        match_confidence: confidence,
        matched_at: new Date().toISOString(),
        matched_by: byUserId,
      };
      statementId = st.id;
      break;
    }
  }
  if (!statementId) throw new Error(`Bank line ${bankLineId} not found`);
  writeStatements(entityCode, statements);

  const rec: ReconciliationRecord = {
    id: newId('recon'),
    entity_id: entityCode,
    statement_id: statementId,
    voucher_id: voucherId,
    bank_line_id: bankLineId,
    matched_at: new Date().toISOString(),
    matched_by: byUserId,
    match_type: matchType,
    notes,
    created_at: new Date().toISOString(),
  };
  const recons = readRecons(entityCode);
  recons.push(rec);
  writeRecons(entityCode, recons);
  return rec;
}

/** Unmatch a previously matched line · audit trail preserved (record kept · status flipped) */
export function unmatchLine(entityCode: string, bankLineId: string): void {
  const statements = readStatements(entityCode);
  for (const st of statements) {
    const idx = st.lines.findIndex(l => l.id === bankLineId);
    if (idx >= 0) {
      st.lines[idx] = {
        ...st.lines[idx],
        matched_voucher_id: null,
        match_status: 'unmatched',
        match_confidence: 0,
        matched_at: null,
        matched_by: null,
      };
      writeStatements(entityCode, statements);
      return;
    }
  }
}

/** Mark a bank line as ignored (bank charges · interest · adjustment-only) */
export function ignoreLine(entityCode: string, bankLineId: string, byUserId = 'system'): void {
  const statements = readStatements(entityCode);
  for (const st of statements) {
    const idx = st.lines.findIndex(l => l.id === bankLineId);
    if (idx >= 0) {
      st.lines[idx] = {
        ...st.lines[idx],
        match_status: 'ignored',
        matched_at: new Date().toISOString(),
        matched_by: byUserId,
      };
      writeStatements(entityCode, statements);
      return;
    }
  }
}

// ============================================================================
// PUBLIC API · IMPORT
// ============================================================================

/**
 * Parse CSV bank statement.
 * Auto-detects column mapping for top Indian formats (ICICI/SBI/HDFC/Axis/coop):
 *   Required headers (case-insensitive contains): date, description, debit|withdrawal, credit|deposit, balance
 */
export function parseBankStatementCSV(
  entityCode: string,
  csvContent: string,
  bankAccountId: string,
  bankName: string,
  accountNumber: string,
  uploadedBy = 'system',
): BankStatement {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) throw new Error('Empty CSV');

  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const col = (...keys: string[]): number => {
    for (const k of keys) {
      const i = header.findIndex(h => h.includes(k));
      if (i >= 0) return i;
    }
    return -1;
  };

  const cDate = col('date', 'txn date');
  const cDesc = col('description', 'narration', 'particulars');
  const cRef = col('ref', 'cheque', 'utr');
  const cDebit = col('debit', 'withdrawal');
  const cCredit = col('credit', 'deposit');
  const cBal = col('balance', 'closing');

  if (cDate < 0 || cDesc < 0 || cDebit < 0 || cCredit < 0) {
    throw new Error('CSV missing required columns (date · description · debit · credit)');
  }

  const statementId = newId('bstmt');
  const stLines: BankStatementLine[] = [];
  let openingBal = 0;
  let closingBal = 0;
  let minDate = '9999-12-31';
  let maxDate = '0000-01-01';

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const dateStr = normalizeDate(cols[cDate] || '');
    if (!dateStr) continue;
    if (dateStr < minDate) minDate = dateStr;
    if (dateStr > maxDate) maxDate = dateStr;
    const debit = parseNum(cols[cDebit] || '0');
    const credit = parseNum(cols[cCredit] || '0');
    const bal = cBal >= 0 ? parseNum(cols[cBal] || '0') : 0;
    if (i === 1) openingBal = bal - credit + debit;
    closingBal = bal;
    stLines.push({
      id: newId('bln'),
      statement_id: statementId,
      date: dateStr,
      description: cols[cDesc] || '',
      reference: cRef >= 0 ? (cols[cRef] || '') : '',
      debit_amount: debit,
      credit_amount: credit,
      balance_after: bal,
      matched_voucher_id: null,
      match_status: 'unmatched',
      match_confidence: 0,
      matched_at: null,
      matched_by: null,
    });
  }

  const statement: BankStatement = {
    id: statementId,
    entity_id: entityCode,
    bank_account_id: bankAccountId,
    bank_name: bankName,
    account_number: accountNumber,
    statement_period_from: minDate,
    statement_period_to: maxDate,
    opening_balance: openingBal,
    closing_balance: closingBal,
    source_format: 'csv',
    uploaded_at: new Date().toISOString(),
    uploaded_by: uploadedBy,
    lines: stLines,
  };

  const all = readStatements(entityCode);
  all.push(statement);
  writeStatements(entityCode, all);
  return statement;
}

/** Direct insert (for demo seed / programmatic) */
export function insertStatement(entityCode: string, statement: BankStatement): void {
  const all = readStatements(entityCode);
  if (all.some(s => s.id === statement.id)) return; // idempotent
  all.push(statement);
  writeStatements(entityCode, all);
}

// ============================================================================
// HELPERS
// ============================================================================

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function parseNum(s: string): number {
  const cleaned = s.replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : 0;
}

function normalizeDate(s: string): string {
  // Accept YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY
  const trimmed = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const m1 = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(trimmed);
  if (m1) {
    const y = m1[3].length === 2 ? `20${m1[3]}` : m1[3];
    return `${y}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  }
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const m2 = /^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{2,4})$/.exec(trimmed);
  if (m2 && months[m2[2].toLowerCase()]) {
    const y = m2[3].length === 2 ? `20${m2[3]}` : m2[3];
    return `${y}-${months[m2[2].toLowerCase()]}-${m2[1].padStart(2, '0')}`;
  }
  return '';
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.round((da - db) / (1000 * 60 * 60 * 24));
}
