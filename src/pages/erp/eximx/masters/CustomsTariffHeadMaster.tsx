/**
 * @file        src/pages/erp/eximx/masters/CustomsTariffHeadMaster.tsx
 * @purpose     CTH Master UI · 3-bucket form · Saathi side-panel · manual refresh
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 * @decisions   EX-2-Q6=a manual refresh · EX-2-Q8=b Saathi panel inside · EX-2-Q9=b dynamic labels
 * @disciplines FR-30 · FR-50 · FR-58 · FR-26 entity-scoped
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, BookOpen, Globe, Calendar, Shield } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { CTH_SEED, DUTY_STRUCTURE_SEED } from '@/data/customs-tariff-head-seed-data';
import { loadDutyStructures, resolveDutyLabel } from '@/lib/cth-resolver';
import type { DutyStructure } from '@/types/duty-structure';
import { CTHSaathiPanel } from '../saathi/CTHSaathiPanel';
import { CTHRefreshDialog } from './CTHRefreshDialog';

export function CustomsTariffHeadMaster(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [search, setSearch] = useState('');
  const [showRefresh, setShowRefresh] = useState(false);
  const [showSaathi, setShowSaathi] = useState(false);
  const [selectedCTH, setSelectedCTH] = useState<string | null>(null);

  const structures = useMemo<DutyStructure[]>(
    () => (entityCode ? loadDutyStructures(entityCode) : DUTY_STRUCTURE_SEED),
    [entityCode],
  );

  const filtered = CTH_SEED.filter(
    (cth) =>
      cth.cth_code.includes(search) ||
      cth.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CTH × Country × Date Master</h1>
          <p className="text-sm text-muted-foreground">
            8-digit ITC(HS) tariff heads · 3-bucket duty structure · FTA preferences · Moats #8 · #11 · #14 · #15
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSaathi((v) => !v)}>
            <BookOpen className="w-4 h-4 mr-2" /> Saathi
          </Button>
          <Button onClick={() => setShowRefresh(true)}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh CTH Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className={showSaathi ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>CTH Catalog ({CTH_SEED.length} codes)</span>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search CTH code or description..."
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
                  <TableHead>CTH (8-digit)</TableHead>
                  <TableHead>Chapter (HSN 6-digit)</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No CTH codes match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((cth) => (
                    <TableRow
                      key={cth.cth_code}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedCTH(cth.cth_code)}
                    >
                      <TableCell className="font-mono">{cth.cth_code}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{cth.chapter_heading}</TableCell>
                      <TableCell>{cth.description}</TableCell>
                      <TableCell><Badge variant="outline">{cth.unit_of_measure}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={cth.status === 'active' ? 'default' : 'secondary'}>{cth.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{cth.notification_ref}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {showSaathi && (
          <div className="lg:col-span-1">
            <CTHSaathiPanel selectedCTH={selectedCTH} />
          </div>
        )}
      </div>

      {selectedCTH && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3-Bucket Duty Structure for <span className="font-mono">{selectedCTH}</span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {structures
                .filter((ds) => ds.cth_code === selectedCTH)
                .slice(0, 1)
                .flatMap((ds) =>
                  ds.buckets.map((b) => (
                    <Card key={`${ds.id}-${b.kind}`} className="bg-secondary/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {b.kind === 'customs' && <Shield className="w-4 h-4" />}
                          {b.kind === 'other' && <Globe className="w-4 h-4" />}
                          {b.kind === 'gst' && <Calendar className="w-4 h-4" />}
                          Bucket · {b.kind.toUpperCase()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1">
                        {b.kind === 'customs' && (
                          <>
                            <div>{resolveDutyLabel(b.bcd_label, b.bcd_rate)}</div>
                            <div>{resolveDutyLabel(b.sws_label, b.sws_rate)}</div>
                            {b.anti_dumping_rate !== null && (
                              <div>{resolveDutyLabel(b.anti_dumping_label, b.anti_dumping_rate)}</div>
                            )}
                          </>
                        )}
                        {b.kind === 'other' && (
                          <>
                            <div>{resolveDutyLabel(b.cvd_label, b.cvd_rate)}</div>
                            <div>{resolveDutyLabel(b.health_cess_label, b.health_cess_rate)}</div>
                            <div>{resolveDutyLabel(b.comp_cess_label, b.comp_cess_rate)}</div>
                            <div>{resolveDutyLabel(b.nccd_label, b.nccd_rate)}</div>
                          </>
                        )}
                        {b.kind === 'gst' && (
                          <>
                            <div>{resolveDutyLabel(b.igst_label, b.igst_rate)}</div>
                            <div>{resolveDutyLabel(b.cgst_label, b.cgst_rate)}</div>
                            <div>{resolveDutyLabel(b.sgst_label, b.sgst_rate)}</div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )),
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {showRefresh && <CTHRefreshDialog onClose={() => setShowRefresh(false)} />}
    </div>
  );
}
