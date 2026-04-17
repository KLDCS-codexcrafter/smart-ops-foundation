/**
 * FineCoreHub.tsx — Fin Core landing dashboard with 8 KPIs, recent activity,
 * GST snapshot, debtor aging and quick entry shortcuts.
 * [JWT] All data via finance hooks
 */
import { useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';
import { useVouchers } from '@/hooks/useVouchers';
import { useJournal } from '@/hooks/useJournal';
import { useGSTRegister } from '@/hooks/useGSTRegister';
import { useOutstanding } from '@/hooks/useOutstanding';
import { useOrders } from '@/hooks/useOrders';
import { fyStart, today, inr, fmtDate } from './reports/reportUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, Wallet, AlertTriangle,
  FileText, CreditCard, BookOpen, ArrowLeftRight, ShoppingCart,
  ClipboardList, FileMinus, BarChart3,
  ArrowRight, Receipt,
} from 'lucide-react';

interface FineCoreHubPanelProps {
  onNavigate?: (module: string) => void;
}

const TYPE_STYLE: Record<string, string> = {
  Sales: 'bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  Purchase: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Receipt: 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Payment: 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Journal: 'bg-purple-50 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Contra: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Credit Note': 'bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Debit Note': 'bg-pink-50 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
};

function KpiCard({ label, value, sub, accent, warn }: {
  label: string; value: string; sub?: string; accent: string; warn?: boolean;
}) {
  return (
    <div className={`rounded-lg p-4 bg-card border border-border border-l-4 ${accent}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-semibold text-foreground leading-tight font-mono">{value}</p>
      {sub && <p className={`text-xs mt-1 ${warn ? 'text-destructive' : 'text-muted-foreground'}`}>{sub}</p>}
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, Admin';
  if (h < 17) return 'Good afternoon, Admin';
  return 'Good evening, Admin';
}

function nextMonth20th(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(20);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const QUICK_ENTRIES: Array<{
  module: string; label: string; icon: React.ElementType; accent: string;
}> = [
  { module: 'fc-txn-sales-invoice',    label: 'Sales Invoice',    icon: FileText,    accent: 'text-teal-500 bg-teal-500/10' },
  { module: 'fc-txn-purchase-invoice', label: 'Purchase Invoice', icon: FileMinus,   accent: 'text-amber-500 bg-amber-500/10' },
  { module: 'fc-txn-receipt',          label: 'Receipt',          icon: CreditCard,  accent: 'text-blue-500 bg-blue-500/10' },
  { module: 'fc-txn-payment',          label: 'Payment',          icon: Wallet,      accent: 'text-red-500 bg-red-500/10' },
  { module: 'fc-txn-journal',          label: 'Journal',          icon: BookOpen,    accent: 'text-purple-500 bg-purple-500/10' },
  { module: 'fc-ord-sales-order',      label: 'Sales Order',      icon: ClipboardList, accent: 'text-green-500 bg-green-500/10' },
];

export function FineCoreHubPanel({ onNavigate }: FineCoreHubPanelProps = {}) {
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all' ? selectedCompany : 'SMRT';

  const { vouchers } = useVouchers(entityCode);
  const { getTrialBalanceAsOf, getLedgerBalance } = useJournal(entityCode);
  const { getGSTR1Data, getITCSummary } = useGSTRegister(entityCode);
  const { entries: outstanding, getAging } = useOutstanding(entityCode);
  const { listOrders } = useOrders(entityCode);

  const todayStr = today();
  const monthPrefix = todayStr.slice(0, 7);
  // fyStart kept available for future expansion
  void fyStart;

  const mtdRevenue = useMemo(() => vouchers
    .filter(v => !v.is_cancelled && v.status === 'posted'
      && v.date.startsWith(monthPrefix) && v.base_voucher_type === 'Sales')
    .reduce((s, v) => s + v.net_amount, 0), [vouchers, monthPrefix]);

  const mtdExpenses = useMemo(() => vouchers
    .filter(v => !v.is_cancelled && v.status === 'posted'
      && v.date.startsWith(monthPrefix) && v.base_voucher_type === 'Purchase')
    .reduce((s, v) => s + v.net_amount, 0), [vouchers, monthPrefix]);

  const cashBank = useMemo(() => {
    const tb = getTrialBalanceAsOf(todayStr);
    return tb.filter(r => r.ledgerGroupCode === 'CASH' || r.ledgerGroupCode === 'BANK')
      .reduce((s, r) => s + (r.dr - r.cr), 0);
  }, [getTrialBalanceAsOf, todayStr]);

  const receivables = useMemo(() => outstanding
    .filter(e => e.party_type === 'debtor' && (e.status === 'open' || e.status === 'partial'))
    .reduce((s, e) => s + e.pending_amount, 0), [outstanding]);
  const overdueRec = useMemo(() => outstanding
    .filter(e => e.party_type === 'debtor' && (e.status === 'open' || e.status === 'partial') && e.due_date < todayStr)
    .reduce((s, e) => s + e.pending_amount, 0), [outstanding, todayStr]);
  const payables = useMemo(() => outstanding
    .filter(e => e.party_type === 'creditor' && (e.status === 'open' || e.status === 'partial'))
    .reduce((s, e) => s + e.pending_amount, 0), [outstanding]);
  const overduePay = useMemo(() => outstanding
    .filter(e => e.party_type === 'creditor' && (e.status === 'open' || e.status === 'partial') && e.due_date < todayStr)
    .reduce((s, e) => s + e.pending_amount, 0), [outstanding, todayStr]);

  const gstLiability = useMemo(() => {
    const data = getGSTR1Data(monthPrefix);
    const itc = getITCSummary(monthPrefix);
    const collected = data.reduce((s, e) => s + e.cgst_amount + e.sgst_amount + e.igst_amount, 0);
    const itcTotal = itc.totalCGST + itc.totalSGST + itc.totalIGST;
    return Math.max(0, collected - itcTotal);
  }, [getGSTR1Data, getITCSummary, monthPrefix]);

  const tdsPayable = useMemo(() => {
    const { balance } = getLedgerBalance('TDSP-000001');
    return Math.max(0, balance);
  }, [getLedgerBalance]);

  const recentActivity = useMemo(() => [...vouchers]
    .filter(v => !v.is_cancelled)
    .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1))
    .slice(0, 8), [vouchers]);

  const draftCount = useMemo(() => vouchers.filter(v => v.status === 'draft').length, [vouchers]);

  const lastEntry = useMemo(() => {
    if (!vouchers.length) return '';
    const latest = [...vouchers].sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1))[0];
    const d = new Date(latest.updated_at);
    const isToday = latest.updated_at.startsWith(todayStr);
    return isToday
      ? 'Today ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
      : fmtDate(latest.updated_at.slice(0, 10));
  }, [vouchers, todayStr]);

  const debtorAging = useMemo(() => {
    const aged = getAging(todayStr).filter(e => e.party_type === 'debtor');
    const b0  = aged.filter(e => e.ageDays <= 30).reduce((s, e) => s + e.pending_amount, 0);
    const b31 = aged.filter(e => e.ageDays > 30 && e.ageDays <= 60).reduce((s, e) => s + e.pending_amount, 0);
    const b60 = aged.filter(e => e.ageDays > 60).reduce((s, e) => s + e.pending_amount, 0);
    const total = b0 + b31 + b60 || 1;
    return {
      b0, b31, b60,
      w0:  Math.round((b0 / total) * 100),
      w31: Math.round((b31 / total) * 100),
      w60: Math.round((b60 / total) * 100),
    };
  }, [getAging, todayStr]);

  const openPOs = useMemo(() => listOrders({ base_voucher_type: 'Purchase Order', status: 'open' }).length +
    listOrders({ base_voucher_type: 'Purchase Order', status: 'partial' }).length, [listOrders]);
  const openSOs = useMemo(() => listOrders({ base_voucher_type: 'Sales Order', status: 'open' }).length +
    listOrders({ base_voucher_type: 'Sales Order', status: 'partial' }).length, [listOrders]);

  const gstSnapshot = useMemo(() => {
    const itc = getITCSummary(monthPrefix);
    const sales = getGSTR1Data(monthPrefix);
    const taxableOut = sales.reduce((s, e) => s + e.taxable_value, 0);
    const cgst = sales.reduce((s, e) => s + e.cgst_amount, 0);
    const sgst = sales.reduce((s, e) => s + e.sgst_amount, 0);
    const itcTotal = itc.totalCGST + itc.totalSGST + itc.totalIGST;
    return { taxableOut, cgst, sgst, itcTotal, net: Math.max(0, cgst + sgst - itcTotal) };
  }, [getGSTR1Data, getITCSummary, monthPrefix]);

  const grossProfit = mtdRevenue - mtdExpenses;
  const margin = mtdRevenue > 0 ? Math.round((grossProfit / mtdRevenue) * 1000) / 10 : 0;
  const subText = mtdRevenue > 0 ? `${margin}% margin` : 'Awaiting revenue';

  const todayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const contextLine = [
    todayDate,
    lastEntry ? 'Last entry: ' + lastEntry : '',
    draftCount > 0 ? draftCount + ' drafts pending' : '',
  ].filter(Boolean).join(' · ');

  return (
    <div data-keyboard-form className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Context bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{getGreeting()}</h1>
          <p className="text-sm text-muted-foreground mt-1">Fin Core · {contextLine}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('fc-rpt-daybook')}>
            <BookOpen className="h-3.5 w-3.5 mr-1" /> Day Book
          </Button>
          <Button data-primary size="sm" onClick={() => onNavigate?.('fc-txn-sales-invoice')}>
            <FileText className="h-3.5 w-3.5 mr-1" /> + New Voucher
          </Button>
        </div>
      </div>

      {/* SECTION 2 — Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Revenue MTD"   value={inr(mtdRevenue)}  sub="Sales invoices this month"     accent="border-l-teal-500" />
        <KpiCard label="Expenses MTD"  value={inr(mtdExpenses)} sub="Purchase invoices this month"  accent="border-l-amber-500" />
        <KpiCard label="Gross profit"  value={inr(grossProfit)} sub={subText}                        accent="border-l-green-600" warn={grossProfit < 0} />
        <KpiCard label="Cash & bank"   value={inr(cashBank)}    sub="As of today"                    accent="border-l-blue-500" />
      </div>

      {/* SECTION 3 — Balance KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Receivables"   value={inr(receivables)} sub={overdueRec > 0 ? `${inr(overdueRec)} overdue` : 'All current'} accent="border-l-orange-500" warn={overdueRec > 0} />
        <KpiCard label="Payables"      value={inr(payables)}    sub={overduePay > 0 ? `${inr(overduePay)} overdue` : 'All current'} accent="border-l-red-400"    warn={overduePay > 0} />
        <KpiCard label="GST liability" value={inr(gstLiability)} sub={`GSTR-3B ${nextMonth20th()}`}  accent="border-l-purple-500" />
        <KpiCard label="TDS payable"   value={inr(tdsPayable)}   sub="Due 7th next month"            accent="border-l-indigo-500" />
      </div>

      {/* SECTION 4 — Recent activity + Quick entry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
              <button
                onClick={() => onNavigate?.('fc-rpt-daybook')}
                className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
              >
                View Day Book <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground">No vouchers posted yet</p>
            ) : (
              <div className="space-y-1.5">
                {recentActivity.map(v => (
                  <div key={v.id} className="flex items-center gap-2 text-xs">
                    <Badge className={`text-[9px] px-1.5 py-0 h-4 ${TYPE_STYLE[v.base_voucher_type] ?? 'bg-muted text-muted-foreground'}`}>
                      {v.base_voucher_type}
                    </Badge>
                    <span className="font-mono text-[11px] truncate w-24">{v.voucher_no}</span>
                    <span className="truncate flex-1 text-muted-foreground">{v.party_name ?? '—'}</span>
                    <span className="font-mono text-[11px] text-foreground shrink-0">{inr(v.net_amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Quick entry</h3>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ENTRIES.map(q => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.module}
                    onClick={() => onNavigate?.(q.module)}
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 hover:bg-accent transition-colors"
                  >
                    <span className={`h-8 w-8 rounded-md flex items-center justify-center ${q.accent}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[10px] text-foreground text-center leading-tight">{q.label}</span>
                  </button>
                );
              })}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Open orders</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onNavigate?.('fc-ord-purchase-order')}
                  className="rounded-lg border border-border p-3 text-left hover:bg-accent transition-colors"
                >
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> Purchase Orders</p>
                  <p className="text-lg font-bold font-mono text-foreground">{openPOs}</p>
                </button>
                <button
                  onClick={() => onNavigate?.('fc-ord-sales-order')}
                  className="rounded-lg border border-border p-3 text-left hover:bg-accent transition-colors"
                >
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><ClipboardList className="h-3 w-3" /> Sales Orders</p>
                  <p className="text-lg font-bold font-mono text-foreground">{openSOs}</p>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 5 — GST snapshot + Aging */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-purple-500" />
                GST snapshot — {monthPrefix}
              </h3>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                GSTR-3B due
              </Badge>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxable outward</span>
                <span className="font-mono text-foreground">{inr(gstSnapshot.taxableOut)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CGST collected</span>
                <span className="font-mono text-foreground">{inr(gstSnapshot.cgst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SGST collected</span>
                <span className="font-mono text-foreground">{inr(gstSnapshot.sgst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ITC available</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">{inr(gstSnapshot.itcTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5">
                <span className="font-semibold">Net GST payable</span>
                <span className={`font-mono font-semibold ${gstSnapshot.net > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {inr(gstSnapshot.net)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              Outstanding aging — debtors
            </h3>
            {[
              { label: '0–30 days',  amount: debtorAging.b0,  width: debtorAging.w0,  color: 'bg-teal-500' },
              { label: '31–60 days', amount: debtorAging.b31, width: debtorAging.w31, color: 'bg-amber-500' },
              { label: '60+ days',   amount: debtorAging.b60, width: debtorAging.w60, color: 'bg-red-500' },
            ].map(row => (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-mono text-foreground">{inr(row.amount)}</span>
                </div>
                <div className="h-1.5 bg-muted rounded overflow-hidden">
                  <div style={{ width: row.width + '%' }} className={`h-1.5 ${row.color} rounded`} />
                </div>
              </div>
            ))}
            {debtorAging.b60 > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-destructive pt-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Debtors over 60 days require follow-up</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer hint kept compact */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <ArrowLeftRight className="h-3 w-3" />
        <span>Use the sidebar Masters group to manage ledgers, GST config and Comply360</span>
        <TrendingUp className="h-3 w-3 ml-auto" />
      </div>
    </div>
  );
}

export default function FineCoreHub() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[
          { label: 'Fin Core', href: '/erp/finecore' },
        ]} showDatePicker={false} showCompany={false} />
        <main>
          <FineCoreHubPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
