/**
 * @file        src/pages/erp/webstorex/WebStoreXWelcome.tsx
 * @sprint      Sprint 149 · T-WebStoreX-A11.1
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Boxes, Tag, FolderTree, Settings } from 'lucide-react';
import type { WebStoreXModule } from './WebStoreXSidebar.types';

interface Props { onNavigate: (m: WebStoreXModule) => void; }

const TILES: { id: WebStoreXModule; label: string; desc: string; icon: typeof ShoppingBag }[] = [
  { id: 'catalog',    label: 'Catalog',    desc: 'Publish items from inventory master · PIM wrapper', icon: ShoppingBag },
  { id: 'variants',   label: 'Variants',   desc: 'Size/color SKUs with stock allocation guard',       icon: Boxes },
  { id: 'brands',     label: 'Brands',     desc: 'Brand master with logo and banner',                 icon: Tag },
  { id: 'categories', label: 'Categories', desc: '3-level category tree (cycle-guarded)',             icon: FolderTree },
  { id: 'settings',   label: 'Settings',   desc: 'Store identity, policies, GST invoice note',        icon: Settings },
];

export function WebStoreXWelcome({ onNavigate }: Props): JSX.Element {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">WebStoreX</h1>
        <p className="text-sm text-muted-foreground">
          B2B/B2C shopfront · PIM publication wrapper · inventory master stays READ-ONLY.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((t) => (
          <Card key={t.id} className="glass-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <t.icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{t.desc}</p>
              <Button size="sm" variant="secondary" onClick={() => onNavigate(t.id)}>Open</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
