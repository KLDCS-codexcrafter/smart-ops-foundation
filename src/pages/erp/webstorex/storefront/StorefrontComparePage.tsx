/**
 * @file        src/pages/erp/webstorex/storefront/StorefrontComparePage.tsx
 * @purpose     S151.T1 hotfix · DP-WS-19.4 · Compare drawer/page
 *              Renders a unioned spec table for selected items (max 4).
 * @sprint      Sprint 151 · T-WebStoreX-A11.3 · T1 hotfix
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getStoreItem } from '@/lib/webstorex-engine';
import { getEffectivePrice } from '@/lib/webstorex-commerce-engine';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GitCompare } from 'lucide-react';
import {
  PreviewRibbon, useCompareSet, setSelectedStoreItemId,
  unionSpecLabels, specLookup, fmtINR,
} from './storefront-shared';
import type { WebStoreXModule } from '../WebStoreXSidebar.types';

interface Props { onNavigate: (m: WebStoreXModule) => void; }

export function StorefrontComparePage({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const compare = useCompareSet(entityCode);

  const items = useMemo(
    () => (entityCode ? compare.ids.map(id => getStoreItem(entityCode, id)).filter((x): x is NonNullable<typeof x> => !!x) : []),
    [entityCode, compare.ids],
  );

  const specLabels = useMemo(() => unionSpecLabels(items), [items]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  return (
    <div className="animate-fade-in pb-20">
      <PreviewRibbon />
      <div className="p-4 max-w-6xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <GitCompare className="h-5 w-5" />Compare
            <span className="text-sm text-muted-foreground font-normal">· {items.length}/4</span>
          </h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onNavigate('storefront-home')}>Add more</Button>
            <Button size="sm" variant="ghost" onClick={() => compare.clear()} disabled={items.length === 0}>Clear all</Button>
          </div>
        </div>

        {items.length === 0 ? (
          <Card className="glass-card"><CardContent className="p-8 text-center space-y-3">
            <div className="text-sm text-muted-foreground">No items in compare. Add up to 4 from the storefront.</div>
            <Button onClick={() => onNavigate('storefront-home')}>Browse storefront</Button>
          </CardContent></Card>
        ) : (
          <Card className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground sticky left-0 bg-card z-10 min-w-[140px]">Attribute</th>
                    {items.map((it) => (
                      <th key={`h-${it.id}`} className="p-3 text-left min-w-[200px] align-top">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              className="font-medium text-sm text-left hover:underline line-clamp-2"
                              onClick={() => { setSelectedStoreItemId(entityCode, it.id); onNavigate('storefront-product'); }}
                            >{it.storeTitle}</button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0"
                              onClick={() => compare.toggle(it.id)} aria-label="Remove">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="aspect-square w-full max-w-[160px] bg-muted rounded-md overflow-hidden">
                            {it.images[0]?.dataUrl
                              ? <img src={it.images[0].dataUrl} alt={it.storeTitle} className="w-full h-full object-cover" />
                              : <div className="w-full h-full" />}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="[&_tr]:border-b [&_tr]:border-border">
                  <CompareRow label="Price" items={items} render={(it) => {
                    const eff = getEffectivePrice(entityCode, it.id);
                    return <span className="font-mono font-semibold">{fmtINR(eff.effective)}</span>;
                  }} />
                  <CompareRow label="MRP" items={items} render={(it) => (
                    <span className="font-mono text-muted-foreground">
                      {it.compareAtPrice != null ? fmtINR(it.compareAtPrice) : '—'}
                    </span>
                  )} />
                  <CompareRow label="Stock" items={items} render={(it) => (
                    <span className="text-xs">
                      {it.stockDisplayMode === 'hidden'
                        ? '—'
                        : (it.backorderAllowed ? 'Backorder OK' : 'In stock')}
                    </span>
                  )} />
                  <CompareRow label="Warranty" items={items} render={(it) => (
                    <span className="text-xs">{it.warrantyText ?? '—'}</span>
                  )} />
                  <CompareRow label="MOQ" items={items} render={(it) => (
                    <span className="font-mono text-xs">{it.moq ?? '—'}</span>
                  )} />
                  {specLabels.map((label) => (
                    <CompareRow key={`s-${label}`} label={label} items={items}
                      render={(it) => <span className="text-xs">{specLookup(it, label)}</span>} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

import type { WebStoreItem } from '@/types/webstorex';

interface RowProps {
  label: string;
  items: WebStoreItem[];
  render: (it: WebStoreItem) => JSX.Element;
}
function CompareRow({ label, items, render }: RowProps): JSX.Element {
  return (
    <tr>
      <td className="p-3 font-medium text-muted-foreground sticky left-0 bg-card z-10 text-xs">{label}</td>
      {items.map((it) => <td key={`${label}-${it.id}`} className="p-3 align-top">{render(it)}</td>)}
    </tr>
  );
}
