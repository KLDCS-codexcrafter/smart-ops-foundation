/**
 * CommandPalette.tsx — Ctrl+K overlay
 * Uses useCardEntitlement to scope. Wires to Stage 3a shortcut hook.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, ArrowUp, ArrowDown, Command } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { BASE_COMMANDS, matchCommands, type CommandEntry } from '@/lib/command-palette-registry';
import { readActivity } from '@/lib/cross-card-activity-engine';
import { logAudit } from '@/lib/card-audit-engine';
import type { CardId } from '@/types/card-entitlement';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { allowedCards, entityCode, userId } = useCardEntitlement();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const allowedSet = useMemo(() => new Set<string>(allowedCards), [allowedCards]);

  // Pull last 5 activity items as 'recent' entries at top when query is empty.
  // Cleanup-1a: `open` intentionally re-reads activity each time the palette
  // is opened, so the recent list reflects work done since the last open.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: refresh on palette open
  const recent = useMemo(
    () => readActivity(entityCode, userId).slice(0, 5),
    [entityCode, userId, open],
  );

  const results = useMemo(() => {
    const entries: CommandEntry[] = [...BASE_COMMANDS];
    if (!query) {
      recent.forEach((r) => {
        entries.unshift({
          id: `recent-${r.id}`,
          label: `Recent: ${r.title}`,
          keywords: r.title + ' ' + (r.subtitle ?? ''),
          card_id: r.card_id as CardId,
          action: 'open_recent',
          target_route: r.deep_link,
          subtitle: r.card_id,
        });
      });
    }
    return matchCommands(query, entries, allowedSet);
  }, [query, recent, allowedSet]);

  useEffect(() => { setCursor(0); }, [query]);

  const go = (e: CommandEntry) => {
    onOpenChange(false);
    logAudit({
      entityCode, userId, userName: userId,
      cardId: e.card_id, action: 'module_open',
      moduleId: e.target_module_id ?? null,
      refType: 'palette', refId: e.id, refLabel: e.label,
    });
    if (e.target_route) navigate(e.target_route);
  };

  const onKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setCursor(c => Math.min(c + 1, results.length - 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (ev.key === 'Enter' && results[cursor]) {
      ev.preventDefault();
      go(results[cursor].entry);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-xl p-0 overflow-hidden'>
        <div className='flex items-center gap-2 px-3 py-2 border-b'>
          <Search className='h-4 w-4 text-muted-foreground' />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='Search cards, masters, actions, recent...'
            className='border-0 shadow-none focus-visible:ring-0 h-8 text-sm'
          />
          <kbd className='text-[10px] px-1.5 py-0.5 rounded bg-muted border'>Ctrl+K</kbd>
        </div>
        <div className='max-h-80 overflow-y-auto'>
          {results.length === 0 && (
            <p className='text-center text-xs text-muted-foreground py-6'>No matches</p>
          )}
          {results.map((r, i) => (
            <button
              key={r.entry.id}
              type='button'
              onClick={() => go(r.entry)}
              onMouseEnter={() => setCursor(i)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-b ${
                i === cursor ? 'bg-indigo-500/10' : ''
              }`}
            >
              <Command className='h-3.5 w-3.5 text-indigo-500 shrink-0' />
              <span className='flex-1 truncate'>{r.entry.label}</span>
              {r.entry.subtitle && (
                <span className='text-[10px] text-muted-foreground'>{r.entry.subtitle}</span>
              )}
              {i === cursor && <CornerDownLeft className='h-3 w-3 text-muted-foreground' />}
            </button>
          ))}
        </div>
        <div className='px-3 py-2 border-t flex items-center gap-3 text-[10px] text-muted-foreground'>
          <span className='flex items-center gap-1'>
            <ArrowUp className='h-3 w-3' />
            <ArrowDown className='h-3 w-3' />
            Navigate
          </span>
          <span className='flex items-center gap-1'>
            <CornerDownLeft className='h-3 w-3' />Open
          </span>
          <span>Esc Close</span>
          <span className='ml-auto'>{results.length} shown · filtered by your role</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;
