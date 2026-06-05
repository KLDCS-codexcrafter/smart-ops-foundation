/**
 * @file   src/pages/erp/ecomx/import-center/EcomXImportCenterPage.tsx
 * @sprint Sprint 153 · EcomX · import center (parse → commit · DP-EC-4 triad)
 */
import { useCallback, useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listMarketplaces, listTemplates, parseOrderFile, commitImport,
} from '@/lib/ecomx-engine';
import type { EcParseReport, CommitResult } from '@/lib/ecomx-engine';
import { Button } from '@/components/ui/button';

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  const out: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });
    out.push(row);
  }
  return out;
}
function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"') inQ = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function EcomXImportCenterPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const marketplaces = useMemo(() => entityCode ? listMarketplaces(entityCode) : [], [entityCode]);
  const [marketplaceId, setMarketplaceId] = useState<string>('');
  const templates = useMemo(() => entityCode ? listTemplates(entityCode, marketplaceId || undefined) : [], [entityCode, marketplaceId]);
  const [templateId, setTemplateId] = useState<string>('');
  const [report, setReport] = useState<EcParseReport | null>(null);
  const [commit, setCommit] = useState<CommitResult | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const onFile = useCallback(async (file: File) => {
    if (!entityCode || !marketplaceId || !templateId) {
      toast.error('Choose marketplace + template first.');
      return;
    }
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const r = parseOrderFile(entityCode, marketplaceId, templateId, rows, file.name);
      setReport(r); setCommit(null); setFileName(file.name);
      toast.success(`Parsed · ${r.validRows} valid · ${r.unknownSkuRows} unknown · ${r.invalidRows} invalid`);
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode, marketplaceId, templateId]);

  const onCommit = useCallback(() => {
    if (!entityCode || !report) return;
    try {
      const c = commitImport(entityCode, report.importId);
      setCommit(c);
      toast.success(`Committed · ${c.booked} booked · ${c.parked} parked · ${c.skippedDuplicates} skipped`);
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode, report]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select an entity.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2"><Upload className="h-5 w-5" /> Import Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Parse → review honest triad → commit. Re-commit is a no-op (idempotent on marketplace_order_id).</p>
      </header>

      <section className="glass-card rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Marketplace</label>
            <select className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" value={marketplaceId} onChange={(e) => { setMarketplaceId(e.target.value); setTemplateId(''); }}>
              <option value="">Choose…</option>
              {marketplaces.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Template</label>
            <select className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Choose…</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          className="block text-sm"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
        />
      </section>

      {report && (
        <section className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-sm font-medium">Parse report · {fileName}</h2>
            <Button onClick={onCommit} disabled={commit !== null}>Commit import</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total rows" value={report.totalRows} />
            <Stat label="Valid" value={report.validRows} />
            <Stat label="Unknown SKU" value={report.unknownSkuRows} />
            <Stat label="Invalid" value={report.invalidRows} />
          </div>
          {report.errors.length > 0 && (
            <details>
              <summary className="text-xs text-muted-foreground cursor-pointer">Errors ({report.errors.length}, capped at 200)</summary>
              <ul className="text-xs mt-2 space-y-1 max-h-48 overflow-auto">
                {report.errors.map((e, i) => (
                  <li key={`${e.rowIndex}-${i}`} className="font-mono">row {e.rowIndex}: {e.reason}</li>
                ))}
              </ul>
            </details>
          )}
          {commit && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/40">
              <Stat label="Booked" value={commit.booked} />
              <Stat label="Parked B2B" value={commit.parked} />
              <Stat label="Skipped duplicates" value={commit.skippedDuplicates} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-mono mt-1">{value}</div>
    </div>
  );
}
