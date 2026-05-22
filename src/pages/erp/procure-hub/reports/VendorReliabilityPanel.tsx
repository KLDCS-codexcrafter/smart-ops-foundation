/**
 * @file        VendorReliabilityPanel.tsx
 * @purpose     Top-N vendors by composite score · tracker for reliability tier.
 * @sprint      T-Phase-1.A.3.c-Procure360-OOB-Polish-PEQ-FU
 *              T-Phase-2.B-Procure360-Phase2-Polish-Part-B-ii-2 · Block A items 3/7/9/10
 * @decisions   D-NEW-AQ · D-NEW-GC remainder
 * @disciplines FR-19 · FR-30 · FR-50
 * @reuses      vendor-scoring-engine · procure360-formatters (formatDateIN · debounce)
 * @[JWT]       n/a · derived view
 */

import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getTopVendorsByScore, type VendorScore } from '@/lib/vendor-scoring-engine';
import { formatDateIN, debounce } from '@/lib/procure360-formatters';

const PAGE_SIZE = 50;
const FETCH_N = 500;  // Item 9 · scale-to-500 perf target · uses useMemo + pagination

function topQuartileThreshold(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.75);
  return Math.round((sorted[Math.min(idx, sorted.length - 1)] ?? 0) * 100) / 100;
}

export function VendorReliabilityPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');  // debounced
  const [pageIndex, setPageIndex] = useState(0);

  const vendors = useMemo<VendorScore[]>(
    () => getTopVendorsByScore(entityCode, FETCH_N),
    [entityCode],
  );

  // Item 10 · debounce search · 300ms
  const debouncedSetSearchTerm = useMemo(
    () => debounce((val: unknown) => setSearchTerm(String(val)), 300),
    [],
  );

  // Item 9 · useMemo filter + sort + pagination
  const filteredVendors = useMemo(() => {
    if (!searchTerm) return vendors;
    const lower = searchTerm.toLowerCase();
    return vendors.filter((v) =>
      v.vendor_name.toLowerCase().includes(lower) ||
      v.vendor_id.toLowerCase().includes(lower),
    );
  }, [vendors, searchTerm]);

  const sortedVendors = useMemo(
    () => [...filteredVendors].sort((a, b) => b.total_score - a.total_score),
    [filteredVendors],
  );

  const totalPages = Math.max(1, Math.ceil(sortedVendors.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pageVendors = useMemo(
    () => sortedVendors.slice(safePageIndex * PAGE_SIZE, (safePageIndex + 1) * PAGE_SIZE),
    [sortedVendors, safePageIndex],
  );

  const kpis = useMemo(() => {
    const total = sortedVendors.length;
    const avg = total === 0 ? 0
      : Math.round((sortedVendors.reduce((s, v) => s + v.total_score, 0) / total) * 100) / 100;
    const topQ = topQuartileThreshold(sortedVendors.map((v) => v.total_score));
    return { total, avg, topQ };
  }, [sortedVendors]);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Vendor Reliability</h1>
          <p className="text-sm text-muted-foreground">Composite score (price · quality · delivery · responsiveness · payment · compliance).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vendors Scored</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold font-mono">{kpis.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold font-mono">{kpis.avg}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Top Quartile (≥)</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold font-mono">{kpis.topQ}</div></CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Input
            placeholder="Search vendors by name or ID..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSetSearchTerm(e.target.value);
              setPageIndex(0);
            }}
            className="max-w-sm"
          />
          <div className="text-xs text-muted-foreground font-mono">
            {sortedVendors.length} of {vendors.length} vendors
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {pageVendors.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No vendors match.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-right p-2 w-[60px]">Rank</th>
                    <th className="text-left p-2">Vendor</th>
                    <th className="text-right p-2 w-[120px]">Total Score</th>
                    <th className="text-left p-2">Top Factors</th>
                    <th className="text-right p-2 w-[80px]">RFQs</th>
                    <th className="text-right p-2 w-[80px]">Awards</th>
                    <th className="text-left p-2 w-[120px]">Computed</th>
                  </tr>
                </thead>
                <tbody>
                  {pageVendors.map((v, i) => {
                    const tier = v.total_score >= kpis.topQ
                      ? <Badge>Top quartile</Badge>
                      : <Badge variant="outline">Standard</Badge>;
                    const topFactors = [...v.factor_breakdown]
                      .sort((a, b) => b.weighted_score - a.weighted_score)
                      .slice(0, 3)
                      .map((f) => `${f.name}:${f.weighted_score}`)
                      .join(' · ');
                    const breakdownTooltip = v.factor_breakdown
                      .map((f) => `${f.name} (w${f.weight}): ${f.weighted_score}`)
                      .join('\n');
                    const rank = safePageIndex * PAGE_SIZE + i + 1;
                    return (
                      <tr key={v.vendor_id} className="border-t">
                        <td className="p-2 text-right font-mono">{rank}</td>
                        <td className="p-2">
                          <div className="font-medium">{v.vendor_name}</div>
                          <div className="text-xs text-muted-foreground">{tier}</div>
                        </td>
                        <td className="p-2 text-right font-mono">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted">{v.total_score}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs whitespace-pre-line">
                                Composite weighted score (0-100){'\n'}
                                On-time delivery: {(v.on_time_delivery_rate * 100).toFixed(1)}%{'\n'}
                                Rejection rate: {(v.rejection_rate * 100).toFixed(1)}%{'\n'}
                                ─────────────{'\n'}
                                {breakdownTooltip}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="p-2 text-xs font-mono text-muted-foreground">{topFactors}</td>
                        <td className="p-2 text-right font-mono">{v.rfq_count}</td>
                        <td className="p-2 text-right font-mono">{v.award_count}</td>
                        <td className="p-2 text-xs font-mono">{formatDateIN(v.computed_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {safePageIndex + 1} of {totalPages} · {sortedVendors.length} vendors
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePageIndex === 0}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePageIndex >= totalPages - 1}
                onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
