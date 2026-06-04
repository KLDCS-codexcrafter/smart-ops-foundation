/**
 * @file        src/pages/erp/frontdesk/FrontDeskWelcome.tsx
 * @sprint      Sprint 145 · T-FrontDesk-A6F.1 · Block 4
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, LogIn, ClipboardList, ShieldAlert, BookUser, UserPlus } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getFrontDeskStats } from '@/lib/frontdesk-engine';
import type { FrontDeskModule } from './FrontDeskSidebar.types';

interface Props { onNavigate?: (m: FrontDeskModule) => void }

export function FrontDeskWelcome({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const stats = useMemo(() => getFrontDeskStats(entityCode), [entityCode]);

  const tile = (
    label: string, value: number, target: FrontDeskModule, Icon: typeof Users,
  ): JSX.Element => (
    <Card key={target} className="cursor-pointer hover:bg-accent/30 transition" onClick={() => onNavigate?.(target)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold font-mono">{value}</p>
          </div>
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">FrontDesk</h1>
        <p className="text-sm text-muted-foreground">Visitors · Watchlist · Roll-Call · Contact Book</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tile('On-site now', stats.onSiteNow, 'visitors', Users)}
        {tile('Planned today', stats.plannedToday, 'visitors', UserPlus)}
        {tile('Checked-out today', stats.checkedOutToday, 'visitors', LogIn)}
        {tile('Overstays', stats.overstays, 'roll-call', ClipboardList)}
        {tile('Watchlist hits', stats.watchlistHits, 'watchlist', ShieldAlert)}
        {tile('Contact book', 0, 'contact-book', BookUser)}
      </div>
    </div>
  );
}
