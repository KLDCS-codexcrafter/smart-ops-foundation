import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Ruler } from 'lucide-react';

export function MeasureXPanel() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ruler className="h-6 w-6" /> Measure X
        </h1>
        <p className="text-sm text-muted-foreground">
          Units of Measure — standard GST-compliant UOM set
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-sm">Measure X — Full build in INV-09 session</p>
      </div>
    </div>
  );
}

export default function MeasureX() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1"><MeasureXPanel /></main>
      </div>
    </SidebarProvider>
  );
}
