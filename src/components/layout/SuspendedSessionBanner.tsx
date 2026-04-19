/**
 * SuspendedSessionBanner.tsx — Shows paused sessions on /erp/dashboard
 * 'Resume where you left off — Credit approval for Sharma Traders'
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PauseCircle, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  readSuspended, resolveSuspended, type SuspendedSession,
} from '@/lib/session-suspend';

export function SuspendedSessionBanner() {
  const navigate = useNavigate();
  const { entityCode, userId } = useCardEntitlement();
  const [revKey, setRevKey] = useState(0);

  // revKey forces re-read after dismiss
  void revKey;
  const sessions: SuspendedSession[] = readSuspended(entityCode, userId);
  if (sessions.length === 0) return null;

  const first = sessions[0];

  const resume = () => {
    resolveSuspended(entityCode, userId, first.id);
    navigate(first.deep_link);
  };

  const dismiss = () => {
    resolveSuspended(entityCode, userId, first.id);
    setRevKey(k => k + 1);
  };

  return (
    <div className='bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3'>
      <PauseCircle className='h-5 w-5 text-amber-600 shrink-0' />
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-semibold'>Resume where you left off</p>
        <p className='text-xs text-muted-foreground truncate'>{first.label} · in {first.card_id}</p>
      </div>
      <Button size='sm' variant='outline' onClick={resume}>
        Resume <ArrowRight className='h-3 w-3 ml-1' />
      </Button>
      <Button size='sm' variant='ghost' onClick={dismiss} aria-label='Dismiss'>
        <X className='h-3 w-3' />
      </Button>
    </div>
  );
}

export default SuspendedSessionBanner;
