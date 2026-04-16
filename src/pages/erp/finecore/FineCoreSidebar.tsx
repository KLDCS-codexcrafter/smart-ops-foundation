/**
 * FineCoreSidebar.tsx — Fin Core left sidebar
 * Mirrors PayHubSidebar.tsx structure. Teal color scheme.
 * Masters section items are LINK-OUTS to Command Center.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, CreditCard, Wallet, BookOpen, ArrowLeftRight,
  FileCheck, FileMinus, Truck, PackageOpen, Package, ShoppingCart, ClipboardList,
  Landmark, Receipt, BarChart3, PieChart, TrendingUp, Scale, Layers,
  Shield, ChevronRight, ExternalLink, Calculator, IndianRupee, Globe, Table2,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { FineCoreModule } from '@/components/finecore/DraftTray';

const LIVE_MODULES: FineCoreModule[] = [
  'fc-hub',
  'fc-txn-sales-invoice', 'fc-txn-purchase-invoice',
  'fc-txn-receipt', 'fc-txn-payment',
  'fc-txn-journal', 'fc-txn-contra',
  'fc-txn-credit-note', 'fc-txn-debit-note',
  'fc-txn-delivery-note', 'fc-txn-receipt-note',
  'fc-inv-stock-journal',
  'fc-rpt-daybook', 'fc-rpt-ledger', 'fc-rpt-trial-balance',
  'fc-rpt-pl', 'fc-rpt-bs', 'fc-rpt-stock-summary', 'fc-rpt-outstanding',
  'fc-bnk-reconciliation', 'fc-bnk-cheque',
  'fc-out-receivables', 'fc-out-payables',
  'fc-tds-advance', 'fc-tds-analytics',
  'fc-rpt-24q', 'fc-rpt-26q', 'fc-rpt-27q', 'fc-rpt-challan', 'fc-rpt-26as',
  'fc-gst-gstr1', 'fc-gst-gstr3b', 'fc-gst-2a', 'fc-gst-itc',
  'fc-gst-gstr2', 'fc-gst-gstr9',
  'fc-audit-dashboard', 'fc-audit-3cd', 'fc-audit-clause44',
  'fc-fa-register', 'fc-fa-master', 'fc-fa-depreciation',
  'fc-fa-amc', 'fc-fa-disposal', 'fc-fa-cwip', 'fc-fa-reports',
];

interface SidebarItem {
  id: FineCoreModule;
  label: string;
  icon: React.ElementType;
}

interface LinkOutItem {
  label: string;
  icon: React.ElementType;
  hash: string;
}

const MASTERS_LINKS: LinkOutItem[] = [
  { label: 'FinFrame — Account Groups', icon: Layers, hash: '#finecore-finframe' },
  { label: 'Ledger Master', icon: BookOpen, hash: '#finecore-ledgers' },
  { label: 'Voucher Types', icon: FileText, hash: '#finecore-voucher-types' },
  { label: 'Currency Master', icon: IndianRupee, hash: '#finecore-currency' },
  { label: 'GST / TDS Config', icon: Shield, hash: '#finecore-gst-config' },
  { label: 'Comply360', icon: Shield, hash: '#finecore-comply360' },
];

const TXN_ITEMS: SidebarItem[] = [
  { id: 'fc-txn-sales-invoice', label: 'Sales Invoice', icon: FileText },
  { id: 'fc-txn-purchase-invoice', label: 'Purchase Invoice', icon: FileCheck },
  { id: 'fc-txn-receipt', label: 'Receipt', icon: CreditCard },
  { id: 'fc-txn-payment', label: 'Payment', icon: Wallet },
  { id: 'fc-txn-journal', label: 'Journal Entry', icon: BookOpen },
  { id: 'fc-txn-contra', label: 'Contra', icon: ArrowLeftRight },
  { id: 'fc-txn-credit-note', label: 'Credit Note', icon: FileMinus },
  { id: 'fc-txn-debit-note', label: 'Debit Note', icon: FileCheck },
  { id: 'fc-txn-delivery-note', label: 'Delivery Note', icon: Truck },
  { id: 'fc-txn-receipt-note', label: 'Receipt Note (GRN)', icon: PackageOpen },
];

const INV_ITEMS: SidebarItem[] = [
  { id: 'fc-inv-stock-journal', label: 'Stock Journal', icon: Package },
];

const ORDER_ITEMS: SidebarItem[] = [
  { id: 'fc-ord-purchase-order', label: 'Purchase Order', icon: ShoppingCart },
  { id: 'fc-ord-sales-order', label: 'Sales Order', icon: ClipboardList },
];

const BANKING_ITEMS: SidebarItem[] = [
  { id: 'fc-bnk-reconciliation', label: 'Bank Reconciliation', icon: Landmark },
  { id: 'fc-bnk-cheque', label: 'Cheque Management', icon: Receipt },
];

const OUTSTANDING_ITEMS: SidebarItem[] = [
  { id: 'fc-out-receivables', label: 'Receivables', icon: TrendingUp },
  { id: 'fc-out-payables', label: 'Payables', icon: TrendingUp },
];

const REPORT_ITEMS: SidebarItem[] = [
  { id: 'fc-rpt-daybook', label: 'Day Book', icon: BookOpen },
  { id: 'fc-rpt-ledger', label: 'Ledger Report', icon: BarChart3 },
  { id: 'fc-rpt-trial-balance', label: 'Trial Balance', icon: Scale },
  { id: 'fc-rpt-pl', label: 'Profit & Loss', icon: PieChart },
  { id: 'fc-rpt-bs', label: 'Balance Sheet', icon: BarChart3 },
  { id: 'fc-rpt-stock-summary', label: 'Stock Summary', icon: Package },
  { id: 'fc-rpt-outstanding', label: 'Outstanding Aging', icon: TrendingUp },
  { id: 'fc-rpt-26as', label: 'Form 26AS', icon: FileText },
  { id: 'fc-rpt-24q', label: 'Form 24Q (Salary)', icon: FileText },
  { id: 'fc-rpt-26q', label: 'Form 26Q (Non-salary)', icon: FileText },
  { id: 'fc-rpt-27q', label: 'Form 27Q (NRI)', icon: Globe },
  { id: 'fc-rpt-challan', label: 'Challan Management', icon: Receipt },
];

const GST_ITEMS: SidebarItem[] = [
  { id: 'fc-gst-gstr1', label: 'GSTR-1', icon: FileText },
  { id: 'fc-gst-gstr3b', label: 'GSTR-3B', icon: FileText },
  { id: 'fc-gst-2a', label: '2A Reconciliation', icon: ArrowLeftRight },
  { id: 'fc-gst-itc', label: 'ITC Register', icon: Calculator },
  { id: 'fc-gst-gstr2', label: 'GSTR-2 Purchase Register', icon: ShoppingCart },
  { id: 'fc-gst-gstr9', label: 'GSTR-9 Annual Return', icon: FileCheck },
];

const TDS_ITEMS: SidebarItem[] = [
  { id: 'fc-tds-advance', label: 'TDS Advance Tracking', icon: IndianRupee },
  { id: 'fc-tds-analytics', label: 'TDS Analytics Report', icon: BarChart3 },
];

const FA_ITEMS: SidebarItem[] = [
  { id: 'fc-fa-register', label: 'Asset Register', icon: Layers },
  { id: 'fc-fa-master', label: 'Asset Master', icon: Package },
  { id: 'fc-fa-depreciation', label: 'Depreciation Workings', icon: Calculator },
  { id: 'fc-fa-amc', label: 'AMC & Warranty', icon: Shield },
  { id: 'fc-fa-disposal', label: 'Asset Disposal', icon: FileText },
  { id: 'fc-fa-cwip', label: 'Capital WIP', icon: Package },
  { id: 'fc-fa-reports', label: 'FA Reports', icon: BarChart3 },
];

const AUDIT_ITEMS: SidebarItem[] = [
  { id: 'fc-audit-dashboard', label: 'Audit Dashboard', icon: LayoutDashboard },
  { id: 'fc-audit-3cd', label: 'Form 3CD', icon: FileText },
  { id: 'fc-audit-clause44', label: 'Clause 44 Report', icon: Table2 },
];

interface FineCoreSidebarProps {
  active: FineCoreModule;
  onNavigate: (m: FineCoreModule) => void;
}

export function FineCoreSidebar({ active, onNavigate }: FineCoreSidebarProps) {
  const navigate = useNavigate();
  const [mastersOpen, setMastersOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(true);
  const [invOpen, setInvOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [rptOpen, setRptOpen] = useState(false);
  const [gstOpen, setGstOpen] = useState(false);
  const [tdsOpen, setTdsOpen] = useState(false);
  const [faOpen, setFaOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const isLive = (id: FineCoreModule) => LIVE_MODULES.includes(id);

  const renderItem = (item: SidebarItem) => {
    const live = isLive(item.id);
    const isActive = active === item.id;
    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          onClick={() => live && onNavigate(item.id)}
          className={cn(
            'text-xs h-8 gap-2 transition-all',
            isActive && 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30',
            !live && 'opacity-50 cursor-not-allowed',
            live && !isActive && 'hover:bg-teal-500/10 cursor-pointer',
          )}
        >
          <item.icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate flex-1">{item.label}</span>
          {!live && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground/60 shrink-0">
              Soon
            </Badge>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderSection = (
    title: string, items: SidebarItem[], open: boolean, setOpen: (v: boolean) => void,
  ) => (
    <Collapsible open={open} onOpenChange={setOpen} className="px-2">
      <CollapsibleTrigger className="flex items-center gap-1 w-full px-2 py-1.5 group">
        <ChevronRight className={cn('h-3 w-3 text-muted-foreground/90 transition-transform', open && 'rotate-90')} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenu className="px-1 space-y-0.5">{items.map(renderItem)}</SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 mb-3" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-teal-500" />
          </div>
          <div>
            <p className="font-bold text-sm">Fin Core</p>
            <p className="text-[10px] text-muted-foreground">Accounting & Transactions</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2 space-y-2">
        {/* Hub */}
        <SidebarMenu className="px-3">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onNavigate('fc-hub')}
              className={cn(
                'text-xs h-8 gap-2',
                active === 'fc-hub' && 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30',
                active !== 'fc-hub' && 'hover:bg-teal-500/10',
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Hub Overview</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Masters — link-outs */}
        <Collapsible open={mastersOpen} onOpenChange={setMastersOpen} className="px-2">
          <CollapsibleTrigger className="flex items-center gap-1 w-full px-2 py-1.5 group">
            <ChevronRight className={cn('h-3 w-3 text-muted-foreground/90 transition-transform', mastersOpen && 'rotate-90')} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">Masters</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenu className="px-1 space-y-0.5">
              {MASTERS_LINKS.map(link => (
                <SidebarMenuItem key={link.hash}>
                  <SidebarMenuButton
                    onClick={() => navigate(`/erp/command-center${link.hash}`)}
                    className="text-xs h-8 gap-2 hover:bg-teal-500/10 cursor-pointer"
                  >
                    <link.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{link.label}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>

        {renderSection('Transactions', TXN_ITEMS, txnOpen, setTxnOpen)}
        {renderSection('Inventory', INV_ITEMS, invOpen, setInvOpen)}
        {renderSection('Orders', ORDER_ITEMS, orderOpen, setOrderOpen)}
        {renderSection('Banking', BANKING_ITEMS, bankOpen, setBankOpen)}
        {renderSection('Outstanding', OUTSTANDING_ITEMS, outOpen, setOutOpen)}
        {renderSection('Reports', REPORT_ITEMS, rptOpen, setRptOpen)}
        {renderSection('GST', GST_ITEMS, gstOpen, setGstOpen)}
        {renderSection('TDS / TCS', TDS_ITEMS, tdsOpen, setTdsOpen)}
        {renderSection('Fixed Assets', FA_ITEMS, faOpen, setFaOpen)}
        {renderSection('Tax Audit', AUDIT_ITEMS, auditOpen, setAuditOpen)}
      </SidebarContent>
    </Sidebar>
  );
}
