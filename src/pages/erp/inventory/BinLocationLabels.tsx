import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { MapPin } from 'lucide-react';

export function BinLocationLabelsPanel() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6" />Bin Location Labels</h1>
        <p className="text-sm text-muted-foreground">Manage bin and location labels — full build in INV-15</p>
      </div>
      <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
        <p className="text-sm">Bin Location Labels — Full build in INV-15 session</p>
      </div>
    </div>
  );
}

export default function BinLocationLabels() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><BinLocationLabelsPanel /></main>
      </div>
    </SidebarProvider>
  );
}
