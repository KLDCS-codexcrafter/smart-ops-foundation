import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Grid3X3 } from 'lucide-react';
import { BatchList } from '@/components/batch-grid/BatchList';

export default function BatchGrid() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Grid3X3 className="h-6 w-6" /> Batch Grid
              </h1>
              <p className="text-sm text-muted-foreground">
                Batch tracking, lot numbers, QC hold and expiry management
              </p>
            </div>
            <BatchList />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
