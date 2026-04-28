import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Building,
  Factory,
  Coffee,
  Landmark,
  Cpu,
  Home,
  FlaskConical,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { seedEntityDemoData } from '@/lib/demo-seed-orchestrator';
import type { DemoArchetype } from '@/data/demo-customers-vendors';

type ScenarioPhase = 'live' | 'phase2' | 'planned';

interface ClientBlueprint {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  description: string;
  details: string;
  pattern: string;
  phase: ScenarioPhase;
  fixtureCoverage: number;
  founderAnchor?: boolean;
  entityCode: string;
  archetype: DemoArchetype;
}

// Sprint T-Phase-SEED-1 · all 7 use 'manufacturing' archetype as-is per founder Q2 lock April 28, 2026.
// Per-client customization (steel for Sinha · marble for Amith · etc.) is a LATER decision.
const CLIENT_BLUEPRINTS: ClientBlueprint[] = [
  {
    id: 'abdos',
    title: 'Abdos India',
    subtitle: 'Multi-BU Conglomerate',
    icon: Factory,
    description:
      'Diversified 5-BU group: Life Sciences, Contract Manufacturing, Packaging, Distribution, Hygiene & Homecare. Validates multi-BU, contract mfg, export, multi-channel.',
    details:
      "1967 · 2500+ employees · 10 mfg facilities · 90+ countries served. Clients include Unilever, P&G, Serum Institute, Novartis, Dr Reddy's. Pattern: large diversified conglomerate.",
    pattern: 'Multi-BU Conglomerate + Contract Mfg + Export + FMCG',
    phase: 'live',
    fixtureCoverage: 100,
    entityCode: 'ABDOS',
    archetype: 'manufacturing',
  },
  {
    id: 'cherise',
    title: 'Cherise India',
    subtitle: 'IoT + D2C + Quick-Commerce',
    icon: Coffee,
    description:
      'IoT-enabled smart vending (Cherise Tapri/Kettle/Buddy) + 7 beverage sub-brands. Multi-channel: own D2C, Amazon, Flipkart, Blinkit, B2B vending AMC, bulk export.',
    details:
      'Pune factory · Mumbai HQ · ~150 vending devices · razor-blade pod consumables model · Live on Blinkit quick-commerce. Pattern: next-gen IoT+D2C business model.',
    pattern: 'IoT-Connected Device + D2C + Quick-Commerce + Export',
    phase: 'live',
    fixtureCoverage: 100,
    entityCode: 'CHRSE',
    archetype: 'manufacturing',
  },
  {
    id: 'bcpl',
    title: 'Bengal Chemicals (BCPL)',
    subtitle: 'PSU + Pharma + Chemical',
    icon: Landmark,
    description:
      "Government PSU under Ministry of Chemicals & Fertilizers. India's first pharma company (1901, Acharya P.C. Ray). 3 divisions: Industrial Chemicals, Pharmaceuticals, Home Products.",
    details:
      'Kolkata HQ · Central PSU · Privatisation ongoing. Validates PSU procurement (GeM), CAG audit, tender lifecycle, parliamentary scrutiny. Needs PSU Pack.',
    pattern: 'PSU / Regulated Entity + Pharma + Heavy Chemicals + FMCG',
    phase: 'live',
    fixtureCoverage: 100,
    entityCode: 'BCPL',
    archetype: 'manufacturing',
  },
  {
    id: 'smartpower',
    title: 'Smartpower Automation',
    subtitle: 'Mfg + AMC + Dealer',
    icon: Cpu,
    description:
      'Eastern India UPS brand (since 1992). Diversified in 2006 into Door/Gate Automation + Security Solutions. Manufacturing + installation + AMC revenue mix.',
    details:
      'Kolkata · Regional leader · B2B + institutional. Clients include Garden Reach Shipbuilders (GRSE). AMC is primary revenue. Validates post-sale model for capital-equipment mfrs.',
    pattern: 'Manufacturer + Installation Project + AMC (primary) + Dealer Network',
    phase: 'live',
    fixtureCoverage: 100,
    entityCode: 'SMRTP',
    archetype: 'manufacturing',
  },
  {
    id: 'amith',
    title: 'Amith Group',
    subtitle: 'Import + Retail + Franchise',
    icon: Home,
    description:
      'Marble/Granite/Tile/Sanitaryware trading. Multi-category retail: stone, tiles, faucets, wellness, kitchen. Two showrooms + expanding Amith Mart franchise.',
    details:
      'Since 2001 · Howrah/Kolkata · Franchise expansion. Kajaria partnership. Validates distribution-heavy retail pattern common in building-materials, furniture, luxury.',
    pattern: 'Import Trader + Showroom Retail + Franchise Network + B2B Interior',
    phase: 'live',
    fixtureCoverage: 100,
    entityCode: 'AMITH',
    archetype: 'manufacturing',
  },
  {
    id: 'shankar-pharma',
    title: 'Shankar Pharma Industries',
    subtitle: 'Complex Multi-Entity (D-082)',
    icon: FlaskConical,
    description:
      'Pre-existing complex scenario per D-082. Fictional 3-company pharma group with 6-tier hierarchy. Used for stress-testing complex multi-entity scenarios.',
    details:
      '3 companies (parent + 2 subsidiaries + SEZ branch) · 6-tier hierarchy · ~200 customers · ~400 items · 18 months of transactions.',
    pattern: 'Complex 3-Company Group + 6-Tier Hierarchy + Pharma Focus',
    phase: 'live',
    fixtureCoverage: 100,
    entityCode: 'SHKPH',
    archetype: 'manufacturing',
  },
  {
    id: 'sinha',
    title: 'Sinha Industries',
    subtitle: 'ETO + Turnkey Projects ★',
    icon: Wrench,
    description:
      'Material handling systems (belt/bucket/screw/chain conveyors) + mechanical fabrication + spare parts. Engineer-to-Order turnkey projects for core-sector industries. CAD/CAM-driven, ISO + IEC certified, domestic + export.',
    details:
      'Proprietor Mr. Prosenjit Sinha · Kolkata · 81 skilled workmen + 18 staff · SSI + NSIC registered. ★ Founder Motivation anchor — the person who motivated Operix to exist. Validates Engineer-to-Order pattern distinct from make-to-stock manufacturing.',
    pattern: 'Engineer-to-Order + Turnkey Projects + Spares + Export',
    phase: 'live',
    fixtureCoverage: 100,
    founderAnchor: true,
    entityCode: 'SINHA',
    archetype: 'manufacturing',
  },
];

