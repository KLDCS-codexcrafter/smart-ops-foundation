/**
 * InventoryHubSidebar.tsx — Inventory Hub left sidebar
 * Sprint T-Phase-1.2.1 · Tier 1 Card #2 sub-sprint 1/3 · mirrors ProjXSidebar pattern
 * Cyan/teal color scheme.
 */
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, ChevronRight,
  PackageOpen, ArrowDownToLine, ArrowUpFromLine,
  ListOrdered, AlertTriangle, FileText, BarChart3, Printer,
  Warehouse, Boxes, Layers, Flame, Grid3X3, Hash, MapPin, Repeat, Truck,
  TrendingUp, Replace, Recycle, Clock, ClipboardCheck, RotateCcw, Activity,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { InventoryHubModule } from './InventoryHubSidebar.types';

const LIVE_MODULES: InventoryHubModule[] = [
  'welcome',
  't-grn-entry', 't-material-issue', 't-consumption-entry',
  't-cycle-count', 't-rtv',
  'r-stock-ledger', 'r-reorder-alerts', 'r-grn-register', 'r-consumption-summary',
  'r-storage-slip', 'r-bin-slip', 'r-aged-git', 'r-slow-moving-dead',
  'r-bin-utilization', 'r-item-movement',
  'r-min-register', 'r-consumption-register', 'r-cycle-count-register', 'r-rtv-register',
  'm-item-master', 'm-godown-master', 'm-stock-groups',
  'm-heat-master', 'm-batch-grid', 'm-serial-grid', 'm-bin-labels',
  'm-reorder-matrix',
  'm-abc-classification', 'm-hazmat-profiles', 'm-substitute-master', 'm-returnable-packaging',
];

interface SidebarItem {
  id: InventoryHubModule;
  label: string;
  icon: React.ElementType;
  comingLabel?: string;
}

const TXN_ITEMS: SidebarItem[] = [
  { id: 't-grn-entry', label: 'GRN Entry', icon: ArrowDownToLine },
  { id: 't-material-issue', label: 'Material Issue Note', icon: ArrowUpFromLine },
  { id: 't-consumption-entry', label: 'Consumption Entry', icon: PackageOpen },
  { id: 't-cycle-count', label: 'Cycle Count', icon: ClipboardCheck },
  { id: 't-rtv', label: 'Return to Vendor', icon: RotateCcw },
];

const RPT_ITEMS: SidebarItem[] = [
  { id: 'r-stock-ledger', label: 'Stock Ledger', icon: ListOrdered },
  { id: 'r-reorder-alerts', label: 'Reorder Alerts', icon: AlertTriangle },
  { id: 'r-grn-register', label: 'GRN Register', icon: FileText },
  { id: 'r-consumption-summary', label: 'Consumption Summary', icon: BarChart3 },
  { id: 'r-storage-slip', label: 'Storage Slip', icon: Printer },
  { id: 'r-bin-slip', label: 'Bin Slip', icon: Printer },
  { id: 'r-aged-git', label: 'Aged Goods in Transit', icon: Truck },
  { id: 'r-slow-moving-dead', label: 'Slow-Moving / Dead Stock', icon: Clock },
  { id: 'r-bin-utilization', label: 'Bin Utilization', icon: Boxes },
  { id: 'r-item-movement', label: 'Item Movement History', icon: Activity },
  // Sprint T-Phase-1.2.6b · UTS register retrofits
  { id: 'r-min-register', label: 'MIN Register', icon: ListOrdered },
  { id: 'r-consumption-register', label: 'Consumption Register', icon: BarChart3 },
  { id: 'r-cycle-count-register', label: 'Cycle Count Register', icon: ClipboardCheck },
  { id: 'r-rtv-register', label: 'RTV Register', icon: RotateCcw },
];

const MAS_ITEMS: SidebarItem[] = [
  { id: 'm-item-master', label: 'Item Master', icon: Boxes },
  { id: 'm-godown-master', label: 'Godown Master', icon: Warehouse },
  { id: 'm-stock-groups', label: 'Stock Groups', icon: Layers },
  { id: 'm-heat-master', label: 'Heat Master', icon: Flame },
  { id: 'm-batch-grid', label: 'Batch Grid', icon: Grid3X3 },
  { id: 'm-serial-grid', label: 'Serial Grid', icon: Hash },
  { id: 'm-bin-labels', label: 'Bin Labels', icon: MapPin },
  { id: 'm-reorder-matrix', label: 'Reorder Matrix', icon: Repeat },
  { id: 'm-abc-classification', label: 'ABC Classification', icon: TrendingUp },
  { id: 'm-hazmat-profiles', label: 'Hazmat Profiles', icon: AlertTriangle },
  { id: 'm-substitute-master', label: 'Substitute Materials', icon: Replace },
  { id: 'm-returnable-packaging', label: 'Returnable Packaging', icon: Recycle },
];


interface InventoryHubSidebarProps {
  active: InventoryHubModule;
  onNavigate: (m: InventoryHubModule) => void;
}

export function InventoryHubSidebar({ active, onNavigate }: InventoryHubSidebarProps) {
  const [txnOpen, setTxnOpen] = useState(true);
  const [rptOpen, setRptOpen] = useState(false);
  const [masOpen, setMasOpen] = useState(false);

  useEffect(() => {
    if (active.startsWith('t-')) setTxnOpen(true);
    else if (active.startsWith('r-')) setRptOpen(true);
    else if (active.startsWith('m-')) setMasOpen(true);
  }, [active]);

  const isLive = (id: InventoryHubModule) => LIVE_MODULES.includes(id);

  const renderItem = (item: SidebarItem) => {
    const live = isLive(item.id);
    const isActive = active === item.id;
    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          onClick={() => live && onNavigate(item.id)}
          className={cn(
            'text-xs h-8 gap-2 transition-all',
            isActive && 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30',
            !live && 'opacity-50 cursor-not-allowed',
            live && !isActive && 'hover:bg-cyan-500/10 cursor-pointer',
          )}
        >
          <item.icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate flex-1">{item.label}</span>
          {!live && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground/60 shrink-0">
              {item.comingLabel ?? 'Soon'}
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
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 mb-3" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
            <Package className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="font-bold text-sm">Store Hub</p>
            <p className="text-[10px] text-muted-foreground">Inventory & Receipts</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2 space-y-2">
        <SidebarMenu className="px-3">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Welcome"
              onClick={() => onNavigate('welcome')}
              className={cn(
                'text-xs h-8 gap-2',
                active === 'welcome' && 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30',
                active !== 'welcome' && 'hover:bg-cyan-500/10',
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Welcome</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {renderSection('Transactions', TXN_ITEMS, txnOpen, setTxnOpen)}
        {renderSection('Reports', RPT_ITEMS, rptOpen, setRptOpen)}
        {renderSection('Masters', MAS_ITEMS, masOpen, setMasOpen)}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="h-6 w-6 rounded bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
            <Package className="h-3 w-3 text-cyan-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] font-semibold leading-tight">
              <span style={{ color: "hsl(24 95% 53%)" }}>Made</span>{" "}
              <span className="text-foreground">in</span>{" "}
              <span style={{ color: "hsl(145 63% 42%)" }}>India</span>
            </p>
            <p className="text-[9px] text-muted-foreground/60 leading-tight">4DSmartOps v0.1.0</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
