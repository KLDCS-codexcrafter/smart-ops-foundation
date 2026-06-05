/**
 * @file   src/pages/erp/ecomx/dashboard/EcomXDashboardPage.tsx
 * @sprint Sprint 153 · EcomX · channel KPIs (entity-scoped)
 */
import { useMemo } from 'react';
import { getImportStats } from '@/lib/ecomx-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

export function EcomXDashboardPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const stats = useMemo(
    () => entityCode ? getImportStats(entityCode) : { marketplacesActive: 0, listingsLive: 0, unmappedInbox: 0, ordersBooked: 0, parkedB2B: 0 },
    [entityCode],
  );
  if (!entityCode) {
    return <div className="p-6 text-sm text-muted-foreground">Select an entity to view EcomX dashboard.</div>;
  }

  const cards: Array<{ label: string; value: number }> = [
    { label: 'Marketplaces · Active', value: stats.marketplacesActive },
    { label: 'Listings · Live',       value: stats.listingsLive },
    { label: 'Unmapped Inbox',        value: stats.unmappedInbox },
    { label: 'Orders Booked',         value: stats.ordersBooked },
    { label: 'Parked B2B',            value: stats.parkedB2B },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-semibold mb-1">EcomX Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">Entity {entityCode} · channel posture (honest counts only).</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="glass-card rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="text-2xl font-mono mt-2">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
