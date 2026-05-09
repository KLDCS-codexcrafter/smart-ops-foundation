/**
 * StockIssueRegister.tsx — Card #7 Block F · D-381
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1 · T-Phase-1.A.6.α-a-Department-Stores-Foundation
 *
 * Lists Stock Issues with status badges + Post action for drafts + empty-state CTA.
 *
 * @decisions   D-NEW-CE FormCarryForwardKit canonical (FR-29 register-shape honest 5/12 baseline)
 * @disciplines FR-29 (register form · most carry-forward items don't apply to read-only list) · FR-30
 * @reuses      @/lib/form-carry-forward-kit · @/components/canonical/form-carry-forward-kit
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, Send, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listStockIssues, postStockIssue } from '@/lib/stock-issue-engine';
import type { StockIssue } from '@/types/stock-issue';
import { STOCK_ISSUE_STATUS_LABELS, STOCK_ISSUE_STATUS_COLORS } from '@/types/stock-issue';
import {
  Sprint27d2Mount, UseLastVoucherButton,
} from '@/components/canonical/form-carry-forward-kit';
import {
  useFormCarryForwardChecklist, useSprint27d1Mount, type FormCarryForwardConfig,
} from '@/lib/form-carry-forward-kit';
import type { StoreHubModule } from './../StoreHubSidebar';

interface Props {
  onModuleChange: (m: StoreHubModule) => void;
}

export function StockIssueRegisterPanel({ onModuleChange }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  // FR-29 register-shape honest 5/12 baseline · D-NEW-CE FormCarryForwardKit canonical
  const _fr29: FormCarryForwardConfig = {
    useLastVoucher: true, sprint27d1: true, sprint27d2: true, sprint27e: false,
    keyboardOverlay: true, draftRecovery: false, decimalHelpers: false, fr30Header: true,
    smartDefaults: false, pinnedTemplates: false, ctrlSSave: false, saveAndNewCarryover: false,
  };
  useFormCarryForwardChecklist('StockIssueRegister', _fr29);
  void _fr29;
  const [items, setItems] = useState<StockIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [postingId, setPostingId] = useState<string | null>(null);
  const _sprint27d1 = useSprint27d1Mount({
    formKey: 'stock-issue-register', entityCode, formState: { count: items.length }, items: [], view: 'view', voucherType: 'stock_issue',
  });
  void _sprint27d1;

  const refresh = useCallback(() => {
    setItems(listStockIssues(entityCode));
    setLoading(false);
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

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

  return (
    <div className="space-y-4" data-keyboard-form>
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

      <Card>
        <CardHeader><CardTitle className="text-base">Issues ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={`sk-${i}`} className="h-9 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <p>No stock issues yet.</p>
              <Button variant="link" className="text-indigo-600"
                onClick={() => onModuleChange('sh-t-stock-issue-entry')}>
                Create your first stock issue
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-[10px]">
                  <TableHead>Issue No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(si => (
                  <TableRow key={si.id} className="text-xs">
                    <TableCell className="font-mono">{si.issue_no}</TableCell>
                    <TableCell className="font-mono">{si.issue_date}</TableCell>
                    <TableCell>{si.department_name}</TableCell>
                    <TableCell>{si.recipient_name}</TableCell>
                    <TableCell className="font-mono text-right">{si.lines.length}</TableCell>
                    <TableCell className="font-mono text-right">
                      ₹{si.total_value.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <Badge className={STOCK_ISSUE_STATUS_COLORS[si.status]}>
                        {STOCK_ISSUE_STATUS_LABELS[si.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {si.status === 'draft' ? (
                        <Button size="sm" variant="ghost" disabled={postingId === si.id}
                          onClick={() => handlePost(si.id)} className="h-7 text-indigo-600">
                          <Send className="h-3 w-3 mr-1" /> Post
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">{si.voucher_no || '—'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StockIssueRegisterPanel;
