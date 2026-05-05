/**
 * CrossDeptHandoffTracker.tsx — Sprint T-Phase-1.1.1o · Operix MOAT #18 · D-188
 * Read-only dashboard. For each Sales Order, assembles one pipeline row
 * by reading 7 existing localStorage sources:
 *   erp_enquiries_${e} · erp_quotations_${e} · erp_orders_${e} ·
 *   erp_supply_request_memos_${e} · erp_delivery_memos_${e} ·
 *   erp_invoice_memos_${e} · erp_group_vouchers_${e}
 *
 * Linkage chain:
 *   Enquiry ← Quotation.enquiry_id
 *   Order.ref_no = Quotation.quotation_no
 *   SRM.sales_order_no = Order.order_no
 *   DM.supply_request_memo_no = SRM.memo_no
 *   IM.delivery_memo_no = DM.memo_no
 *   Voucher.so_ref = Order.order_no   (Sales Invoice)
 *
 * Pure composition · zero new schemas · zero engine writes ·
 * D-194 boundary preserved · D-127/D-128 zero-touch (47 sprints).
 *
 * [JWT] All reads will move to GET /api/handoff-tracker?entityCode=:e in Phase 2.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, GitMerge, AlertTriangle, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

import type { Order } from '@/types/order';
import type { Quotation, QuotationStage } from '@/types/quotation';
import { quotationsKey } from '@/types/quotation';
import type { Enquiry, EnquiryStatus } from '@/types/enquiry';
import { enquiriesKey } from '@/types/enquiry';
import type { SupplyRequestMemo, SRMStatus } from '@/types/supply-request-memo';
import { supplyRequestMemosKey, SRM_STATUS_LABELS } from '@/types/supply-request-memo';
import type { DeliveryMemo, DMStatus } from '@/types/delivery-memo';
import { deliveryMemosKey, DM_STATUS_LABELS } from '@/types/delivery-memo';
import type { InvoiceMemo, IMStatus } from '@/types/invoice-memo';
import { invoiceMemosKey, IM_STATUS_LABELS } from '@/types/invoice-memo';
import type { Voucher } from '@/types/voucher';
import { vouchersKey } from '@/lib/finecore-engine';
// Sprint 6-pre-2 · Block H · D-367 · FT-DISPATCH-013 closure
import type { InwardReceipt, InwardReceiptStatus } from '@/types/inward-receipt';
import { inwardReceiptsKey, INWARD_STATUS_LABELS } from '@/types/inward-receipt';

interface Props {
  entityCode: string;
}

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

interface HandoffRow {
  soId: string;
  soNo: string;
  customerName: string;
  soStatus: Order['status'];
  soValue: number;
  soDate: string;
  enquiryNo: string | null;
  enquiryStatus: EnquiryStatus | null;
  quotationNo: string | null;
  quotationStage: QuotationStage | null;
  srmNo: string | null;
  srmStatus: SRMStatus | null;
  dmNo: string | null;
  dmStatus: DMStatus | null;
  imNo: string | null;
  imStatus: IMStatus | null;
  siVoucherNo: string | null;
  siAmount: number | null;
  // Sprint 1.1.2-c · ProjX cross-module
  projectId: string | null;
  projectNo: string | null;
  // Sprint 6-pre-2 · D-367 · FT-DISPATCH-013
  inwardReceiptNo: string | null;
  inwardReceiptStage: InwardReceiptStatus | null;
  pipelineStage: number;   // 0-5
  daysSinceActivity: number;
}

function buildHandoffRows(entityCode: string): HandoffRow[] {
  // [JWT] GET /api/accounting/orders?entityCode=:e
  const orders = ls<Order>(`erp_orders_${entityCode}`)
    .filter(o => o.base_voucher_type === 'Sales Order');
  // [JWT] GET /api/salesx/quotations?entityCode=:e
  const quotations = ls<Quotation>(quotationsKey(entityCode));
  // [JWT] GET /api/salesx/enquiries?entityCode=:e
  const enquiries = ls<Enquiry>(enquiriesKey(entityCode));
  // [JWT] GET /api/salesx/supply-request-memos?entityCode=:e
  const srms = ls<SupplyRequestMemo>(supplyRequestMemosKey(entityCode));
  // [JWT] GET /api/dispatch/delivery-memos?entityCode=:e
  const dms = ls<DeliveryMemo>(deliveryMemosKey(entityCode));
  // [JWT] GET /api/salesx/invoice-memos?entityCode=:e
  const ims = ls<InvoiceMemo>(invoiceMemosKey(entityCode));
  // [JWT] GET /api/accounting/vouchers?entityCode=:e
  const vouchers = ls<Voucher>(vouchersKey(entityCode));

  const quotByNo = new Map(quotations.map(q => [q.quotation_no, q]));
  const enqMap = new Map(enquiries.map(e => [e.id, e]));
  const srmBySO = new Map<string, SupplyRequestMemo>();
  srms.forEach(s => { if (s.sales_order_no) srmBySO.set(s.sales_order_no, s); });
  const dmBySRM = new Map<string, DeliveryMemo>();
  dms.forEach(d => { if (d.supply_request_memo_no) dmBySRM.set(d.supply_request_memo_no, d); });
  const imByDM = new Map<string, InvoiceMemo>();
  ims.forEach(i => { if (i.delivery_memo_no) imByDM.set(i.delivery_memo_no, i); });
  const siBySORef = new Map<string, Voucher>();
  vouchers.filter(v => v.base_voucher_type === 'Sales').forEach(v => {
    if (v.so_ref) siBySORef.set(v.so_ref, v);
  });
  // D-367 · best-effort backlink · IR.po_no may carry SO ref
  const irBySoRef = new Map<string, InwardReceipt>();
  inwardReceipts.forEach(ir => { if (ir.po_no) irBySoRef.set(ir.po_no, ir); });

  return orders.map((so): HandoffRow => {
    const quot = so.ref_no ? quotByNo.get(so.ref_no) ?? null : null;
    const enq = quot?.enquiry_id ? enqMap.get(quot.enquiry_id) ?? null : null;
    const srm = srmBySO.get(so.order_no) ?? null;
    const dm = srm ? dmBySRM.get(srm.memo_no) ?? null : null;
    const im = dm ? imByDM.get(dm.memo_no) ?? null : null;
    const si = siBySORef.get(so.order_no) ?? null;
    const ir = irBySoRef.get(so.order_no) ?? null;

    const pipelineStage = si ? 4 : im ? 3 : dm ? 2 : srm ? 1 : 0;

    const stamps: string[] = [
      so.updated_at, quot?.updated_at, srm?.updated_at,
      dm?.updated_at, im?.updated_at, si?.date,
    ].filter((x): x is string => Boolean(x));
    const latest = stamps.sort().at(-1) ?? so.created_at ?? so.date;
    const daysSince = Math.max(0, Math.floor(
      (Date.now() - new Date(latest).getTime()) / (1000 * 60 * 60 * 24),
    ));

    return {
      soId: so.id, soNo: so.order_no,
      customerName: so.party_name, soStatus: so.status,
      soValue: so.net_amount, soDate: so.date,
      enquiryNo: enq?.enquiry_no ?? null,
      enquiryStatus: enq?.status ?? null,
      quotationNo: quot?.quotation_no ?? null,
      quotationStage: quot?.quotation_stage ?? null,
      srmNo: srm?.memo_no ?? null, srmStatus: srm?.status ?? null,
      dmNo: dm?.memo_no ?? null, dmStatus: dm?.status ?? null,
      imNo: im?.memo_no ?? null, imStatus: im?.status ?? null,
      siVoucherNo: si?.voucher_no ?? null,
      siAmount: si ? si.net_amount : null,
      projectId: so.project_id ?? null,
      projectNo: so.project_no ?? null,
      inwardReceiptNo: ir?.receipt_no ?? null,
      inwardReceiptStage: ir?.status ?? null,
      pipelineStage, daysSinceActivity: daysSince,
    };
  });
}

// ─── Stage badge color maps ──────────────────────────────────────────────
const ENQ_COLOR: Record<EnquiryStatus, string> = {
  new:        'bg-muted text-muted-foreground border-border',
  assigned:   'bg-muted text-muted-foreground border-border',
  pending:    'bg-amber-500/15 text-amber-700 border-amber-500/30',
  in_process: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  demo:       'bg-blue-500/15 text-blue-700 border-blue-500/30',
  on_hold:    'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  forwarded:  'bg-blue-500/15 text-blue-700 border-blue-500/30',
  quote:      'bg-purple-500/15 text-purple-700 border-purple-500/30',
  agreed:     'bg-teal-500/15 text-teal-700 border-teal-500/30',
  sold:       'bg-success/15 text-success border-success/30',
  lost:       'bg-destructive/15 text-destructive border-destructive/30',
};

const QUOT_COLOR: Record<QuotationStage, string> = {
  draft:       'bg-muted text-muted-foreground border-border',
  on_hold:     'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  negotiation: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  confirmed:   'bg-success/15 text-success border-success/30',
  proforma:    'bg-teal-500/15 text-teal-700 border-teal-500/30',
  sales_order: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  lost:        'bg-destructive/15 text-destructive border-destructive/30',
  cancelled:   'bg-muted text-muted-foreground border-border',
};

const SRM_COLOR: Record<SRMStatus, string> = {
  draft:        'bg-muted text-muted-foreground border-border',
  raised:       'bg-blue-500/15 text-blue-700 border-blue-500/30',
  acknowledged: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  dispatching:  'bg-orange-500/15 text-orange-700 border-orange-500/30',
  dispatched:   'bg-success/15 text-success border-success/30',
};

const DM_COLOR: Record<DMStatus, string> = {
  draft:       'bg-muted text-muted-foreground border-border',
  raised:      'bg-blue-500/15 text-blue-700 border-blue-500/30',
  lr_assigned: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  delivered:   'bg-success/15 text-success border-success/30',
};

const IM_COLOR: Record<IMStatus, string> = {
  draft:          'bg-muted text-muted-foreground border-border',
  raised:         'bg-blue-500/15 text-blue-700 border-blue-500/30',
  invoice_posted: 'bg-success/15 text-success border-success/30',
};

const SI_COLOR_PRESENT = 'bg-success/15 text-success border-success/30';
const DASH_COLOR = 'bg-muted/50 text-muted-foreground border-border';

const ENQ_LABEL: Record<EnquiryStatus, string> = {
  new: 'New', assigned: 'Assigned', pending: 'Pending', in_process: 'In Process',
  demo: 'Demo', on_hold: 'On Hold', forwarded: 'Forwarded', quote: 'Quoted',
  agreed: 'Agreed', sold: 'Sold', lost: 'Lost',
};

const QUOT_LABEL: Record<QuotationStage, string> = {
  draft: 'Draft', on_hold: 'On Hold', negotiation: 'Negotiation',
  confirmed: 'Confirmed', proforma: 'Proforma', sales_order: 'SO Issued',
  lost: 'Lost', cancelled: 'Cancelled',
};

interface StageCellProps {
  docNo: string | null;
  label: string | null;
  className: string;
}

function StageCell({ docNo, label, className }: StageCellProps) {
  if (!docNo) {
    return <span className="text-muted-foreground/60 text-xs">—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-mono text-foreground/80 truncate max-w-[110px]" title={docNo}>
        {docNo}
      </span>
      <Badge variant="outline" className={cn('text-[9px] py-0 px-1.5 w-fit', className)}>
        {label}
      </Badge>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  tone?: 'default' | 'warn' | 'good';
}

function MetricCard({ label, value, tone = 'default' }: MetricCardProps) {
  return (
    <Card className={cn(
      'border-border/60',
      tone === 'warn' && 'border-amber-500/30 bg-amber-500/5',
      tone === 'good' && 'border-success/30 bg-success/5',
    )}>
      <CardContent className="p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold mt-0.5 font-mono">{value}</p>
      </CardContent>
    </Card>
  );
}

export function CrossDeptHandoffTrackerPanel({ entityCode }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [stuckOnly, setStuckOnly] = useState(false);

  const allRows = useMemo(() => buildHandoffRows(entityCode), [entityCode]);

  const filtered = useMemo(() => {
    let list = allRows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.customerName.toLowerCase().includes(q)
        || r.soNo.toLowerCase().includes(q)
        || (r.quotationNo?.toLowerCase().includes(q) ?? false)
        || (r.enquiryNo?.toLowerCase().includes(q) ?? false)
        || (r.projectNo?.toLowerCase().includes(q) ?? false),
      );
    }
    if (stuckOnly) list = list.filter(r => r.daysSinceActivity > 7);
    // Most stuck first, then most recent SO
    return [...list].sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
  }, [allRows, search, stuckOnly]);

  const totalSOs = allRows.length;
  const atSI = allRows.filter(r => r.pipelineStage === 4).length;
  const stuckCount = allRows.filter(r => r.daysSinceActivity > 7).length;
  const pipelineValue = allRows.reduce((s, r) => s + r.soValue, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitMerge className="h-4 w-4 text-orange-500" />
            Cross-Dept Handoff Tracker
            <Badge variant="outline" className="text-[10px] ml-2">MOAT #18</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            One row per Sales Order. Pipeline: Enquiry → Quotation → SO → SRM → DM → IM → Sales Invoice.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Total SOs" value={totalSOs} />
            <MetricCard label="At SI Stage" value={atSI} tone={atSI > 0 ? 'good' : 'default'} />
            <MetricCard label="Stuck > 7d" value={stuckCount} tone={stuckCount > 0 ? 'warn' : 'default'} />
            <MetricCard label="Pipeline Value" value={formatINR(pipelineValue)} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search customer, SO, quote, enquiry…"
                className="pl-7 h-8 text-xs"
              />
            </div>
            <Button
              type="button"
              variant={stuckOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStuckOnly(v => !v)}
              className={cn('h-8 text-xs gap-1', stuckOnly && 'bg-amber-500 hover:bg-amber-600 text-white')}
            >
              <AlertTriangle className="h-3 w-3" />
              Stuck only
            </Button>
            <span className="text-[11px] text-muted-foreground ml-auto">
              {filtered.length} of {totalSOs} rows
            </span>
          </div>

          <div className="border border-border/60 rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[10px] uppercase tracking-wider h-9">SO No</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-9">Customer</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-9 text-right">Value</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-9">ENQ · SalesX</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-9">QUOT · SalesX</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-9">SRM · SalesX</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-9">DM · Dispatch</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-9">IM · SalesX</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-9">SI · Accounts</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-9">Project · ProjX</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider h-9 text-right">Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-xs text-muted-foreground py-8">
                      No Sales Orders found. Load demo data or create a Sales Order to see the pipeline.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(r => {
                  const stuck14 = r.daysSinceActivity > 14;
                  const stuck7 = r.daysSinceActivity > 7;
                  return (
                    <TableRow
                      key={r.soId}
                      className={cn(
                        'align-top',
                        stuck14 && 'bg-destructive/5 hover:bg-destructive/10',
                        !stuck14 && stuck7 && 'bg-amber-500/5 hover:bg-amber-500/10',
                      )}
                    >
                      <TableCell className="py-2">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-mono font-medium">{r.soNo}</span>
                          <span className="text-[10px] text-muted-foreground">{r.soDate}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-xs">{r.customerName}</TableCell>
                      <TableCell className="py-2 text-right text-xs font-mono">{formatINR(r.soValue)}</TableCell>
                      <TableCell className="py-2">
                        <StageCell
                          docNo={r.enquiryNo}
                          label={r.enquiryStatus ? ENQ_LABEL[r.enquiryStatus] : null}
                          className={r.enquiryStatus ? ENQ_COLOR[r.enquiryStatus] : DASH_COLOR}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <StageCell
                          docNo={r.quotationNo}
                          label={r.quotationStage ? QUOT_LABEL[r.quotationStage] : null}
                          className={r.quotationStage ? QUOT_COLOR[r.quotationStage] : DASH_COLOR}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <StageCell
                          docNo={r.srmNo}
                          label={r.srmStatus ? SRM_STATUS_LABELS[r.srmStatus] : null}
                          className={r.srmStatus ? SRM_COLOR[r.srmStatus] : DASH_COLOR}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <StageCell
                          docNo={r.dmNo}
                          label={r.dmStatus ? DM_STATUS_LABELS[r.dmStatus] : null}
                          className={r.dmStatus ? DM_COLOR[r.dmStatus] : DASH_COLOR}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <StageCell
                          docNo={r.imNo}
                          label={r.imStatus ? IM_STATUS_LABELS[r.imStatus] : null}
                          className={r.imStatus ? IM_COLOR[r.imStatus] : DASH_COLOR}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <StageCell
                          docNo={r.siVoucherNo}
                          label={r.siVoucherNo ? 'Posted' : null}
                          className={r.siVoucherNo ? SI_COLOR_PRESENT : DASH_COLOR}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        {r.projectId ? (
                          <Badge
                            variant="outline"
                            className="gap-1 text-[10px] border-purple-500/30 bg-purple-500/10 text-purple-700 cursor-pointer"
                            onClick={() => navigate('/erp/projx')}
                            title={`Open project ${r.projectNo}`}
                          >
                            <Briefcase className="h-2.5 w-2.5" />
                            <span className="font-mono">{r.projectNo}</span>
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-mono',
                            stuck14 && 'bg-destructive/15 text-destructive border-destructive/30',
                            !stuck14 && stuck7 && 'bg-amber-500/15 text-amber-700 border-amber-500/30',
                          )}
                        >
                          {r.daysSinceActivity}d
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
