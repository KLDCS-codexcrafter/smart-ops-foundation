/**
 * @file   src/pages/erp/ecomx/settlements/EcomXSettlementsPage.tsx
 * @sprint Sprint 154 · EcomX Money Suite · DP-EC-6 · settlement templates + import + register
 */
import { useMemo, useState, useCallback } from 'react';
import { Banknote, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listMarketplaces } from '@/lib/ecomx-engine';
import {
  listSettlementTemplates, saveSettlementTemplate, suggestSettlementColumnMap,
  parseSettlementFile, commitSettlementImport, listSettlementRows, getTaxCreditSummary,
} from '@/lib/ecomx-recon-engine';
import { Button } from '@/components/ui/button';
import type { EcParseReport, EcSettlementColumnKey } from '@/types/ecomx';
import { exportEcomxCsv } from '../lib/ecomx-csv';

export function EcomXSettlementsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [mpId, setMpId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [report, setReport] = useState<EcParseReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const marketplaces = useMemo(() => entityCode ? listMarketplaces(entityCode) : [], [entityCode]);
  const templates = useMemo(
    () => entityCode && mpId ? listSettlementTemplates(entityCode, mpId) : [],
    [entityCode, mpId, tick],
  );
  const rows = useMemo(
    () => entityCode && mpId ? listSettlementRows(entityCode, { marketplaceId: mpId }) : [],
    [entityCode, mpId, tick],
  );
  const taxCredits = useMemo(
    () => entityCode && mpId ? getTaxCreditSummary(entityCode, mpId) : { tds194oTotal: 0, gstTcsTotal: 0, rowCount: 0 },
    [entityCode, mpId, tick],
  );

  const onCreateTemplate = useCallback(() => {
    if (!entityCode || !mpId) return;
    const mp = marketplaces.find(m => m.id === mpId);
    if (!mp) return;
    const headers = ['Order ID', 'Event Type', 'Gross', 'Commission', 'TDS', 'TCS', 'Net', 'Settlement Date'];
    const cm = suggestSettlementColumnMap(headers, mp.type);
    const t = saveSettlementTemplate(entityCode, {
      marketplaceId: mpId, name: `${mp.name} default`, columnMap: cm,
    });
    setTemplateId(t.id);
    setTick(x => x + 1);
    toast.success('Template saved · column map auto-suggested.');
  }, [entityCode, mpId, marketplaces]);

  const onUpload = useCallback(async (file: File) => {
    if (!entityCode || !mpId || !templateId) { toast.error('Pick marketplace + template first'); return; }
    setBusy(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim());
      const dataRows = lines.slice(1).map(line => {
        const cells = line.split(',');
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim(); });
        return obj;
      });
      const rep = parseSettlementFile(entityCode, mpId, templateId, { rows: dataRows, fileName: file.name });
      setReport(rep);
      toast.success(`Parsed · valid ${rep.validRows} · invalid ${rep.invalidRows}`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }, [entityCode, mpId, templateId]);

  const onCommit = useCallback(() => {
    if (!entityCode || !mpId || !report) return;
    try {
      const r = commitSettlementImport(entityCode, mpId, report.importId);
      toast.success(`Committed · inserted ${r.inserted} · duplicates ${r.duplicates} · returns ${r.returns}`);
      setTick(x => x + 1);
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode, mpId, report]);

  const onExport = useCallback(() => {
    const header: Array<string | number> = ['Order ID', 'Event', 'Gross', 'Commission', 'Fees', 'TDS', 'TCS', 'Net', 'Date'];
    const body: Array<Array<string | number>> = rows.map(r => [
      r.marketplaceOrderId, r.eventType, r.gross, r.commission, r.fees, r.tds194o, r.gstTcs, r.net, r.settlementDate,
    ]);
    exportEcomxCsv([header, ...body], 'settlement-rows');
  }, [rows]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select an entity.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
          <Banknote className="h-5 w-5" /> Settlements
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          DP-EC-6 · marketplace settlement ingestion · 26AS + GSTR-2B Table-8 cross-check accumulators.
          File-reported TDS/TCS is never overwritten.
        </p>
      </header>

      <section className="glass-card rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Marketplace</label>
            <select className="w-full mt-1 px-2 py-2 rounded-md bg-background border border-border text-sm"
              value={mpId} onChange={(e) => { setMpId(e.target.value); setTemplateId(''); setReport(null); }}>
              <option value="">Select…</option>
              {marketplaces.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Template</label>
            <select className="w-full mt-1 px-2 py-2 rounded-md bg-background border border-border text-sm"
              value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Select…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Button size="sm" variant="outline" className="mt-2" onClick={onCreateTemplate} disabled={!mpId}>
              + Auto-create template
            </Button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Upload CSV</label>
            <input type="file" accept=".csv,text/csv"
              className="w-full mt-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border file:bg-muted"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} disabled={!templateId || busy} />
          </div>
        </div>

        {report && (
          <div className="mt-3 p-3 rounded-md bg-muted/40 text-xs space-y-1">
            <div>File: <span className="font-mono">{report.fileName}</span></div>
            <div>
              Triad · total <span className="font-mono">{report.totalRows}</span>
              {' · '}valid <span className="font-mono text-success">{report.validRows}</span>
              {' · '}invalid <span className="font-mono text-destructive">{report.invalidRows}</span>
            </div>
            <Button size="sm" className="mt-2" onClick={onCommit}>
              <Upload className="h-3 w-3 mr-1" /> Commit · idempotent
            </Button>
          </div>
        )}
      </section>

      {mpId && (
        <section className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold">Settlement Rows · {rows.length}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Tax credits · 194-O ₹<span className="font-mono">{taxCredits.tds194oTotal.toFixed(2)}</span>
                {' · '}GST-TCS ₹<span className="font-mono">{taxCredits.gstTcsTotal.toFixed(2)}</span>
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={onExport} disabled={rows.length === 0}>Export CSV</Button>
          </div>
          {rows.length === 0 ? (
            <div className="text-xs text-muted-foreground p-6 text-center">No rows yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2">Order #</th>
                    <th>Event</th><th className="text-right">Gross</th><th className="text-right">Comm</th>
                    <th className="text-right">Fees</th><th className="text-right">TDS</th>
                    <th className="text-right">TCS</th><th className="text-right">Net</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map(r => (
                    <tr key={r.id} className="border-b border-border/40">
                      <td className="font-mono py-1">{r.marketplaceOrderId}</td>
                      <td>{r.eventType}</td>
                      <td className="text-right font-mono">{r.gross.toFixed(2)}</td>
                      <td className="text-right font-mono">{r.commission.toFixed(2)}</td>
                      <td className="text-right font-mono">{r.fees.toFixed(2)}</td>
                      <td className="text-right font-mono">{r.tds194o.toFixed(2)}</td>
                      <td className="text-right font-mono">{r.gstTcs.toFixed(2)}</td>
                      <td className="text-right font-mono">{r.net.toFixed(2)}</td>
                      <td>{r.settlementDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
