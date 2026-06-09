/**
 * @file     src/pages/tower/VariantBuilder.tsx
 * @sprint   SP.1 · T-SP1-Variant-Builder · extended SP.2 · T-SP2-Prudent360-ERP
 * @purpose  Super-admin Product Variant Builder. SP.2 extends with:
 *           product_kind selector · 33+ CardId grid · full LimitSet · PricingPlan
 *           with computed list-price preview · flagship Prudent360-ERP seed.
 * @canon    Limits + Pricing STORED + DISPLAYED only · NOT enforced/charged
 *           (DP-7 · Wave-2 banner). CONSUMES product-variant-engine.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Save, CheckCircle2, Package, Puzzle, Sliders, Trash2, AlertTriangle,
  LayoutGrid, IndianRupee, Layers,
} from 'lucide-react';
import { TowerLayout } from '@/components/layout/TowerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CardId, PlanTier } from '@/types/card-entitlement';
import type { FeatureId } from '@/types/plan-features';
import { FEATURE_MATRIX } from '@/types/plan-features';
import {
  VARIANT_LIMITS_HONESTY,
  EMPTY_LIMIT_SET,
  EMPTY_PRICING_PLAN,
  type ProductVariant,
  type LimitSet,
  type PricingPlan,
  type ProductKind,
  type PricingModel,
  type BillingCycle,
  type SupportTier,
} from '@/types/product-variant';
import {
  VARIANT_MODULE_IDS,
  VARIANT_ADDON_IDS,
  ALL_CARD_IDS,
  createVariant,
  publishVariant,
  listVariants,
  updateVariant,
  validateLimitSet,
  computeListPrice,
  computeChannelPrice,
  seedFlagshipPrudent360,
} from '@/lib/product-variant-engine';

const ENTITY = 'demo-entity';
const PLAN_TIERS: PlanTier[] = ['trial', 'starter', 'growth', 'enterprise'];
const PRODUCT_KINDS: ProductKind[] = ['erp', 'module', 'addon', 'bundle'];
const PRICING_MODELS: PricingModel[] = ['per_seat', 'per_company', 'flat_tier', 'usage', 'hybrid'];
const BILLING_CYCLES: BillingCycle[] = ['monthly', 'annual', 'multi_year'];
const SUPPORT_TIERS: SupportTier[] = ['basic', 'standard', 'premium', 'enterprise'];

const TIER_BADGE: Record<PlanTier, string> = {
  trial: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  starter: 'bg-slate-500/15 text-slate-300 border-slate-500/20',
  growth: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  enterprise: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
};

const KIND_BADGE: Record<ProductKind, string> = {
  erp: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  module: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  addon: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  bundle: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

interface ComposerState {
  name: string;
  description: string;
  base_plan_tier: PlanTier;
  product_kind: ProductKind;
  enabled_cards: CardId[];
  enabled_modules: string[];
  enabled_addons: string[];
  limits: LimitSet;
  pricing: PricingPlan;
  extraKey: string;
  extraValue: string;
}

const EMPTY_COMPOSER: ComposerState = {
  name: '',
  description: '',
  base_plan_tier: 'growth',
  product_kind: 'module',
  enabled_cards: [],
  enabled_modules: [],
  enabled_addons: [],
  limits: EMPTY_LIMIT_SET,
  pricing: EMPTY_PRICING_PLAN,
  extraKey: '',
  extraValue: '',
};

function formatINR(n: number): string {
  return n.toLocaleString('en-IN');
}

export default function VariantBuilder() {
  const [variants, setVariants] = useState<ProductVariant[]>(() => {
    // SP.2 · idempotent flagship seed on first mount
    seedFlagshipPrudent360(ENTITY);
    return listVariants(ENTITY);
  });
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Re-seed if storage was cleared between renders
  useEffect(() => {
    if (variants.length === 0) {
      seedFlagshipPrudent360(ENTITY);
      setVariants(listVariants(ENTITY));
    }
  }, [variants.length]);

  const limitsValidation = useMemo(
    () => validateLimitSet(composer.limits),
    [composer.limits],
  );

  const listPrice = useMemo(
    () => computeListPrice(composer.pricing, composer.limits),
    [composer.pricing, composer.limits],
  );

  const channelPrice = useMemo(
    () => computeChannelPrice(listPrice, composer.pricing.channel_margin_pct ?? 0),
    [listPrice, composer.pricing.channel_margin_pct],
  );

  const refresh = () => setVariants(listVariants(ENTITY));

  const onToggleCard = (id: CardId) => {
    setComposer((c) => ({
      ...c,
      enabled_cards: c.enabled_cards.includes(id)
        ? c.enabled_cards.filter((x) => x !== id)
        : [...c.enabled_cards, id],
    }));
  };

  const onSelectAllCards = () => {
    setComposer((c) => ({ ...c, enabled_cards: [...ALL_CARD_IDS] }));
  };

  const onClearAllCards = () => {
    setComposer((c) => ({ ...c, enabled_cards: [] }));
  };

  const onToggle = (
    list: 'enabled_modules' | 'enabled_addons',
    id: string,
  ) => {
    setComposer((c) => {
      const arr = c[list];
      return {
        ...c,
        [list]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
      };
    });
  };

  const onToggleFeature = (id: FeatureId) => {
    setComposer((c) => {
      const flags = c.limits.feature_flags.includes(id)
        ? c.limits.feature_flags.filter((x) => x !== id)
        : [...c.limits.feature_flags, id];
      return { ...c, limits: { ...c.limits, feature_flags: flags } };
    });
  };

  const onAddExtra = () => {
    const k = composer.extraKey.trim();
    const v = composer.extraValue.trim();
    if (!k) return;
    setComposer((c) => ({
      ...c,
      limits: {
        ...c.limits,
        extra: { ...c.limits.extra, [k]: /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v },
      },
      extraKey: '',
      extraValue: '',
    }));
  };

  const onRemoveExtra = (key: string) => {
    setComposer((c) => {
      const { [key]: _drop, ...rest } = c.limits.extra;
      void _drop;
      return { ...c, limits: { ...c.limits, extra: rest } };
    });
  };

  const setLimit = (k: keyof LimitSet, n: number) => {
    setComposer((c) => ({ ...c, limits: { ...c.limits, [k]: n } as LimitSet }));
  };

  const setPricing = <K extends keyof PricingPlan>(k: K, v: PricingPlan[K]) => {
    setComposer((c) => ({ ...c, pricing: { ...c.pricing, [k]: v } }));
  };

  const onSaveDraft = () => {
    if (!composer.name.trim()) {
      toast.error('Variant name is required');
      return;
    }
    if (!limitsValidation.ok) {
      toast.error(limitsValidation.errors.join('; '));
      return;
    }
    const payload = {
      name: composer.name.trim(),
      description: composer.description,
      base_plan_tier: composer.base_plan_tier,
      product_kind: composer.product_kind,
      enabled_cards: composer.enabled_cards,
      enabled_modules: composer.enabled_modules,
      enabled_addons: composer.enabled_addons,
      limits: composer.limits,
      pricing: composer.pricing,
    };
    if (editingId) {
      updateVariant(ENTITY, editingId, payload);
      toast.success('Variant draft updated');
    } else {
      createVariant(ENTITY, { ...payload, created_by: 'super-admin' });
      toast.success('Variant draft saved');
    }
    setComposer(EMPTY_COMPOSER);
    setEditingId(null);
    refresh();
  };

  const onPublish = (id: string) => {
    const v = publishVariant(ENTITY, id);
    if (v) toast.success(`Published "${v.name}"`);
    refresh();
  };

  const onEdit = (v: ProductVariant) => {
    if (v.status === 'published') {
      toast.error('Published variants are immutable. Clone to a new draft instead.');
      return;
    }
    setEditingId(v.id);
    setComposer({
      name: v.name,
      description: v.description ?? '',
      base_plan_tier: v.base_plan_tier,
      product_kind: v.product_kind ?? 'module',
      enabled_cards: [...(v.enabled_cards ?? [])],
      enabled_modules: [...v.enabled_modules],
      enabled_addons: [...v.enabled_addons],
      limits: { ...v.limits, feature_flags: [...v.limits.feature_flags], extra: { ...v.limits.extra } },
      pricing: v.pricing ? { ...v.pricing } : EMPTY_PRICING_PLAN,
      extraKey: '',
      extraValue: '',
    });
  };

  const isErp = composer.product_kind === 'erp';

  return (
    <TowerLayout title="Product Variants">
      <div className="space-y-6 max-w-7xl">
        {/* Honest Wave-2 banner (DP-7) */}
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-white/80">{VARIANT_LIMITS_HONESTY}</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          {/* Composer */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {editingId ? 'Edit draft variant' : 'New variant'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="vname">Name</Label>
                  <Input
                    id="vname" value={composer.name}
                    onChange={(e) => setComposer({ ...composer, name: e.target.value })}
                    placeholder="e.g. Prudent360 ERP — Manufacturing"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vkind">Product kind</Label>
                  <Select
                    value={composer.product_kind}
                    onValueChange={(v) => setComposer({ ...composer, product_kind: v as ProductKind })}
                  >
                    <SelectTrigger id="vkind"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCT_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="vtier">Base plan tier</Label>
                  <Select
                    value={composer.base_plan_tier}
                    onValueChange={(v) => setComposer({ ...composer, base_plan_tier: v as PlanTier })}
                  >
                    <SelectTrigger id="vtier"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLAN_TIERS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vsupport">Support tier</Label>
                  <Select
                    value={composer.limits.support_tier}
                    onValueChange={(v) => setLimit('support_tier', v as unknown as never)}
                  >
                    <SelectTrigger id="vsupport"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUPPORT_TIERS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vdesc">Description</Label>
                <Textarea
                  id="vdesc" rows={2} value={composer.description}
                  onChange={(e) => setComposer({ ...composer, description: e.target.value })}
                  placeholder="Short marketing description"
                />
              </div>

              {/* ERP card grid (only for product_kind='erp') */}
              {isErp && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                    <LayoutGrid className="h-4 w-4" /> Cards ({ALL_CARD_IDS.length} total)
                    <Badge variant="outline" className="ml-2 font-mono">
                      {composer.enabled_cards.length}/{ALL_CARD_IDS.length}
                    </Badge>
                    <div className="ml-auto flex gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={onSelectAllCards}>
                        Select all
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={onClearAllCards}>
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto rounded-lg border border-white/[0.08] p-3">
                    {ALL_CARD_IDS.map((id) => (
                      <label key={id} className="flex items-center gap-2 text-xs cursor-pointer hover:text-white">
                        <Checkbox
                          checked={composer.enabled_cards.includes(id)}
                          onCheckedChange={() => onToggleCard(id)}
                        />
                        <span className="font-mono text-white/70 truncate">{id}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* SP.1 module/addon grids — preserved for module/addon/bundle kinds */}
              {!isErp && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                      <Package className="h-4 w-4" /> Modules (28 catalog)
                      <Badge variant="outline" className="ml-auto font-mono">
                        {composer.enabled_modules.length}/{VARIANT_MODULE_IDS.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-60 overflow-y-auto rounded-lg border border-white/[0.08] p-3">
                      {VARIANT_MODULE_IDS.map((id) => (
                        <label key={id} className="flex items-center gap-2 text-xs cursor-pointer hover:text-white">
                          <Checkbox
                            checked={composer.enabled_modules.includes(id)}
                            onCheckedChange={() => onToggle('enabled_modules', id)}
                          />
                          <span className="font-mono text-white/70 truncate">{id}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                      <Puzzle className="h-4 w-4" /> Add-ons (12 catalog)
                      <Badge variant="outline" className="ml-auto font-mono">
                        {composer.enabled_addons.length}/{VARIANT_ADDON_IDS.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 rounded-lg border border-white/[0.08] p-3">
                      {VARIANT_ADDON_IDS.map((id) => (
                        <label key={id} className="flex items-center gap-2 text-xs cursor-pointer hover:text-white">
                          <Checkbox
                            checked={composer.enabled_addons.includes(id)}
                            onCheckedChange={() => onToggle('enabled_addons', id)}
                          />
                          <span className="font-mono text-white/70 truncate">{id}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Limits */}
              <div className="space-y-3 rounded-lg border border-white/[0.08] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                  <Sliders className="h-4 w-4" /> Limits
                  <span className="text-[10px] uppercase tracking-wide text-warning ml-2">
                    stored · not enforced
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {([
                    ['companies', 'companies'],
                    ['users', 'users'],
                    ['space_gb', 'space (GB)'],
                    ['branches', 'branches'],
                    ['transactions_per_month', 'txn/mo'],
                    ['retention_years', 'retention (yr)'],
                    ['api_calls', 'API calls'],
                  ] as Array<[keyof LimitSet, string]>).map(([k, label]) => (
                    <div key={String(k)} className="space-y-1">
                      <Label htmlFor={`v-${String(k)}`} className="text-xs">{label}</Label>
                      <Input
                        id={`v-${String(k)}`} type="number" min={0}
                        className="font-mono"
                        value={Number(composer.limits[k] ?? 0)}
                        onChange={(e) => setLimit(k, Number(e.target.value) || 0)}
                      />
                    </div>
                  ))}
                </div>
                {!limitsValidation.ok && (
                  <p className="text-xs text-destructive">{limitsValidation.errors.join('; ')}</p>
                )}

                {/* Feature flags */}
                <div className="space-y-1.5">
                  <Label>Feature flags</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FEATURE_MATRIX.map((f) => (
                      <label key={f.id} className="flex items-center gap-2 text-xs cursor-pointer hover:text-white">
                        <Checkbox
                          checked={composer.limits.feature_flags.includes(f.id)}
                          onCheckedChange={() => onToggleFeature(f.id)}
                        />
                        <span className="text-white/70 truncate">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Extra bag */}
                <div className="space-y-1.5">
                  <Label>Extra (key/value bag)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="key" className="font-mono text-xs"
                      value={composer.extraKey}
                      onChange={(e) => setComposer({ ...composer, extraKey: e.target.value })}
                    />
                    <Input
                      placeholder="value" className="font-mono text-xs"
                      value={composer.extraValue}
                      onChange={(e) => setComposer({ ...composer, extraValue: e.target.value })}
                    />
                    <Button type="button" size="sm" variant="secondary" onClick={onAddExtra}>Add</Button>
                  </div>
                  {Object.keys(composer.limits.extra).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(composer.limits.extra).map(([k, v]) => (
                        <Badge key={k} variant="outline" className="font-mono text-[10px] gap-1">
                          {k}={String(v)}
                          <button onClick={() => onRemoveExtra(k)} className="hover:text-destructive">×</button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3 rounded-lg border border-white/[0.08] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                  <IndianRupee className="h-4 w-4" /> Pricing
                  <span className="text-[10px] uppercase tracking-wide text-warning ml-2">
                    stored · not charged
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Model</Label>
                    <Select
                      value={composer.pricing.model}
                      onValueChange={(v) => setPricing('model', v as PricingModel)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRICING_MODELS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Billing cycle</Label>
                    <Select
                      value={composer.pricing.billing_cycle}
                      onValueChange={(v) => setPricing('billing_cycle', v as BillingCycle)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BILLING_CYCLES.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Trial days</Label>
                    <Input
                      type="number" min={0} className="font-mono"
                      value={composer.pricing.trial_days ?? 0}
                      onChange={(e) => setPricing('trial_days', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Base price (₹)</Label>
                    <Input
                      type="number" min={0} className="font-mono"
                      value={composer.pricing.base_price}
                      onChange={(e) => setPricing('base_price', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Per user (₹)</Label>
                    <Input
                      type="number" min={0} className="font-mono"
                      value={composer.pricing.per_user_price ?? 0}
                      onChange={(e) => setPricing('per_user_price', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Per company (₹)</Label>
                    <Input
                      type="number" min={0} className="font-mono"
                      value={composer.pricing.per_company_price ?? 0}
                      onChange={(e) => setPricing('per_company_price', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Per GB (₹)</Label>
                    <Input
                      type="number" min={0} className="font-mono"
                      value={composer.pricing.per_gb_price ?? 0}
                      onChange={(e) => setPricing('per_gb_price', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Discount %</Label>
                    <Input
                      type="number" min={0} max={100} className="font-mono"
                      value={composer.pricing.discount_pct ?? 0}
                      onChange={(e) => setPricing('discount_pct', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Channel margin %</Label>
                    <Input
                      type="number" min={0} max={100} className="font-mono"
                      value={composer.pricing.channel_margin_pct ?? 0}
                      onChange={(e) => setPricing('channel_margin_pct', Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
                {/* Computed preview (read-only · display only) */}
                <div className="rounded-md border border-white/[0.08] bg-white/[0.02] p-3 space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-white/70">
                    <span>List price (preview)</span>
                    <span className="text-white">₹ {formatINR(listPrice)}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Channel price ({composer.pricing.channel_margin_pct ?? 0}% margin)</span>
                    <span className="text-white">₹ {formatINR(channelPrice)}</span>
                  </div>
                  <p className="text-[10px] text-warning pt-1">
                    Display math only — no charging at runtime (Wave-2).
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={onSaveDraft} disabled={!limitsValidation.ok}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? 'Update draft' : 'Save draft'}
                </Button>
                {editingId && (
                  <Button variant="ghost" onClick={() => { setComposer(EMPTY_COMPOSER); setEditingId(null); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Variant list */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4" /> Variants ({variants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {variants.length === 0 ? (
                <div className="text-sm text-white/50 py-8 text-center">
                  No variants yet. Compose one on the left.
                </div>
              ) : (
                <div className="space-y-3">
                  {variants.map((v) => {
                    const kind = v.product_kind ?? 'module';
                    const vListPrice = v.pricing
                      ? computeListPrice(v.pricing, v.limits)
                      : null;
                    return (
                      <div
                        key={v.id}
                        className="rounded-lg border border-white/[0.08] p-3 space-y-2 hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{v.name}</p>
                            {v.description && (
                              <p className="text-xs text-white/50 truncate">{v.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge className={cn('text-[10px] border', KIND_BADGE[kind])}>
                              {kind}
                            </Badge>
                            <Badge className={cn('text-[10px] border', TIER_BADGE[v.base_plan_tier])}>
                              {v.base_plan_tier}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                v.status === 'published'
                                  ? 'border-emerald-500/30 text-emerald-400'
                                  : 'border-amber-500/30 text-amber-400',
                              )}
                            >
                              {v.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[10px] text-white/60 font-mono">
                          {kind === 'erp' && (
                            <span>cards:{(v.enabled_cards ?? []).length}</span>
                          )}
                          <span>modules:{v.enabled_modules.length}</span>
                          <span>addons:{v.enabled_addons.length}</span>
                          <span>users:{v.limits.users ?? v.limits.max_users}</span>
                          <span>gb:{v.limits.space_gb ?? v.limits.storage_gb}</span>
                          <span>companies:{v.limits.companies ?? 1}</span>
                          {vListPrice !== null && (
                            <span>list:₹{formatINR(vListPrice)}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {v.status === 'draft' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => onEdit(v)}>
                                <Sliders className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              <Button size="sm" onClick={() => onPublish(v.id)}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Publish
                              </Button>
                            </>
                          )}
                          {v.status === 'published' && (
                            <span className="text-[10px] text-white/40 flex items-center gap-1">
                              <Trash2 className="h-3 w-3" /> immutable (clone to revise)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TowerLayout>
  );
}
