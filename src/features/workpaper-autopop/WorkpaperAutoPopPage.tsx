/**
 * @file        src/features/workpaper-autopop/WorkpaperAutoPopPage.tsx
 * @page        First-Class Standalone Page #41 · OOB-13 Workpaper Auto-Population
 * @sprint      T-Phase-6.B.OOB.2 · Sprint 114 · Arc 4
 * @decisions   DP-A4-3 (FR-44 multi-engine reuse) · DP-A4-8 (HONEST METRICS — no machine "16/16" register)
 * @reads-from  oob13-workpaper-autopop-engine (no dead UI)
 * @discipline  Dark mode · semantic tokens · shadcn · lucide · font-mono on numbers · ₹ Indian locale · NOT a SIBLID
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  WORKPAPER_TEMPLATES,
  TEMPLATE_SOURCE_ENGINE,
  autoPopulateAll,
  autoPopulateWorkpaper,
  sumWorkpaperTotals,
  type Workpaper,
  type WorkpaperTemplateId,
} from '@/lib/oob13-workpaper-autopop-engine';

function fmtINR(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

const TEMPLATE_LABEL: Record<WorkpaperTemplateId, string> = {
  transfer_pricing: 'Transfer Pricing (Section 92)',
  depreciation_reconciliation: 'Depreciation Reconciliation (IT / CA / Ind AS)',
  tds_reconciliation: 'TDS Reconciliation',
  cost_audit: 'Cost Audit (CRA-1/2/3/4)',
  statutory_register_extract: 'Statutory Register Extract',
  consolidation: 'Consolidation (Schedule III P&L)',
  gst_reconciliation: 'GST / Disclosure Pack',
  related_party: 'Related-Party Transactions',
  fixed_asset_register: 'Fixed-Asset Register',
  provisions: 'Provisions (BS · liabilities)',
};

export default function WorkpaperAutoPopPage() {
  const [fy, setFy] = useState('FY25-26');
  const [entityCode, setEntityCode] = useState('OPERIX-DEMO');
  const [workpapers, setWorkpapers] = useState<Workpaper[]>([]);
  const [selected, setSelected] = useState<WorkpaperTemplateId | null>(null);

  const grandTotal = useMemo(() => sumWorkpaperTotals(workpapers), [workpapers]);
  const populatedCount = workpapers.filter((w) => w.populated).length;

  const runAll = () => {
    const all = autoPopulateAll({ fy, entity_code: entityCode });
    setWorkpapers(all);
    toast.success('Auto-populated 10 workpapers', {
      description: `${all.filter((w) => w.populated).length}/10 populated · ${all.length - all.filter((w) => w.populated).length} skeleton (honest, no fabrication)`,
    });
  };

  const runOne = (t: WorkpaperTemplateId) => {
    const wp = autoPopulateWorkpaper({ template_id: t, fy, entity_code: entityCode });
    setWorkpapers((prev) => {
      const next = prev.filter((p) => p.template_id !== t);
      next.push(wp);
      return next;
    });
    setSelected(t);
  };

  const current = workpapers.find((w) => w.template_id === selected) ?? null;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Workpaper Auto-Population (OOB-13)
        </h1>
        <p className="text-sm text-muted-foreground">
          10 audit-workpaper templates auto-populated from existing engines (idea-7 TP · multi-GAAP
          depreciation · TDS · cost-audit · statutory registers · consolidation). Pure assembly —
          no figure rebuild. Empty source returns a skeleton (honest, no fabrication).
        </p>
      </header>

      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Scope</CardTitle>
          <CardDescription>Pick FY + entity, then auto-populate.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="fy">Financial Year</Label>
              <Input id="fy" value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ec">Entity Code</Label>
              <Input id="ec" value={entityCode} onChange={(e) => setEntityCode(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1 flex items-end">
              <Button onClick={runAll} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" /> Auto-populate all 10
              </Button>
            </div>
          </div>
          {workpapers.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Populated: <span className="font-mono">{populatedCount}/10</span> · Aggregate roll-up: <span className="font-mono">{fmtINR(grandTotal)}</span> ·
              "OOB 16/16" is a narrative figure, not a machine-asserted register (DP-A4-8).
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">10 Workpaper Templates</CardTitle>
          <CardDescription>Click a template to view its rows and source_refs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {WORKPAPER_TEMPLATES.map((t) => {
              const wp = workpapers.find((w) => w.template_id === t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => runOne(t)}
                  className="text-left p-3 rounded-lg border border-border/60 bg-card/50 hover:bg-card/70 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">{t}</Badge>
                        {wp && wp.populated && (
                          <Badge className="bg-success/20 text-success border-success/40">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> populated
                          </Badge>
                        )}
                        {wp && !wp.populated && (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" /> skeleton
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{TEMPLATE_LABEL[t]}</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        source: {TEMPLATE_SOURCE_ENGINE[t]}
                      </p>
                    </div>
                    {wp && typeof wp.total === 'number' && wp.total > 0 && (
                      <span className="text-sm font-mono">{fmtINR(wp.total)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {current && (
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Workpaper · {TEMPLATE_LABEL[current.template_id]}</CardTitle>
            <CardDescription>
              {current.populated
                ? `${current.rows.length} rows · source_ref cited per row · roll-up ${fmtINR(current.total ?? 0)}`
                : `Skeleton — ${current.skeleton_reason ?? 'no source data'} (honest, no fabrication)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {current.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rows — source returned empty.</p>
            ) : (
              <div className="space-y-2">
                {current.rows.map((r, i) => (
                  <div
                    key={`${current.template_id}-${i}`}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/60 bg-card/40"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm truncate">{r.label}</p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">{r.source_ref}</p>
                    </div>
                    <span className="text-sm font-mono shrink-0">
                      {typeof r.value === 'number' ? fmtINR(r.value) : r.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
