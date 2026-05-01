// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration (page title + chip)
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useT } from '@/lib/i18n-engine';
import {
  PackageOpen, ArrowRight, Warehouse, Truck,
  ScanLine, GitBranch, LayoutGrid, Clock, Network,
} from 'lucide-react';

const COMING_FEATURES = [
  {
    icon: PackageOpen,
    title: 'Goods Receipt (GRN)',
    desc: 'Record vendor deliveries, QC inspection routing and 3-way PO match',
  },
  {
    icon: Truck,
    title: 'Dispatch & Delivery',
    desc: 'Outward goods, dispatch notes, vehicle and transporter tracking',
  },
  {
    icon: GitBranch,
    title: 'Store-to-Store Transfers',
    desc: 'RM to WIP to FG to Dispatch store movements with department attribution',
  },
  {
    icon: Warehouse,
    title: 'Bin & Rack Management',
    desc: 'Zone, aisle, rack and bin allocation with pick-path optimisation',
  },
  {
    icon: ScanLine,
    title: 'Barcode & RFID Scanning',
    desc: 'Live scan-based GRN, picking and dispatch with mobile devices',
  },
  {
    icon: LayoutGrid,
    title: 'Stock Position Dashboard',
    desc: 'Real-time stock by godown, bin, batch and serial with aging',
  },
];

export function InventoryHubPanel() {
  const navigate = useNavigate();
  const t = useT();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-8">

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {t('inv.hub.title', 'Store Hub')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Physical warehouse and store operations
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-muted text-muted-foreground">
                <Clock className="h-3 w-3" />
                {t('common.loading', 'Coming in Sprint 26')}
              </span>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Store Hub covers all physical warehouse operations — inward receipts,
                outward dispatch, inter-store stock movements and bin-level tracking.
                Item masters, pricing, stock groups and parametric setup are managed
                in Command Center &rarr; Inventory Masters.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                {t('common.next', 'Available now')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => navigate('/erp/inventory-hub/bom-master')}
                  className="flex items-center justify-between p-4 rounded-xl
                    border border-border bg-card hover:bg-accent cursor-pointer
                    transition-colors"
                >
                  <div className="flex gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Network className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        BOM Master
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Bill of Materials for manufactured items — multi-level, versioned.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                What&apos;s coming in Store Hub
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {COMING_FEATURES.map(f => (
                  <div key={f.title} className="flex gap-3 p-4 rounded-xl border bg-card/60">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {f.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              onClick={() => navigate('/erp/command-center')}
              className="flex items-center justify-between p-4 rounded-xl
                border border-border bg-card hover:bg-accent cursor-pointer
                transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Item masters are in Command Center
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ItemCraft, Stock Groups, Pricing, UOM, Batch/Serial
                  tracking setup and Labels
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>

          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
export default function InventoryHub() { return <InventoryHubPanel />; }
