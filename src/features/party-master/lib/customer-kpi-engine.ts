/**
 * @file     customer-kpi-engine.ts
 * @purpose  Compute per-customer + per-sector KPIs from voucher history.
 *           Read-only aggregation — does NOT modify customer master.
 * @sprint   T-H1.5-C-S4.5
 * @finding  CC-058
 */

interface Voucher {
  id?: string;
  voucher_type?: string;
  voucher_date?: string;
  party_id?: string;
  amount?: number;
  payment_status?: 'paid' | 'partial' | 'unpaid' | 'overdue';
  days_late?: number;
  product_ids?: string[];
  gross_amount?: number;
  tax_amount?: number;
}

interface Outstanding {
  party_id?: string;
  invoice_amount?: number;
  paid_amount?: number;
  days_overdue?: number;
}

export interface CustomerKPI {
  partyId: string;
  revenueMTD: number;
  revenueYTD: number;
  lifetimeRevenue: number;
  outstandingAmount: number;
  daysSalesOutstanding: number;
  productsPurchasedCount: number;
  lastTransactionDate: string | null;
  healthStatus: 'green' | 'amber' | 'red' | 'new';
}

const monthStart = (): string => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const fyStart = (): string => {
  const d = new Date();
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${year}-04-01`;
};

function emptyKPI(partyId: string): CustomerKPI {
  return {
    partyId,
    revenueMTD: 0, revenueYTD: 0, lifetimeRevenue: 0,
    outstandingAmount: 0, daysSalesOutstanding: 0,
    productsPurchasedCount: 0,
    lastTransactionDate: null,
    healthStatus: 'new',
  };
}

export function computeCustomerKPIs(
  partyId: string,
  entityCode: string,
): CustomerKPI {
  if (!partyId || !entityCode) return emptyKPI(partyId);

  let vouchers: Voucher[] = [];
  let outstanding: Outstanding[] = [];

  try {
    // [JWT] GET /api/vouchers?party=:partyId&entity=:entityCode
    const raw = localStorage.getItem(`erp_group_vouchers_${entityCode}`);
    vouchers = raw ? JSON.parse(raw) : [];
  } catch { /* ignore */ }

  try {
    // [JWT] GET /api/outstanding?party=:partyId&entity=:entityCode
    const raw = localStorage.getItem(`erp_outstanding_${entityCode}`);
    outstanding = raw ? JSON.parse(raw) : [];
  } catch { /* ignore */ }

  const salesInvoices = vouchers.filter(v =>
    v.voucher_type === 'sales_invoice' && v.party_id === partyId);
  const partyOutstanding = outstanding.filter(o => o.party_id === partyId);

  if (salesInvoices.length === 0 && partyOutstanding.length === 0) {
    return emptyKPI(partyId);
  }

  const mtdCutoff = monthStart();
  const ytdCutoff = fyStart();

  const revenueMTD = salesInvoices
    .filter(v => (v.voucher_date ?? '') >= mtdCutoff)
    .reduce((s, v) => s + (v.amount ?? 0), 0);
  const revenueYTD = salesInvoices
    .filter(v => (v.voucher_date ?? '') >= ytdCutoff)
    .reduce((s, v) => s + (v.amount ?? 0), 0);
  const lifetimeRevenue = salesInvoices.reduce((s, v) => s + (v.amount ?? 0), 0);

  const outstandingAmount = partyOutstanding.reduce(
    (s, o) => s + ((o.invoice_amount ?? 0) - (o.paid_amount ?? 0)), 0);

  const paidInvoices = salesInvoices.filter(v =>
    v.payment_status === 'paid' || v.payment_status === 'partial');
  const daysSalesOutstanding = paidInvoices.length === 0
    ? 0
    : paidInvoices.reduce((s, v) => s + Math.max(0, v.days_late ?? 0), 0) / paidInvoices.length;

  const productSet = new Set<string>();
  for (const v of salesInvoices) {
    for (const p of v.product_ids ?? []) productSet.add(p);
  }

  const sortedByDate = [...salesInvoices].sort((a, b) =>
    (b.voucher_date ?? '').localeCompare(a.voucher_date ?? ''));
  const lastTransactionDate = sortedByDate[0]?.voucher_date ?? null;

  const anyOverdue = partyOutstanding.some(o => (o.days_overdue ?? 0) > 0);
  const longOverdue = partyOutstanding.some(o => (o.days_overdue ?? 0) > 60);

  let healthStatus: CustomerKPI['healthStatus'];
  if (salesInvoices.length === 0) healthStatus = 'new';
  else if (longOverdue || daysSalesOutstanding > 45) healthStatus = 'red';
  else if (anyOverdue || daysSalesOutstanding > 20) healthStatus = 'amber';
  else healthStatus = 'green';

  return {
    partyId,
    revenueMTD,
    revenueYTD,
    lifetimeRevenue,
    outstandingAmount,
    daysSalesOutstanding: Math.round(daysSalesOutstanding),
    productsPurchasedCount: productSet.size,
    lastTransactionDate,
    healthStatus,
  };
}

export interface NodeRollup {
  count: number;
  revenueMTD: number;
  revenueYTD: number;
  totalOutstanding: number;
  avgDSO: number;
  greenCount: number;
  amberCount: number;
  redCount: number;
  newCount: number;
}

export function rollupFromLeaves(leaves: CustomerKPI[]): NodeRollup {
  if (leaves.length === 0) {
    return {
      count: 0, revenueMTD: 0, revenueYTD: 0, totalOutstanding: 0, avgDSO: 0,
      greenCount: 0, amberCount: 0, redCount: 0, newCount: 0,
    };
  }
  const greenCount = leaves.filter(l => l.healthStatus === 'green').length;
  const amberCount = leaves.filter(l => l.healthStatus === 'amber').length;
  const redCount = leaves.filter(l => l.healthStatus === 'red').length;
  const newCount = leaves.filter(l => l.healthStatus === 'new').length;
  return {
    count: leaves.length,
    revenueMTD: leaves.reduce((s, l) => s + l.revenueMTD, 0),
    revenueYTD: leaves.reduce((s, l) => s + l.revenueYTD, 0),
    totalOutstanding: leaves.reduce((s, l) => s + l.outstandingAmount, 0),
    avgDSO: Math.round(leaves.reduce((s, l) => s + l.daysSalesOutstanding, 0) / leaves.length),
    greenCount, amberCount, redCount, newCount,
  };
}
