import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { QrCode } from 'lucide-react';

export function BarcodeGeneratorPanel() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><QrCode className="h-6 w-6" />Barcode Generator</h1>
        <p className="text-sm text-muted-foreground">Generate and manage barcodes — full build in INV-14</p>
      </div>
      <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
        <p className="text-sm">Barcode Generator — Full build in INV-14 session</p>
      </div>
    </div>
  );
}

export default function BarcodeGenerator() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><BarcodeGeneratorPanel /></main>
      </div>
    </SidebarProvider>
  );
}
