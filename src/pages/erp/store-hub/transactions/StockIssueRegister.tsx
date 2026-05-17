/**
 * @file        src/pages/erp/store-hub/transactions/StockIssueRegister.tsx
 * @purpose     Stock Issue register V2 · UniversalRegisterGrid consumer · UPRA-3 Phase B in-place migration
 * @who         Store Keeper · Department Head · Storekeeper Supervisor
 * @when        2026-05-17
 * @sprint      T-Phase-1 · UPRA-3 · Phase B · T2-2 V2 in-place
 * @iso         ISO 9001:2015 Clause 8.1 · ISO 25010 Usability + Operability
 * @whom        Audit Owner
 * @decisions   D-NEW-CE FormCarryForwardKit canonical (FR-29 register-shape honest 5/12 baseline · PRESERVED) ·
 *              UPRA-3 Phase B · in-place V2 · INLINE Post button preserved byte-identical per PB-Q2=(A)
 * @disciplines FR-29 (form-carry-forward · register-shape · most items N/A) · FR-30 · canonical Tally register UI
 * @reuses      @/components/registers/UniversalRegisterGrid · @/lib/stock-issue-engine · @/types/stock-issue
 *              @/lib/form-carry-forward-kit · @/components/canonical/form-carry-forward-kit (PRESERVED verbatim per PB-Q3=(A))
 * @[JWT]       reads via listStockIssues · posts via postStockIssue (single inline action)
 */
import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Plus, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listStockIssues, postStockIssue } from '@/lib/stock-issue-engine';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import type { StockIssue, StockIssueStatus } from '@/types/stock-issue';
import { STOCK_ISSUE_STATUS_LABELS, STOCK_ISSUE_STATUS_COLORS } from '@/types/stock-issue';
import {
  Sprint27d2Mount, UseLastVoucherButton,
} from '@/components/canonical/form-carry-forward-kit';
import {
  useFormCarryForwardChecklist, useSprint27d1Mount, type FormCarryForwardConfig,
} from '@/lib/form-carry-forward-kit';
import type { StoreHubModule } from './../StoreHubSidebar';
import { StockIssueDetailPanel } from './detail/StockIssueDetailPanel';
import { StockIssuePrint } from './print/StockIssuePrint';

interface Props {
  onModuleChange: (m: StoreHubModule) => void;
}

export function StockIssueRegisterPanel({ onModuleChange }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  // FR-29 register-shape honest 5/12 baseline · D-NEW-CE FormCarryForwardKit canonical (PRESERVED verbatim per PB-Q3=(A))
  const _fr29: FormCarryForwardConfig = {
    useLastVoucher: true, sprint27d1: true, sprint27d2: true, sprint27e: false,
    keyboardOverlay: true, draftRecovery: false, decimalHelpers: false, fr30Header: true,
    smartDefaults: false, pinnedTemplates: false, ctrlSSave: false, saveAndNewCarryover: false,
  };
  useFormCarryForwardChecklist('StockIssueRegister', _fr29);
  void _fr29;
  const [items, setItems] = useState<StockIssue[]>([]);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<StockIssue | null>(null);
  const [printing, setPrinting] = useState<StockIssue | null>(null);
  const _sprint27d1 = useSprint27d1Mount({
    formKey: 'stock-issue-register', entityCode, formState: { count: items.length }, items: [], view: 'view', voucherType: 'stock_issue',
  });
  void _sprint27d1;

  const refresh = useCallback(() => {
    setItems(listStockIssues(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  // BYTE-IDENTICAL Post handler per PB-Q2=(A) · DO NOT add confirmation modal
  async function handlePost(id: string) {
    setPostingId(id);
    try {
      const updated = await postStockIssue(id, entityCode, 'u-store-1');
      toast.success(`Posted · ${updated?.issue_no}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to post');
    } finally { setPostingId(null); }
  }

  const meta: RegisterMeta<StockIssue> = {
    registerCode: 'stock_issue_register',
    title: 'Stock Issue Register',
    description: 'All stock issues · drafts and posted · Tally-Prime register',
    dateAccessor: r => r.issue_date,
  };

  const columns: RegisterColumn<StockIssue>[] = [
    { key: 'issue_no', label: 'Issue No', clickable: true, render: r => r.issue_no, exportKey: 'issue_no' },
    { key: 'date', label: 'Date', render: r => r.issue_date, exportKey: 'issue_date' },
    { key: 'department', label: 'Department', render: r => r.department_name, exportKey: 'department_name' },
    { key: 'recipient', label: 'Recipient', render: r => r.recipient_name, exportKey: 'recipient_name' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'value', label: 'Value', align: 'right',
      render: r => `₹${r.total_value.toLocaleString('en-IN')}`,
      exportKey: r => r.total_value },
    {
      key: 'status', label: 'Status',
      render: r => <Badge className={STOCK_ISSUE_STATUS_COLORS[r.status]}>{STOCK_ISSUE_STATUS_LABELS[r.status]}</Badge>,
      exportKey: 'status',
    },
    {
      key: 'actions', label: 'Action', align: 'right',
      render: r => r.status === 'draft' ? (
        <Button size="sm" variant="ghost" disabled={postingId === r.id}
          onClick={(e) => { e.stopPropagation(); handlePost(r.id); }}
          className="h-7 text-indigo-600">
          <Send className="h-3 w-3 mr-1" /> Post
        </Button>
      ) : (
        <span className="text-muted-foreground text-[10px]">{r.voucher_no || '—'}</span>
      ),
      exportKey: r => r.status === 'draft' ? 'postable' : (r.voucher_no ?? ''),
    },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STOCK_ISSUE_STATUS_LABELS) as StockIssueStatus[])
    .map(s => ({ value: s, label: STOCK_ISSUE_STATUS_LABELS[s] }));

  const summaryBuilder = (f: StockIssue[]): SummaryCard[] => {
    const draft = f.filter(r => r.status === 'draft').length;
    const issued = f.filter(r => r.status === 'issued').length;
    const cancelled = f.filter(r => r.status === 'cancelled').length;
    const totalValue = f.reduce((a, r) => a + r.total_value, 0);
    return [
      { label: 'Total Issues', value: String(f.length) },
      { label: 'Draft · awaiting Post', value: String(draft), tone: 'warning' },
      { label: 'Issued', value: String(issued), tone: 'positive' },
      { label: 'Cancelled', value: String(cancelled) },
      { label: 'Total Value', value: `₹${totalValue.toLocaleString('en-IN')}` },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6" data-keyboard-form>
      {/* FR-29 hidden mounts · PRESERVED verbatim per PB-Q3=(A) */}
      <Sprint27d2Mount formName="Stock Issue Register" entityCode={entityCode} items={[]} isLineItemForm={false} showBulkPasteButton={false} />
      <div className="hidden">
        <UseLastVoucherButton entityCode={entityCode} recordType="stock_issue" partyValue={null} onUse={() => { /* register · view-only consumer */ }} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowDown className="h-5 w-5 text-indigo-600" /> Stock Issue Register
          </h1>
          <p className="text-sm text-muted-foreground">All stock issues · drafts and posted</p>
        </div>
        <Button onClick={() => onModuleChange('sh-t-stock-issue-entry')}
          className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-3.5 w-3.5 mr-1" /> New Issue
        </Button>
      </div>
      <UniversalRegisterGrid<StockIssue>
        entityCode={entityCode}
        meta={meta}
        rows={items}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="status"
        summaryBuilder={summaryBuilder}
        onNavigateToRecord={setSelected}
      />
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && <StockIssueDetailPanel issue={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <StockIssuePrint issue={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StockIssueRegisterPanel;
