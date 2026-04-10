import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScanLine } from 'lucide-react';

export function AssetTagManagerPanel() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ScanLine className="h-6 w-6" />Asset Tag Manager</h1>
        <p className="text-sm text-muted-foreground">Track and manage asset tags — full build in INV-15</p>
      </div>
      <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
        <p className="text-sm">Asset Tag Manager — Full build in INV-15 session</p>
      </div>
    </div>
  );
}

export default function AssetTagManager() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><AssetTagManagerPanel /></main>
      </div>
    </SidebarProvider>
  );
}
