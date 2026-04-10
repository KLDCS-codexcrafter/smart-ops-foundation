import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Printer } from 'lucide-react';

export function PrintQueuePanel() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Printer className="h-6 w-6" />Print Queue</h1>
        <p className="text-sm text-muted-foreground">Monitor and manage print jobs — full build in INV-16</p>
      </div>
      <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
        <p className="text-sm">Print Queue — Full build in INV-16 session</p>
      </div>
    </div>
  );
}

export default function PrintQueue() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><PrintQueuePanel /></main>
      </div>
    </SidebarProvider>
  );
}
