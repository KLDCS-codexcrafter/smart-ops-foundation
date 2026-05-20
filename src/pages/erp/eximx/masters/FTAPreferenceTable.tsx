/**
 * @file        src/pages/erp/eximx/masters/FTAPreferenceTable.tsx
 * @purpose     FTA preference table CRUD · CAROTAR Rule 6 self-certification (Moat #11)
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 * @decisions   EX-2-Q4=b separate FTA table
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ShieldCheck } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadFTAPreferences } from '@/lib/fta-checker';
import { FTA_SEED } from '@/data/customs-tariff-head-seed-data';

export function FTAPreferenceTable(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [search, setSearch] = useState('');

  const prefs = useMemo(() => (entityCode ? loadFTAPreferences(entityCode) : FTA_SEED), [entityCode]);
  const filtered = prefs.filter((p) =>
    p.cth_code.includes(search) ||
    p.country_code.toLowerCase().includes(search.toLowerCase()) ||
    p.agreement.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" /> FTA Preference Table
        </h1>
        <p className="text-sm text-muted-foreground">
          CAROTAR Rule 6 · self-certification eligibility · 17 active Indian FTAs (top-5 seeded)
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span>Preference Records ({prefs.length})</span>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search CTH · country · agreement..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CTH</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Agreement</TableHead>
                <TableHead>Pref. BCD Rate</TableHead>
                <TableHead>CoO Required</TableHead>
                <TableHead>Self-Cert (CAROTAR)</TableHead>
                <TableHead>Effective From</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No FTA preference records match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.cth_code}</TableCell>
                    <TableCell><Badge variant="outline">{p.country_code}</Badge></TableCell>
                    <TableCell><Badge>{p.agreement}</Badge></TableCell>
                    <TableCell className="font-semibold font-mono">{p.preferential_bcd_rate}%</TableCell>
                    <TableCell>{p.coo_required ? 'Yes' : '—'}</TableCell>
                    <TableCell>
                      {p.coo_self_certification_allowed
                        ? <Badge variant="secondary">Self-Cert OK</Badge>
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{p.effective_from}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
