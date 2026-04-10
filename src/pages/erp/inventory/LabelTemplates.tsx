import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Tag } from 'lucide-react';

export function LabelTemplatesPanel() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6" />Label Templates</h1>
        <p className="text-sm text-muted-foreground">Design and manage label layouts — full build in INV-13</p>
      </div>
      <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
        <p className="text-sm">Label Templates — Full build in INV-13 session</p>
      </div>
    </div>
  );
}

export default function LabelTemplates() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><LabelTemplatesPanel /></main>
      </div>
    </SidebarProvider>
  );
}
