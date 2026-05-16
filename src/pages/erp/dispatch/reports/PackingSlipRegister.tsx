/**
 * PackingSlipRegister.tsx — UPRA-1 Phase A · T1-4
 * Sidebar route: dh-r-packing-slip
 *
 * Print NOTE: existing src/pages/erp/dispatch/transactions/PackingSlipPrint.tsx exports
 * PackingSlipPrintPanel — a full DLN-picker UI, not a single-slip renderer. It is NOT
 * shape-compatible with a register row print. STOP-AND-RAISE noted in close summary:
 * a new print/PackingSlipPrint.tsx (record-shaped) was created instead, preserving the
 * existing transactions/PackingSlipPrint.tsx 0-diff.
 *
 * [JWT] GET /api/dispatch/packing-slips/:entityCode
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import { packingSlipsKey, type PackingSlip, type PackingSlipStatus } from '@/types/packing-slip';
import { dSum } from '@/lib/decimal-helpers';
import { PackingSlipDetailPanel } from './detail/PackingSlipDetailPanel';
import { PackingSlipPrint } from './print/PackingSlipPrint';

const STATUS_LABELS: Record<PackingSlipStatus, string> = {
  draft: 'Draft', printed: 'Printed', packed: 'Packed', dispatched: 'Dispatched',
};

function seedIfEmpty(entity: string): void {
  try {
    if (localStorage.getItem(packingSlipsKey(entity))) return;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const seed: PackingSlip[] = [
      {
        id: 'ps-seed-1', entity_id: entity, fiscal_year_id: 'FY-2025-26',
        dln_voucher_id: 'dln-1', dln_voucher_no: 'DLN/25-26/0001', dln_date: today,
        party_id: null, party_name: 'Sharma Traders',
        ship_to_address: '12 Industrial Estate', ship_to_city: 'Mumbai',
        ship_to_state: 'Maharashtra', ship_to_pincode: '400001',
        lines: [{
          id: 'l1', dln_line_id: 'dl1', item_id: 'i1', item_code: 'SKU-001',
          item_name: 'Steel Rod 12mm', qty: 50, uom: 'KG', godown_id: 'gd-1',
          full_cartons: 5, loose_packs: 0, total_gross_kg: 250, total_volumetric_kg: 80,
        }],
        total_full_cartons: 5, total_loose_packs: 0, total_gross_kg: 250, total_volumetric_kg: 80,
        transporter_id: null, transporter_name: 'Speedy Carriers', vehicle_no: 'MH-12-AB-1234',
        generated_at: now, generated_by: 'dispatch-clerk', printed_count: 1, status: 'dispatched',
      },
      {
        id: 'ps-seed-2', entity_id: entity, fiscal_year_id: 'FY-2025-26',
        dln_voucher_id: 'dln-2', dln_voucher_no: 'DLN/25-26/0002', dln_date: today,
        party_id: null, party_name: 'Gupta Enterprises',
        ship_to_address: '7 Market Rd', ship_to_city: 'Pune',
        ship_to_state: 'Maharashtra', ship_to_pincode: '411001',
        lines: [{
          id: 'l1', dln_line_id: 'dl1', item_id: 'i2', item_code: 'SKU-002',
          item_name: 'Cement OPC 50kg', qty: 200, uom: 'BAG', godown_id: 'gd-1',
          full_cartons: 0, loose_packs: 200, total_gross_kg: 10000, total_volumetric_kg: 1200,
        }],
        total_full_cartons: 0, total_loose_packs: 200, total_gross_kg: 10000, total_volumetric_kg: 1200,
        transporter_id: null, transporter_name: 'Reliable Logistics', vehicle_no: 'MH-14-CD-5678',
        generated_at: now, generated_by: 'dispatch-clerk', printed_count: 0, status: 'packed',
      },
      {
        id: 'ps-seed-3', entity_id: entity, fiscal_year_id: 'FY-2025-26',
        dln_voucher_id: 'dln-3', dln_voucher_no: 'DLN/25-26/0003', dln_date: today,
        party_id: null, party_name: 'Patel Hardware',
        ship_to_address: 'Old Bazaar', ship_to_city: 'Nashik',
        ship_to_state: 'Maharashtra', ship_to_pincode: '422001',
        lines: [{
          id: 'l1', dln_line_id: 'dl1', item_id: 'i3', item_code: 'SKU-003',
          item_name: 'PVC Pipe 1in', qty: 500, uom: 'MTR', godown_id: 'gd-1',
          full_cartons: 10, loose_packs: 0, total_gross_kg: 100, total_volumetric_kg: 250,
        }],
        total_full_cartons: 10, total_loose_packs: 0, total_gross_kg: 100, total_volumetric_kg: 250,
        transporter_id: null, transporter_name: 'Speedy Carriers', vehicle_no: 'MH-15-EF-9012',
        generated_at: now, generated_by: 'dispatch-clerk', printed_count: 0, status: 'draft',
      },
    ];
    localStorage.setItem(packingSlipsKey(entity), JSON.stringify(seed));
  } catch { /* quota silent */ }
}

