import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ArrowRight, Settings2, Grid3X3, Hash } from 'lucide-react';

const INV_CARDS = [
  {
    title: 'Parametric Hub',
    desc: 'Parameter templates, stock group assignments and attribute library',
    icon: Settings2, href: '/erp/inventory-hub/parametric',
  },
  {
    title: 'Batch Grid',
    desc: 'Batch tracking, lot numbers, supplier batches, QC hold and expiry management',
    icon: Grid3X3, href: '/erp/inventory-hub/batch-grid',
  },
  {
    title: 'Serial Grid',
    desc: 'Serial number tracking, IMEI, warranty and individual unit lifecycle',
    icon: Hash, href: '/erp/inventory-hub/serial-grid',
  },
];

export default function InventoryHub() {
  const navigate = useNavigate();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Inventory Hub</h1>
              <p className="text-sm text-muted-foreground">
                A.1 Parameter & Tracking — Stock Matrix, Batch, Serial
              </p>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                A.1 — Parameter & Tracking
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {INV_CARDS.map(c => (
                  <button key={c.title} onClick={() => navigate(c.href)}
                    className="group flex flex-col gap-3 p-5 rounded-xl border bg-card
                    hover:border-primary/40 hover:bg-accent/30 transition-all text-left">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <c.icon className="h-5 w-5 text-primary" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
