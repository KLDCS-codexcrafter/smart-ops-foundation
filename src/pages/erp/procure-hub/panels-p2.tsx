/**
 * @file        panels-p2.tsx
 * @purpose     Sprint 45b-i · 5 NEW Procure360 panels (Blocks A-E) consuming Sprint 45a engines
 * @sprint      T-Phase-2.B-Procure360-Phase2-Polish-Part-B · Block A/B/C/D/E
 * @decisions   Strategy 2 Pragmatic Mix · ZERO touches on src/lib/oob/* directory
 *              Block D forced to use oob/alternate-vendor-suggest (no 45a equivalent)
 *              Block E dual-consumer: Welcome KPI unchanged (uses oob shim) ·
 *              Dashboard widget here uses Sprint 45a contract-expiry-alert-engine
 *              with RateContract→VendorAgreementInput adapter (lives in this file · NOT a new engine)
 * @disciplines FR-19 SIBLING · FR-22 · FR-26 · FR-54 CC SSOT · src/lib/oob/* 0-DIFF
 * @[JWT]       reads via engine layers · no direct API calls
 */
import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Trophy, Sparkles, FileText, TrendingUp, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

import { useEntityCode } from '@/hooks/useEntityCode';

// ─── Sprint 45a engines (D-NEW-FT/FU/FV/FX) ───
import {
  autoRankVendorsForCategory,
  getSuggestedVendor,
  type ItemCategoryRanking,
  type RankBasis,
} from '@/lib/vendor-auto-rank-engine';
import {
  loadTemplates,
  listByCategory,
  applyTemplate,
  type AppliedTemplate,
} from '@/lib/enquiry-template-engine';
import type { EnquiryTemplate, EnquiryTemplateCategory } from '@/types/enquiry-template';
import { getItemPriceBenchmark } from '@/lib/price-benchmark-engine';
import type { ItemPriceBenchmark } from '@/types/price-benchmark';
import {
  scanAgreements,
  loadAcknowledgments,
  persistAlert,
  acknowledgeAlert,
  generateRenewalEnquiry,
  summarizeAlerts,
  type VendorAgreementInput,
} from '@/lib/contract-expiry-alert-engine';
import type { ContractExpiryAlert, ExpiryTier } from '@/types/contract-expiry-alert';

// ─── Block D forced consumer: oob/alternate-vendor-suggest (0-DIFF · no 45a replacement) ───
import { suggestAlternates, type AlternateSuggestion } from '@/lib/oob/alternate-vendor-suggest';
import {
  getSourcingRecommendationForItem,
  type SourcingRecommendation,
} from '@/lib/sourcing-recommendation-engine';

// ─── Block E adapter source (panels-p2 internal · keeps engine layer clean) ───
import { listExpiringContracts } from '@/lib/rate-contract-engine';
import type { RateContract } from '@/types/rate-contract';

const inr = (n: number | null | undefined): string =>
  n == null ? '—' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Block E adapter · RateContract → VendorAgreementInput
 * Internal to panels-p2.tsx · NOT a new engine file (per founder Strategy 2 ratification).
 */