const PHASE_CONFIG: Record<ScenarioPhase, { label: string; color: string }> = {
  live:    { label: 'Live',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  phase2:  { label: 'Phase 2', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  planned: { label: 'Planned', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

// Entity-scoped keys reset by handleResetEntity (NOT shared masters like
// erp_group_customer_master · erp_group_vendor_master · erp_inventory_items
// which cascade-affect other entities).
function entityScopedKeys(entityCode: string): string[] {
  return [
    `erp_sam_persons_${entityCode}`,
    `erp_sam_hierarchy_${entityCode}`,
    `erp_enquiry_sources_${entityCode}`,
    `erp_campaigns_${entityCode}`,
    `erp_sam_targets_${entityCode}`,
    `erp_enquiries_${entityCode}`,
    `erp_quotations_${entityCode}`,
    `erp_opportunities_${entityCode}`,
    `erp_commission_register_${entityCode}`,
    `erp_receivx_config_${entityCode}`,
    `erp_receivx_templates_${entityCode}`,
    `erp_receivx_execs_${entityCode}`,
    `erp_receivx_schemes_${entityCode}`,
    `erp_receivx_ptps_${entityCode}`,
    `erp_receivx_comm_log_${entityCode}`,
    `erp_territories_${entityCode}`,
    `erp_beat_routes_${entityCode}`,
    `erp_visit_logs_${entityCode}`,
    `erp_secondary_sales_${entityCode}`,
    `erp_supply_request_memos_${entityCode}`,
    `erp_delivery_memos_${entityCode}`,
    `erp_invoice_memos_${entityCode}`,
    `erp_orders_${entityCode}`,
    `erp_salesx_conversion_log_${entityCode}`,
    // Sprint T-Phase-1.1.1m · Stock reservations
    `erp_stock_reservations_${entityCode}`,
    // Sprint T-Phase-1.1.1n · Three Memo doc-sequence keys
    `erp_doc_seq_SRQM_${entityCode}`,
    `erp_doc_seq_DM_${entityCode}`,
    `erp_doc_seq_IM_${entityCode}`,
    // Sprint T-Phase-1.1.1p · Sample & Demo Outward
    `erp_sample_outward_memos_${entityCode}`,
    `erp_demo_outward_memos_${entityCode}`,
    `erp_doc_seq_SOM_${entityCode}`,
    `erp_doc_seq_DOM_${entityCode}`,
    // Sprint T-Phase-1.1.1c · Exhibition Management
    `erp_exhibitions_${entityCode}`,
    `erp_exhibition_visitors_${entityCode}`,
    // Sprint T-Phase-1.1.1d · Webinar Management
    `erp_webinars_${entityCode}`,
    `erp_webinar_participants_${entityCode}`,
    // Sprint T-Phase-1.1.1f · Lead Aggregation
    `erp_leads_${entityCode}`,
    // Sprint T-Phase-1.1.1g · Telecaller UX
    `erp_wa_templates_${entityCode}`,
    `erp_call_sessions_${entityCode}`,
    `erp_dialer_sessions_${entityCode}`,
    `erp_recording_consent_${entityCode}`,
    `erp_agent_status_${entityCode}`,
    `erp_agent_status_events_${entityCode}`,
    `erp_agent_profiles_${entityCode}`,
    `erp_points_transactions_${entityCode}`,
    `erp_points_rule_${entityCode}`,
    `erp_quality_criteria_${entityCode}`,
    `erp_call_reviews_${entityCode}`,
    `erp_coaching_feedback_${entityCode}`,
    `erp_distribution_config_${entityCode}`,
    `erp_telecaller_capacities_${entityCode}`,
    `erp_distribution_logs_${entityCode}`,
  ];
}

export function ClientBlueprintsPagePanel() {
  const navigate = useNavigate();
  const [loadingEntity, setLoadingEntity] = useState<string | null>(null);

  const handleLoadDemo = useCallback(
    (entityCode: string, archetype: DemoArchetype, clientName: string) => {
      setLoadingEntity(entityCode);
      try {
        // Ensure entity exists in MOCK_ENTITIES / localStorage (lazy creation)
        // [JWT] GET /api/foundation/entities
        const entitiesRaw = localStorage.getItem('erp_group_entities');
        const entities: Array<{ id: string; name: string; shortCode: string; type: string }> =
          entitiesRaw ? JSON.parse(entitiesRaw) : [];
        const exists = entities.some((e) => e.shortCode === entityCode);
        if (!exists) {
          const newEntity = {
            id: `e-${entityCode.toLowerCase()}`,
            name: clientName,
            shortCode: entityCode,
            type: 'subsidiary' as const,
          };
          // [JWT] POST /api/foundation/entities
          localStorage.setItem(
            'erp_group_entities',
            JSON.stringify([...entities, newEntity]),
          );
        }

        // Run the existing seed orchestrator (D-190 reuse · zero new logic)
        // [JWT] POST /api/demo/seed-entity
        const result = seedEntityDemoData(entityCode, archetype);

        toast.success(
          `${clientName} demo loaded · ${result.customers}c · ${result.vendors}v · ${result.items}i · ${result.enquiries}e · ${result.quotations}q · ${result.salesInvoices}si · ${result.receipts}r · ${result.ptps}ptp`,
          { duration: 6000 },
        );
      } catch (err) {
        toast.error(`Failed to load ${clientName} demo · ${(err as Error).message}`);
      } finally {
        setLoadingEntity(null);
      }
    },
    [],
  );

  const handleResetEntity = useCallback((entityCode: string, clientName: string) => {
    if (!window.confirm(`Reset ALL demo data for ${clientName}? This clears entity-scoped localStorage keys for ${entityCode}. Shared masters (customers/vendors/items) are preserved.`)) return;

    const keysToReset = entityScopedKeys(entityCode);
    keysToReset.forEach((k) => {
      // [JWT] DELETE /api/entity/storage/:key
      localStorage.removeItem(k);
    });

    // Also remove vouchers + outstanding scoped to this entity
    // [JWT] DELETE /api/entity/storage/vouchers?entity=:entityCode
    try {
      const vouchersRaw = localStorage.getItem('erp_group_vouchers');
      if (vouchersRaw) {
        const vouchers = JSON.parse(vouchersRaw);
        if (Array.isArray(vouchers)) {
          const filtered = vouchers.filter(
            (v: { entity_id?: string }) => v.entity_id !== entityCode,
          );
          localStorage.setItem('erp_group_vouchers', JSON.stringify(filtered));
        }
      }
      const outstandingRaw = localStorage.getItem('erp_outstanding');
      if (outstandingRaw) {
        const outstanding = JSON.parse(outstandingRaw);
        if (Array.isArray(outstanding)) {
          const filtered = outstanding.filter(
            (o: { entity_id?: string }) => o.entity_id !== entityCode,
          );
          localStorage.setItem('erp_outstanding', JSON.stringify(filtered));
        }
      }
    } catch {
      /* ignore parse errors */
    }

    toast.success(`${clientName} demo reset · ${keysToReset.length} entity-scoped keys cleared`);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        <Button variant="ghost" size="sm" onClick={() => navigate('/welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Workspace
        </Button>

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Client Blueprints</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Seven design-partner client scenarios that anchor Operix's universal ERP architecture.
              Click "Load Demo Data" on any card to seed that entity with the manufacturing
              archetype (22 localStorage keys populated). Use "Reset" to clear entity-scoped data
              and iterate. Shared masters (customers/vendors/items) are preserved across resets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{CLIENT_BLUEPRINTS.filter(b => b.phase === 'live').length}</span> Live</span>
          <span><span className="font-semibold text-foreground">{CLIENT_BLUEPRINTS.filter(b => b.phase === 'phase2').length}</span> Phase 2</span>
          <span><span className="font-semibold text-foreground">{CLIENT_BLUEPRINTS.filter(b => b.phase === 'planned').length}</span> Planned</span>
          <span className="ml-auto text-amber-600 dark:text-amber-400">★ Founder Motivation anchor</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {CLIENT_BLUEPRINTS.map(b => {
            const phaseConf = PHASE_CONFIG[b.phase];
            const isLoading = loadingEntity === b.entityCode;
            return (
              <div
                key={b.id}
                className={cn(
                  'group relative rounded-2xl border bg-card/60 backdrop-blur-xl p-6 text-left w-full transition-all duration-300',
                  b.founderAnchor && 'ring-1 ring-amber-300/60 dark:ring-amber-500/40',
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <b.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge className={phaseConf.color}>{phaseConf.label}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {b.title}
                  {b.founderAnchor && <span className="ml-2 text-amber-500">★</span>}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">{b.subtitle}</p>
                <p className="text-sm text-muted-foreground mb-2">{b.description}</p>
                <p className="text-xs text-muted-foreground/70 mb-3">{b.details}</p>

                <div className="pt-3 border-t border-border/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fixture coverage</span>
                    <span className="font-medium text-foreground">{b.fixtureCoverage}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 transition-all"
                      style={{ width: `${b.fixtureCoverage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 italic">{b.pattern}</p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleLoadDemo(b.entityCode, b.archetype, b.title)}
                      disabled={loadingEntity !== null}
                    >
                      {isLoading ? 'Loading…' : 'Load Demo Data'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetEntity(b.entityCode, b.title)}
                      disabled={loadingEntity !== null}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate('/erp/dashboard')}
                    >
                      Open Dashboard →
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          All 7 clients share the manufacturing archetype as-is (founder Q2 lock April 28, 2026).
          Per-client customization (steel for Sinha · marble for Amith · etc.) is a later sprint.
        </p>
      </div>
    </div>
  );
}

export default ClientBlueprintsPagePanel;
