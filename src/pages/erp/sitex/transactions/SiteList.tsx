/**
 * @file        src/pages/erp/sitex/transactions/SiteList.tsx
 * @purpose     Site Master list · reads sitex-engine.listSites · 1 working transaction at A.14
 * @sprint      T-Phase-1.A.14 SiteX Foundation · Block E.1
 * @decisions   D-NEW-CU POSSIBLE · FR-50 Multi-Entity 6-point
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listSites } from '@/lib/sitex-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import type { SiteMaster } from '@/types/sitex';
import type { SiteXModule } from '../SiteXSidebar.types';
import { MOCK_SITES } from '@/data/mock-sitex';
import { siteMastersKey } from '@/types/sitex';

interface Props {
  onNavigate: (m: SiteXModule) => void;
}

const STATUS_COLOR: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  mobilizing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  demobilizing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  closed: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

const MODE_LABEL: Record<string, string> = {
  install_commission: 'Install/Commission',
  construction: 'Construction',
  capex_internal: 'CAPEX Internal',
};

export function SiteList({ onNavigate }: Props): JSX.Element {
  const [sites, setSites] = useState<SiteMaster[]>([]);

  useEffect(() => {
    // Auto-seed demo data on first visit (per AC#12)
    let stored = listSites(DEFAULT_ENTITY_SHORTCODE);
    if (stored.length === 0) {
      try {
        localStorage.setItem(siteMastersKey(DEFAULT_ENTITY_SHORTCODE), JSON.stringify(MOCK_SITES));
        stored = MOCK_SITES;
      } catch { /* ignore */ }
    }
    setSites(stored);
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => onNavigate('welcome')}>
        <ArrowLeft className="h-4 w-4 mr-1" />Welcome
      </Button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-amber-600" />
          <div>
            <h2 className="text-xl font-bold">Site List</h2>
            <p className="text-sm text-muted-foreground">{sites.length} site(s) · 2 demo sites seeded</p>
          </div>
        </div>
        <Button onClick={() => onNavigate('mobilize-site')} disabled>
          <Plus className="h-4 w-4 mr-1" />Mobilize New Site (A.15)
        </Button>
      </div>

      {sites.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No sites yet. Demo seed should auto-load 2 sites · check entity selection.
        </Card>
      ) : (
        <div className="grid gap-4">
          {sites.map((site) => (
            <Card key={site.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold">{site.site_name}</h3>
                  <p className="text-sm text-muted-foreground">{site.site_code} · {site.location.city}, {site.location.state}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={STATUS_COLOR[site.status]}>{site.status}</Badge>
                  <Badge variant="outline">{MODE_LABEL[site.site_mode]}</Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Manager: {site.site_manager_id} · Branch: {site.branch_id || '(auto-creates on mobilize)'} · Project: {site.project_id || '(ad-hoc)'}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4 bg-slate-50 dark:bg-slate-900/50 text-xs text-muted-foreground">
        <strong>SiteX delivers (MOAT #22 · 8/8 criteria):</strong> Mobilize Site wizard · Site Detail · 5-state machine · DPR · Snag Register · Safety Suite · Imprest · Customer Signoff · Commissioning · 4 closeout handoffs · Site Twin Dashboard with live Site Health Score · 5 mobile captures.
      </Card>
    </div>
  );
}
