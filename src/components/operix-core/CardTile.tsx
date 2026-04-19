/**
 * CardTile.tsx — Replaces the old AppCard on /erp/dashboard
 * Shows status lamp + 2-3 pulse metrics per tile + entitlement status.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Clock, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { AppDefinition } from '@/components/operix-core/applications';
import { computeCardPulse, STATUS_COLOURS } from '@/lib/card-pulse-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { buildCardRoute } from '@/lib/breadcrumb-memory';
import type { CardId } from '@/types/card-entitlement';

const ICON = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;

export function CardTile({ app }: { app: AppDefinition }) {
  const navigate = useNavigate();
  const { getStatus, canAccess, entityCode } = useCardEntitlement();
  const ent = getStatus(app.id as CardId);
  const { allowed, reason } = canAccess(app.id as CardId);
  const Icon = ICON[app.icon] ?? Sparkles;

  const pulse = useMemo(
    () => computeCardPulse(app.id as CardId, entityCode),
    [app.id, entityCode],
  );

  const handleClick = () => {
    if (!allowed) return;
    navigate(buildCardRoute(app.id as CardId));
  };

  const statusClass = STATUS_COLOURS[pulse.status];

  return (
    <Card
      onClick={handleClick}
      className={`relative transition-all cursor-pointer ${
        allowed ? 'hover:shadow-md hover:border-indigo-500/30' : 'opacity-60 cursor-not-allowed'
      }`}
    >
      <CardContent className='p-4 space-y-3'>
        {/* Status lamp */}
        <div
          className={`absolute top-3 right-3 h-2 w-2 rounded-full ${statusClass}`}
          title={pulse.status_note}
        />

        <div className='flex items-center gap-2'>
          <div className='h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0'>
            <Icon className='h-4 w-4 text-indigo-500' />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='font-semibold truncate'>{app.name}</p>
            <p className='text-[10px] text-muted-foreground truncate'>{app.category}</p>
          </div>
        </div>

        {/* Pulse metrics */}
        {pulse.metrics.length > 0 && allowed && (
          <div className='grid grid-cols-3 gap-2 pt-1'>
            {pulse.metrics.map((m, i) => (
              <div key={i} className='text-center'>
                <p className='text-base font-bold leading-none'>{m.value}</p>
                <p className='text-[9px] text-muted-foreground mt-1 leading-tight'>{m.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Entitlement badges */}
        <div className='flex items-center gap-2 pt-1'>
          {ent === 'trial' && <Badge variant='outline' className='text-[9px] h-4'>Trial</Badge>}
          {ent === 'add_on_available' && <Badge variant='outline' className='text-[9px] h-4'>Add-on</Badge>}
          {ent === 'locked' && (
            <span className='flex items-center gap-1 text-[10px] text-muted-foreground'>
              <Lock className='h-3 w-3' />Locked
            </span>
          )}
          {ent === 'expired' && (
            <span className='flex items-center gap-1 text-[10px] text-amber-600'>
              <Clock className='h-3 w-3' />Expired
            </span>
          )}
          {allowed && pulse.status_note && (
            <span className='text-[10px] text-muted-foreground ml-auto'>{pulse.status_note}</span>
          )}
        </div>

        {!allowed && reason && (
          <p className='text-[10px] text-muted-foreground pt-1'>{reason}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default CardTile;
