/**
 * FineCoreHub.tsx — FineCore transaction register landing page
 * [JWT] Voucher stats will move to GET /api/accounting/dashboard
 */
import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { vouchersKey } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';

interface FineCoreHubPanelProps {
  onNavigate?: (module: string) => void;
}

interface VoucherShortcut { name: string; module: string; family: string; }

const SHORTCUTS: VoucherShortcut[] = [
  { name: 'Sales Invoice', module: 'fc-txn-sales-invoice', family: 'Accounting' },
  { name: 'Purchase Invoice', module: 'fc-txn-purchase-invoice', family: 'Accounting' },
  { name: 'Receipt', module: 'fc-txn-receipt', family: 'Accounting' },
  { name: 'Payment', module: 'fc-txn-payment', family: 'Accounting' },
  { name: 'Journal Entry', module: 'fc-txn-journal', family: 'Accounting' },
  { name: 'Contra', module: 'fc-txn-contra', family: 'Accounting' },
  { name: 'Credit Note', module: 'fc-txn-credit-note', family: 'Accounting' },
  { name: 'Debit Note', module: 'fc-txn-debit-note', family: 'Accounting' },
  { name: 'Delivery Note', module: 'fc-txn-delivery-note', family: 'Inventory' },
  { name: 'Receipt Note (GRN)', module: 'fc-txn-receipt-note', family: 'Inventory' },
  { name: 'Purchase Order', module: 'fc-ord-purchase-order', family: 'Orders' },
  { name: 'Sales Order', module: 'fc-ord-sales-order', family: 'Orders' },
];

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/accounting/vouchers
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function FineCoreHubPanel({ onNavigate }: FineCoreHubPanelProps = {}) {
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all' ? selectedCompany : 'SMRT';
  const [stats, setStats] = useState({ today: 0, drafts: 0, posted: 0, cancelled: 0 });

  useEffect(() => {
    // [JWT] GET /api/accounting/dashboard/stats
    const vouchers = ls<Voucher>(vouchersKey(entityCode));
    const todayStr = new Date().toISOString().split('T')[0];
    setStats({
      today: vouchers.filter(v => v.date === todayStr).length,
      drafts: vouchers.filter(v => v.status === 'draft').length,
      posted: vouchers.filter(v => v.status === 'posted' && v.date === todayStr).length,
      cancelled: vouchers.filter(v => v.is_cancelled || v.status === 'cancelled').length,
    });
  }, [entityCode]);

  const accounting = SHORTCUTS.filter(s => s.family === 'Accounting');
  const inventory = SHORTCUTS.filter(s => s.family === 'Inventory' || s.family === 'Orders');

  return (
    <div data-keyboard-form className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fin Core — Transaction Register</h1>
        <p className="text-sm text-muted-foreground">Post, view and manage all accounting and inventory vouchers</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Vouchers", value: stats.today },
          { label: 'Drafts Pending', value: stats.drafts },
          { label: 'Posted Today', value: stats.posted },
          { label: 'Cancelled', value: stats.cancelled },
        ].map(s => (
          <Card key={s.label} className="bg-card border rounded-lg">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Voucher shortcuts */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">New Voucher</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {accounting.map(s => (
              <div
                key={s.name}
                onClick={() => onNavigate?.(s.module)}
                className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
              >
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.family}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {inventory.map(s => (
              <div
                key={s.name}
                onClick={() => onNavigate?.(s.module)}
                className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
              >
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.family}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accounting Setup */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Accounting Setup</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Configure ledgers, tax rates, compliance and voucher types.
          Full setup is available in Command Center.
        </p>
        <div
          onClick={() => onNavigate?.('fc-hub')}
          className="border rounded-lg p-4 hover:bg-accent cursor-pointer
            transition-colors flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">
              Compliance & COA
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              FinFrame, Ledger Master, Tax Rates, GST Config,
              Comply360, Voucher Types
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
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
