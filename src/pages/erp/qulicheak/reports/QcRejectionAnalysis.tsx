/**
 * @file src/pages/erp/qulicheak/reports/QcRejectionAnalysis.tsx
 * @purpose Trident C14 · Generic Rejection Analysis joining NCR + CAPA + MTC + FAI.
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block E
 * @decisions D-NEW-BW (memoized lookup Maps) · Q-LOCK-8a
 * @disciplines FR-30 · FR-50
 * @[JWT] reads erp_ncr_${e} · erp_capa_${e} · erp_mtc_${e} · erp_fai_${e}
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { listNcrs } from '@/lib/ncr-engine';
import { listCapas } from '@/lib/capa-engine';
import { listMtcs } from '@/lib/mtc-engine';
import { listFais } from '@/lib/fai-engine';

interface AnalysisRow {
  vendor: string;
  item: string;
  ncrCount: number;
  capaCount: number;
  mtcCount: number;
  faiCount: number;
  total: number;
}

export function QcRejectionAnalysis(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [search, setSearch] = useState('');
  const [version, setVersion] = useState(0);
  useEntityChangeEffect(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const onFocus = (): void => setVersion((v) => v + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const rows = useMemo<AnalysisRow[]>(() => {
    void version;
    const ncrs = listNcrs(entityCode);
    const capas = listCapas(entityCode);
    const mtcs = listMtcs(entityCode);
    const fais = listFais(entityCode);

    // D-NEW-BW: build buckets in a single pass per ledger
    const map = new Map<string, AnalysisRow>();
    const key = (v: string, i: string): string => `${v}::${i}`;
    const upsert = (vendor: string, item: string): AnalysisRow => {
      const k = key(vendor, item);
      const r = map.get(k) ?? { vendor, item, ncrCount: 0, capaCount: 0, mtcCount: 0, faiCount: 0, total: 0 };
      map.set(k, r);
      return r;
    };

    for (const n of ncrs) {
      const r = upsert(n.related_party_name ?? '—', n.item_name ?? '—');
      r.ncrCount += 1; r.total += 1;
    }
    const ncrById = new Map(ncrs.map((n) => [n.id, n]));
    for (const c of capas) {
      const linked = c.source === 'ncr' && 'related_ncr_id' in c
        ? ncrById.get((c as { related_ncr_id?: string }).related_ncr_id ?? '') : null;
      const vendor = linked?.related_party_name ?? '—';
      const item = linked?.item_name ?? '—';
      const r = upsert(vendor, item); r.capaCount += 1; r.total += 1;
    }
    for (const m of mtcs) {
      if (m.overall === 'fail' || m.overall === 'conditional') {
        const r = upsert(m.supplier_name, m.item_name ?? '—');
        r.mtcCount += 1; r.total += 1;
      }
    }
    for (const f of fais) {
      if (f.overall_status === 'rejected' || f.overall_status === 'conditional_accept') {
        const r = upsert(f.supplier_name ?? '—', f.item_name ?? '—');
        r.faiCount += 1; r.total += 1;
      }
    }

    const all = Array.from(map.values()).sort((a, b) => b.total - a.total);
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => r.vendor.toLowerCase().includes(q) || r.item.toLowerCase().includes(q));
  }, [entityCode, search, version]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rejection Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} vendor × item buckets · Entity {entityCode}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search vendor or item…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No rejection events recorded.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">NCR</TableHead>
                <TableHead className="text-right">CAPA</TableHead>
                <TableHead className="text-right">MTC fail</TableHead>
                <TableHead className="text-right">FAI fail</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.vendor}-${r.item}`}>
                  <TableCell className="text-xs">{r.vendor}</TableCell>
                  <TableCell className="text-xs">{r.item}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.ncrCount}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.capaCount}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.mtcCount}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.faiCount}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{r.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