function rateContractToVendorAgreementInput(c: RateContract): VendorAgreementInput {
  return {
    id: c.id,
    agreement_number: c.contract_no,
    vendor_id: c.vendor_id,
    vendor_name: c.vendor_name,
    agreement_end_date: c.valid_to,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   BLOCK A · D-NEW-FT · Vendor Auto-Rank UI
   ═══════════════════════════════════════════════════════════════════════════ */

const ITEM_CATEGORIES: { value: string; label: string }[] = [
  { value: 'steel', label: 'Steel' },
  { value: 'bearings', label: 'Bearings' },
  { value: 'lubricants', label: 'Lubricants' },
  { value: 'pcb_components', label: 'PCB Components' },
  { value: 'welding_consumables', label: 'Welding Consumables' },
  { value: 'general', label: 'General' },
];

export function VendorAutoRankPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [category, setCategory] = useState<string>('steel');
  const [basis, setBasis] = useState<RankBasis>('blended');

  const ranking: ItemCategoryRanking = useMemo(
    () => autoRankVendorsForCategory(entityCode, category, basis),
    [entityCode, category, basis],
  );

  const suggested = useMemo(
    () => getSuggestedVendor(entityCode, category),
    [entityCode, category],
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6" />
          Vendor Auto-Rank
        </h1>
        <p className="text-sm text-muted-foreground">
          OOB-50 · Top 3 vendors per item-category · composite + reliability scoring
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Item Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ITEM_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ranking Basis</Label>
            <Select value={basis} onValueChange={(v) => setBasis(v as RankBasis)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="blended">Blended (60% composite + 40% reliability)</SelectItem>
                <SelectItem value="composite_score">Composite score only</SelectItem>
                <SelectItem value="reliability_score">Reliability score only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Badge variant="outline" className="font-mono">
              Total scored: {ranking.total_vendors_scored}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {suggested ? (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Suggested Vendor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{suggested.vendor_name}</p>
                <p className="text-xs text-muted-foreground">{suggested.suggestion_reason}</p>
              </div>
              <Badge>Rank #{suggested.rank}</Badge>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Top 3 Ranked Vendors</CardTitle></CardHeader>
        <CardContent className="p-0">
          {ranking.top_3.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              No scored vendors yet for this category.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Composite</TableHead>
                  <TableHead className="text-right">Reliability</TableHead>
                  <TableHead>Top Factors</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.top_3.map((v) => (
                  <TableRow key={v.vendor_id}>
                    <TableCell className="font-mono">#{v.rank}</TableCell>
                    <TableCell className="font-medium">{v.vendor_name}</TableCell>
                    <TableCell className="text-right font-mono">{v.composite_score.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{v.reliability_score.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.factor_highlights
                        .slice(0, 3)
                        .map((f) => `${f.factor}:${f.rank.toFixed(1)}`)
                        .join(' · ')}
                    </TableCell>
                    <TableCell>
                      {v.is_suggested ? (
                        <Badge>Suggested</Badge>
                      ) : (
                        <Badge variant="outline">Eligible</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Computed at {fmtDate(ranking.ranking_computed_at)} · vendor-scoring + vendor-reliability
        engines stay 0-DIFF (FR-19 SIBLING consumer pattern).
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BLOCK B · D-NEW-FU · Enquiry Template Library UI
   ═══════════════════════════════════════════════════════════════════════════ */

const TEMPLATE_CATEGORIES: { value: EnquiryTemplateCategory; label: string }[] = [
  { value: 'steel', label: 'Steel' },
  { value: 'bearings', label: 'Bearings' },
  { value: 'lubricants', label: 'Lubricants' },
  { value: 'pcb_components', label: 'PCB Components' },
  { value: 'welding_consumables', label: 'Welding Consumables' },
  { value: 'custom', label: 'Custom' },
];

export function EnquiryTemplateLibraryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [category, setCategory] = useState<EnquiryTemplateCategory>('steel');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedTemplate | null>(null);
  const [version, setVersion] = useState(0);

  // Seed starter templates on first load
  useMemo(() => loadTemplates(entityCode), [entityCode]);

  const templates: EnquiryTemplate[] = useMemo(
    () => { void version; return listByCategory(entityCode, category); },
    [entityCode, category, version],
  );

  const handleApply = useCallback(
    (templateId: string) => {
      const result = applyTemplate(entityCode, templateId);
      if (result) {
        setSelectedId(templateId);
        setApplied(result);
        setVersion((v) => v + 1);
        toast.success('Template applied · specs/clauses preview ready');
      } else {
        toast.error('Template not found');
      }
    },
    [entityCode],
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Enquiry Template Library
        </h1>
        <p className="text-sm text-muted-foreground">
          OOB-51 · Pre-built spec/clause templates · 5 starter categories
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as EnquiryTemplateCategory)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEMPLATE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Approved Templates</CardTitle></CardHeader>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              No approved templates in this category.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead className="text-right">Specs</TableHead>
                  <TableHead className="text-right">Usage Count</TableHead>
                  <TableHead>INCO Terms</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id} className={selectedId === t.id ? 'bg-muted/50' : ''}>
                    <TableCell className="font-medium">{t.template_name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {t.default_specifications.length}
                    </TableCell>
                    <TableCell className="text-right font-mono">{t.usage_count}</TableCell>
                    <TableCell className="text-xs">{t.default_inco_terms ?? '—'}</TableCell>
                    <TableCell className="text-xs">{t.default_payment_terms ?? '—'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleApply(t.id)}>
                        Apply
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {applied ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applied Template Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium mb-1">Specifications</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {applied.specs.map((s) => (
                  <li key={s.field_name}>
                    <span className="font-mono">{s.field_name}</span>: {s.default_value}
                    {s.is_required ? ' (required)' : ''}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Quality Clauses</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                {applied.quality_clauses.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Delivery / Packing Terms</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                {applied.delivery_terms.map((d, i) => <li key={`d-${i}`}>{d}</li>)}
                {applied.packing_terms.map((p, i) => <li key={`p-${i}`}>{p}</li>)}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">INCO Terms</p>
                <p className="text-sm">{applied.inco_terms ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Terms</p>
                <p className="text-sm">{applied.payment_terms ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BLOCK C · D-NEW-FV · Price Benchmark UI
   ═══════════════════════════════════════════════════════════════════════════ */

export function PriceBenchmarkPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [itemId, setItemId] = useState('');
  const [benchmark, setBenchmark] = useState<ItemPriceBenchmark | null>(null);
  const [checked, setChecked] = useState(false);

  const handleLookup = useCallback(() => {
    if (!itemId.trim()) {
      toast.error('Item ID required');
      return;
    }
    const result = getItemPriceBenchmark(entityCode, itemId.trim());
    setBenchmark(result);
    setChecked(true);
    if (!result) toast.info('No PO history found for this item');
  }, [entityCode, itemId]);

  const varianceBadge = (v: ItemPriceBenchmark['variance_indicator']): JSX.Element => {
    if (v === 'green') return <Badge className="bg-success text-success-foreground">Below average</Badge>;
    if (v === 'amber') return <Badge variant="secondary">Within ±10%</Badge>;
    if (v === 'red') return <Badge variant="destructive">Above average</Badge>;
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Price Benchmark
        </h1>
        <p className="text-sm text-muted-foreground">
          OOB-52 · 90/180/365-day rolling PO average · last 5 prices · variance indicator
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex gap-3 items-end">
          <div className="flex-1 max-w-md">
            <Label>Item ID</Label>
            <Input
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              placeholder="Enter item_id"
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            />
          </div>
          <Button onClick={handleLookup}>Lookup</Button>
        </CardContent>
      </Card>

      {checked && !benchmark ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center">
            No purchase history found for item <span className="font-mono">{itemId}</span>.
          </CardContent>
        </Card>
      ) : null}

      {benchmark ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Avg · 90 days</p>
                <p className="text-2xl font-bold font-mono mt-1">{inr(benchmark.avg_90_days)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Avg · 180 days</p>
                <p className="text-2xl font-bold font-mono mt-1">{inr(benchmark.avg_180_days)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Avg · 365 days</p>
                <p className="text-2xl font-bold font-mono mt-1">{inr(benchmark.avg_365_days)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Variance Signal</p>
                <div className="mt-2">{varianceBadge(benchmark.variance_indicator)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Last 5 PO Prices</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>UOM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benchmark.last_5_po_prices.map((p) => (
                    <TableRow key={p.po_id}>
                      <TableCell>{fmtDate(p.po_date)}</TableCell>
                      <TableCell>{p.vendor_name}</TableCell>
                      <TableCell>{p.item_name}</TableCell>
                      <TableCell className="text-right font-mono">{inr(p.rate)}</TableCell>
                      <TableCell>{p.uom}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Cached for 24h · Phase 3 will hook external LME/MCX/industry feeds.
          </p>
        </>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BLOCK D · D-NEW-FW · Alternate Vendor Suggest UI
   ═══════════════════════════════════════════════════════════════════════════ */

export function AlternateVendorSuggestPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [itemId, setItemId] = useState('');
  const [contextId, setContextId] = useState('historical');
  const [vendorId, setVendorId] = useState('');
  const [rate, setRate] = useState('');
  const [suggestion, setSuggestion] = useState<AlternateSuggestion | null>(null);
  const [concentration, setConcentration] = useState<SourcingRecommendation | null>(null);
  const [checked, setChecked] = useState(false);

  const handleAnalyze = useCallback(() => {
    const numericRate = Number(rate);
    if (!itemId || !vendorId || !Number.isFinite(numericRate) || numericRate <= 0) {
      toast.error('Item ID, current vendor, and quoted rate are required');
      return;
    }
    setSuggestion(suggestAlternates(itemId.trim(), numericRate, vendorId.trim(), entityCode));
    setConcentration(
      getSourcingRecommendationForItem(itemId.trim(), contextId.trim() || 'historical', entityCode),
    );
    setChecked(true);
  }, [entityCode, itemId, vendorId, rate, contextId]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" />
          Alternate Vendor Suggest
        </h1>
        <p className="text-sm text-muted-foreground">
          OOB-53 · Quote vs benchmark deviation + sourcing concentration banner
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Item ID</Label>
            <Input value={itemId} onChange={(e) => setItemId(e.target.value)} />
          </div>
          <div>
            <Label>Current Vendor ID</Label>
            <Input value={vendorId} onChange={(e) => setVendorId(e.target.value)} />
          </div>
          <div>
            <Label>Quoted Rate</Label>
            <Input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          <div>
            <Label>Context ID</Label>
            <Input
              value={contextId}
              onChange={(e) => setContextId(e.target.value)}
              placeholder="enquiry_id or historical"
            />
          </div>
          <div className="md:col-span-4">
            <Button onClick={handleAnalyze}>Analyze</Button>
          </div>
        </CardContent>
      </Card>

      {checked && concentration ? (
        <Card className="border-warning">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Sourcing Concentration Banner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <Badge
                variant={
                  concentration.recommended_strategy === 'force_alternate' ? 'destructive' :
                  concentration.recommended_strategy === 'split_3+' ? 'default' :
                  concentration.recommended_strategy === 'split_2' ? 'secondary' : 'outline'
                }
              >
                {concentration.recommended_strategy.replace(/_/g, ' ')}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Primary share {concentration.primary_share_pct}%
              </span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
              {concentration.rationale.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {checked && suggestion === null ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center">
            No deviation flagged · quote is within benchmark range.
          </CardContent>
        </Card>
      ) : null}

      {suggestion ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suggested Alternates</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{suggestion.reason}</p>
          </CardHeader>
          <CardContent className="p-0">
            {suggestion.alternates.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                No alternate vendors scored above current vendor.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">RFQs</TableHead>
                    <TableHead className="text-right">Awards</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestion.alternates.map((a) => (
                    <TableRow key={a.vendor_id}>
                      <TableCell className="font-medium">{a.vendor_name}</TableCell>
                      <TableCell className="text-right font-mono">{a.total_score.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{a.rfq_count}</TableCell>
                      <TableCell className="text-right font-mono">{a.award_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BLOCK E · D-NEW-FX · Contract Expiry Dashboard
   (Uses Sprint 45a contract-expiry-alert-engine via in-panel adapter ·
    Welcome KPI tile in panels.tsx:119 stays on oob shim · 0-DIFF · dual-consumer)
   ═══════════════════════════════════════════════════════════════════════════ */

const ALERT_WINDOW_DAYS = 90;

export function ContractExpiryDashboardPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [version, setVersion] = useState(0);
  const [actionNote, setActionNote] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const alerts: ContractExpiryAlert[] = useMemo(() => {
    const contracts = listExpiringContracts(entityCode, ALERT_WINDOW_DAYS);
    const inputs: VendorAgreementInput[] = contracts.map(rateContractToVendorAgreementInput);
    const computed = scanAgreements(inputs, ALERT_WINDOW_DAYS);
    // Persist newly-discovered alerts so acknowledgments survive reload
    const acked = loadAcknowledgments(entityCode);
    const ackedAgreementIds = new Set(acked.map((a) => a.agreement_id));
    for (const c of computed) {
      if (!ackedAgreementIds.has(c.agreement_id)) {
        persistAlert(entityCode, c);
      }
    }
    return loadAcknowledgments(entityCode);
    // version triggers recompute after acknowledgment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, version]);

  const summary = useMemo(() => summarizeAlerts(alerts), [alerts]);

  const urgent = alerts.filter((a) => a.tier === 'urgent');
  const reminder = alerts.filter((a) => a.tier === 'reminder');
  const informational = alerts.filter((a) => a.tier === 'informational');

  const handleAcknowledge = useCallback(
    (alertId: string) => {
      try {
        acknowledgeAlert(entityCode, alertId, 'mock-user', actionNote || 'Acknowledged', 'no_action');
        setActionNote('');
        setActingId(null);
        setVersion((v) => v + 1);
        toast.success('Acknowledged');
      } catch (e) {
        toast.error(`Failed: ${(e as Error).message}`);
      }
    },
    [entityCode, actionNote],
  );

  const handleGenerateRenewal = useCallback(
    (alertId: string) => {
      try {
        const result = generateRenewalEnquiry(entityCode, alertId, 'mock-user');
        setVersion((v) => v + 1);
        toast.success(`Renewal enquiry prepared · ${result.alert.agreement_number}`);
      } catch (e) {
        toast.error(`Failed: ${(e as Error).message}`);
      }
    },
    [entityCode],
  );

  const tierBadge = (tier: ExpiryTier): JSX.Element => {
    if (tier === 'urgent') return <Badge variant="destructive">Urgent ≤30d</Badge>;
    if (tier === 'reminder') return <Badge variant="secondary">Reminder ≤60d</Badge>;
    return <Badge variant="outline">Info ≤90d</Badge>;
  };

  const renderRow = (a: ContractExpiryAlert): JSX.Element => (
    <TableRow key={a.id}>
      <TableCell>{tierBadge(a.tier)}</TableCell>
      <TableCell className="font-medium">{a.vendor_name}</TableCell>
      <TableCell className="font-mono">{a.agreement_number}</TableCell>
      <TableCell>{fmtDate(a.agreement_end_date)}</TableCell>
      <TableCell className="text-right font-mono">{a.days_to_expiry}d</TableCell>
      <TableCell>
        {a.acknowledged ? (
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {a.action_taken ?? 'ack'}
          </Badge>
        ) : actingId === a.id ? (
          <div className="flex gap-2 items-center">
            <Input
              className="h-8 w-40"
              placeholder="Note"
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
            />
            <Button size="sm" onClick={() => handleAcknowledge(a.id)}>OK</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setActingId(null); setActionNote(''); }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setActingId(a.id)}>
              Acknowledge
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleGenerateRenewal(a.id)}>
              Renewal Enquiry
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          Contract Expiry Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          OOB-54 · Rate-contract expiry watch · 30/60/90-day tiers · renewal enquiry generator
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiTile label="Total" value={summary.total} />
        <KpiTile label="Urgent" value={summary.urgent} tone="destructive" />
        <KpiTile label="Reminder" value={summary.reminder} tone="secondary" />
        <KpiTile label="Info" value={summary.informational} />
        <KpiTile label="Acknowledged" value={summary.acknowledged} />
        <KpiTile label="Pending" value={summary.pending} />
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center">
            No rate-contracts expiring in the next {ALERT_WINDOW_DAYS} days.
          </CardContent>
        </Card>
      ) : (
        <>
          {urgent.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Urgent (≤30 days)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{urgent.map(renderRow)}</TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {reminder.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Reminder (31–60 days)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{reminder.map(renderRow)}</TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {informational.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Informational (61–90 days)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{informational.map(renderRow)}</TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Dashboard consumes Sprint 45a contract-expiry-alert-engine via
        RateContract→VendorAgreementInput adapter (in-panel) · Welcome KPI tile uses
        oob/contract-expiry-alerts thin wrapper · D-127/128a 139 invariant preserved.
      </p>
    </div>
  );
}

function KpiTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'destructive' | 'secondary';
}): JSX.Element {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={
            'text-2xl font-bold font-mono mt-1 ' +
            (tone === 'destructive' ? 'text-destructive' : '')
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

