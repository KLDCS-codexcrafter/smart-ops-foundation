/**
 * @file   src/pages/erp/ecomx/EcomXWelcome.tsx
 * @sprint Sprint 153 · EcomX Channel Foundation
 */
import { Store, Boxes, Upload, Receipt, LayoutDashboard, Inbox } from 'lucide-react';
import type { EcomXModule } from './EcomXSidebar.types';

interface Props { onNavigate: (m: EcomXModule) => void; }

const TILES: Array<{ id: EcomXModule; label: string; desc: string; Icon: typeof Store }> = [
  { id: 'dashboard',     label: 'Dashboard',     desc: 'Channel KPIs · today at a glance',                    Icon: LayoutDashboard },
  { id: 'marketplaces',  label: 'Marketplaces',  desc: 'Amazon · Flipkart · Meesho · quick-commerce',         Icon: Store },
  { id: 'listings',      label: 'Listings',      desc: 'Simple + Kit listings · PIM-mapped',                  Icon: Boxes },
  { id: 'unmapped',      label: 'Unmapped SKUs', desc: 'Inbox · never silently dropped (DP-EC-4)',            Icon: Inbox },
  { id: 'import-center', label: 'Import Center', desc: 'Order-file ingestion → SalesX vouchers',              Icon: Upload },
  { id: 'orders',        label: 'Orders',        desc: 'Dual-layer register · B2C · B2B matched · parked',    Icon: Receipt },
];

export function EcomXWelcome({ onNavigate }: Props): JSX.Element {
  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in">
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">EcomX · Marketplace Commerce Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">
          MOAT #12 · ingest marketplace orders into real Sales Order vouchers · dual-layer
          (B2C consolidated · B2B matched · B2B parked) · idempotent commit.
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TILES.map(({ id, label, desc, Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className="glass-card rounded-2xl p-4 text-left hover:shadow-glow transition-shadow group"
          >
            <Icon className="h-5 w-5 text-primary mb-2" />
            <div className="font-medium">{label}</div>
            <div className="text-xs text-muted-foreground mt-1">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
