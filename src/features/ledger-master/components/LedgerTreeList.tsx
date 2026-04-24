/**
 * @file     LedgerTreeList.tsx
 * @purpose  3-level tree list (Parent Group → Entity → Leaf) for ledger masters.
 *           Adapted from PartyTreeList (which is 4-level) since ledgers don't
 *           carry industry/activity taxonomy.
 * @sprint   T-H1.5-C-S6.5a
 * @finding  CC-059
 */
import { useState, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { LedgerTreeL1, LedgerLeaf } from '../lib/ledger-tree-builder';

export interface LedgerTreeListProps {
  tree: LedgerTreeL1[];
  onLeafClick: (leaf: LedgerLeaf) => void;
  renderLeafMeta?: (leaf: LedgerLeaf) => React.ReactNode;
  emptyState?: React.ReactNode;
}

export function LedgerTreeList({ tree, onLeafClick, renderLeafMeta, emptyState }: LedgerTreeListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(tree.map(l1 => l1.code)));
  const [search, setSearch] = useState('');

  const toggle = (code: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });

  const expandAll = () => {
    const all = new Set<string>();
    for (const l1 of tree) {
      all.add(l1.code);
      for (const l2 of l1.l2) all.add(`${l1.code}:${l2.code}`);
    }
    setExpanded(all);
  };
  const collapseAll = () => setExpanded(new Set());

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.toLowerCase();
    return tree.map(l1 => ({
      ...l1,
      l2: l1.l2.map(l2 => ({
        ...l2,
        leaves: l2.leaves.filter(leaf =>
          leaf.name.toLowerCase().includes(q) ||
          leaf.code.toLowerCase().includes(q) ||
          leaf.numericCode.toLowerCase().includes(q)),
      })).filter(l2 => l2.leaves.length > 0),
    })).filter(l1 => l1.l2.length > 0);
  }, [tree, search]);

  if (tree.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
        {emptyState ?? 'No ledger entries yet.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, code or numeric code..."
            className="pl-9 text-xs"
          />
        </div>
        <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={expandAll}>
          <ChevronDown className="h-3 w-3" /> Expand All
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="divide-y divide-border/40">
          {filteredTree.map(l1 => {
            const l1Open = expanded.has(l1.code);
            return (
              <div key={l1.code}>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-muted/30 transition-colors"
                  onClick={() => toggle(l1.code)}
                >
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ${l1Open ? '' : '-rotate-90'}`} />
                  <span className="text-sm font-bold text-foreground">{l1.label}</span>
                  <Badge variant="outline" className="text-[10px] ml-1">{l1.totalLeaves}</Badge>
                </button>

                {l1Open && l1.l2.map(l2 => {
                  const l2Key = `${l1.code}:${l2.code}`;
                  const l2Open = expanded.has(l2Key);
                  return (
                    <div key={l2Key} className="bg-muted/10">
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full pl-10 pr-3 py-2 hover:bg-muted/30 transition-colors"
                        onClick={() => toggle(l2Key)}
                      >
                        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-150 ${l2Open ? '' : '-rotate-90'}`} />
                        <span className="text-xs font-semibold text-foreground">{l2.label}</span>
                        <Badge variant="outline" className="text-[10px] ml-1">{l2.leaves.length}</Badge>
                      </button>

                      {l2Open && l2.leaves.map(leaf => (
                        <button
                          key={leaf.id}
                          type="button"
                          onClick={() => onLeafClick(leaf)}
                          className={`flex items-center gap-2 w-full pl-16 pr-3 py-1.5 hover:bg-primary/5 transition-colors text-left ${leaf.status !== 'active' ? 'opacity-60' : ''}`}
                        >
                          <span className="text-xs text-foreground font-medium flex-1 truncate">{leaf.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{leaf.numericCode || leaf.code}</span>
                          {renderLeafMeta?.(leaf)}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
