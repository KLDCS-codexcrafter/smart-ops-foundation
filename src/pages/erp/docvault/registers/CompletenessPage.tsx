/**
 * @file        src/pages/erp/docvault/registers/CompletenessPage.tsx
 * @purpose     S144 · TF-38 Required-Documents Completeness · templates + register
 * @sprint      Sprint 144 · T-TaskFlow-A641.8 · Block 4
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listRequirementTemplates, upsertRequirementTemplate, deleteRequirementTemplate,
  evaluateCompleteness, getCompletenessSummary,
} from '@/lib/docvault-governance-engine';
import type { DocumentRequirementTemplate, CompletenessResult } from '@/types/docvault';

type Kind = DocumentRequirementTemplate['target_kind'];
const KINDS: Kind[] = ['customer', 'vendor', 'employee', 'document_category'];

export default function CompletenessPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [templates, setTemplates] = useState<DocumentRequirementTemplate[]>([]);
  const [kind, setKind] = useState<Kind>('vendor');
  const [results, setResults] = useState<CompletenessResult[]>([]);

  const refresh = useCallback(() => { setTemplates(listRequirementTemplates(entityCode)); }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const seedTemplate = (): void => {
    upsertRequirementTemplate(entityCode, {
      target_kind: kind,
      target_filter: null,
      required_items: [
        { title: 'KYC document', category: 'statutory', mandatory: true },
        { title: 'Agreement', category: 'agreement', mandatory: true },
      ],
      is_active: true,
    });
    refresh();
  };
  const evaluate = (): void => { setResults(evaluateCompleteness(entityCode, kind)); };

  const summary = getCompletenessSummary(entityCode, kind);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Required-Documents templates</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 items-end">
            <div className="w-48">
              <label className="text-xs text-muted-foreground">Target kind</label>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={seedTemplate}>Add default template</Button>
            <Button variant="outline" onClick={evaluate}>Evaluate</Button>
          </div>
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-sm py-1">
              <Badge variant="secondary">{t.target_kind}</Badge>
              <span>{t.required_items.length} items</span>
              <Button size="sm" variant="ghost" onClick={() => { deleteRequirementTemplate(entityCode, t.id); refresh(); }}>Delete</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent>
          {summary.length === 0 ? (
            <p className="text-sm text-muted-foreground">Run evaluate above.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-sm">
              {summary.map((s) => (
                <div key={s.kind} className="border border-border rounded-lg p-3">
                  <div className="font-medium capitalize">{s.kind}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {s.complete}/{s.total} complete · {s.incomplete} incomplete
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Per-target results</CardTitle></CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Run evaluate above.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground">
                <th className="py-2">Target</th><th>Required</th><th>Present</th><th>Missing</th>
              </tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={`${r.target_kind}-${r.target_id}`} className="border-t border-border">
                    <td className="py-2">{r.target_label}</td>
                    <td className="font-mono text-xs">{r.required}</td>
                    <td className="font-mono text-xs">{r.present}</td>
                    <td className="text-xs text-muted-foreground">
                      {r.missing.map((m) => m.title).join(', ') || '—'}
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
