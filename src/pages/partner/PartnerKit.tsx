/**
 * PartnerKit.tsx — Marketing asset catalog.
 * Downloads honest-deferred · hosted assets arrive with Wave-2.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Presentation, Calculator, BookOpen } from 'lucide-react';
import { getMarketingAssets } from '@/lib/partner-portal-engine';
import type { MarketingAsset } from '@/types/partner-portal';

const ICONS: Record<MarketingAsset['type'], typeof FileText> = {
  brochure: BookOpen,
  deck: Presentation,
  pricelist: FileText,
  tool: Calculator,
};

export default function PartnerKit() {
  const assets = getMarketingAssets();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Marketing Kit</h1>
        <p className="text-sm text-muted-foreground">
          Pitch decks, brochures, price lists, tools.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {assets.map((a) => {
          const Icon = ICONS[a.type];
          return (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-tight">{a.title}</CardTitle>
                  <Icon className="h-5 w-5 text-orange-600 shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="outline" className="capitalize">{a.type}</Badge>
                  <span className="font-mono">{a.size_kb ? `${a.size_kb} KB` : '—'}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  className="w-full"
                  title="Hosted assets arrive with Wave-2"
                >
                  <Download className="h-4 w-4 mr-1" /> Download (Wave-2)
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Asset hosting + CDN-backed downloads ship with Wave-2 partner-services backend.
      </p>
    </div>
  );
}
