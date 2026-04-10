import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { TrendingDown, Construction } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function PriceListsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <TrendingDown className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Price List Manager</h1>
          <p className="text-sm text-muted-foreground">Multi-tier price lists, customer-specific pricing, and promotional rates</p>
        </div>
        <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-600 bg-amber-500/10">
          <Construction className="h-3 w-3 mr-1" /> Full build in INV-25 Part B
        </Badge>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-12 space-y-3">
            <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <h3 className="font-semibold text-foreground">Price List Manager — Scaffold Ready</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              This module will manage standard selling, wholesale, export, distributor,
              promotional, and customer-specific price lists with effective dates,
              multi-currency support, and copy-from functionality.
              Infrastructure types and hooks are in place.
            </p>
            <p className="text-xs text-muted-foreground/60">
              [JWT] GET /api/inventory/price-lists · POST /api/inventory/price-lists
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PriceListManager() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="flex-1">
          <ERPHeader />
          <div className="p-6 max-w-7xl mx-auto">
            <PriceListsPanel />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
