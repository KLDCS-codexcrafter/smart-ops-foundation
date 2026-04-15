/**
 * FineCoreHub.tsx — FineCore transaction register landing page
 * [JWT] Voucher stats will move to GET /api/accounting/dashboard
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Card, CardContent } from '@/components/ui/card';
import { vouchersKey } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';

const ENTITY = 'SMRT';

interface VoucherShortcut {
  name: string;
  path: string;
  family: 'Accounting' | 'Inventory';
}

const SHORTCUTS: VoucherShortcut[] = [
  { name: 'Sales Invoice', path: '/erp/accounting/vouchers/sales-invoice', family: 'Accounting' },
  { name: 'Purchase Invoice', path: '/erp/accounting/vouchers/purchase-invoice', family: 'Accounting' },
  { name: 'Receipt', path: '/erp/accounting/vouchers/receipt', family: 'Accounting' },
  { name: 'Payment', path: '/erp/accounting/vouchers/payment', family: 'Accounting' },
  { name: 'Journal Entry', path: '/erp/accounting/vouchers/journal', family: 'Accounting' },
  { name: 'Contra', path: '/erp/accounting/vouchers/contra', family: 'Accounting' },
  { name: 'Credit Note', path: '/erp/accounting/vouchers/credit-note', family: 'Accounting' },
  { name: 'Debit Note', path: '/erp/accounting/vouchers/debit-note', family: 'Accounting' },
  { name: 'Delivery Note', path: '/erp/accounting/vouchers/delivery-note', family: 'Inventory' },
  { name: 'Receipt Note (GRN)', path: '/erp/accounting/vouchers/receipt-note', family: 'Inventory' },
  { name: 'Stock Transfer', path: '/erp/accounting/vouchers/stock-transfer', family: 'Inventory' },
];

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/accounting/vouchers
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function FineCoreHubPanel() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ today: 0, drafts: 0, posted: 0, cancelled: 0 });

  useEffect(() => {
    // [JWT] GET /api/accounting/dashboard/stats
    const vouchers = ls<Voucher>(vouchersKey(ENTITY));
    const todayStr = new Date().toISOString().split('T')[0];
    setStats({
      today: vouchers.filter(v => v.date === todayStr).length,
      drafts: vouchers.filter(v => v.status === 'draft').length,
      posted: vouchers.filter(v => v.status === 'posted' && v.date === todayStr).length,
      cancelled: vouchers.filter(v => v.is_cancelled || v.status === 'cancelled').length,
    });
  }, []);

  const accounting = SHORTCUTS.filter(s => s.family === 'Accounting');
  const inventory = SHORTCUTS.filter(s => s.family === 'Inventory');

  return (
    <div data-keyboard-form className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">FineCore — Transaction Register</h1>
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
                onClick={() => navigate(s.path)}
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
                onClick={() => navigate(s.path)}
                className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
              >
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.family}</p>
              </div>
            ))}
          </div>
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
          { label: 'FineCore', href: '/erp/finecore' },
        ]} showDatePicker={false} showCompany={false} />
        <main>
          <FineCoreHubPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
