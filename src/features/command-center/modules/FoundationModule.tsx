/**
 * FoundationModule.tsx — Zone 1 Entity Overview landing page.
 * Replaces the blank empty state.
 * [JWT] Replace MOCK object with real API queries.
 */
import { useNavigate } from 'react-router-dom';
import { Building, Building2, GitBranch, Layers, MapPin, Network, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// [JWT] Replace with real API data — GET /api/foundation/stats
function useFoundationStats() {
  // [JWT] GET /api/foundation/stats
  const parentSaved = localStorage.getItem('erp_parent_company_saved') === 'true';

  const safeCount = (key: string): number => {
    // [JWT] GET /api/foundation/stats/:key
    try { return JSON.parse(localStorage.getItem(key) || '[]').length; }
    catch { return 0; }
  };

  const branches: any[] = (() => {
    // [JWT] GET /api/foundation/branch-offices
    try { return JSON.parse(localStorage.getItem('erp_branch_offices') || '[]'); }
    catch { return []; }
  })();

  return {
    parentSaved,
    companiesCount:      safeCount('erp_companies'),
    subsidiariesCount:   safeCount('erp_subsidiaries'),
    branchOfficesTotal:  branches.length,
    branchOfficesActive: branches.filter((b: any) =>
      b.status === 'Active' || b.status === 'active'
    ).length,
  };
}

interface StatCardProps {
  icon: React.ReactNode; title: string; value: React.ReactNode;
  status: 'ok' | 'warn' | 'empty'; href: string; description: string;
}
function StatCard({ icon, title, value, status, href, description }: StatCardProps) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(href)}
      className={cn(
        'group relative w-full text-left rounded-xl border p-5 transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        status === 'warn' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card hover:border-primary/30',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          status === 'warn' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary',
        )}>{icon}</div>
        <div className="flex items-center gap-1">
          {status === 'ok' && <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
          {status === 'warn' && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground mb-0.5">{title}</p>
      <div className="text-xl font-bold text-foreground mb-1">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

export function FoundationModule() {
  const stats = useFoundationStats();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Foundation — Entity Core</h2>
        <p className="text-sm text-muted-foreground">
          Set up your organisation's legal entity structure. Start with Parent Company.
        </p>
      </div>

      {!stats.parentSaved && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Parent Company not configured</p>
            <p className="text-xs text-muted-foreground">
              Configure Parent Company first — it sets the FY and deployment mode for all modules.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Building className="h-5 w-5" />}
          title="Parent Company"
          value={stats.parentSaved
            ? <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Configured ✓</Badge>
            : <Badge variant="outline" className="text-amber-500 border-amber-500/30">Not Set Up ⚠</Badge>}
          status={stats.parentSaved ? 'ok' : 'warn'}
          href="/erp/foundation/company"
          description="Root entity — sets FY, currency, and deployment mode."
        />
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          title="Companies"
          value={stats.companiesCount === 0 ? 'None registered' : `${stats.companiesCount} registered`}
          status={stats.companiesCount > 0 ? 'ok' : 'empty'}
          href="/erp/foundation/entities?tab=companies"
          description="Registered legal entities under the parent."
        />
        <StatCard
          icon={<Layers className="h-5 w-5" />}
          title="Subsidiaries"
          value={stats.subsidiariesCount === 0 ? 'None registered' : `${stats.subsidiariesCount} registered`}
          status={stats.subsidiariesCount > 0 ? 'ok' : 'empty'}
          href="/erp/foundation/entities?tab=subsidiaries"
          description="Owned entities linked for consolidated reporting."
        />
        <StatCard
          icon={<GitBranch className="h-5 w-5" />}
          title="Branch Offices"
          value={stats.branchOfficesTotal === 0 ? 'None registered'
            : `${stats.branchOfficesActive} active / ${stats.branchOfficesTotal} total`}
          status={stats.branchOfficesTotal > 0 ? 'ok' : 'empty'}
          href="/erp/foundation/entities?tab=branch-offices"
          description="Operational locations: service centres, stores, offices."
        />
        <StatCard
          icon={<Network className="h-5 w-5" />}
          title="Business Units"
          value={(() => { try {
            // [JWT] GET /api/foundation/org-structure/divisions
            const divs = JSON.parse(localStorage.getItem('erp_divisions') || '[]').length;
            // [JWT] GET /api/foundation/org-structure/departments
            const depts = JSON.parse(localStorage.getItem('erp_departments') || '[]').length;
            return divs > 0 || depts > 0 ? `${divs} divisions · ${depts} departments` : 'Not configured';
          } catch { return 'Not configured'; } })()}
          status={(() => { try {
            const divs = JSON.parse(localStorage.getItem('erp_divisions') || '[]').length;
            return divs > 0 ? 'ok' : 'empty';
          } catch { return 'empty'; } })()}
          href='/erp/foundation/org-structure'
          description='Divisions and departments — used for MIS reporting across all modules.'
        />
        <StatCard
          icon={<MapPin className="h-5 w-5" />}
          title="Geography"
          value="Configure"
          status="empty"
          href="/erp/foundation/geography"
          description="Countries, states, cities, ports, and sales regions."
        />
      </div>
    </div>
  );
}
