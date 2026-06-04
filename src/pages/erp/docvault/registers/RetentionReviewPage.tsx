/**
 * @file        src/pages/erp/docvault/registers/RetentionReviewPage.tsx
 * @purpose     S144 · Retention rules + Review cycles CRUD + evaluate previews
 * @sprint      Sprint 144 · T-TaskFlow-A641.8 · Block 4
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listRetentionRules, upsertRetentionRule, evaluateRetention, archivePerRetention,
  listReviewCycles, upsertReviewCycle, evaluateReviewsDue, markReviewed,
  type RetentionVerdict, type ReviewDue,
} from '@/lib/docvault-governance-engine';
import type { DocumentRetentionRule, DocumentReviewCycle, DocumentCategory } from '@/types/docvault';

const CATEGORIES: DocumentCategory[] = [
  'policy', 'procedure', 'work_instruction', 'contract', 'agreement',
  'certificate', 'license', 'statutory', 'legal', 'financial',
  'technical', 'quality', 'hr', 'correspondence', 'general',
];
const FREQ: DocumentReviewCycle['frequency'][] = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'biennial'];

export default function RetentionReviewPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const byUserId = user?.id ?? 'demo-user';
  const [rules, setRules] = useState<DocumentRetentionRule[]>([]);
  const [cycles, setCycles] = useState<DocumentReviewCycle[]>([]);
  const [verdicts, setVerdicts] = useState<RetentionVerdict[]>([]);
  const [due, setDue] = useState<ReviewDue[]>([]);
  const [years, setYears] = useState('7');
  const [ruleCat, setRuleCat] = useState<DocumentCategory>('financial');
  const [cycCat, setCycCat] = useState<DocumentCategory>('policy');
  const [freq, setFreq] = useState<DocumentReviewCycle['frequency']>('yearly');

  const refresh = useCallback(() => {
    setRules(listRetentionRules(entityCode));
    setCycles(listReviewCycles(entityCode));
  }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const addRule = (): void => {
    const y = parseInt(years, 10);
    if (!Number.isFinite(y) || y < 1) { toast.error('Years must be positive'); return; }
    upsertRetentionRule(entityCode, {
      category: ruleCat, retain_years: y, action_at_end: 'archive', is_active: true,
    });
    toast.success('Retention rule added'); refresh();
  };
  const addCycle = (): void => {
    upsertReviewCycle(entityCode, {
      category: cycCat, frequency: freq, escalate_to_owner: true, is_active: true,
    });
    toast.success('Review cycle added'); refresh();
  };
  const previewRetention = (): void => { setVerdicts(evaluateRetention(entityCode)); };
  const previewReviews = (): void => { setDue(evaluateReviewsDue(entityCode)); };
  const archiveDue = (): void => {
    const ids = verdicts.filter((v) => v.due).map((v) => v.document_id);
    if (ids.length === 0) { toast.info('No documents due'); return; }
    const r = archivePerRetention(entityCode, ids, byUserId);
    toast.success(`Archived ${r.archived.length} · skipped ${r.skipped.length}`);
  };
  const onMarkReviewed = (id: string): void => {
    try { markReviewed(entityCode, id, byUserId); toast.success('Reviewed'); previewReviews(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Retention rules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div><Label>Category</Label>
              <Select value={ruleCat} onValueChange={(v) => setRuleCat(v as DocumentCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Retain years</Label><Input value={years} onChange={(e) => setYears(e.target.value)} /></div>
            <div className="col-span-2 flex items-end gap-2">
              <Button onClick={addRule}>Add rule</Button>
              <Button variant="outline" onClick={previewRetention}>Evaluate</Button>
              <Button variant="destructive" onClick={archiveDue}>Archive due</Button>
            </div>
          </div>
          <div className="text-sm">
            {rules.map((r) => (
              <div key={r.id} className="flex gap-2 py-1">
                <Badge variant="secondary">{r.category ?? 'default'}</Badge>
                <span>{r.retain_years ?? '∞'} years → {r.action_at_end}</span>
              </div>
            ))}
          </div>
          {verdicts.length > 0 && (
            <div className="text-xs font-mono text-muted-foreground">
              {verdicts.length} verdicts · {verdicts.filter((v) => v.due).length} due
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Review cycles</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div><Label>Category</Label>
              <Select value={cycCat} onValueChange={(v) => setCycCat(v as DocumentCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Frequency</Label>
              <Select value={freq} onValueChange={(v) => setFreq(v as DocumentReviewCycle['frequency'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQ.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-end gap-2">
              <Button onClick={addCycle}>Add cycle</Button>
              <Button variant="outline" onClick={previewReviews}>Evaluate due</Button>
            </div>
          </div>
          <div className="text-sm">
            {cycles.filter((c) => c.is_active).map((c) => (
              <div key={c.id} className="flex gap-2 py-1">
                <Badge variant="secondary">{c.category}</Badge>
                <span>{c.frequency}</span>
              </div>
            ))}
          </div>
          {due.length > 0 && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground">
                <th className="py-2">Document</th><th>Reason</th><th></th>
              </tr></thead>
              <tbody>
                {due.map((d) => (
                  <tr key={d.document_id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{d.document_id}</td>
                    <td>{d.reason}</td>
                    <td className="text-right">
                      <Button size="sm" variant="outline" onClick={() => onMarkReviewed(d.document_id)}>Mark reviewed</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
