import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Hash } from 'lucide-react';
import { SerialList } from '@/components/serial-grid/SerialList';
import { SerialStatsCards } from '@/components/serial-grid/SerialStatsCards';

/** Panel variant — renders inside CommandCenterPage without SidebarProvider/ERPHeader wrapper */
export function SerialGridPanel() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Hash className="h-6 w-6" /> Serial Grid
        </h1>
        <p className="text-sm text-muted-foreground">
          Serial number tracking, IMEI, warranty and unit lifecycle
        </p>
      </div>
      <SerialStatsCards />
      <SerialList />
    </div>
  );
}

export default function SerialGrid() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1 p-6">
          <SerialGridPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
