/**
 * @file        src/pages/erp/fpa-planning/FpaPlanningPage.tsx
 * @page        Landing surface + module-switch host for the FP&A self-owned card.
 * @sprint      Sprint 124 · T-Phase-7.D.1.5 · Block 2 · A1
 * @a1          FP&A becomes a SELF-OWNED CARD (mirrors Comply360):
 *              - own fpaPlanningShellConfig (NOT commandCenterShellConfig)
 *              - own fpaPlanningSidebarItems
 *              - own activeModule + renderModule() switch
 *              - hosts the 7 D.0/D.1 pages (AOP / Workforce / OKR / Org Design /
 *                Budgeting / Forecasting / Scenario) + the new S124 OperationalCostingPage.
 *              This fixes the CC-sidebar-showing bug (carried from S116/S120/S122).
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Shell } from '@/shell';
import { fpaPlanningShellConfig } from '@/apps/erp/configs/fpa-planning-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Target, TrendingUp, LineChart, Sparkles, Users, Trophy, Network, Calculator, Layers,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';
import type { FpaPlanningModule } from './FpaPlanningSidebar.types';

import AOPStrategicPlanPage from '@/features/fpa-planning/AOPStrategicPlanPage';
import BudgetingPage from '@/features/budgeting/BudgetingPage';
import ForecastingPage from '@/features/forecasting/ForecastingPage';
import ScenarioModelingPage from '@/features/scenario-modeling/ScenarioModelingPage';
import WorkforcePlanningPage from '@/features/workforce-planning/WorkforcePlanningPage';
import OKRFrameworkPage from '@/features/okr-framework/OKRFrameworkPage';
import OrgDesignSimulatorPage from '@/features/org-design/OrgDesignSimulatorPage';
import OperationalCostingPage from '@/features/operational-costing/OperationalCostingPage';
import AdvancedCostingPage from '@/features/advanced-costing/AdvancedCostingPage';

const KNOWN_MODULES = new Set<FpaPlanningModule>([
  'fpa-home', 'fpa-aop', 'fpa-budgeting', 'fpa-forecasting', 'fpa-scenario',
  'fpa-workforce', 'fpa-okr', 'fpa-org-design', 'fpa-operational-costing',
  'fpa-advanced-costing',
]);

// Legacy hash redirect map — old CC deep-links route into the new FP&A ids.
const LEGACY_MAP: Record<string, FpaPlanningModule> = {
  'fincore-aop-strategic-plan': 'fpa-aop',
  'fpa-planning-workforce': 'fpa-workforce',
  'fpa-planning-okr-framework': 'fpa-okr',
  'fpa-planning-org-design': 'fpa-org-design',
  'fpa-planning-budgeting': 'fpa-budgeting',
  'fpa-planning-forecasting': 'fpa-forecasting',
  'fpa-planning-scenario': 'fpa-scenario',
};

function readInitialModule(): FpaPlanningModule {
  if (typeof window === 'undefined') return 'fpa-home';
  const raw = window.location.hash.replace('#', '');
  if (!raw) return 'fpa-home';
  if (KNOWN_MODULES.has(raw as FpaPlanningModule)) return raw as FpaPlanningModule;
  if (LEGACY_MAP[raw]) return LEGACY_MAP[raw];
  return 'fpa-home';
}

export default function FpaPlanningPage() {
  const { profile, entitlements } = useCardEntitlement();
  const [activeModule, setActiveModule] = useState<FpaPlanningModule>(readInitialModule);
  const location = useLocation();

  // Hash → active module (router-driven + native hashchange)
  useEffect(() => {
    const applyHash = () => {
      const raw = window.location.hash.replace('#', '');
      if (!raw) return;
      if (KNOWN_MODULES.has(raw as FpaPlanningModule)) {
        setActiveModule(raw as FpaPlanningModule);
      } else if (LEGACY_MAP[raw]) {
        setActiveModule(LEGACY_MAP[raw]);
      }
    };
    window.addEventListener('hashchange', applyHash);
    applyHash();
    return () => window.removeEventListener('hashchange', applyHash);
  }, [location]);

  // Active module → URL hash (no router push · idempotent)
  useEffect(() => {
    const hash = activeModule === 'fpa-home' ? '' : `#${activeModule}`;
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + hash);
    }
  }, [activeModule]);

  const handleSidebarItemClick = useCallback((item: SidebarItem) => {
    const id = (item.moduleId ?? item.id) as string;
    if (KNOWN_MODULES.has(id as FpaPlanningModule)) {
      setActiveModule(id as FpaPlanningModule);
    }
  }, []);

  const renderModule = () => {
    switch (activeModule) {
      case 'fpa-home':                return <FpaHome onNavigate={setActiveModule} />;
      case 'fpa-aop':                 return <AOPStrategicPlanPage />;
      case 'fpa-budgeting':           return <BudgetingPage />;
      case 'fpa-forecasting':         return <ForecastingPage />;
      case 'fpa-scenario':            return <ScenarioModelingPage />;
      case 'fpa-workforce':           return <WorkforcePlanningPage />;
      case 'fpa-okr':                 return <OKRFrameworkPage />;
      case 'fpa-org-design':          return <OrgDesignSimulatorPage />;
      case 'fpa-operational-costing': return <OperationalCostingPage />;
      case 'fpa-advanced-costing':    return <AdvancedCostingPage />;
      default:                        return <FpaHome onNavigate={setActiveModule} />;
    }
  };

  return (
    <Shell
      config={fpaPlanningShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[
        { label: 'ERP', href: '/erp/dashboard' },
        { label: 'FP&A / Planning' },
      ]}
      onSidebarItemClick={handleSidebarItemClick}
    >
      {renderModule()}
    </Shell>
  );
}

// ─── Home / Overview module (replaces the old landing tiles) ─────────────────

interface FpaHomeProps {
  onNavigate: (m: FpaPlanningModule) => void;
}

function FpaHome({ onNavigate }: FpaHomeProps) {
  const tiles: Array<{
    id: FpaPlanningModule;
    title: string;
    description: string;
    icon: typeof Target;
    badge?: string;
  }> = [
    { id: 'fpa-aop',                 title: 'AOP & Strategic Plan', description: 'Set revenue + cost targets and cascade them through the org tree.', icon: Target },
    { id: 'fpa-budgeting',           title: 'Budgeting',            description: 'Operating · capital · cash budgets at the org-node level.',         icon: TrendingUp },
    { id: 'fpa-forecasting',         title: 'Forecasting',          description: 'Revenue / cash / demand forecasts via explainable heuristics.',     icon: LineChart },
    { id: 'fpa-scenario',            title: 'Scenario Modeling',    description: 'Best/base/worst — single + multi-entity consolidated.',             icon: Sparkles,   badge: '⭐ The Moat' },
    { id: 'fpa-workforce',           title: 'Workforce Planning',   description: 'Headcount projection + cost variance.',                              icon: Users },
    { id: 'fpa-okr',                 title: 'OKR / KPI Framework',  description: 'Top-down objective cascade + org-cost allocation.',                  icon: Trophy },
    { id: 'fpa-org-design',          title: 'Org Design',           description: 'Re-org simulator + succession + skills inventory.',                  icon: Network },
    { id: 'fpa-operational-costing', title: 'Operational Costing',  description: 'BOM roll-up · standard costing · standard-vs-actual variance.',     icon: Calculator, badge: '🆕 S124' },
  ];

  return (
    <div className="min-h-full bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold">FP&amp;A / Planning</h1>
            <Badge variant="outline" className="ml-2">Phase 7 · Arc D.0 / D.1</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Financial Planning &amp; Analysis hub — own shell, own sidebar. Home of the
            Annual Operating Plan (AOP), budgeting / forecasting, the multi-entity
            consolidated scenario moat, and operational costing (BOM roll-up).
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Card
                key={t.id}
                className="glass-card hover:shadow-elevated transition-shadow cursor-pointer"
                onClick={() => onNavigate(t.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-primary" />
                    {t.title}
                    {t.badge && <Badge variant="secondary" className="ml-auto">{t.badge}</Badge>}
                  </CardTitle>
                  <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Open from the sidebar or click this tile.
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Scope &amp; FR-44 Reuse</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              All planning engines READ — they do not reimplement — the underlying
              stores (org tree, consolidated P&amp;L, BOM, purchase-cost variance).
              Statutory cost-audit (§148) stays in Comply360 — operational costing
              here is INTERNAL (FR-44 wall).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
