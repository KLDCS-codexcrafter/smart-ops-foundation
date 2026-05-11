/**
 * @file        src/pages/erp/maintainpro/MaintainProWelcome.tsx
 * @purpose     MaintainPro welcome landing · 6 master quick-action tiles + scope summary
 * @sprint      T-Phase-1.A.16a · Block C.4
 * @whom        Audit Owner
 */
import { Card } from '@/components/ui/card';
import {
  Wrench,
  Package,
  FlaskConical,
  Flame,
  Calendar,
  Building,
  Sparkles,
} from 'lucide-react';
import type { MaintainProModule } from './MaintainProSidebar.types';

interface Props {
  onNavigate: (m: MaintainProModule) => void;
}

const MASTER_TILES: Array<{
  icon: typeof Wrench;
  title: string;
  description: string;
  target: MaintainProModule;
}> = [
  {
    icon: Wrench,
    title: 'Equipment Master',
    description: '35-field asset register · cross-card hookpoints (SiteX · ProjX · EngineeringX · SAMPerson) · genealogy tree',
    target: 'equipment-list',
  },
  {
    icon: Package,
    title: 'Spare Parts',
    description: 'Read-only filter view of Inventory Hub · stock group "Maintenance Spares"',
    target: 'spare-parts',
  },
  {
    icon: FlaskConical,
    title: 'Calibration Instruments',
    description: 'TDL 9 fields exact · NABL / ISO 17025 audit-ready · auto-quarantine on due',
    target: 'calibration-instruments',
  },
  {
    icon: Flame,
    title: 'Fire Safety & Emergency',
    description: 'TDL 5 fields × 6 equipment types · Indian Factory Act §38A compliant · cascade alerts',
    target: 'fire-safety',
  },
  {
    icon: Calendar,
    title: 'PM Schedule Templates',
    description: '4-axis trigger model (calendar · meter · usage · season) · activities checklist',
    target: 'pm-template-master',
  },
  {
    icon: Building,
    title: 'Maintenance Vendor',
    description: 'Read-only filter view of Command Center Vendor Master · Sundry Creditor ledger group',
    target: 'maintenance-vendor',
  },
];

export function MaintainProWelcome({ onNavigate }: Props): JSX.Element {
  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
          <Wrench className="h-6 w-6 text-cyan-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">MaintainPro · Maintenance Operations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Asset master · preventive maintenance · breakdowns · calibration · fire safety ·
            internal helpdesk. Foundation Masters layer (6 masters) — transactions and reports
            ship in A.16b / A.16c.
          </p>
        </div>
      </div>

      <Card className="p-6 bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-5 w-5 text-cyan-600" />
          <h2 className="font-semibold">Foundation Sprint · 6 Masters Delivered</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Equipment (35 fields with ProjX deep wiring) · Spare Parts (Inventory Hub replica) ·
          Calibration (TDL 9 fields) · Fire Safety (TDL 5 fields × 6 types) ·
          PM Schedule Template (4-axis) · Maintenance Vendor (Command Center replica).
          Card status flips to active at A.17 Closeout.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MASTER_TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Card
              key={tile.target}
              className="p-5 hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => onNavigate(tile.target)}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">{tile.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{tile.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
