/**
 * @file     src/pages/build-your-plan/BuildYourPlanPage.tsx
 * @sprint   SP.4 · T-SP4-Build-Your-Plan · SaaS Productization ARC CLOSE
 * @purpose  Customer-facing self-serve plan configurator (the selling prototype).
 *           Compose base + add-ons + conditions → live price (CONSUMES
 *           computeListPrice/computeChannelPrice) → CTA creates a
 *           ProvisionRequest (CONSUMES provisioning-engine createProvisionRequest).
 * @canon    Live price is DISPLAY math only. CTA creates a request only.
 *           NO checkout · NO payment · NO instant provisioning (Wave-2).
 *           Catalog ids + CardIds are REAL (no fabricated).
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, ShoppingCart, Sliders, Package,
  Puzzle, Sparkles, IndianRupee, Building2, Users, HardDrive, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ALL_CARD_IDS,
  VARIANT_MODULE_IDS,
  VARIANT_ADDON_IDS,
  computeListPrice,
  computeChannelPrice,
} from '@/lib/product-variant-engine';
import {
  EMPTY_LIMIT_SET,
  EMPTY_PRICING_PLAN,
  type LimitSet,
  type PricingPlan,
  type PricingModel,
  type BillingCycle,
} from '@/types/product-variant';
import { createProvisionRequest } from '@/lib/provisioning-engine';
import type {
  ProvisionRequest,
  ProvisionRequestType,
} from '@/types/provisioning';

const ENTITY = 'public-build-your-plan';

export const BUILD_YOUR_PLAN_HONESTY =
  'Live quote · request drops into the provisioning queue · checkout, payment & instant provisioning arrive with Wave-2.';

type BaseKind = 'erp' | 'module' | 'bundle';

const BUNDLE_IDS = VARIANT_MODULE_IDS.filter((id) => id.startsWith('bundle-'));
const STANDALONE_MODULE_IDS = VARIANT_MODULE_IDS.filter((id) => !id.startsWith('bundle-'));
const CORE_ERP_PRESET: readonly string[] = [
  'fincore', 'salesx', 'procure360', 'inventory-hub', 'insightx', 'command-center',
];

const STEPS = ['Base', 'Add-ons', 'Conditions', 'Plan & Price', 'Request'] as const;
type Step = (typeof STEPS)[number];

export default function BuildYourPlanPage() {
  const [step, setStep] = useState<Step>('Base');
  const [baseKind, setBaseKind] = useState<BaseKind>('erp');
  const [enabledCards, setEnabledCards] = useState<string[]>([...CORE_ERP_PRESET]);
  const [moduleId, setModuleId] = useState<string>(STANDALONE_MODULE_IDS[0] ?? '');
  const [bundleId, setBundleId] = useState<string>(BUNDLE_IDS[0] ?? '');
  const [enabledAddons, setEnabledAddons] = useState<string[]>([]);
  const [limits, setLimits] = useState<LimitSet>({ ...EMPTY_LIMIT_SET, companies: 1, users: 10, space_gb: 25 });
  const [pricing, setPricing] = useState<PricingPlan>({
    ...EMPTY_PRICING_PLAN,
    model: 'hybrid',
    base_price: 4999,
    per_user_price: 499,
    per_company_price: 1999,
    per_gb_price: 25,
    billing_cycle: 'monthly',
    discount_pct: 0,
    channel_margin_pct: 0,
  });
  const [requestType, setRequestType] = useState<ProvisionRequestType>('demo');
  const [requesterName, setRequesterName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState<ProvisionRequest | null>(null);

  // billing-cycle discount overlay (display only)
  const cycleDiscount = pricing.billing_cycle === 'annual' ? 10 : pricing.billing_cycle === 'multi_year' ? 18 : 0;
  const effectivePricing: PricingPlan = useMemo(
    () => ({ ...pricing, discount_pct: Math.max(pricing.discount_pct ?? 0, cycleDiscount) }),
    [pricing, cycleDiscount],
  );

  // ── LIVE PRICE · CONSUMES computeListPrice (display math) ──
  const listPrice = useMemo(
    () => computeListPrice(effectivePricing, limits),
    [effectivePricing, limits],
  );
  const channelPrice = useMemo(
    () => computeChannelPrice(listPrice, effectivePricing.channel_margin_pct ?? 0),
    [listPrice, effectivePricing.channel_margin_pct],
  );

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function planSummary(): string {
    const baseLabel =
      baseKind === 'erp'
        ? `Prudent360 ERP (${enabledCards.length} cards)`
        : baseKind === 'module'
        ? `Module: ${moduleId}`
        : `Bundle: ${bundleId}`;
    return [
      `Base: ${baseLabel}`,
      `Add-ons: ${enabledAddons.length ? enabledAddons.join(', ') : 'none'}`,
      `Companies ${limits.companies} · Users ${limits.users} · Space ${limits.space_gb}GB`,
      `Pricing model: ${effectivePricing.model} · ${effectivePricing.billing_cycle} · list ₹${listPrice}`,
    ].join(' | ');
  }

  // ── CTA · CONSUMES provisioning-engine createProvisionRequest ──
  function handleSubmit() {
    if (!requesterName.trim()) return;
    const req = createProvisionRequest(ENTITY, {
      type: requestType,
      requester_name: requesterName.trim(),
      notes: `${planSummary()}${notes.trim() ? ` || ${notes.trim()}` : ''}`,
    });
    setSubmitted(req);
  }

  const canNext =
    step === 'Base'
      ? (baseKind === 'erp' ? enabledCards.length > 0 : baseKind === 'module' ? !!moduleId : !!bundleId)
      : true;

  if (submitted) {
    return (
      <ConfirmationView
        request={submitted}
        summary={planSummary()}
        listPrice={listPrice}
        onReset={() => {
          setSubmitted(null);
          setStep('Base');
          setRequesterName('');
          setNotes('');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/welcome" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Build Your Plan</h1>
            <Badge variant="secondary" className="font-mono text-[10px]">SP.4 · Tier-L</Badge>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <IndianRupee className="h-3.5 w-3.5" />
            <span>Live quote ₹{listPrice.toLocaleString('en-IN')}/{effectivePricing.billing_cycle === 'monthly' ? 'mo' : effectivePricing.billing_cycle === 'annual' ? 'yr' : '3yr'}</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Honest banner */}
        <div className="rounded-lg border border-warning/30 bg-warning/10 text-warning-foreground px-4 py-3 flex gap-3 items-start">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-sm">{BUILD_YOUR_PLAN_HONESTY}</p>
        </div>

        {/* Stepper */}
        <nav className="flex flex-wrap gap-2" aria-label="Configurator steps">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                step === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground',
              )}
            >
              <span className="font-mono mr-1">{i + 1}.</span>{s}
            </button>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <main className="space-y-4">
            {step === 'Base' && (
              <BaseStep
                baseKind={baseKind} setBaseKind={setBaseKind}
                enabledCards={enabledCards} setEnabledCards={setEnabledCards}
                moduleId={moduleId} setModuleId={setModuleId}
                bundleId={bundleId} setBundleId={setBundleId}
                toggle={toggle}
              />
            )}
            {step === 'Add-ons' && (
              <AddonStep enabledAddons={enabledAddons} setEnabledAddons={setEnabledAddons} toggle={toggle} />
            )}
            {step === 'Conditions' && (
              <ConditionsStep limits={limits} setLimits={setLimits} />
            )}
            {step === 'Plan & Price' && (
              <PriceStep
                pricing={pricing} setPricing={setPricing}
                effectivePricing={effectivePricing}
                limits={limits}
                listPrice={listPrice} channelPrice={channelPrice}
              />
            )}
            {step === 'Request' && (
              <RequestStep
                requestType={requestType} setRequestType={setRequestType}
                requesterName={requesterName} setRequesterName={setRequesterName}
                notes={notes} setNotes={setNotes}
                onSubmit={handleSubmit}
              />
            )}

            {/* Footer nav */}
            <div className="flex justify-between pt-2">
              <Button
                variant="outline" size="sm"
                onClick={() => {
                  const idx = STEPS.indexOf(step);
                  if (idx > 0) setStep(STEPS[idx - 1]);
                }}
                disabled={STEPS.indexOf(step) === 0}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {step !== 'Request' && (
                <Button
                  size="sm"
                  onClick={() => {
                    const idx = STEPS.indexOf(step);
                    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
                  }}
                  disabled={!canNext}
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </main>

          {/* Sticky price sidebar */}
          <aside className="lg:sticky lg:top-24 self-start">
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-primary" /> Live Quote
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="font-mono text-2xl text-foreground">
                  ₹{listPrice.toLocaleString('en-IN')}
                  <span className="text-xs text-muted-foreground ml-1">
                    /{effectivePricing.billing_cycle === 'monthly' ? 'mo' : effectivePricing.billing_cycle === 'annual' ? 'yr' : '3yr'}
                  </span>
                </div>
                {(effectivePricing.channel_margin_pct ?? 0) > 0 && (
                  <div className="text-xs text-muted-foreground font-mono">
                    Channel price: ₹{channelPrice.toLocaleString('en-IN')} (margin {effectivePricing.channel_margin_pct}%)
                  </div>
                )}
                <hr className="border-border" />
                <dl className="space-y-1.5 text-xs">
                  <Row label="Base" value={baseKind === 'erp' ? `ERP (${enabledCards.length} cards)` : baseKind === 'module' ? moduleId : bundleId} />
                  <Row label="Add-ons" value={String(enabledAddons.length)} />
                  <Row label="Companies" value={String(limits.companies)} />
                  <Row label="Users" value={String(limits.users)} />
                  <Row label="Space" value={`${limits.space_gb} GB`} />
                  <Row label="Model" value={effectivePricing.model} />
                  <Row label="Cycle" value={effectivePricing.billing_cycle} />
                  <Row label="Discount" value={`${effectivePricing.discount_pct ?? 0}%`} />
                </dl>
                <p className="text-[10px] text-muted-foreground leading-snug pt-1">
                  Display math only · CONSUMES computeListPrice (SP.2). Not charged.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-foreground truncate max-w-[140px]" title={value}>{value}</dd>
    </div>
  );
}

