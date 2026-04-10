import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { LayoutTemplate } from 'lucide-react';

export function ItemTemplatesPanel() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutTemplate className="h-6 w-6" /> Item Templates
        </h1>
        <p className="text-sm text-muted-foreground">
          Pre-configured item profiles — full build in INV-12 session
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
        <p className="text-sm">Item Templates — Full build in INV-12 session</p>
      </div>
    </div>
  );
}

export default function ItemTemplates() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><ItemTemplatesPanel /></main>
      </div>
    </SidebarProvider>
  );
}
