import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { DollarSign, Construction } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function ItemRatesPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Item Rates & MRP</h1>
          <p className="text-sm text-muted-foreground">Standard rates, MRP management, and rate change history</p>
        </div>
        <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-600 bg-amber-500/10">
          <Construction className="h-3 w-3 mr-1" /> Full build in INV-25 Part A
        </Badge>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-12 space-y-3">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <h3 className="font-semibold text-foreground">Item Rates & MRP — Scaffold Ready</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              This module will manage standard purchase/selling/cost rates, MRP with tax
              inclusive/exclusive handling, and full rate change audit history with reason tracking.
              Infrastructure types and hooks are in place.
            </p>
            <p className="text-xs text-muted-foreground/60">
              [JWT] GET /api/inventory/item-rates/history · POST /api/inventory/item-rates/history
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ItemRatesMRP() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="flex-1">
          <ERPHeader />
          <div className="p-6 max-w-7xl mx-auto">
            <ItemRatesPanel />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
