import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Package } from 'lucide-react';

export function ItemCraftPanel() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" /> Item Craft
        </h1>
        <p className="text-sm text-muted-foreground">
          Complete item master — full build in INV-10 session
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
        <p className="text-sm">Item Craft — Full build in INV-10 session</p>
      </div>
    </div>
  );
}

export default function ItemCraft() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><ItemCraftPanel /></main>
      </div>
    </SidebarProvider>
  );
}
