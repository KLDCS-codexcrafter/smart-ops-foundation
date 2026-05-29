/**
 * @file        src/pages/erp/comply360/challan-vault/ChallanVaultPage.tsx
 * @purpose     Sprint 79b · Challan Vault mega-menu shell · consumes comply360-challan-vault-engine.
 *              15-module Challan Vault UI: challan grid · OCR upload stub (DP-S79-7 · no extraction)
 *              · reconciliation centre · status filters · bulk CSV export.
 * @sprint      Sprint 79b · T-Phase-5.A.1.11-PASS-B · Block 3
 * @decisions   D-S69-1 (NATIVE) · DP-S79-7 (OCR is stub only)
 */
import { useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Upload, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import {
  storeChallan,
  listChallans,
  reconcileChallan,
  uploadChallanStub,
  exportChallansCsv,
  buildSampleChallan,
  type Challan,
  type ChallanStatus,
} from '@/lib/comply360-challan-vault-engine';

const ENTITIES = ['DEMO-CORP-01', 'ACME-PVT-LTD', 'BHARAT-AGRO-LLP'];
const FY = '2025-26';
const STATUS_FILTERS: Array<ChallanStatus | 'all'> = ['all', 'pending-recon', 'matched', 'unmatched', 'queried'];

function inr(paise: number): string {
  return `₹ ${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getUTCDate()).padStart(2, '0')} ${m[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function statusClass(s: ChallanStatus): string {
  switch (s) {
    case 'matched': return 'text-success';
    case 'unmatched': return 'text-destructive';
    case 'queried': return 'text-warning';
    default: return 'text-muted-foreground';
  }
}

export default function ChallanVaultPage(): JSX.Element {
  const [entity, setEntity] = useState<string>(ENTITIES[0]);
  const [refresh, setRefresh] = useState<number>(0);
  const [filter, setFilter] = useState<ChallanStatus | 'all'>('all');
  const fileRef = useRef<HTMLInputElement | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const challans = useMemo<Challan[]>(() => listChallans(entity, FY), [entity, refresh]);
  const visible = filter === 'all' ? challans : challans.filter((c) => c.status === filter);
  const totalAmount = challans.reduce((s, c) => s + c.amount_inr, 0);

  const onSeedSample = (): void => {
    const sample = buildSampleChallan(entity, `PMT-${Date.now().toString().slice(-6)}`);
    storeChallan(sample);
    toast.success(`Seeded sample challan · CIN ${sample.cin}`);
    setRefresh((n) => n + 1);
  };

  const onPickFile = (): void => {
    fileRef.current?.click();
  };

  const onFileChosen = (ev: React.ChangeEvent<HTMLInputElement>): void => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const meta = uploadChallanStub(f.name, f.size);
    const sample = buildSampleChallan(entity, `UPL-${Date.now().toString().slice(-6)}`);
    storeChallan({ ...sample, ocr_file_meta: meta });
    toast.success(`Uploaded ${meta.file_name} (${(meta.file_size_bytes / 1024).toFixed(1)} KB) · OCR stubbed (DP-S79-7)`);
    ev.target.value = '';
    setRefresh((n) => n + 1);
  };

  const onReconcile = (c: Challan): void => {
    const r = reconcileChallan(entity, c.id, FY);
    toast.success(`Reconciled · ${r.status}${r.mismatch_reason ? ' · ' + r.mismatch_reason : ''}`);
    setRefresh((n) => n + 1);
  };

  const onExport = (): void => {
    const csv = exportChallansCsv(challans);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `challan-vault-${entity}-${FY}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${challans.length} challan(s)`);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Archive className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Challan Vault</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Executed-challan repository · BSR/CIN-indexed · OCR upload (stub) · reconciliation against Statutory Payments + Memory · bulk CSV export.
          </p>
        </div>
        <Card className="px-3 py-2 flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-primary" />
          <div className="text-[11px] text-muted-foreground">Vault total</div>
          <div className="font-mono font-semibold">{inr(totalAmount)}</div>
        </Card>
      </div>

      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[11px] font-medium block mb-1">Entity</label>
          <select className="text-xs bg-background border rounded-md px-2 py-1" value={entity} onChange={(e) => setEntity(e.target.value)}>
            {ENTITIES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium block mb-1">Status filter</label>
          <select className="text-xs bg-background border rounded-md px-2 py-1" value={filter} onChange={(e) => setFilter(e.target.value as ChallanStatus | 'all')}>
            {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <input ref={fileRef} type="file" className="hidden" onChange={onFileChosen} accept=".pdf,.jpg,.png" />
          <Button size="sm" variant="outline" onClick={onPickFile}>
            <Upload className="h-3.5 w-3.5" />
            Upload Challan
          </Button>
          <Button size="sm" variant="outline" onClick={onSeedSample}>Seed Sample</Button>
          <Button size="sm" variant="ghost" onClick={onExport} disabled={challans.length === 0}>Export CSV</Button>
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No challans for {entity} · FY {FY} {filter !== 'all' ? `· status ${filter}` : ''}. Upload or seed to populate.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">BSR</th>
                <th className="px-3 py-2 font-medium">CIN</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium text-right">Amount</th>
                <th className="px-3 py-2 font-medium">Mode</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">OCR file</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono">{c.bsr_code}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{c.cin}</td>
                  <td className="px-3 py-2 font-mono">{fmtDate(c.deposit_date)}</td>
                  <td className="px-3 py-2 uppercase">{c.payment_type}</td>
                  <td className="px-3 py-2 font-mono text-right">{inr(c.amount_inr)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.mode}</td>
                  <td className={`px-3 py-2 font-medium ${statusClass(c.status)}`}>{c.status}</td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground">{c.ocr_file_meta?.file_name ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => onReconcile(c)}>Reconcile</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
