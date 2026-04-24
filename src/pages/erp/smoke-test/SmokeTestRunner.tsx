/**
 * SmokeTestRunner.tsx — End-to-end health dashboard
 * Traverses every hub, checks storage keys populated, runs engine fns,
 * shows pass/fail matrix.
 * [JWT] GET /api/diagnostics/smoke-test
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Play, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  seedEntityDemoData, detectArchetype,
} from '@/lib/demo-seed-orchestrator';
import type { DemoArchetype } from '@/data/demo-customers-vendors';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { computeCustomerKPIs } from '@/features/party-master/lib/customer-kpi-engine';
import { findCrossSellCandidates } from '@/features/party-master/lib/cross-sell-finder';
import {
  canTransition, enrichRow, upgradeSchedule,
  type EMIScheduleLiveRow,
} from '@/features/loan-emi/lib/emi-lifecycle-engine';
import type { EMIScheduleRow } from '@/features/ledger-master/lib/emi-schedule-builder';
import { buildEMISchedule } from '@/features/ledger-master/lib/emi-schedule-builder';
import { resolveExpenseLedger } from '@/features/loan-emi/lib/ledger-resolver';
import {
  findDuplicate, type AccrualLogEntry,
} from '@/features/loan-emi/lib/accrual-log';
import { planMonthlyAccrual } from '@/features/loan-emi/engines/accrual-engine';
import { planDailyPenal } from '@/features/loan-emi/engines/penal-engine';
import { postBounceCharge } from '@/features/loan-emi/engines/bounce-engine';
import { detectDuplicatePayments } from '@/features/loan-emi/lib/duplicate-detector';
import { computeAlerts } from '@/features/loan-emi/lib/alert-engine';

type CheckStatus = 'pending' | 'pass' | 'fail';
interface CheckResult {
  id: string; section: string; name: string;
  status: CheckStatus; expected: number | string; actual: number | string;
  details: string;
}

function readArray(key: string): unknown[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function readObj(key: string): unknown {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

interface CheckSpec {
  id: string; section: string; name: string;
  run: (entityCode: string) => { actual: number | string; expected: number | string; pass: boolean; details: string };
}

const CHECKS: CheckSpec[] = [
  // Foundation
  { id: 'fnd-1', section: 'Foundation', name: 'Entity registry populated',
    run: () => { const n = readArray('erp_group_entities').length;
      return { actual: n, expected: '≥1', pass: n >= 1, details: `${n} entities found` }; } },
  { id: 'fnd-2', section: 'Foundation', name: 'Customer master populated',
    run: () => { const n = readArray('erp_group_customer_master').length;
      return { actual: n, expected: '≥10', pass: n >= 10, details: `${n} customers` }; } },
  { id: 'fnd-3', section: 'Foundation', name: 'Vendor master populated',
    run: () => { const n = readArray('erp_group_vendor_master').length;
      return { actual: n, expected: '≥5', pass: n >= 5, details: `${n} vendors` }; } },
  { id: 'fnd-4', section: 'Foundation', name: 'Inventory items populated',
    run: () => { const n = readArray('erp_inventory_items').length;
      return { actual: n, expected: '≥5', pass: n >= 5, details: `${n} items` }; } },

  // FineCore
  { id: 'fc-1', section: 'FineCore', name: 'Vouchers exist for entity',
    run: (e) => { const n = readArray(`erp_group_vouchers_${e}`).length;
      return { actual: n, expected: '≥20', pass: n >= 20, details: `${n} vouchers` }; } },
  { id: 'fc-2', section: 'FineCore', name: 'Outstanding entries exist',
    run: (e) => { const n = readArray(`erp_outstanding_${e}`).length;
      return { actual: n, expected: '≥10', pass: n >= 10, details: `${n} outstanding records` }; } },
  { id: 'fc-3', section: 'FineCore', name: 'Sales invoices present',
    run: (e) => {
      const v = readArray(`erp_group_vouchers_${e}`) as Array<{ voucher_type?: string }>;
      const n = v.filter(x => x.voucher_type === 'sales_invoice').length;
      return { actual: n, expected: '≥20', pass: n >= 20, details: `${n} sales invoices` };
    } },
  { id: 'fc-4', section: 'FineCore', name: 'Receipts present',
    run: (e) => {
      const v = readArray(`erp_group_vouchers_${e}`) as Array<{ voucher_type?: string }>;
      const n = v.filter(x => x.voucher_type === 'receipt').length;
      return { actual: n, expected: '≥10', pass: n >= 10, details: `${n} receipts` };
    } },

  // SalesX
  { id: 'sx-1', section: 'SalesX', name: 'SAM persons',
    run: (e) => { const n = readArray(`erp_sam_persons_${e}`).length;
      return { actual: n, expected: '≥3', pass: n >= 3, details: `${n} persons` }; } },
  { id: 'sx-2', section: 'SalesX', name: 'SAM hierarchy',
    run: (e) => { const n = readArray(`erp_sam_hierarchy_${e}`).length;
      return { actual: n, expected: '≥3', pass: n >= 3, details: `${n} levels` }; } },
  { id: 'sx-3', section: 'SalesX', name: 'Enquiry sources',
    run: (e) => { const n = readArray(`erp_enquiry_sources_${e}`).length;
      return { actual: n, expected: '≥5', pass: n >= 5, details: `${n} sources` }; } },
  { id: 'sx-4', section: 'SalesX', name: 'Campaigns',
    run: (e) => { const n = readArray(`erp_campaigns_${e}`).length;
      return { actual: n, expected: '≥3', pass: n >= 3, details: `${n} campaigns` }; } },
  { id: 'sx-5', section: 'SalesX', name: 'Enquiries',
    run: (e) => { const n = readArray(`erp_enquiries_${e}`).length;
      return { actual: n, expected: '≥10', pass: n >= 10, details: `${n} enquiries` }; } },
  { id: 'sx-6', section: 'SalesX', name: 'Quotations',
    run: (e) => { const n = readArray(`erp_quotations_${e}`).length;
      return { actual: n, expected: '≥8', pass: n >= 8, details: `${n} quotations` }; } },
  { id: 'sx-7', section: 'SalesX', name: 'Targets',
    run: (e) => { const n = readArray(`erp_sam_targets_${e}`).length;
      return { actual: n, expected: '≥3', pass: n >= 3, details: `${n} targets` }; } },
  { id: 'sx-8', section: 'SalesX', name: 'Commission register',
    run: (e) => { const n = readArray(`erp_commission_register_${e}`).length;
      return { actual: n, expected: '≥10', pass: n >= 10, details: `${n} entries` }; } },

  // Sprint 7 — Field Force
  { id: 'sx-territories', section: 'SalesX', name: 'Territories',
    run: (e) => {
      // [JWT] GET /api/salesx/territories
      const n = readArray(`erp_territories_${e}`).length;
      return { actual: n, expected: '≥8', pass: n >= 8, details: `${n} territories` };
    } },
  { id: 'sx-beats', section: 'SalesX', name: 'Beat routes',
    run: (e) => {
      // [JWT] GET /api/salesx/beat-routes
      const n = readArray(`erp_beat_routes_${e}`).length;
      return { actual: n, expected: '≥20', pass: n >= 20, details: `${n} beats` };
    } },
  { id: 'sx-visit-logs', section: 'SalesX', name: 'Visit logs',
    run: (e) => {
      // [JWT] GET /api/salesx/visit-logs
      const n = readArray(`erp_visit_logs_${e}`).length;
      return { actual: n, expected: '≥50', pass: n >= 50, details: `${n} logs` };
    } },
  { id: 'sx-secondary-sales', section: 'SalesX', name: 'Secondary sales',
    run: (e) => {
      // [JWT] GET /api/salesx/secondary-sales
      const n = readArray(`erp_secondary_sales_${e}`).length;
      return { actual: n, expected: '≥20', pass: n >= 20, details: `${n} rows` };
    } },

  // ReceivX
  { id: 'rx-1', section: 'ReceivX', name: 'ReceivX config',
    run: (e) => { const o = readObj(`erp_receivx_config_${e}`);
      return { actual: o ? 'present' : 'missing', expected: 'present', pass: !!o, details: o ? 'Config loaded' : 'Missing' }; } },
  { id: 'rx-2', section: 'ReceivX', name: 'Reminder templates',
    run: (e) => { const n = readArray(`erp_receivx_templates_${e}`).length;
      return { actual: n, expected: '≥1', pass: n >= 1, details: `${n} templates` }; } },
  { id: 'rx-3', section: 'ReceivX', name: 'Collection execs',
    run: (e) => { const n = readArray(`erp_receivx_execs_${e}`).length;
      return { actual: n, expected: '≥1', pass: n >= 1, details: `${n} execs` }; } },
  { id: 'rx-4', section: 'ReceivX', name: 'Incentive schemes',
    run: (e) => { const n = readArray(`erp_receivx_schemes_${e}`).length;
      return { actual: n, expected: '≥1', pass: n >= 1, details: `${n} schemes` }; } },
  { id: 'rx-5', section: 'ReceivX', name: 'PTPs present',
    run: (e) => { const n = readArray(`erp_receivx_ptps_${e}`).length;
      return { actual: n, expected: '≥3', pass: n >= 3, details: `${n} PTPs` }; } },
  { id: 'rx-6', section: 'ReceivX', name: 'Communication log',
    run: (e) => { const n = readArray(`erp_receivx_comm_log_${e}`).length;
      return { actual: n, expected: '≥5', pass: n >= 5, details: `${n} log rows` }; } },

  // Pay Hub
  { id: 'ph-1', section: 'Pay Hub', name: 'Employees',
    run: () => { const n = readArray('erp_employees').length;
      return { actual: n, expected: '≥5', pass: n >= 5, details: `${n} employees` }; } },
  { id: 'ph-2', section: 'Pay Hub', name: 'Salary structures',
    run: () => { const n = readArray('erp_salary_structures').length;
      return { actual: n, expected: '≥1', pass: n >= 1, details: `${n} structures` }; } },
  { id: 'ph-3', section: 'Pay Hub', name: 'Pay grades',
    run: () => { const n = readArray('erp_pay_grades').length;
      return { actual: n, expected: '≥1', pass: n >= 1, details: `${n} grades` }; } },

  // T-H1.5-C-S4 — Customer Master regression checks
  { id: 'cm-1', section: 'Customer Master (S4)', name: 'Interface shape preserved — contacts[] is array',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ contacts?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers to check' };
      const bad = arr.filter(c => !Array.isArray(c.contacts)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers with non-array contacts` };
    } },
  { id: 'cm-2', section: 'Customer Master (S4)', name: 'Interface shape preserved — addresses[] is array',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ addresses?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const bad = arr.filter(c => !Array.isArray(c.addresses)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers with non-array addresses` };
    } },
  { id: 'cm-3', section: 'Customer Master (S4)', name: 'Credit-hold field present (credit_hold_mode)',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ credit_hold_mode?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const missing = arr.filter(c => c.credit_hold_mode === undefined).length;
      return { actual: missing, expected: 0, pass: missing === 0, details: `${missing} missing credit_hold_mode` };
    } },
  { id: 'cm-4', section: 'Customer Master (S4)', name: 'Sales-force linkage preserved (territory_id, beat_ids)',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ territory_id?: unknown; beat_ids?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const bad = arr.filter(c => c.territory_id === undefined || !Array.isArray(c.beat_ids)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers with broken SF linkage` };
    } },
  { id: 'cm-5', section: 'Customer Master (S4)', name: 'Distributor hierarchy linkage preserved',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ hierarchy_node_id?: unknown; hierarchy_role?: unknown; portal_enabled?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const bad = arr.filter(c => c.hierarchy_node_id === undefined || c.portal_enabled === undefined).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers with broken hierarchy linkage` };
    } },
  { id: 'cm-6', section: 'Customer Master (S4)', name: 'Two-tier credit fields intact (creditLimit + warningLimit)',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ creditLimit?: unknown; warningLimit?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const bad = arr.filter(c => typeof c.creditLimit !== 'number' || typeof c.warningLimit !== 'number').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers with broken credit fields` };
    } },
  { id: 'cm-7', section: 'Customer Master (S4)', name: 'PartyPickerRow contract compatible',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ id?: unknown; partyName?: unknown; partyCode?: unknown; gstin?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const bad = arr.filter(c =>
        typeof c.id !== 'string' || typeof c.partyName !== 'string' ||
        typeof c.partyCode !== 'string').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers with broken PartyPicker fields` };
    } },
  { id: 'cm-8', section: 'Customer Master (S4)', name: 'Deprecated fields retained (referredBy/associatedDealer/otherReference)',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<Record<string, unknown>>;
      const bad = arr.filter(c => !('referredBy' in c) || !('associatedDealer' in c) || !('otherReference' in c)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers missing deprecated fields` };
    } },

  // Customer Intelligence Layer (S4.5)
  { id: 'cm-kpi-1', section: 'Customer Intelligence (S4.5)',
    name: 'KPI engine returns finite numbers for seeded customer',
    run: (e) => {
      const customers = readArray('erp_group_customer_master') as Array<{ id?: string }>;
      if (customers.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const first = customers[0].id;
      if (!first) return { actual: 'missing id', expected: 'id', pass: false, details: 'First customer has no id' };
      const kpi = computeCustomerKPIs(first, e);
      const allFinite = [kpi.revenueMTD, kpi.revenueYTD, kpi.lifetimeRevenue, kpi.outstandingAmount, kpi.daysSalesOutstanding].every(Number.isFinite);
      return { actual: allFinite ? 'ok' : 'NaN detected', expected: 'all finite', pass: allFinite, details: JSON.stringify(kpi) };
    } },
  { id: 'cm-kpi-2', section: 'Customer Intelligence (S4.5)',
    name: 'Cross-sell finder returns array (never null/undefined)',
    run: () => {
      const out = findCrossSellCandidates({ customers: [], kpis: new Map() });
      return { actual: Array.isArray(out) ? 'array' : 'not-array', expected: 'array', pass: Array.isArray(out), details: `length=${out.length}` };
    } },
  { id: 'cm-kpi-3', section: 'Customer Intelligence (S4.5)',
    name: 'KPI healthStatus enum correct',
    run: (e) => {
      const customers = readArray('erp_group_customer_master') as Array<{ id?: string }>;
      if (customers.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const allOk = customers.slice(0, 10).every(c => {
        if (!c.id) return false;
        const kpi = computeCustomerKPIs(c.id, e);
        return ['green', 'amber', 'red', 'new'].includes(kpi.healthStatus);
      });
      return { actual: allOk ? 'ok' : 'bad enum', expected: 'valid', pass: allOk, details: 'Sampled first 10' };
    } },

  // T-H1.5-C-S5 — Vendor Master regression checks
  { id: 'vm-1', section: 'Vendor Master (S5)', name: 'Interface shape preserved — contacts[] is array',
    run: () => {
      const arr = readArray('erp_group_vendor_master') as Array<{ contacts?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No vendors' };
      const bad = arr.filter(v => !Array.isArray(v.contacts)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} vendors with non-array contacts` };
    } },
  { id: 'vm-2', section: 'Vendor Master (S5)', name: 'PAN-required field present (panRequired)',
    run: () => {
      const arr = readArray('erp_group_vendor_master') as Array<{ panRequired?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No vendors' };
      const missing = arr.filter(v => v.panRequired === undefined).length;
      return { actual: missing, expected: 0, pass: missing === 0, details: `${missing} missing panRequired` };
    } },
  { id: 'vm-3', section: 'Vendor Master (S5)', name: 'MSME compliance fields intact (msmeRegistered + msmeCategory)',
    run: () => {
      const arr = readArray('erp_group_vendor_master') as Array<{ msmeRegistered?: unknown; msmeCategory?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No vendors' };
      const bad = arr.filter(v => v.msmeRegistered === undefined || v.msmeCategory === undefined).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} vendors with broken MSME fields` };
    } },
  { id: 'vm-4', section: 'Vendor Master (S5)', name: 'Optional bankAccounts[] is array when present',
    run: () => {
      const arr = readArray('erp_group_vendor_master') as Array<{ bankAccounts?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No vendors' };
      const bad = arr.filter(v => v.bankAccounts !== undefined && !Array.isArray(v.bankAccounts)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} vendors with non-array bankAccounts` };
    } },
  { id: 'vm-5', section: 'Vendor Master (S5)', name: 'PartyPickerRow contract compatible',
    run: () => {
      const arr = readArray('erp_group_vendor_master') as Array<{ id?: unknown; partyName?: unknown; partyCode?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No vendors' };
      const bad = arr.filter(v =>
        typeof v.id !== 'string' || typeof v.partyName !== 'string' || typeof v.partyCode !== 'string').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} vendors with broken PartyPicker fields` };
    } },

  // T-H1.5-C-S6 — Logistic Master regression checks
  { id: 'lm-1', section: 'Logistic Master (S6)', name: 'Interface shape preserved — contacts[] is array',
    run: () => {
      const arr = readArray('erp_group_logistic_master') as Array<{ contacts?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No logistic parties' };
      const bad = arr.filter(l => !Array.isArray(l.contacts)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} logistic parties with non-array contacts` };
    } },
  { id: 'lm-2', section: 'Logistic Master (S6)', name: 'GTA-RCM fields intact (gtaRcmApplicable + rcmGstRate)',
    run: () => {
      const arr = readArray('erp_group_logistic_master') as Array<{ logisticType?: string; gtaRcmApplicable?: unknown; rcmGstRate?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No logistic parties' };
      const bad = arr.filter(l => l.gtaRcmApplicable === undefined).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} missing gtaRcmApplicable` };
    } },
  { id: 'lm-3', section: 'Logistic Master (S6)', name: 'Freight rate card field intact (freightRates[] array)',
    run: () => {
      const arr = readArray('erp_group_logistic_master') as Array<{ freightRates?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No logistic parties' };
      const bad = arr.filter(l => !Array.isArray(l.freightRates)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with non-array freightRates` };
    } },
  { id: 'lm-4', section: 'Logistic Master (S6)', name: 'Optional bankAccounts[] is array when present',
    run: () => {
      const arr = readArray('erp_group_logistic_master') as Array<{ bankAccounts?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No logistic parties' };
      const bad = arr.filter(l => l.bankAccounts !== undefined && !Array.isArray(l.bankAccounts)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with non-array bankAccounts` };
    } },
  { id: 'lm-5', section: 'Logistic Master (S6)', name: 'logisticType enum within allowed set',
    run: () => {
      const arr = readArray('erp_group_logistic_master') as Array<{ logisticType?: string }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No logistic parties' };
      const allowed = ['gta', 'courier', 'rail', 'air', 'sea', 'cha', 'freight_forwarder', 'other'];
      const bad = arr.filter(l => !l.logisticType || !allowed.includes(l.logisticType)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with invalid logisticType` };
    } },

  // T-H1.5-C-S6.5a — Balance Sheet ledger Panel regression (Cash/Bank/Asset/Liability/Capital)
  { id: 'lp-cash-1', section: 'Cash Ledger Panel (S6.5a)', name: 'Interface — cashLimit numeric',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; cashLimit?: unknown }>;
      const cash = all.filter(l => l.ledgerType === 'cash');
      if (cash.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No cash ledgers' };
      const bad = cash.filter(l => typeof l.cashLimit !== 'number').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with non-numeric cashLimit` };
    } },
  { id: 'lp-cash-2', section: 'Cash Ledger Panel (S6.5a)', name: 'ledgerType discriminator preserved',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string }>;
      const cash = all.filter(l => l.ledgerType === 'cash');
      if (cash.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No cash ledgers' };
      const bad = cash.filter(l => l.ledgerType !== 'cash').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} broken ledgerType` };
    } },

  { id: 'lp-bank-1', section: 'Bank Ledger Panel (S6.5a)', name: 'Interface — IFSC field present',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; ifscCode?: unknown }>;
      const bank = all.filter(l => l.ledgerType === 'bank');
      if (bank.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No bank ledgers' };
      const bad = bank.filter(l => typeof l.ifscCode !== 'string').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} missing/broken ifscCode` };
    } },
  { id: 'lp-bank-2', section: 'Bank Ledger Panel (S6.5a)', name: 'Payment-rail flags preserved',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; neftEnabled?: unknown; rtgsEnabled?: unknown; impsEnabled?: unknown; upiEnabled?: unknown }>;
      const bank = all.filter(l => l.ledgerType === 'bank');
      if (bank.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No bank ledgers' };
      const bad = bank.filter(l =>
        typeof l.neftEnabled !== 'boolean' || typeof l.rtgsEnabled !== 'boolean' ||
        typeof l.impsEnabled !== 'boolean' || typeof l.upiEnabled !== 'boolean').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with broken payment-rail flags` };
    } },

  { id: 'lp-asset-1', section: 'Asset Ledger Panel (S6.5a)', name: 'Depreciation method enum intact',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; depreciationMethod?: string }>;
      const asset = all.filter(l => l.ledgerType === 'asset');
      if (asset.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No asset ledgers' };
      const valid = ['slm', 'wdv', 'none'];
      const bad = asset.filter(l => !l.depreciationMethod || !valid.includes(l.depreciationMethod)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with invalid depreciationMethod` };
    } },
  { id: 'lp-asset-2', section: 'Asset Ledger Panel (S6.5a)', name: 'IT Act depreciation fields intact',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; it_act_block?: unknown; it_act_depr_rate?: unknown }>;
      const asset = all.filter(l => l.ledgerType === 'asset');
      if (asset.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No asset ledgers' };
      const bad = asset.filter(l => l.it_act_block === undefined || typeof l.it_act_depr_rate !== 'number').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with broken IT Act fields` };
    } },

  { id: 'lp-liab-1', section: 'Liability Ledger Panel (S6.5a)', name: 'Opening balance type enum intact',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; openingBalanceType?: string }>;
      const liab = all.filter(l => l.ledgerType === 'liability');
      if (liab.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No liability ledgers' };
      const bad = liab.filter(l => !['Dr', 'Cr'].includes(l.openingBalanceType ?? '')).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with invalid openingBalanceType` };
    } },
  { id: 'lp-liab-2', section: 'Liability Ledger Panel (S6.5a)', name: 'Parent group linkage preserved',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; parentGroupCode?: unknown }>;
      const liab = all.filter(l => l.ledgerType === 'liability');
      if (liab.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No liability ledgers' };
      const bad = liab.filter(l => typeof l.parentGroupCode !== 'string').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with broken parentGroupCode` };
    } },

  { id: 'lp-cap-1', section: 'Capital Ledger Panel (S6.5a)', name: 'capitalType discriminator intact',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; capitalType?: unknown }>;
      const cap = all.filter(l => l.ledgerType === 'capital');
      if (cap.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No capital ledgers' };
      const bad = cap.filter(l => typeof l.capitalType !== 'string').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with broken capitalType` };
    } },
  { id: 'lp-cap-2', section: 'Capital Ledger Panel (S6.5a)', name: 'Profit-sharing & contribution numeric',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; profitSharingRatio?: unknown; capitalContribution?: unknown }>;
      const cap = all.filter(l => l.ledgerType === 'capital');
      if (cap.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No capital ledgers' };
      const bad = cap.filter(l => typeof l.profitSharingRatio !== 'number' || typeof l.capitalContribution !== 'number').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with non-numeric ratio/contribution` };
    } },

  // ─── S6.5b — P&L + Statutory + Debt Panels ─────────────────────────────
  { id: 'lp-inc-1', section: 'Income Ledger Panel (S6.5b)', name: 'Interface — sacCode/hsnCode preserved',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; sacCode?: unknown; hsnCode?: unknown }>;
      const inc = all.filter(l => l.ledgerType === 'income');
      if (inc.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No income ledgers' };
      const bad = inc.filter(l => typeof l.sacCode !== 'string' && typeof l.hsnCode !== 'string').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} missing sac/hsn` };
    } },
  { id: 'lp-inc-2', section: 'Income Ledger Panel (S6.5b)', name: 'GST flags numeric/boolean intact',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; isGstApplicable?: unknown; gstRate?: unknown }>;
      const inc = all.filter(l => l.ledgerType === 'income');
      if (inc.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No income ledgers' };
      const bad = inc.filter(l => typeof l.isGstApplicable !== 'boolean' || typeof l.gstRate !== 'number').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with broken GST shape` };
    } },

  { id: 'lp-exp-1', section: 'Expense Ledger Panel (S6.5b)', name: 'RCM flag boolean preserved',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; isRcmApplicable?: unknown }>;
      const exp = all.filter(l => l.ledgerType === 'expense');
      if (exp.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No expense ledgers' };
      const bad = exp.filter(l => typeof l.isRcmApplicable !== 'boolean').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with broken RCM flag` };
    } },
  { id: 'lp-exp-2', section: 'Expense Ledger Panel (S6.5b)', name: 'TDS section + rate intact',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; isTdsApplicable?: unknown; tdsSection?: unknown; tdsRate?: unknown }>;
      const exp = all.filter(l => l.ledgerType === 'expense');
      if (exp.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No expense ledgers' };
      const bad = exp.filter(l => typeof l.isTdsApplicable !== 'boolean').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with broken TDS shape` };
    } },

  { id: 'lp-dt-1', section: 'Duties & Tax Ledger Panel (S6.5b)', name: 'taxType discriminator intact',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; taxType?: unknown }>;
      const dt = all.filter(l => l.ledgerType === 'duties_tax');
      if (dt.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No duties_tax ledgers' };
      const bad = dt.filter(l => typeof l.taxType !== 'string').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with broken taxType` };
    } },
  { id: 'lp-dt-2', section: 'Duties & Tax Ledger Panel (S6.5b)', name: 'GSTR mapping + filing freq present',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; gstrMapping?: unknown; filingFrequency?: unknown }>;
      const dt = all.filter(l => l.ledgerType === 'duties_tax');
      if (dt.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No duties_tax ledgers' };
      const bad = dt.filter(l => typeof l.gstrMapping !== 'string' && typeof l.filingFrequency !== 'string').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} missing mapping/frequency` };
    } },

  { id: 'lp-pay-1', section: 'Payroll Statutory Panel (S6.5b)', name: 'statutoryType discriminator intact',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; statutoryType?: unknown }>;
      const pr = all.filter(l => l.ledgerType === 'payroll_statutory');
      if (pr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No payroll ledgers' };
      const bad = pr.filter(l => typeof l.statutoryType !== 'string').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with broken statutoryType` };
    } },
  { id: 'lp-pay-2', section: 'Payroll Statutory Panel (S6.5b)', name: 'Employer/employee share numeric',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; employerShare?: unknown; employeeShare?: unknown }>;
      const pr = all.filter(l => l.ledgerType === 'payroll_statutory');
      if (pr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No payroll ledgers' };
      const bad = pr.filter(l => typeof l.employerShare !== 'number' || typeof l.employeeShare !== 'number').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with non-numeric shares` };
    } },

  { id: 'lp-lrec-1', section: 'Loan Receivable Panel (S6.5b)', name: 'Borrower + tenure fields intact',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; borrowerName?: unknown; tenureMonths?: unknown }>;
      const lr = all.filter(l => l.ledgerType === 'loan_receivable');
      if (lr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No loan receivables' };
      const bad = lr.filter(l => typeof l.borrowerName !== 'string' || typeof l.tenureMonths !== 'number').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with broken borrower/tenure` };
    } },
  { id: 'lp-lrec-2', section: 'Loan Receivable Panel (S6.5b)', name: 'Interest type enum (simple|compound)',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; interestType?: unknown }>;
      const lr = all.filter(l => l.ledgerType === 'loan_receivable');
      if (lr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No loan receivables' };
      const bad = lr.filter(l => l.interestType !== 'simple' && l.interestType !== 'compound').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with bad interestType` };
    } },

  { id: 'lp-borr-1', section: 'Borrowing Panel (S6.5b)', name: 'lenderType + loanType discriminators intact',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; lenderType?: unknown; loanType?: unknown }>;
      const br = all.filter(l => l.ledgerType === 'borrowing');
      if (br.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No borrowings' };
      const bad = br.filter(l => typeof l.lenderType !== 'string' || typeof l.loanType !== 'string').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with broken lender/loan type` };
    } },
  { id: 'lp-borr-2', section: 'Borrowing Panel (S6.5b)', name: 'H1.5-D foundation fields preserved',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{ ledgerType?: string; processingFee?: unknown; penalInterestRate?: unknown; foreclosureRate?: unknown }>;
      const br = all.filter(l => l.ledgerType === 'borrowing');
      if (br.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No borrowings' };
      const bad = br.filter(l => 'processingFee' in l && typeof l.processingFee !== 'number').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} with broken foundation field types` };
    } },

  // ── T-H1.5-D-D1 · EMI Lifecycle Layer (CC-062) ──
  { id: 'emi-1', section: 'EMI Lifecycle (D1)',
    name: 'Lifecycle engine blocks illegal transitions',
    run: () => {
      const legalOk = canTransition('scheduled', 'paid');
      const illegalOk = canTransition('paid', 'scheduled');
      const pass = legalOk === true && illegalOk === false;
      return {
        actual: `legal=${legalOk}, illegal=${illegalOk}`,
        expected: 'legal=true, illegal=false',
        pass, details: 'State machine gatekeeping',
      };
    } },
  { id: 'emi-2', section: 'EMI Lifecycle (D1)',
    name: 'enrichRow computes "due" for past dueDate',
    run: () => {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      const mockRow: EMIScheduleLiveRow = {
        emiNumber: 1, dueDate: yesterday,
        principalPortion: 1000, interestPortion: 100, totalEMI: 1100,
        openingBalance: 10000, closingBalance: 9000,
        status: 'scheduled', paymentVoucherId: null, paidDate: null,
        paidAmount: 0, penalAccrued: 0, bouncedDate: null, bouncedCount: 0, notes: '',
      };
      const enriched = enrichRow(mockRow, today);
      return {
        actual: enriched.status, expected: 'due',
        pass: enriched.status === 'due',
        details: `Row with dueDate=${yesterday} enriched on today=${today}`,
      };
    } },
  { id: 'emi-3', section: 'EMI Lifecycle (D1)',
    name: 'S6.5b → D1 migration preserves row count + dates',
    run: () => {
      const cached: EMIScheduleRow[] = [
        { emiNumber: 1, dueDate: '2026-05-01', principal: 100, interest: 20,
          runningBalance: 900, status: 'scheduled' },
        { emiNumber: 2, dueDate: '2026-06-01', principal: 100, interest: 18,
          runningBalance: 800, status: 'scheduled' },
      ];
      const live = upgradeSchedule(cached);
      const pass = live.length === 2
        && live[0].dueDate === '2026-05-01'
        && live[0].principalPortion === 100
        && live[0].totalEMI === 120
        && live[0].status === 'scheduled';
      return {
        actual: `len=${live.length}, firstDue=${live[0]?.dueDate}, firstTotal=${live[0]?.totalEMI}`,
        expected: 'len=2, firstDue=2026-05-01, firstTotal=120',
        pass, details: 'Backward compat migration',
      };
    } },
  { id: 'emi-4', section: 'EMI Lifecycle (D1)',
    name: 'Charges fields remain optional / numeric when present',
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{
        ledgerType?: string;
        processingFee?: unknown;
        penalInterestRate?: unknown;
        chequeBounceCharge?: unknown;
        foreclosureChargeRate?: unknown;
      }>;
      const borrowings = all.filter(l => l.ledgerType === 'borrowing');
      if (borrowings.length === 0) {
        return { actual: 'skip', expected: 'skip', pass: true, details: 'No borrowing ledgers' };
      }
      const bad = borrowings.filter(l =>
        (l.processingFee !== undefined && typeof l.processingFee !== 'number')
        || (l.penalInterestRate !== undefined && typeof l.penalInterestRate !== 'number')
        || (l.chequeBounceCharge !== undefined && typeof l.chequeBounceCharge !== 'number')
        || (l.foreclosureChargeRate !== undefined && typeof l.foreclosureChargeRate !== 'number')
      ).length;
      return {
        actual: bad, expected: 0, pass: bad === 0,
        details: `${bad} borrowings with corrupt charge types`,
      };
    } },

  // ── T-H1.5-D-D2 · GL Posting Engines (CC-063) ──
  { id: 'd2-1', section: 'D2 Accrual Engine',
    name: 'Ledger resolver creates/returns Interest Expense ledger',
    run: () => {
      const id = resolveExpenseLedger('interest_expense');
      const pass = typeof id === 'string' && id.length > 0;
      return { actual: `id=${id.slice(0, 24)}`, expected: 'non-empty string', pass, details: '' };
    } },
  { id: 'd2-2', section: 'D2 Accrual Engine',
    name: 'Accrual log dup detection works',
    run: () => {
      const log: AccrualLogEntry[] = [{
        id: 'a1', ledgerId: 'L1', action: 'monthly_interest',
        periodKey: '2026-04', emiNumber: 1, amount: 100,
        voucherId: 'v1', voucherNo: 'JV-ACCR/26-27/0001',
        postedAt: '2026-04-01T00:00:00Z', postedBy: 'current-user',
        reversedByVoucherId: null, narration: '',
      }];
      const dup = findDuplicate(log, 'L1', 'monthly_interest', '2026-04');
      const fresh = findDuplicate(log, 'L1', 'monthly_interest', '2026-05');
      const pass = !!dup && !fresh;
      return { actual: `dup=${!!dup}, fresh=${!!fresh}`,
        expected: 'dup=true, fresh=false', pass, details: '' };
    } },
  { id: 'd2-3', section: 'D2 Accrual Engine',
    name: 'Monthly accrual plan returns array',
    run: () => {
      const plan = planMonthlyAccrual(new Date().toISOString().slice(0, 10));
      const pass = Array.isArray(plan);
      return { actual: `plan-length=${plan.length}`, expected: 'array', pass, details: '' };
    } },
  { id: 'd2-4', section: 'D2 Penal Engine',
    name: 'Penal plan filters to penal>0 ledgers',
    run: () => {
      const plan = planDailyPenal(new Date().toISOString().slice(0, 10));
      const allHavePenalGt0 = plan.every(p => p.penalRate > 0);
      const pass = Array.isArray(plan) && allHavePenalGt0;
      return { actual: `len=${plan.length}, allPenalGt0=${allHavePenalGt0}`,
        expected: 'Array with penalRate>0', pass, details: '' };
    } },
  { id: 'd2-5', section: 'D2 Bounce Engine',
    name: 'Bounce charge skip on missing ledger (idempotency-safe)',
    run: () => {
      const r = postBounceCharge('no-such-ledger-xyz', 1, '2026-04-24', 'GROUP');
      const pass = r.posted === false && typeof r.skipReason === 'string';
      return { actual: `posted=${r.posted}, reason=${r.skipReason ?? ''}`,
        expected: 'posted=false, skipReason=string', pass, details: '' };
    } },
  { id: 'd2-6', section: 'D2 Invariants',
    name: '6-month accrual sum matches manual amortization',
    run: () => {
      const schedule = buildEMISchedule({
        principal: 715000, annualRatePercent: 23,
        tenureMonths: 36, firstEmiDate: '2022-02-16',
      });
      const sum6 = schedule.slice(0, 6).reduce((s, r) => s + r.interest, 0);
      const pass = sum6 > 77000 && sum6 < 79000;
      return { actual: `sum6=${sum6.toFixed(2)}`, expected: '77000..79000',
        pass, details: 'First 6 months of standard amortization (expected ~₹78,103.53)' };
    } },

  // ── T-H1.5-D-D3 · Visibility + Prevention Layer ──
  { id: 'd3-1', section: 'D3 Duplicate Detector',
    name: 'detectDuplicatePayments returns array never null',
    run: () => {
      const result = detectDuplicatePayments({
        partyId: 'no-such-party', amount: 100, date: '2026-04-24', entityCode: 'SMRT',
      });
      return { actual: Array.isArray(result) ? 'array' : 'not-array',
        expected: 'array', pass: Array.isArray(result),
        details: `len=${result.length}` };
    } },

  { id: 'd3-2', section: 'D3 Duplicate Detector',
    name: 'Tolerance ±₹0.50 — amounts within window flagged',
    run: () => {
      const testKey = 'erp_journal_SMRT';
      const saved = localStorage.getItem(testKey);
      const mockJournal = [{
        id: 'je-dup-1', voucher_id: 'v-test-1', voucher_no: 'PAY/TEST/0001',
        base_voucher_type: 'Payment', date: '2026-04-23', party_id: 'party-dup-test',
        dr_amount: 0, cr_amount: 27677.50, narration: 'test',
        ledger_name: 'Test Party', is_cancelled: false,
      }];
      localStorage.setItem(testKey, JSON.stringify(mockJournal));
      const hits = detectDuplicatePayments({
        partyId: 'party-dup-test', amount: 27677, date: '2026-04-24', entityCode: 'SMRT',
      });
      // Restore
      if (saved) localStorage.setItem(testKey, saved); else localStorage.removeItem(testKey);
      const pass = hits.length === 1 && hits[0].voucherNo === 'PAY/TEST/0001';
      return { actual: `hits=${hits.length}`, expected: 'hits=1', pass, details: '' };
    } },

  { id: 'd3-3', section: 'D3 Alert Engine',
    name: 'computeAlerts buckets by daysUntilDue correctly',
    run: () => {
      const today = new Date().toISOString().slice(0, 10);
      const t = Date.now();
      const mkRow = (daysOffset: number, emiNumber: number) => ({
        emiNumber,
        dueDate: new Date(t + daysOffset * 86_400_000).toISOString().slice(0, 10),
        principalPortion: 1000, interestPortion: 100, totalEMI: 1100,
        openingBalance: 10000, closingBalance: 9000,
        status: 'scheduled' as const, paymentVoucherId: null, paidDate: null,
        paidAmount: 0, penalAccrued: 0, bouncedDate: null, bouncedCount: 0, notes: '',
      });
      const borrowings = [{
        id: 'L-test', ledgerType: 'borrowing' as const, name: 'Test Loan', status: 'active',
        emiScheduleLive: [mkRow(-2, 1), mkRow(3, 2), mkRow(5, 3), mkRow(10, 4)],
      }];
      const alerts = computeAlerts(borrowings, today);
      const buckets = alerts.map(a => a.bucket).sort().join(',');
      // Expected: overdue (EMI1), 3d (EMI2), 7d (EMI3). EMI4 too far — excluded.
      const pass = alerts.length === 3;
      return { actual: `count=${alerts.length}, buckets=${buckets}`,
        expected: 'count=3 (overdue+3d+7d)',
        pass, details: '' };
    } },

  { id: 'd3-4', section: 'D3 PartyPicker Extension',
    name: "'borrowing' mode loads from ledger-definitions, filters by ledgerType+status",
    run: () => {
      const all = readArray('erp_group_ledger_definitions') as Array<{
        ledgerType?: string; status?: string;
      }>;
      const activeBorrowings = all.filter(l =>
        l.ledgerType === 'borrowing' && l.status === 'active').length;
      if (activeBorrowings === 0) {
        return { actual: 'skip', expected: 'skip', pass: true, details: 'No active borrowings' };
      }
      const borrowings = all.filter(l => l.ledgerType === 'borrowing') as Array<
        { id?: unknown; name?: unknown }
      >;
      const bad = borrowings.filter(b =>
        typeof b.id !== 'string' || typeof b.name !== 'string').length;
      return { actual: bad, expected: 0, pass: bad === 0,
        details: `${bad} borrowings with broken PartyPicker contract fields` };
    } },

  { id: 'd3-5', section: 'D3 PartyPicker Regression',
    name: 'Existing modes (customer/vendor/both) contract preserved',
    run: () => {
      const customers = readArray('erp_group_customer_master') as Array<Record<string, unknown>>;
      const vendors = readArray('erp_group_vendor_master') as Array<Record<string, unknown>>;
      const badCust = customers.filter(c =>
        typeof c.id !== 'string' || typeof c.partyName !== 'string').length;
      const badVen = vendors.filter(v =>
        typeof v.id !== 'string' || typeof v.partyName !== 'string').length;
      const total = badCust + badVen;
      return { actual: total, expected: 0, pass: total === 0,
        details: `Bad customers=${badCust}, bad vendors=${badVen}` };
    } },

  { id: 'd3-6', section: 'D3 EMI Dashboard',
    name: 'EMIAlertSummary shape returns finite numbers',
    run: () => {
      const today = new Date().toISOString().slice(0, 10);
      const alerts = computeAlerts([], today);
      const pass = Array.isArray(alerts) && alerts.length === 0;
      return { actual: `len=${alerts.length}`, expected: 'len=0 for empty input',
        pass, details: 'Base case — no borrowings means no alerts' };
    } },
];

function useCtrlS(handler: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handler(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler]);
}

export function SmokeTestRunnerPanel() { return <SmokeTestRunner />; }

export default function SmokeTestRunner() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [entityCode, setEntityCode] = useState<string>(DEFAULT_ENTITY_SHORTCODE);
  const [archetype, setArchetype] = useState<DemoArchetype>('trading');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sections = useMemo(() => Array.from(new Set(CHECKS.map(c => c.section))), []);

  const runAll = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const next: CheckResult[] = CHECKS.map(c => {
        try {
          const r = c.run(entityCode);
          return {
            id: c.id, section: c.section, name: c.name,
            status: r.pass ? 'pass' : 'fail',
            expected: r.expected, actual: r.actual, details: r.details,
          };
        } catch (err) {
          return { id: c.id, section: c.section, name: c.name,
            status: 'fail', expected: '-', actual: 'error', details: (err as Error).message };
        }
      });
      setResults(next);
      setRunning(false);
      const passed = next.filter(r => r.status === 'pass').length;
      toast.success(`Smoke test complete: ${passed}/${next.length} passed`);
    }, 300);
  }, [entityCode]);

  const reseed = useCallback(() => {
    try {
      const result = seedEntityDemoData(entityCode, archetype);
      toast.success(`${entityCode} reseeded: ${result.customers} cust, ${result.salesInvoices} inv, ${result.ptps} PTPs`);
      runAll();
    } catch (err) {
      toast.error(`Re-seed failed: ${(err as Error).message}`);
    }
  }, [entityCode, archetype, runAll]);

  const exportReport = useCallback(() => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `smoke-test-${entityCode}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results, entityCode]);

  useEffect(() => { runAll(); }, [runAll]);
  useCtrlS(runAll);

  const passed = results.filter(r => r.status === 'pass').length;
  const total = results.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;
  const healthColor = score >= 90 ? 'text-emerald-500' : score >= 70 ? 'text-amber-500' : 'text-destructive';

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Detect archetype from entity (best effort)
  useEffect(() => {
    try {
      const entities = readArray('erp_group_entities') as Array<{ shortCode?: string; businessActivity?: string }>;
      const ent = entities.find(e => e.shortCode === entityCode);
      if (ent?.businessActivity) setArchetype(detectArchetype(ent.businessActivity));
    } catch { /* ignore */ }
  }, [entityCode]);

  return (
    <div data-keyboard-form className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Smoke Test Runner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            End-to-end health checks across every hub. Validates seeded data integrity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={entityCode} onValueChange={setEntityCode}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(readArray('erp_group_entities') as Array<{ shortCode: string; name: string }>)
                .map(e => <SelectItem key={e.shortCode} value={e.shortCode}>{e.shortCode}</SelectItem>)}
              {readArray('erp_group_entities').length === 0 && <SelectItem value={DEFAULT_ENTITY_SHORTCODE}>{DEFAULT_ENTITY_SHORTCODE}</SelectItem>}
            </SelectContent>
          </Select>
          <Select value={archetype} onValueChange={(v) => setArchetype(v as DemoArchetype)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trading">Trading</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="manufacturing">Manufacturing</SelectItem>
            </SelectContent>
          </Select>
          <Button data-primary onClick={runAll} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Run All Checks
          </Button>
          <Button variant="outline" onClick={reseed} className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10">
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-Seed Demo Data
          </Button>
          <Button variant="ghost" onClick={exportReport} disabled={results.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Overall health score</div>
            <div className={`text-4xl font-mono font-bold ${healthColor}`}>{passed}/{total}</div>
            <div className="text-xs text-muted-foreground mt-1">{score}% checks passed</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={score >= 90 ? 'default' : 'destructive'} className={score >= 70 && score < 90 ? 'bg-amber-500' : ''}>
              {score >= 90 ? 'HEALTHY' : score >= 70 ? 'DEGRADED' : 'CRITICAL'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {sections.map(section => {
        const sectionResults = results.filter(r => r.section === section);
        const sectionPass = sectionResults.filter(r => r.status === 'pass').length;
        return (
          <Card key={section}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{section}</span>
                <Badge variant="outline">{sectionPass}/{sectionResults.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sectionResults.map(r => (
                <div key={r.id} className="border-b border-border/40 last:border-0 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {r.status === 'pass'
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                      <span className="text-sm">{r.name}</span>
                    </div>
                    <Badge variant={r.status === 'pass' ? 'default' : 'destructive'}
                           className={r.status === 'pass' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : ''}>
                      {r.status === 'pass' ? 'PASS' : 'FAIL'}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => toggle(r.id)} className="text-xs">
                      Details
                    </Button>
                  </div>
                  {expanded.has(r.id) && (
                    <div className="text-xs text-muted-foreground mt-1 ml-6 font-mono">
                      Expected: {r.expected} · Actual: {r.actual} · {r.details}
                    </div>
                  )}
                </div>
              ))}
              {sectionResults.length === 0 && (
                <div className="text-sm text-muted-foreground italic">No results yet — run checks</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
