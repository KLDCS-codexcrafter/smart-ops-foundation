/**
 * @file        src/pages/erp/comply360/companies/CompaniesEntitiesPage.tsx
 * @purpose     Sprint W1C-3 · Companies & Entities · "Entities" tab now lists real companies
 *              from the foundation/company store (`erp_companies`) with per-row compliance
 *              chips drawn from existing record fields (GST registrations, LUT bonds, status).
 *              Each row links to the foundation Company Edit form. Sub-tabs preserved.
 * @sprint      Sprint W1C-3 · T-W1C3-ComingSoon-WelcomeTruth · Block 1
 * @decisions   D-S69-1 (NATIVE) · DP-S77-1 (companies hosts Schedule-M / CARO-Ext / CFR-Part-11)
 * @disciplines FR-7 · FR-13 · FR-106
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, ArrowRight, Inbox } from 'lucide-react';
import ScheduleMPage from './ScheduleMPage';
import CAROExtendedPage from './CAROExtendedPage';
import CFRPart11DeeplinkPage from './CFRPart11DeeplinkPage';

type SubTab = 'entities' | 'schedule-m' | 'caro-extended' | 'cfr-part-11';

interface CompanyRow {
  id: string;
  legalEntityName?: string;
  name?: string;
  shortCode?: string;
  status?: string;
  city?: string;
  state?: string;
  gstRegs?: unknown[];
  lutBonds?: unknown[];
}

// [JWT] GET /api/foundation/companies — currently reads the same localStorage
// foundation store that CompanyForm/FoundationEntityHub persist into.
function loadCompanies(): CompanyRow[] {
  try {
    const raw = localStorage.getItem('erp_companies');
    return raw ? (JSON.parse(raw) as CompanyRow[]) : [];
  } catch { return []; }
}

function EntitiesTab(): JSX.Element {
  const navigate = useNavigate();
  const companies = useMemo(loadCompanies, []);

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground">No companies registered yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add a company from Command Center → Foundation → Companies.
        </p>
        <button
          onClick={() => navigate('/erp/foundation/companies/create')}
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Open Company form
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        {companies.length} {companies.length === 1 ? 'company' : 'companies'} in the foundation
        register. Click any row to open its Company form.
      </p>
      {companies.map((c) => {
        const name = c.legalEntityName ?? c.name ?? '(unnamed company)';
        const status = (c.status ?? 'unknown').toString().toLowerCase();
        const gstCount = Array.isArray(c.gstRegs) ? c.gstRegs.length : 0;
        const lutCount = Array.isArray(c.lutBonds) ? c.lutBonds.length : 0;
        return (
          <button
            key={c.id}
            onClick={() => navigate(`/erp/foundation/companies/${c.id}/edit`)}
            className="w-full rounded-lg border bg-card hover:border-primary/40 hover:bg-accent/30 p-4 text-left transition-all flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                {c.shortCode && (
                  <Badge variant="outline" className="text-[10px] font-mono">{c.shortCode}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant={status === 'active' ? 'default' : 'outline'}
                  className="text-[10px] capitalize"
                >
                  {status}
                </Badge>
                <Badge
                  variant={gstCount > 0 ? 'default' : 'outline'}
                  className="text-[10px]"
                >
                  GST · {gstCount}
                </Badge>
                <Badge
                  variant={lutCount > 0 ? 'default' : 'outline'}
                  className="text-[10px]"
                >
                  LUT · {lutCount}
                </Badge>
                {(c.city || c.state) && (
                  <span className="text-[11px] text-muted-foreground">
                    {[c.city, c.state].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

export default function CompaniesEntitiesPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('entities');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="schedule-m">Schedule M (GMP)</TabsTrigger>
          <TabsTrigger value="caro-extended">CARO Extended (3(ii)–3(xxi))</TabsTrigger>
          <TabsTrigger value="cfr-part-11">CFR Part 11</TabsTrigger>
        </TabsList>
        <TabsContent value="entities"><EntitiesTab /></TabsContent>
        <TabsContent value="schedule-m"><ScheduleMPage /></TabsContent>
        <TabsContent value="caro-extended"><CAROExtendedPage /></TabsContent>
        <TabsContent value="cfr-part-11"><CFRPart11DeeplinkPage /></TabsContent>
      </Tabs>
    </div>
  );
}
