/**
 * @file        src/pages/erp/sitex/SiteXWelcome.tsx
 * @purpose     SiteX welcome landing · 8-responsibility cards + Site Health Score teaser
 * @sprint      T-Phase-1.A.14 SiteX Foundation · Q-LOCK-10a + Q-LOCK-16a · Block D.2 · NEW canonical
 * @decisions   D-NEW-CU POSSIBLE Site=Branch lifecycle · 6 OOBs in plan · 11 land A.15
 */
import { Card } from '@/components/ui/card';
import { MapPin, Package, FileText, Users, Shield, FlaskConical, Activity, Truck, FileCheck, Sparkles } from 'lucide-react';
import type { SiteXModule } from './SiteXSidebar.types';

interface Props {
  onNavigate: (m: SiteXModule) => void;
}

const RESPONSIBILITY_CARDS: Array<{ icon: typeof MapPin; title: string; description: string; target: SiteXModule }> = [
  { icon: Activity, title: 'Daily Site Operations', description: 'Workforce coordination · vendor supervision · material movement · task allocation', target: 'dpr' },
  { icon: Package, title: 'Material Management', description: 'Receive · store · issue · wastage tracking · stock register (consumes Inventory Hub)', target: 'site-stock' },
  { icon: FileText, title: 'Site Planning & Execution', description: 'Drawings · tech specs · 14-day look-ahead · SOP compliance', target: 'look-ahead-plan' },
  { icon: Users, title: 'Coordination Between Teams', description: 'PM · contractors · procurement · logistics · QA/QC · client representatives', target: 'subcontractor-master' },
  { icon: Shield, title: 'Safety Management', description: 'PPE compliance · safety drills · hazard control · incident reporting · PTW · JSA', target: 'safety-incidents' },
  { icon: FlaskConical, title: 'Quality Control at Site', description: 'Installation quality · workmanship · testing · pre-commissioning (consumes QualiCheck)', target: 'site-inspections' },
  { icon: Activity, title: 'Progress Monitoring', description: 'Daily progress · delays · resource utilization · DPR · site registers · checklists', target: 'snag-register' },
  { icon: Truck, title: 'Logistics Coordination', description: 'Incoming deliveries · dispatch scheduling · vehicle movement (consumes GateFlow + Logistics)', target: 'site-inward-gate' },
];

export function SiteXWelcome({ onNavigate }: Props): JSX.Element {
  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <MapPin className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">SiteX · Site Execution Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage installation, commissioning, construction, and CAPEX site execution.
            Each site = a temporary Branch with project lifecycle · HO transfers funds · site orders local materials · site receives + reconciles.
          </p>
        </div>
      </div>

      <Card className="p-6 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-5 w-5 text-amber-600" />
          <h2 className="font-semibold">Site Health Score · Coming in A.15</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Live 0-100 score per active site combining safety record · budget variance · progress · quality · workforce stability.
          Multi-site view at next sprint close (A.15 Closeout).
        </p>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {RESPONSIBILITY_CARDS.map((card) => (
          <button
            key={card.title}
            onClick={() => onNavigate(card.target)}
            className="rounded-2xl border bg-card/60 backdrop-blur-xl p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:border-amber-400/40 cursor-pointer"
          >
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
              <card.icon className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-foreground mb-1 text-sm">{card.title}</h3>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </button>
        ))}
      </div>

      <Card className="p-6 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 mb-2">
          <FileCheck className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <h3 className="font-semibold">Closeout & Handoffs</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Customer Signoff · Commissioning Report · ServiceDesk Handoff (external) · MaintainPro Handoff (CAPEX) · Asset Capitalization · Turnkey Checklist · Final Reconciliation · Close Certificate. All gated by Compliance Lock at Closeout · cannot close site with open NCRs, pending RA bills, or unreconciled stock.
        </p>
        <button
          onClick={() => onNavigate('sitex-reports')}
          className="text-sm text-amber-600 hover:underline"
        >
          View SiteX reports →
        </button>
      </Card>

      <p className="text-xs text-muted-foreground text-center pt-4">
        Status: <span className="font-semibold">coming_soon</span> · Foundation sprint (A.14) · workflows ship at A.15 Closeout · MOAT #22 SiteX banks at A.15
      </p>
    </div>
  );
}
