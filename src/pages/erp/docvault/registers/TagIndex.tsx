/**
 * @file        src/pages/erp/docvault/registers/TagIndex.tsx
 * @purpose     ISO/IEC tag taxonomy browseable index · clause-prefix grouping
 * @who         Quality · Compliance · Document Controller
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.9 BUNDLED · Q-LOCK-3a + Block A.2
 * @iso         ISO 9001:2015 · ISO 25010 Usability
 * @whom        Audit Owner · Document Controller
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema (consumes tags.iso_clause/iec_clause) ·
 *              D-NEW-BV Phase 1 mock
 * @disciplines FR-30 · FR-50 multi-entity
 * @reuses      docvault-engine.loadDocuments (read-only)
 * @[JWT]       N/A (client-side taxonomy)
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadDocuments } from '@/lib/docvault-engine';

export function TagIndex(): JSX.Element {
  const { entityCode } = useEntityCode();
  const docs = loadDocuments(entityCode);
  const [search, setSearch] = useState('');

  const taxonomy = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of docs) {
      const iso = d.tags?.iso_clause;
      const iec = d.tags?.iec_clause;
      if (iso) counts.set(iso, (counts.get(iso) ?? 0) + 1);
      if (iec) counts.set(iec, (counts.get(iec) ?? 0) + 1);
      for (const t of d.tags?.custom_tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([k]) => !search || k.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [docs, search]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Tag Index</h1>
        <p className="text-sm text-muted-foreground">
          Browse documents by ISO/IEC clauses and custom tags.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Input placeholder="Search clause (e.g. ISO 9001:2015 §7.5)..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 space-y-2">
          {taxonomy.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">No tags yet.</div>
          ) : taxonomy.map(([tag, count]) => (
            <div key={tag} className="flex items-center justify-between border-b pb-2">
              <span className="font-mono text-sm">{tag}</span>
              <Badge variant="outline">{count} docs</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default TagIndex;
