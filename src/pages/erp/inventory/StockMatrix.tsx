import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Boxes } from 'lucide-react';

export function StockMatrixPanel() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Boxes className="h-6 w-6" /> Stock Matrix
        </h1>
        <p className="text-sm text-muted-foreground">
          Hierarchical stock group management — A.2 Classification
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-sm">Stock Matrix — Full build in INV-04 session</p>
      </div>
    </div>
  );
}

export default function StockMatrix() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1"><StockMatrixPanel /></main>
      </div>
    </SidebarProvider>
  );
}
