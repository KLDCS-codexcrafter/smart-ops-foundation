/**
 * @file        src/pages/mobile/servicedesk/MobileServiceEngineerPage.tsx
 * @purpose     Mobile landing for service_engineer role · Sarathi REUSE pattern
 * @sprint      T-Phase-1.C.1a · Block G.3 · v2 spec
 * @decisions   D-NEW-DI POSSIBLE 33rd · Sarathi pattern reuse
 * @iso        Usability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Headphones, MapPin, Clock, Wrench, CheckCircle2, FileText } from 'lucide-react';
import { MobileServiceTicketRaise } from '@/components/mobile/MobileServiceTicketRaise';
import { MobileServiceCompletion } from '@/components/mobile/MobileServiceCompletion';

type View = 'home' | 'raise' | 'complete';

export default function MobileServiceEngineerPage(): JSX.Element {
  const [view, setView] = useState<View>('home');

  if (view === 'raise') return <MobileServiceTicketRaise onClose={() => setView('home')} />;
  if (view === 'complete') return <MobileServiceCompletion onClose={() => setView('home')} ticketId="DEMO-TICKET-001" />;

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <Headphones className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="font-bold">ServiceDesk Engineer</h1>
          <p className="text-xs text-muted-foreground">Sarathi REUSE landing · C.1a Foundation</p>
        </div>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold text-sm mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setView('raise')} variant="outline" className="h-20 flex-col gap-1">
            <Wrench className="h-5 w-5" />
            <span className="text-xs">Raise Ticket</span>
          </Button>
          <Button onClick={() => setView('complete')} variant="outline" className="h-20 flex-col gap-1">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs">Complete Service</span>
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold text-sm mb-3">Activity</h2>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Location update auto-emitted</div>
          <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Attendance check-in</div>
          <div className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Daily expenses</div>
        </div>
      </Card>
    </div>
  );
}
