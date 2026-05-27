/**
 * @file        src/pages/erp/comply360/widgets/MegaSearch.tsx
 * @purpose     Top-of-dashboard mega search · matches 23 mega-menus + filings
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 3
 */
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { comply360SidebarItems } from '@/apps/erp/configs/comply360-sidebar-config';
import type { FilingObligation } from '@/lib/comply360-health-score-engine';
import type { Comply360Module } from '../Comply360Sidebar.types';

interface Props {
  filings: FilingObligation[];
  onOpen: (module: Comply360Module) => void;
}

interface Hit {
  kind: 'menu' | 'filing';
  label: string;
  sub?: string;
  module: Comply360Module;
}

export function MegaSearch({ filings, onOpen }: Props): JSX.Element {
  const [q, setQ] = useState('');

  const hits = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const menuHits: Hit[] = comply360SidebarItems
      .filter((i) => i.label.toLowerCase().includes(needle))
      .map((i) => ({ kind: 'menu', label: i.label, module: i.id as Comply360Module }));
    const filingHits: Hit[] = filings
      .filter((f) => f.label.toLowerCase().includes(needle))
      .slice(0, 6)
      .map((f) => ({ kind: 'filing', label: f.label, sub: `Due ${f.due_date}`, module: f.module as Comply360Module }));
    return [...menuHits, ...filingHits].slice(0, 10);
  }, [q, filings]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Comply360 · mega-menus, filings, ARNs…"
          className="pl-9 h-11"
        />
      </div>
      {hits.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border bg-popover shadow-elevated overflow-hidden">
          {hits.map((h, idx) => (
            <button
              key={`${h.kind}-${h.module}-${idx}`}
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 transition-colors"
              onClick={() => {
                onOpen(h.module);
                setQ('');
              }}
            >
              <div className="min-w-0">
                <div className="truncate">{h.label}</div>
                {h.sub && <div className="text-[11px] text-muted-foreground font-mono">{h.sub}</div>}
              </div>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{h.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
