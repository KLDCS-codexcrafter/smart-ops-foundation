/**
 * CrossCardSearch.tsx — Ctrl+Shift+F overlay
 * Searches across cards' data, respects entitlement.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Truck, FileText, Package, ShoppingCart, Filter } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { searchAcrossCards, type SearchHit } from '@/lib/cross-card-search-engine';

interface CrossCardSearchProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const KIND_ICON: Record<SearchHit['kind'], React.ComponentType<{ className?: string }>> = {
  customer: Users, vendor: Truck, voucher: FileText,
  distributor: Users, item: Package, order: ShoppingCart, invoice: FileText,
};

export function CrossCardSearch({ open, onOpenChange }: CrossCardSearchProps) {
  const navigate = useNavigate();
  const { allowedCards } = useCardEntitlement();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const allowedSet = useMemo(() => new Set<string>(allowedCards), [allowedCards]);
  const hits = useMemo(() => searchAcrossCards(query, allowedSet), [query, allowedSet]);

  // Group by card_id for display
  const grouped = useMemo(() => {
    const map = new Map<string, SearchHit[]>();
    for (const h of hits) {
      const arr = map.get(h.card_id) ?? [];
      arr.push(h); map.set(h.card_id, arr);
    }
    return Array.from(map.entries());
  }, [hits]);

  const go = (h: SearchHit) => {
    onOpenChange(false);
    navigate(h.deep_link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl p-0 overflow-hidden'>
        <div className='flex items-center gap-2 px-3 py-2 border-b'>
          <Search className='h-4 w-4 text-muted-foreground' />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Search customers, vouchers, distributors, items...'
            className='border-0 shadow-none focus-visible:ring-0 h-8 text-sm'
          />
          <kbd className='text-[10px] px-1.5 py-0.5 rounded bg-muted border'>Ctrl+Shift+F</kbd>
        </div>
        <div className='max-h-96 overflow-y-auto'>
          {query.length < 2 && (
            <p className='text-center text-xs text-muted-foreground py-6'>Type at least 2 characters</p>
          )}
          {query.length >= 2 && hits.length === 0 && (
            <p className='text-center text-xs text-muted-foreground py-6'>No matches in your cards</p>
          )}
          {grouped.map(([card, cardHits]) => (
            <div key={card}>
              <div className='px-3 py-1.5 bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1'>
                <Filter className='h-3 w-3' />
                {card} · {cardHits.length}
              </div>
              {cardHits.map(h => {
                const Icon = KIND_ICON[h.kind];
                return (
                  <button
                    key={h.id + h.kind}
                    type='button'
                    onClick={() => go(h)}
                    className='w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-b hover:bg-indigo-500/5'
                  >
                    <Icon className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <p className='font-medium truncate'>{h.title}</p>
                      {h.subtitle && <p className='text-[11px] text-muted-foreground truncate'>{h.subtitle}</p>}
                    </div>
                    <Badge variant='outline' className='text-[9px] h-4 px-1'>{h.kind}</Badge>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CrossCardSearch;