/* ── Step components ─────────────────────────────────────────────── */

interface BaseStepProps {
  baseKind: BaseKind;
  setBaseKind: (k: BaseKind) => void;
  enabledCards: string[];
  setEnabledCards: (v: string[]) => void;
  moduleId: string;
  setModuleId: (v: string) => void;
  bundleId: string;
  setBundleId: (v: string) => void;
  toggle: (list: string[], id: string) => string[];
}

function BaseStep(props: BaseStepProps) {
  const { baseKind, setBaseKind, enabledCards, setEnabledCards, moduleId, setModuleId, bundleId, setBundleId, toggle } = props;
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> Step 1 · Choose Base Product
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(['erp', 'module', 'bundle'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setBaseKind(k)}
              className={cn(
                'rounded-lg border px-3 py-3 text-sm capitalize transition-colors',
                baseKind === k ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
              )}
              data-testid={`base-kind-${k}`}
            >
              {k === 'erp' ? 'Prudent360 ERP' : k}
            </button>
          ))}
        </div>

        {baseKind === 'erp' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Cards ({enabledCards.length}/{ALL_CARD_IDS.length})</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEnabledCards([...ALL_CARD_IDS])}>Select all</Button>
                <Button variant="ghost" size="sm" onClick={() => setEnabledCards([...CORE_ERP_PRESET])}>Core preset</Button>
                <Button variant="ghost" size="sm" onClick={() => setEnabledCards([])}>Clear</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[420px] overflow-auto pr-1">
              {ALL_CARD_IDS.map((c) => {
                const on = enabledCards.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEnabledCards(toggle(enabledCards, c))}
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-xs text-left font-mono transition-colors',
                      on ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                    data-testid={`card-toggle-${c}`}
                  >
                    {on ? '✓ ' : ''}{c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {baseKind === 'module' && (
          <div className="space-y-2">
            <Label>Module</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STANDALONE_MODULE_IDS.map((id) => <SelectItem key={id} value={id}>{id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {baseKind === 'bundle' && (
          <div className="space-y-2">
            <Label>Bundle</Label>
            <Select value={bundleId} onValueChange={setBundleId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUNDLE_IDS.map((id) => <SelectItem key={id} value={id}>{id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AddonStepProps {
  enabledAddons: string[];
  setEnabledAddons: (v: string[]) => void;
  toggle: (list: string[], id: string) => string[];
}

function AddonStep({ enabledAddons, setEnabledAddons, toggle }: AddonStepProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Puzzle className="h-4 w-4 text-primary" /> Step 2 · À-la-carte Add-ons ({enabledAddons.length}/{VARIANT_ADDON_IDS.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VARIANT_ADDON_IDS.map((a) => {
            const on = enabledAddons.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => setEnabledAddons(toggle(enabledAddons, a))}
                className={cn(
                  'rounded-md border p-3 text-left transition-colors',
                  on ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                )}
                data-testid={`addon-toggle-${a}`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={cn('h-4 w-4', on ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="text-sm font-mono">{a}</span>
                  {on && <Badge variant="secondary" className="ml-auto text-[10px]">added</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface ConditionsStepProps {
  limits: LimitSet;
  setLimits: (l: LimitSet) => void;
}

function ConditionsStep({ limits, setLimits }: ConditionsStepProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" /> Step 3 · Size Your Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <SliderRow icon={<Building2 className="h-4 w-4 text-primary" />} label="Companies" value={limits.companies} min={1} max={50}
          onChange={(v) => setLimits({ ...limits, companies: v })} />
        <SliderRow icon={<Users className="h-4 w-4 text-primary" />} label="Users" value={limits.users} min={1} max={500}
          onChange={(v) => setLimits({ ...limits, users: v })} />
        <SliderRow icon={<HardDrive className="h-4 w-4 text-primary" />} label="Space (GB)" value={limits.space_gb} min={5} max={2000}
          onChange={(v) => setLimits({ ...limits, space_gb: v })} />
        <p className="text-xs text-muted-foreground">Other LimitSet dims (branches · transactions · retention · API · support) use sensible defaults. Stored but not enforced (Wave-2).</p>
      </CardContent>
    </Card>
  );
}

function SliderRow({ icon, label, value, min, max, onChange }: {
  icon: React.ReactNode; label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm">{icon}{label}</Label>
        <span className="font-mono text-sm text-foreground">{value}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0] ?? value)} />
    </div>
  );
}

interface PriceStepProps {
  pricing: PricingPlan;
  setPricing: (p: PricingPlan) => void;
  effectivePricing: PricingPlan;
  limits: LimitSet;
  listPrice: number;
  channelPrice: number;
}

const PRICING_MODELS: PricingModel[] = ['per_seat', 'per_company', 'flat_tier', 'usage', 'hybrid'];
const BILLING_CYCLES: BillingCycle[] = ['monthly', 'annual', 'multi_year'];

function PriceStep(props: PriceStepProps) {
  const { pricing, setPricing, effectivePricing, listPrice, channelPrice } = props;
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-primary" /> Step 4 · Plan & Live Price
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Pricing model</Label>
            <Select value={pricing.model} onValueChange={(v: PricingModel) => setPricing({ ...pricing, model: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRICING_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Billing cycle</Label>
            <Select value={pricing.billing_cycle} onValueChange={(v: BillingCycle) => setPricing({ ...pricing, billing_cycle: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BILLING_CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <NumberField label="Base price (₹)" value={pricing.base_price}
            onChange={(v) => setPricing({ ...pricing, base_price: v })} />
          <NumberField label="Per user (₹)" value={pricing.per_user_price ?? 0}
            onChange={(v) => setPricing({ ...pricing, per_user_price: v })} />
          <NumberField label="Per company (₹)" value={pricing.per_company_price ?? 0}
            onChange={(v) => setPricing({ ...pricing, per_company_price: v })} />
          <NumberField label="Per GB (₹)" value={pricing.per_gb_price ?? 0}
            onChange={(v) => setPricing({ ...pricing, per_gb_price: v })} />
          <NumberField label="Discount %" value={pricing.discount_pct ?? 0}
            onChange={(v) => setPricing({ ...pricing, discount_pct: Math.min(100, Math.max(0, v)) })} />
          <NumberField label="Channel margin %" value={pricing.channel_margin_pct ?? 0}
            onChange={(v) => setPricing({ ...pricing, channel_margin_pct: Math.min(100, Math.max(0, v)) })} />
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1">
          <div className="text-xs text-muted-foreground">List price (display math · computeListPrice)</div>
          <div className="font-mono text-2xl text-foreground">₹{listPrice.toLocaleString('en-IN')}</div>
          {(effectivePricing.channel_margin_pct ?? 0) > 0 && (
            <div className="text-xs font-mono text-muted-foreground">
              Channel price (computeChannelPrice): ₹{channelPrice.toLocaleString('en-IN')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number" inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

interface RequestStepProps {
  requestType: ProvisionRequestType;
  setRequestType: (t: ProvisionRequestType) => void;
  requesterName: string;
  setRequesterName: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  onSubmit: () => void;
}

function RequestStep(props: RequestStepProps) {
  const { requestType, setRequestType, requesterName, setRequesterName, notes, setNotes, onSubmit } = props;
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" /> Step 5 · Request Demo / Final Copy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(['demo', 'final_copy', 'client'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setRequestType(t)}
              className={cn(
                'rounded-lg border px-3 py-3 text-sm capitalize transition-colors',
                requestType === t ? 'border-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground',
              )}
              data-testid={`req-type-${t}`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Your name / company</Label>
          <Input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder="e.g. Sharma Traders Pvt Ltd" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Anything specific you'd like to discuss" />
        </div>
        <Button onClick={onSubmit} disabled={!requesterName.trim()} size="lg" className="w-full">
          {requestType === 'demo' ? 'Request Demo' : requestType === 'final_copy' ? 'Get Final Copy' : 'Create Client Request'}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Drops into the provisioning queue. No checkout · no payment · no instant provisioning (Wave-2).
        </p>
      </CardContent>
    </Card>
  );
}

function ConfirmationView({ request, summary, listPrice, onReset }: {
  request: ProvisionRequest; summary: string; listPrice: number; onReset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="rounded-2xl max-w-xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success/15 grid place-items-center">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <CardTitle className="text-lg">Request received</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Thanks, {request.requester_name}. Your {request.type.replace('_', ' ')} request is in the queue.
          </p>
          <dl className="rounded-lg border border-border p-3 space-y-1 text-xs">
            <Row label="Request ID" value={request.id} />
            <Row label="Type" value={request.type} />
            <Row label="Status" value={request.status} />
            <Row label="List price (quote)" value={`₹${listPrice.toLocaleString('en-IN')}`} />
          </dl>
          <details className="rounded-lg border border-border p-3 text-xs">
            <summary className="cursor-pointer text-foreground">Plan summary</summary>
            <p className="mt-2 font-mono text-muted-foreground break-words">{summary}</p>
          </details>
          <p className="text-[11px] text-muted-foreground">
            {BUILD_YOUR_PLAN_HONESTY}
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onReset} className="flex-1">Configure another</Button>
            <Button asChild className="flex-1"><Link to="/welcome">Done</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
