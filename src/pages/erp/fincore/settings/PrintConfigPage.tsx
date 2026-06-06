/**
 * @file     PrintConfigPage.tsx
 * @purpose  Unified editor for per-entity print configuration. 14-voucher × 20-toggle matrix with row-expand.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2b.3b-A
 * @sprint   T10-pre.2b.3b-A
 * @iso      Usability (HIGH — Tally F12 familiar) · Functional Suitability (HIGH — all 20 toggles editable) · Maintainability (HIGH — driven from PRINT_TOGGLES metadata)
 * @whom     Entity admins · Accountants (trim prints) · Stores (more detail)
 * @depends  print-config.ts · print-config-storage.ts · @/components/ui/switch, accordion, button, label, badge · lucide-react · sonner toast
 * @consumers Route /erp/fincore/settings/print-config
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Save, X, Settings2, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  type PrintConfig,
  type PrintToggles,
  type VoucherTypeCode,
  type ToggleGroup,
  DEFAULT_PRINT_CONFIG,
  DEFAULT_TOGGLES,
  PRINT_TOGGLES,
  VOUCHER_TYPE_LABELS,
  TOGGLE_GROUP_LABELS,
} from '@/types/print-config';
import {
  loadPrintConfig,
  savePrintConfig,
  resetPrintConfig,
  resolveToggles,
} from '@/lib/print-config-storage';
import { loadEntities, type MockEntity } from '@/data/mock-entities';
import {
  loadEntityBranding,
  setBrandingSlot,
  clearBrandingSlot,
  validateBrandingDataUrl,
  type EntityBranding,
  type BrandingSlot,
  BRANDING_SLOT_LABELS,
  BRANDING_SLOT_HINTS,
  MAX_SLOT_BYTES,
} from '@/lib/entity-branding-engine';

const VOUCHER_ORDER: VoucherTypeCode[] = [
  'invoice', 'receipt', 'payment', 'contra', 'journal',
  'purchase_invoice', 'credit_note', 'debit_note',
  'delivery_note', 'receipt_note',
  'stock_adjustment', 'stock_journal', 'stock_transfer', 'mfg_journal',
];

const GROUP_ORDER: ToggleGroup[] = ['header', 'line_columns', 'footer', 'gst', 'transport'];

const LAST_ENTITY_KEY = 'printConfig:lastEntity';

export function PrintConfigPagePanel() {
  const navigate = useNavigate();

  const entities = useMemo<MockEntity[]>(() => loadEntities(), []);
  const initialEntityCode = useMemo<string>(() => {
    try {
      // [JWT] localStorage — last-selected entity for editor convenience
      const last = localStorage.getItem(LAST_ENTITY_KEY);
      if (last && entities.some(e => e.shortCode === last)) return last;
    } catch { /* ignore */ }
    return entities[0]?.shortCode ?? '';
  }, [entities]);

  const [entityCode, setEntityCode] = useState<string>(initialEntityCode);
  const [loaded, setLoaded] = useState<PrintConfig>(DEFAULT_PRINT_CONFIG);
  const [draft, setDraft] = useState<PrintConfig>(DEFAULT_PRINT_CONFIG);

  // Load config when entity changes
  useEffect(() => {
    if (!entityCode) return;
    const cfg = loadPrintConfig(entityCode);
    setLoaded(cfg);
    setDraft(cfg);
    try {
      // [JWT] persist last-selected entity (UX convenience only)
      localStorage.setItem(LAST_ENTITY_KEY, entityCode);
    } catch { /* ignore */ }
  }, [entityCode]);

  const isDirty = useMemo(
    () => JSON.stringify(draft.byVoucherType) !== JSON.stringify(loaded.byVoucherType),
    [draft, loaded],
  );

  // [Convergent] Single helper to update one toggle on one voucher inside draft.
  const setToggle = (voucher: VoucherTypeCode, key: keyof PrintToggles, value: boolean) => {
    setDraft(prev => {
      const current = prev.byVoucherType[voucher] ?? {};
      const nextForVoucher: Partial<PrintToggles> = { ...current, [key]: value };
      return {
        ...prev,
        byVoucherType: { ...prev.byVoucherType, [voucher]: nextForVoucher },
      };
    });
  };

  const handleSave = () => {
    savePrintConfig(entityCode, draft);
    const fresh = loadPrintConfig(entityCode);
    setLoaded(fresh);
    setDraft(fresh);
    toast.success('Print configuration saved', {
      description: `${VOUCHER_TYPE_LABELS.invoice.split(' ')[0]}-style overrides applied for ${entityCode}.`,
    });
  };

  const handleCancel = () => {
    setDraft(loaded);
    toast.info('Changes discarded');
  };

  const handleReset = () => {
    resetPrintConfig(entityCode);
    setLoaded(DEFAULT_PRINT_CONFIG);
    setDraft(DEFAULT_PRINT_CONFIG);
    toast.success('Print configuration reset to defaults');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        <Button variant="ghost" size="sm" onClick={() => navigate('/erp/fincore')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to FinCore
        </Button>

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Settings2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Print Configuration</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Tally F12-style per-voucher print toggles. Configure once per entity; applies
              to every print from that entity. Defaults mirror current behavior — empty
              config means no change. Engine consumption ships in T10-pre.2b.3b-B1.
            </p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="text-xs text-muted-foreground">Entity</Label>
          <Select value={entityCode} onValueChange={setEntityCode}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Select entity" />
            </SelectTrigger>
            <SelectContent>
              {entities.map(e => (
                <SelectItem key={e.id} value={e.shortCode}>
                  {e.name} ({e.shortCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/erp/fincore/settings/register-config">
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Register Config
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <RotateCcw className="h-4 w-4 mr-1" />Reset All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset print configuration?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears all overrides for entity <span className="font-mono font-semibold">{entityCode}</span>.
                    Prints revert to engine defaults. Cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" size="sm" onClick={handleCancel} disabled={!isDirty}>
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!isDirty}>
              <Save className="h-4 w-4 mr-1" />Save
            </Button>
          </div>
        </div>

        {/* Sprint R0 · Block 5.3 · Entity Branding section */}
        <EntityBrandingSection entityCode={entityCode} />


        {/* 14-row matrix */}
        <Accordion type="multiple" className="rounded-2xl border bg-card/60 backdrop-blur-xl divide-y">
          {VOUCHER_ORDER.map(voucher => {
            const resolved = resolveToggles(draft, voucher);
            const overrides = draft.byVoucherType[voucher] ?? {};
            const overrideCount = Object.keys(overrides).length;
            const applicableToggles = PRINT_TOGGLES.filter(t => t.appliesTo.includes(voucher));
            const activeCount = applicableToggles.filter(t => resolved[t.key]).length;

            return (
              <AccordionItem key={voucher} value={voucher} className="border-0">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-2">
                    <span className="font-medium text-foreground">{VOUCHER_TYPE_LABELS[voucher]}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {activeCount}/{applicableToggles.length} active
                      </Badge>
                      {overrideCount > 0 && (
                        <Badge className="bg-primary/15 text-primary hover:bg-primary/15 font-mono text-[11px]">
                          {overrideCount} override{overrideCount === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    {GROUP_ORDER.map(group => {
                      const groupToggles = applicableToggles.filter(t => t.group === group);
                      if (groupToggles.length === 0) return null;
                      return (
                        <div key={group} className="rounded-xl border border-border/40 p-4 bg-background/40">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                            {TOGGLE_GROUP_LABELS[group]}
                          </div>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                            {groupToggles.map(meta => {
                              const checked = resolved[meta.key];
                              const isOverridden = meta.key in overrides;
                              const switchId = `${voucher}-${meta.key}`;
                              return (
                                <TooltipProvider key={meta.key} delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center justify-between gap-3 py-1">
                                        <Label
                                          htmlFor={switchId}
                                          className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                                        >
                                          {meta.label}
                                          {isOverridden && (
                                            <span
                                              className="h-1.5 w-1.5 rounded-full bg-primary"
                                              aria-label="Overridden from default"
                                            />
                                          )}
                                        </Label>
                                        <Switch
                                          id={switchId}
                                          checked={checked}
                                          onCheckedChange={(v) => setToggle(voucher, meta.key, v)}
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <p className="text-xs">{meta.description}</p>
                                      <p className="text-[10px] text-muted-foreground mt-1">
                                        Default: {DEFAULT_TOGGLES[meta.key] ? 'On' : 'Off'}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Engine consumption deferred to T10-pre.2b.3b-B1 (engine signatures) and B2 (panel wiring).
          Saving now persists overrides; existing prints remain unchanged until B-series ships.
        </p>
      </div>
    </div>
  );
}

export default PrintConfigPagePanel;

// ─────────────────────────────────────────────────────────────────────────────
// Sprint R0 · Block 5.3 · EntityBrandingSection
// Three image slots (logo · authorized_signature · stamp) per entity.
// Hard guards live in entity-branding-engine (MIME + ≤200KB).
// ─────────────────────────────────────────────────────────────────────────────
const BRANDING_SLOTS: BrandingSlot[] = ['logo', 'authorized_signature', 'stamp'];

function EntityBrandingSection({ entityCode }: { entityCode: string }): JSX.Element | null {
  const [branding, setBranding] = useState<EntityBranding>(() => loadEntityBranding(entityCode));

  useEffect(() => {
    setBranding(loadEntityBranding(entityCode));
  }, [entityCode]);

  if (!entityCode) return null;

  const onFile = (slot: BrandingSlot, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      try {
        validateBrandingDataUrl(dataUrl);
        const next = setBrandingSlot(entityCode, slot, dataUrl);
        setBranding(next);
        toast.success(`${BRANDING_SLOT_LABELS[slot]} updated`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      }
    };
    reader.onerror = () => toast.error('Failed to read file');
    reader.readAsDataURL(file);
  };

  const onClear = (slot: BrandingSlot) => {
    const next = clearBrandingSlot(entityCode, slot);
    setBranding(next);
    toast.info(`${BRANDING_SLOT_LABELS[slot]} cleared`);
  };

  return (
    <section
      data-testid="entity-branding-section"
      className="rounded-2xl border bg-card/60 backdrop-blur-xl p-5 space-y-4"
    >
      <div>
        <h2 className="text-base font-semibold text-foreground">Entity Branding</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Logo · authorized signature · company stamp. Rendered on invoice prints.
          Each slot accepts PNG/JPEG/WebP/SVG, max {(MAX_SLOT_BYTES / 1024).toFixed(0)} KB.
          Stored per entity; unset slots render cleanly absent.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {BRANDING_SLOTS.map(slot => {
          const url = branding[slot];
          const inputId = `branding-${slot}`;
          return (
            <div
              key={slot}
              data-testid={`branding-slot-${slot}`}
              className="rounded-xl border border-border/40 p-3 bg-background/40 space-y-2"
            >
              <div className="text-xs font-medium text-foreground">{BRANDING_SLOT_LABELS[slot]}</div>
              <div className="text-[10px] text-muted-foreground leading-snug">
                {BRANDING_SLOT_HINTS[slot]}
              </div>
              <div className="h-24 rounded-lg border border-dashed border-border/60 bg-background/60 flex items-center justify-center overflow-hidden">
                {url ? (
                  <img
                    src={url}
                    alt={BRANDING_SLOT_LABELS[slot]}
                    className="max-h-full max-w-full object-contain"
                    data-testid={`branding-preview-${slot}`}
                  />
                ) : (
                  <span className="text-[10px] text-muted-foreground">No image</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={inputId}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => onFile(slot, e.target.files?.[0] ?? null)}
                />
                <Button asChild size="sm" variant="outline" className="text-xs">
                  <label htmlFor={inputId} className="cursor-pointer">
                    {url ? 'Replace' : 'Upload'}
                  </label>
                </Button>
                {url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={() => onClear(slot)}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