export function PackingSlipRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<PackingSlip | null>(null);
  const [printing, setPrinting] = useState<PackingSlip | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const rows = useMemo<PackingSlip[]>(() => {
    try { return JSON.parse(localStorage.getItem(packingSlipsKey(safeEntity)) || '[]') as PackingSlip[]; }
    catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEntity, tick]);

  const meta: RegisterMeta<PackingSlip> = {
    registerCode: 'packing_slip_register',
    title: 'Packing Slip Register',
    description: 'Auto-generated packing slips · cartons + dimensional weight',
    dateAccessor: r => r.dln_date,
  };

  const columns: RegisterColumn<PackingSlip>[] = [
    { key: 'no', label: 'Slip ID', clickable: true, render: r => r.id, exportKey: 'id' },
    { key: 'dln', label: 'DLN No', render: r => r.dln_voucher_no, exportKey: 'dln_voucher_no' },
    { key: 'date', label: 'Date', render: r => r.dln_date, exportKey: 'dln_date' },
    { key: 'party', label: 'Party', render: r => r.party_name, exportKey: 'party_name' },
    { key: 'dest', label: 'Destination', render: r => `${r.ship_to_city}, ${r.ship_to_state}`, exportKey: r => `${r.ship_to_city}, ${r.ship_to_state}` },
    { key: 'cartons', label: 'Full Ctn', align: 'right', render: r => r.total_full_cartons, exportKey: 'total_full_cartons' },
    { key: 'loose', label: 'Loose', align: 'right', render: r => r.total_loose_packs, exportKey: 'total_loose_packs' },
    { key: 'kg', label: 'Gross Kg', align: 'right', render: r => r.total_gross_kg, exportKey: 'total_gross_kg' },
    { key: 'transporter', label: 'Transporter', render: r => r.transporter_name ?? '—', exportKey: r => r.transporter_name ?? '' },
    { key: 'status', label: 'Status', render: r => (
      <Badge variant="outline" className="text-[10px] capitalize">{STATUS_LABELS[r.status]}</Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as PackingSlipStatus[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: PackingSlip[]): SummaryCard[] => [
    { label: 'Total Slips', value: String(f.length) },
    { label: 'Dispatched', value: String(f.filter(r => r.status === 'dispatched').length), tone: 'positive' },
    { label: 'Draft', value: String(f.filter(r => r.status === 'draft').length), tone: 'warning' },
    { label: 'Total Cartons', value: String(dSum(f, r => r.total_full_cartons + r.total_loose_packs)) },
    { label: 'Total Gross Kg', value: String(dSum(f, r => r.total_gross_kg)) },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<PackingSlip>
        entityCode={safeEntity}
        meta={meta}
        rows={rows}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="status"
        summaryBuilder={summaryBuilder}
        onNavigateToRecord={setSelected}
      />
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && <PackingSlipDetailPanel slip={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <PackingSlipPrint slip={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PackingSlipRegisterPanel;
