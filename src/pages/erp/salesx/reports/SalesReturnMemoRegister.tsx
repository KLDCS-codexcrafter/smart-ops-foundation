/**
 * SalesReturnMemoRegister.tsx — UPRA-1 Phase B · V2 canonical
 * UniversalRegisterGrid<SalesReturnMemo> consumer.
 *
 * Workflow extracted to actions/SalesReturnMemoActionsDialog.tsx (byte-identical parity).
 * Display extracted to detail/SalesReturnMemoDetailPanel.tsx.
 *
 * Export name `SalesReturnMemoRegisterPanel` and Props { entityCode } preserved
 * (SalesXPage imports unchanged).
 *
 * [JWT] GET /api/salesx/sales-return-memos
 */

import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, X, Send, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type {
  RegisterColumn, RegisterMeta, SummaryCard, StatusOption,
} from '@/components/registers/UniversalRegisterTypes';
import {
  salesReturnMemosKey,
  type SalesReturnMemo,
  type SalesReturnMemoStatus,
} from '@/types/sales-return-memo';
import {
  SalesReturnMemoActionsDialog,
  type SalesReturnMemoAction,
} from './actions/SalesReturnMemoActionsDialog';
import { SalesReturnMemoDetailPanel } from './detail/SalesReturnMemoDetailPanel';

interface Props { entityCode: string }

const STATUS_LABEL: Record<SalesReturnMemoStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  credit_note_posted: 'CN Posted',
};

const STATUS_COLOR: Record<SalesReturnMemoStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  approved: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  credit_note_posted: 'bg-green-500/15 text-green-700 border-green-500/30',
};

