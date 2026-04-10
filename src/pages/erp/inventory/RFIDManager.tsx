import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Wifi } from 'lucide-react';

export function RFIDManagerPanel() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wifi className="h-6 w-6" />RFID Manager</h1>
        <p className="text-sm text-muted-foreground">RFID tag assignment and tracking — full build in INV-17</p>
      </div>
      <div className="rounded-lg border border-dashed p-16 text-center text-muted-foreground">
        <p className="text-sm">RFID Manager — Full build in INV-17 session</p>
      </div>
    </div>
  );
}

export default function RFIDManager() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><RFIDManagerPanel /></main>
      </div>
    </SidebarProvider>
  );
}
