/**
 * @file     PartNoSearch.tsx
 * @sprint   T-CLN1-Wave1-Cleanups · Item 1 · B25
 * @purpose  Part-No / item-code search surface. Reads the existing inventory-item
 *           store via useInventoryItems(). Pure search/filter over existing master,
 *           NO new item data, honest empty state when no match.
 * @reuses   useInventoryItems · InventoryItem.code / .name / .short_name / .hsn_sac_code
 * @[JWT]    via useInventoryItems (already annotated)
 */
import { useMemo, useState } from 'react';
import { Search, Boxes } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import type { InventoryItem } from '@/types/inventory-item';

export interface PartNoSearchPanelProps {
  /** Optional callback when an item row is opened. Caller decides drill behavior. */
  onOpen?: (item: InventoryItem) => void;
}

/** Pure filter — exported for tests. Matches code / short_name / hsn_sac_code / name (case-insensitive). */
// eslint-disable-next-line react-refresh/only-export-components
export function filterByPartNo(items: InventoryItem[], q: string): InventoryItem[] {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  return items.filter((it) => {
    const code = (it.code ?? '').toLowerCase();
    const short = (it.short_name ?? '').toLowerCase();
    const hsn = (it.hsn_sac_code ?? '').toLowerCase();
    const name = (it.name ?? '').toLowerCase();
    return code.includes(term) || short.includes(term) || hsn.includes(term) || name.includes(term);
  });
}

export function PartNoSearchPanel({ onOpen }: PartNoSearchPanelProps): JSX.Element {
  const { items } = useInventoryItems();
  const [q, setQ] = useState('');

  const results = useMemo(() => filterByPartNo(items, q), [items, q]);
  const hasQuery = q.trim().length > 0;

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Boxes className="h-5 w-5 text-primary" />
          Part-No Search
        </h1>
        <p className="text-sm text-muted-foreground">
          Search the existing item master by part-no (item code), short name, HSN / SAC, or item name.
          Read-only surface · no new item data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Enter part-no, short name, HSN or item name…"
              className="pl-9 font-mono"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Part-No search"
            />
          </div>

          <div className="mt-4">
            {!hasQuery && (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Type at least 1 character to search the item master.
              </p>
            )}
            {hasQuery && results.length === 0 && (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No item matches “{q}”. No part-no record exists for this term.
              </p>
            )}
            {hasQuery && results.length > 0 && (
              <div className="rounded-lg border divide-y">
                <div className="grid grid-cols-12 px-3 py-2 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-3">Part-No (Code)</div>
                  <div className="col-span-5">Name</div>
                  <div className="col-span-2">HSN / SAC</div>
                  <div className="col-span-2 text-right">Type</div>
                </div>
                {results.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onOpen?.(it)}
                    className="w-full grid grid-cols-12 px-3 py-2 text-left text-sm hover:bg-muted/40 transition-colors"
                  >
                    <div className="col-span-3 font-mono font-semibold">{it.code}</div>
                    <div className="col-span-5 truncate">
                      {it.name}
                      {it.short_name && (
                        <span className="text-xs text-muted-foreground ml-1">· {it.short_name}</span>
                      )}
                    </div>
                    <div className="col-span-2 font-mono text-xs text-muted-foreground">
                      {it.hsn_sac_code ?? '—'}
                    </div>
                    <div className="col-span-2 text-right">
                      <Badge variant="outline" className="text-[10px]">{it.item_type}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PartNoSearchPanel;
