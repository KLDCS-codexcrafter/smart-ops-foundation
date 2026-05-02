/**
 * LineItemSearchBar · Sprint T-Phase-2.7-d-2 · Q4-d
 *
 * Inline search bar above line items table · slides in on Ctrl+F.
 * Debounced 200ms · X of Y match counter · Enter cycles forward · Shift+Enter back.
 */
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { searchLineItems, type SearchResult } from '@/lib/line-item-search';

interface Props {
  open: boolean;
  onClose: () => void;
  items: Array<Record<string, unknown>>;
  onJumpToRow: (rowIndex: number) => void;
}

export function LineItemSearchBar({ open, onClose, items, onJumpToRow }: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setDebounced('');
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const result: SearchResult = open
    ? searchLineItems(items, debounced)
    : { matches: [], totalRowsSearched: 0, searchScope: 'full-text' };

  useEffect(() => {
    if (result.matches.length === 0) { setCursor(0); return; }
    if (cursor >= result.matches.length) setCursor(0);
  }, [result.matches.length, cursor]);

  function jumpTo(idx: number) {
    if (result.matches.length === 0) return;
    const c = ((idx % result.matches.length) + result.matches.length) % result.matches.length;
    setCursor(c);
    onJumpToRow(result.matches[c].rowIndex);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      jumpTo(e.shiftKey ? cursor - 1 : cursor + 1);
    }
  }

  if (!open) return null;
  const hasMatches = result.matches.length > 0;

  return (
    <div className="sticky top-0 z-30 mb-2 flex flex-col gap-1 rounded-lg border border-border bg-card/95 p-2 shadow-soft backdrop-blur-xl animate-slide-up">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Find in line items..."
          className="h-8 flex-1"
        />
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {hasMatches ? `${cursor + 1} of ${result.matches.length}` : (debounced ? '0 matches' : '')}
        </span>
        <Button size="sm" variant="ghost" onClick={() => jumpTo(cursor - 1)} disabled={!hasMatches} aria-label="Previous match">
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => jumpTo(cursor + 1)} disabled={!hasMatches} aria-label="Next match">
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close search">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {result.fallbackReason && (
        <div className="text-xs text-warning">
          Long voucher · searching identity fields only ({result.totalRowsSearched} rows · &gt;100 threshold).
        </div>
      )}
    </div>
  );
}
