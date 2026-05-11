/**
 * @file        src/pages/mobile/MobileSiteEngineerPage.tsx
 * @purpose     SiteX OperixGo Sahayak mobile landing · site engineer today's view
 * @sprint      T-Phase-1.A.14 SiteX Foundation · Q-LOCK-11a · Block F.1 · NEW canonical · web+mobile parallel
 * @decisions   D-NEW-CV POSSIBLE Mobile catalog incremental pattern · D-NEW-CT 17th canonical
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, MapPin, FileText, AlertTriangle, Shield, Package, Activity } from 'lucide-react';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { listSites } from '@/lib/sitex-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import type { SiteMaster } from '@/types/sitex';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

export default function MobileSiteEngineerPage(): JSX.Element {
  const navigate = useNavigate();
  const [sites, setSites] = useState<SiteMaster[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteMaster | null>(null);

  const refresh = (): void => {
    const all = listSites(ENTITY).filter((s) => s.status === 'active' || s.status === 'mobilizing' || s.status === 'planned');
    setSites(all);
    setSelectedSite((prev) => prev ?? (all.length > 0 ? all[0] : null));
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Operix Go
        </Button>
        <OfflineIndicator />
      </header>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <MapPin className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Site Engineer</h1>
          <p className="text-xs text-muted-foreground">SiteX Mobile · today's site work</p>
        </div>
      </div>

      {sites.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No active sites assigned. Sites mobilize at A.15.
        </Card>
      ) : (
        <>
          <Card className="p-4 bg-amber-50 dark:bg-amber-950/30">
            <p className="text-xs text-muted-foreground mb-1">Current site</p>
            <h2 className="font-semibold">{selectedSite?.site_name}</h2>
            <p className="text-xs text-muted-foreground mt-1">{selectedSite?.site_code} · {selectedSite?.location.city}</p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard icon={FileText} label="DPR" sub="Daily Progress" onClick={() => navigate('/operix-go/site-dpr')} />
            <QuickActionCard icon={AlertTriangle} label="Snag" sub="Capture issue" onClick={() => navigate('/operix-go/site-snag')} />
            <QuickActionCard icon={Shield} label="Safety" sub="Incident report" onClick={() => navigate('/operix-go/site-safety')} />
            <QuickActionCard icon={Package} label="Material" sub="Issue · offline" onClick={() => navigate('/operix-go/site-material-issue')} />
          </div>

          <Card className="p-4 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4" />
              <strong>A.15 Closeout adds:</strong>
            </div>
            DPR capture (geo-fenced photos) · Snag capture (one-tap photo+severity) · Toolbox Talk (camera badge scan attendance) · Material Issue (offline queue) · Labour Attendance (biometric) · Safety Incident capture.
          </Card>
        </>
      )}

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Status: coming_soon · Foundation A.14 · captures land A.15
      </p>
    </div>
  );
}

interface QuickActionProps {
  icon: typeof FileText;
  label: string;
  sub: string;
  disabled?: boolean;
  onClick?: () => void;
}

function QuickActionCard({ icon: Icon, label, sub, disabled, onClick }: QuickActionProps): JSX.Element {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border bg-card p-4 text-left transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon className="h-5 w-5 text-amber-600 mb-2" />
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </button>
  );
}