function ls<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso); const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function SalesReturnMemoRegisterPanel({ entityCode }: Props) {
  const [tick, setTick] = useState(0);
  const memos = useMemo(
    () => ls<SalesReturnMemo>(salesReturnMemosKey(entityCode))
      .sort((a, b) => b.memo_date.localeCompare(a.memo_date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );

  const [viewMemo, setViewMemo] = useState<SalesReturnMemo | null>(null);
  const [actionMemo, setActionMemo] = useState<SalesReturnMemo | null>(null);
  const [action, setAction] = useState<SalesReturnMemoAction | null>(null);

  const openAction = useCallback((m: SalesReturnMemo, a: SalesReturnMemoAction) => {
    setActionMemo(m);
    setAction(a);
  }, []);

  const closeAction = useCallback(() => {
    setActionMemo(null);
    setAction(null);
  }, []);

  const onActionComplete = useCallback(() => {
    setTick(t => t + 1);
  }, []);

  const meta: RegisterMeta<SalesReturnMemo> = {
    registerCode: 'sales_return_memo_register',
    title: 'Sales Return Memo Register',
    description: 'Approve memos raised by field force; convert approved memos into Credit Notes.',
    dateAccessor: r => r.memo_date,
  };

  const columns: RegisterColumn<SalesReturnMemo>[] = [
    { key: 'memo_no', label: 'Memo No', clickable: true, render: r => r.memo_no, exportKey: 'memo_no' },
    { key: 'date', label: 'Date', render: r => r.memo_date, exportKey: 'memo_date' },
    {
      key: 'raised_by', label: 'Raised By',
      render: r => (
        <div>
          <div>{r.raised_by_person_name}</div>
          <div className="text-[10px] text-muted-foreground capitalize">{r.raised_by_person_type}</div>
        </div>
      ),
      exportKey: 'raised_by_person_name',
    },
    { key: 'customer', label: 'Customer', render: r => r.customer_name, exportKey: 'customer_name' },
    { key: 'against', label: 'Against Invoice', render: r => r.against_invoice_no, exportKey: 'against_invoice_no' },
    {
      key: 'total', label: 'Total ₹', align: 'right',
      render: r => r.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      exportKey: r => r.total_amount,
    },
    {
      key: 'status', label: 'Status',
      render: r => (
        <>
          <Badge variant="outline" className={cn('text-[10px]', STATUS_COLOR[r.status])}>
            {STATUS_LABEL[r.status]}
          </Badge>
          {r.credit_note_voucher_no && (
            <div className="text-[9px] font-mono text-muted-foreground mt-0.5">
              CN: {r.credit_note_voucher_no}
            </div>
          )}
        </>
      ),
      exportKey: r => STATUS_LABEL[r.status],
    },
    {
      key: 'actions', label: 'Actions',
      render: r => (
        <div className="flex flex-wrap gap-1">
          {r.status === 'pending' && (
            <>
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                onClick={() => openAction(r, 'approve')}>
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                onClick={() => openAction(r, 'reject')}>
                <X className="h-3 w-3 mr-1" /> Reject
              </Button>
            </>
          )}
          {r.status === 'approved' && (
            <Button data-primary size="sm" className="h-7 text-[10px] px-2 bg-orange-500 hover:bg-orange-600"
              onClick={() => openAction(r, 'convert')}>
              <Send className="h-3 w-3 mr-1" /> Convert to CN
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2"
            onClick={() => setViewMemo(r)}>
            <Eye className="h-3 w-3 mr-1" /> View
          </Button>
        </div>
      ),
    },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABEL) as SalesReturnMemoStatus[])
    .map(s => ({ value: s, label: STATUS_LABEL[s] }));

  const summaryBuilder = (filtered: SalesReturnMemo[]): SummaryCard[] => {
    const month = memos.filter(m => isThisMonth(m.memo_date));
    return [
      { label: 'Filtered Memos', value: String(filtered.length) },
      { label: 'This month — raised', value: String(month.length) },
      {
        label: 'Approved (mo.)',
        value: String(month.filter(m => m.status === 'approved' || m.status === 'credit_note_posted').length),
        tone: 'positive',
      },
      {
        label: 'Rejected (mo.)',
        value: String(month.filter(m => m.status === 'rejected').length),
        tone: 'negative',
      },
      {
        label: 'CN Posted (mo.)',
        value: String(month.filter(m => m.status === 'credit_note_posted').length),
        tone: 'positive',
      },
    ];
  };

  return (
    <div className="space-y-4">
      <UniversalRegisterGrid<SalesReturnMemo>
        entityCode={entityCode}
        meta={meta}
        rows={memos}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="status"
        summaryBuilder={summaryBuilder}
        onNavigateToRecord={setViewMemo}
      />

      <Dialog open={!!viewMemo} onOpenChange={o => !o && setViewMemo(null)}>
        <DialogContent className="max-w-2xl">
          {viewMemo && (
            <>
              <SalesReturnMemoDetailPanel memo={viewMemo} />
              <div className="pt-2 flex justify-end gap-2">
                {viewMemo.status === 'pending' && (
                  <>
                    <Button variant="outline" onClick={() => { const m = viewMemo; setViewMemo(null); openAction(m, 'approve'); }}>
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button variant="destructive" onClick={() => { const m = viewMemo; setViewMemo(null); openAction(m, 'reject'); }}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </>
                )}
                {viewMemo.status === 'approved' && (
                  <Button data-primary onClick={() => { const m = viewMemo; setViewMemo(null); openAction(m, 'convert'); }}
                    className="bg-orange-500 hover:bg-orange-600">
                    <Send className="h-4 w-4 mr-1" /> Convert to CN
                  </Button>
                )}
                <Button variant="outline" onClick={() => setViewMemo(null)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <SalesReturnMemoActionsDialog
        entityCode={entityCode}
        memo={actionMemo}
        action={action}
        open={!!actionMemo && !!action}
        onClose={closeAction}
        onActionComplete={onActionComplete}
      />

      {/* Silence unused-Card-import-equivalent: keep Card visible for HMR pattern */}
      <Card className="hidden"><CardContent /></Card>
    </div>
  );
}

export default function SalesReturnMemoRegisterPage() {
  return <SalesReturnMemoRegisterPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
