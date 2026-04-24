/**
 * @file     PartyTreeList.tsx
 * @purpose  Generic 4-level tree list (Type → Sector → Activity → Leaf) for party masters.
 *           Matches LedgerMaster's coaExpanded Set pattern.
 * @sprint   T-H1.5-C-S4
 */
import { useState, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { PartyTreeL1, PartyLeaf } from '../lib/party-tree-builder';

export interface PartyTreeListProps {
  tree: PartyTreeL1[];
  onLeafClick: (leaf: PartyLeaf) => void;
  renderLeafMeta?: (leaf: PartyLeaf) => React.ReactNode;
  /** S4.5 — render aggregated KPI badges next to L1/L2/L3 node titles. */
  renderNodeMeta?: (level: 1 | 2 | 3, nodeCode: string, leaves: PartyLeaf[]) => React.ReactNode;
  emptyState?: React.ReactNode;
}

export function PartyTreeList({ tree, onLeafClick, renderLeafMeta, renderNodeMeta, emptyState }: PartyTreeListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(tree.map(l1 => l1.code)));
  const [search, setSearch] = useState('');

  const toggle = (code: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    return next;
  });

  const expandAll = () => {
    const all = new Set<string>();
    for (const l1 of tree) {
      all.add(l1.code);
      for (const l2 of l1.l2) {
        all.add(`${l1.code}:${l2.code}`);
        for (const l3 of l2.l3) all.add(`${l1.code}:${l2.code}:${l3.code}`);
      }
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
        l3: l2.l3.map(l3 => ({
          ...l3,
          leaves: l3.leaves.filter(leaf =>
            leaf.partyName.toLowerCase().includes(q) ||
            leaf.partyCode.toLowerCase().includes(q)),
        })).filter(l3 => l3.leaves.length > 0),
      })).filter(l2 => l2.l3.length > 0),
    })).filter(l1 => l1.l2.length > 0);
  }, [tree, search]);

  if (tree.length === 0) {
    return <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">{emptyState ?? 'No entries yet.'}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or code..." className="pl-9 text-xs" />
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
            const l1Leaves = l1.l2.flatMap(l2 => l2.l3.flatMap(l3 => l3.leaves));
            return (
              <div key={l1.code}>
                <button type="button"
                  className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-muted/30 transition-colors"
                  onClick={() => toggle(l1.code)}>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ${l1Open ? '' : '-rotate-90'}`} />
                  <span className="text-sm font-bold text-foreground">{l1.label}</span>
                  <Badge variant="outline" className="text-[10px] ml-1">{l1.totalLeaves}</Badge>
                  {renderNodeMeta && (
                    <span className="ml-auto pl-2">{renderNodeMeta(1, l1.code, l1Leaves)}</span>
                  )}
                </button>

                {l1Open && l1.l2.map(l2 => {
                  const l2Key = `${l1.code}:${l2.code}`;
                  const l2Open = expanded.has(l2Key);
                  const l2Leaves = l2.l3.flatMap(l3 => l3.leaves);
                  return (
                    <div key={l2Key} className="bg-muted/10">
                      <button type="button"
                        className="flex items-center gap-2 w-full pl-8 pr-3 py-2 hover:bg-muted/30 transition-colors"
                        onClick={() => toggle(l2Key)}>
                        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-150 ${l2Open ? '' : '-rotate-90'}`} />
                        <span className="text-xs font-semibold text-foreground">{l2.label}</span>
                        {renderNodeMeta && (
                          <span className="ml-auto pl-2">{renderNodeMeta(2, l2.code, l2Leaves)}</span>
                        )}
                      </button>

                      {l2Open && l2.l3.map(l3 => {
                        const l3Key = `${l1.code}:${l2.code}:${l3.code}`;
                        const l3Open = expanded.has(l3Key);
                        return (
                          <div key={l3Key}>
                            <button type="button"
                              className="flex items-center gap-1.5 w-full pl-14 pr-3 py-1.5 hover:bg-muted/30 transition-colors"
                              onClick={() => toggle(l3Key)}>
                              <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-150 ${l3Open ? '' : '-rotate-90'}`} />
                              <span className="text-xs font-medium text-foreground">{l3.label}</span>
                              <Badge variant="outline" className="text-[10px] ml-1">{l3.leaves.length}</Badge>
                              {renderNodeMeta && (
                                <span className="ml-auto pl-2">{renderNodeMeta(3, l3.code, l3.leaves)}</span>
                              )}
                            </button>
                            {l3Open && l3.leaves.map(leaf => (
                              <button key={leaf.id} type="button"
                                onClick={() => onLeafClick(leaf)}
                                className={`flex items-center gap-2 w-full pl-20 pr-3 py-1.5 hover:bg-primary/5 transition-colors text-left ${leaf.status === 'inactive' ? 'opacity-50' : ''}`}>
                                <span className="text-xs text-foreground font-medium flex-1 truncate">{leaf.partyName}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{leaf.partyCode}</span>
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
