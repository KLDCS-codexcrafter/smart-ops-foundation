import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { PackageOpen, Construction } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function OpeningStockPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <PackageOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Opening Stock Entry</h1>
          <p className="text-sm text-muted-foreground">Bulk opening stock entry with godown, batch, serial & rate columns</p>
        </div>
        <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-600 bg-amber-500/10">
          <Construction className="h-3 w-3 mr-1" /> Full build in INV-24
        </Badge>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-12 space-y-3">
            <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <h3 className="font-semibold text-foreground">Opening Stock Entry — Scaffold Ready</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              This module will provide bulk opening stock entry with godown selection,
              batch/serial number support, rate entry, and automatic valuation calculation.
              Infrastructure types and hooks are in place.
            </p>
            <p className="text-xs text-muted-foreground/60">
              [JWT] GET /api/inventory/opening-stock · POST /api/inventory/opening-stock
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OpeningStockEntry() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="flex-1">
          <ERPHeader />
          <div className="p-6 max-w-7xl mx-auto">
            <OpeningStockPanel />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
