/**
 * @file        src/lib/export-dispatch-bridge.ts
 * @purpose     Bridge ExportPO → ExportDispatchMirror · multi-leg-git.ts STAYS 0-diff
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 */
import type { ExportDispatchMirror } from '@/types/export-dispatch-mirror';
import type { ExportPurchaseOrder } from '@/types/export-purchase-order';
import { exportDispatchMirrorKey } from '@/types/export-dispatch-mirror';

export function loadDispatchMirrors(entityCode: string): ExportDispatchMirror[] {
  try {
    const raw = localStorage.getItem(exportDispatchMirrorKey(entityCode));
    return raw ? (JSON.parse(raw) as ExportDispatchMirror[]) : [];
  } catch { return []; }
}

export function saveDispatchMirrors(entityCode: string, mirrors: ExportDispatchMirror[]): void {
  localStorage.setItem(exportDispatchMirrorKey(entityCode), JSON.stringify(mirrors));
}

export function generateDispatchMirror(exportPO: ExportPurchaseOrder): ExportDispatchMirror {
  const now = new Date().toISOString();
  const destination = exportPO.country_code;
  return {
    id: `edm-${exportPO.id}`, dispatch_mirror_no: `EDM-${exportPO.export_po_no}`,
    entity_id: exportPO.entity_id, related_export_po_id: exportPO.id,
    overall_state: 'planning',
    leg1: { leg_no: 1, state: 'pending', facility_name: 'Sinha Factory', factory_address: 'Mumbai · India', dispatch_date: null, notes: 'Origin warehouse' },
    leg2: { leg_no: 2, state: 'pending', port_code: exportPO.port_of_loading, port_arrival_date: null, port_dispatch_date: null, dwell_time_days: 0, notes: 'Origin port' },
    leg3: { leg_no: 3, state: 'pending', vessel_name: '', vessel_imo_no: '', voyage_no: '', shipping_line: '', sailing_date: null, arrival_date: null, notes: 'Vessel/flight' },
    leg4: { leg_no: 4, state: 'pending', port_code: '', port_arrival_date: null, customs_clearance_date: null, dwell_time_days: 0, notes: `Destination port (${destination})` },
    leg5: { leg_no: 5, state: 'pending', facility_name: '', buyer_address: '', delivery_date: null, proof_of_delivery_ref: '', notes: 'Foreign buyer warehouse' },
    origination_date: now, delivery_date: null,
    created_at: now, updated_at: now, notes: '',
  };
}

export function getDispatchMirror(entityCode: string, id: string): ExportDispatchMirror | null {
  return loadDispatchMirrors(entityCode).find((m) => m.id === id) ?? null;
}
