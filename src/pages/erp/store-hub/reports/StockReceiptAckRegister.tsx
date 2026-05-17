/**
 * StockReceiptAckRegister.tsx — UPRA-3 Phase A Step 2 · Tier-1 NEW Register #3
 * Canonical UniversalRegisterGrid<StockReceiptAck>.
 * Sidebar module: sh-r-stock-receipt-ack-register
 * [JWT] GET /api/store/stock-receipt-acks/:entityCode
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import {
  stockReceiptAcksKey, STOCK_ACK_STATUS_LABELS,
  type StockReceiptAck, type StockReceiptAckStatus,
} from '@/types/stock-receipt-ack';
import { StockReceiptAckDetailPanel } from './detail/StockReceiptAckDetailPanel';
import { StockReceiptAckPrint } from './print/StockReceiptAckPrint';

function seedIfEmpty(entity: string): StockReceiptAck[] {
  try {
    const raw = localStorage.getItem(stockReceiptAcksKey(entity));
    const list = raw ? (JSON.parse(raw) as StockReceiptAck[]) : [];
    if (list.length > 0) return list;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const base = {
      entity_id: entity, fiscal_year_id: 'FY-2025-26',
      lines: [], voucher_id: null, voucher_no: null, posted_at: null,
      narration: '', created_at: now, updated_at: now, cancelled_at: null,
    };
    const seed: StockReceiptAck[] = [
      {
        ...base, id: 'sra-seed-1', ack_no: 'SRA/2526/0001',
        status: 'acknowledged', ack_date: today,
        inward_receipt_id: 'ir-1', inward_receipt_no: 'IR/2526/0011',
        vendor_id: 'v-1', vendor_name: 'Maharashtra Steels Pvt Ltd',
        acknowledged_by_id: 'u-1', acknowledged_by_name: 'Suresh Patil',
        total_variance: 0,
      },
      {
        ...base, id: 'sra-seed-2', ack_no: 'SRA/2526/0002',
        status: 'draft', ack_date: today,
        inward_receipt_id: 'ir-2', inward_receipt_no: 'IR/2526/0012',
        vendor_id: 'v-2', vendor_name: 'Bengaluru Castings',
        acknowledged_by_id: 'u-2', acknowledged_by_name: 'Anita Rao',
        total_variance: 2,
      },
      {
        ...base, id: 'sra-seed-3', ack_no: 'SRA/2526/0003',
        status: 'acknowledged', ack_date: today,
        inward_receipt_id: 'ir-3', inward_receipt_no: 'IR/2526/0013',
        vendor_id: null, vendor_name: 'Internal Transfer',
        acknowledged_by_id: 'u-3', acknowledged_by_name: 'Ramesh Iyer',
        total_variance: 0,
      },
    ];
    localStorage.setItem(stockReceiptAcksKey(entity), JSON.stringify(seed));
    return seed;
  } catch { return []; }
}

export function StockReceiptAckRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<StockReceiptAck | null>(null);
  const [printing, setPrinting] = useState<StockReceiptAck | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const rows = useMemo<StockReceiptAck[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(stockReceiptAcksKey(safeEntity)) || '[]') as StockReceiptAck[];
    } catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEntity, tick]);

  const meta: RegisterMeta<StockReceiptAck> = {
    registerCode: 'stock_receipt_ack_register',
    title: 'Stock Receipt Acknowledgment Register',
    description: 'All SRA records · Stores acknowledgment of inward receipts',
    dateAccessor: r => (r.ack_date || r.created_at).slice(0, 10),
  };

  const columns: RegisterColumn<StockReceiptAck>[] = [
    { key: 'ack_no', label: 'Ack No', clickable: true, render: r => r.ack_no, exportKey: 'ack_no' },
    { key: 'date', label: 'Ack Date', render: r => r.ack_date.slice(0, 10), exportKey: r => r.ack_date.slice(0, 10) },
    { key: 'ir', label: 'Inward Receipt', render: r => r.inward_receipt_no, exportKey: 'inward_receipt_no' },
    { key: 'vendor', label: 'Vendor', render: r => r.vendor_name, exportKey: 'vendor_name' },
    { key: 'by', label: 'Acknowledged By', render: r => r.acknowledged_by_name, exportKey: 'acknowledged_by_name' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'variance', label: 'Variance', align: 'right', render: r => <span className={r.total_variance > 0 ? 'font-mono text-warning' : 'font-mono'}>{r.total_variance}</span>, exportKey: r => r.total_variance },
    { key: 'voucher', label: 'Voucher', render: r => r.voucher_no ?? '—', exportKey: r => r.voucher_no ?? '' },
    { key: 'status', label: 'Status', render: r => <Badge variant="outline" className="text-[10px]">{STOCK_ACK_STATUS_LABELS[r.status]}</Badge>, exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STOCK_ACK_STATUS_LABELS) as StockReceiptAckStatus[])
    .map(s => ({ value: s, label: STOCK_ACK_STATUS_LABELS[s] }));

  const summaryBuilder = (f: StockReceiptAck[]): SummaryCard[] => {
    const acked = f.filter(r => r.status === 'acknowledged').length;
    const drafts = f.filter(r => r.status === 'draft').length;
    const variances = f.filter(r => r.total_variance > 0).length;
    return [
      { label: 'Total Records', value: String(f.length) },
      { label: 'Acknowledged', value: String(acked), tone: 'positive' },
      { label: 'Draft', value: String(drafts) },
      { label: 'With Variance', value: String(variances), tone: variances > 0 ? 'warning' : 'neutral' },
      { label: 'Posted', value: String(f.filter(r => r.voucher_id).length) },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<StockReceiptAck>
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
          {selected && <StockReceiptAckDetailPanel ack={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <StockReceiptAckPrint ack={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StockReceiptAckRegisterPanel;
