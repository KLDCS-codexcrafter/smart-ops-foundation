import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Warehouse } from 'lucide-react';

export function StorageMatrixPanel() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Warehouse className="h-6 w-6" /> Storage Matrix
        </h1>
        <p className="text-sm text-muted-foreground">
          Godown hierarchy and warehouse management — A.2 Storage
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-sm">Storage Matrix — Full build in INV-08 session</p>
      </div>
    </div>
  );
}

export default function StorageMatrix() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1"><StorageMatrixPanel /></main>
      </div>
    </SidebarProvider>
  );
}
