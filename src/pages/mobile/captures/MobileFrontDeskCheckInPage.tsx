/**
 * @file        src/pages/mobile/captures/MobileFrontDeskCheckInPage.tsx
 * @purpose     AM.2 · mobile-gap persona · visitor check-in on the go
 *              CONSUMES frontdesk-engine.createPlannedVisitor + checkInVisitor
 * @sprint      AM.2 · T-AM2-Mobile-Captures · Pass 2
 * @canon       NO reimplement · delegation only · CameraCapture for visitor photo
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  listVisitors,
  createPlannedVisitor,
  checkInVisitor,
} from '@/lib/frontdesk-engine';
import { CameraCapture } from '@/components/mobile/CameraCapture';

const E = 'DEMO';
const HOST = 'mobile_host';

export default function MobileFrontDeskCheckInPage(): JSX.Element {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('meeting');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const planned = useMemo(
    () => listVisitors(E, 'planned').slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  function handleCheckIn(): void {
    if (!name.trim()) return;
    try {
      const v = createPlannedVisitor(E, {
        name,
        company: null,
        partyId: null,
        phone,
        purpose,
        hostEmployeeId: HOST,
        hostName: 'Mobile host',
        expectedDurationMinutes: 60,
        photoDataUrl: photoUrl,
        idProofType: null,
        idProofLast4: null,
        ndaDocumentId: null,
        vehicleNo: null,
        parkingNote: null,
        itemsCarried: [],
      } as Parameters<typeof createPlannedVisitor>[1]);
      checkInVisitor(E, { visitorId: v.id, byUserId: HOST } as Parameters<typeof checkInVisitor>[1]);
      toast.success(`Checked in · ${v.name}`);
      setTick((t) => t + 1);
      setName('');
      setPhone('');
      setPhotoUrl(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-bold">FrontDesk · Mobile Check-In</h1>
      </header>

      <Card className="p-3 text-xs text-muted-foreground">
        Consumes <code className="font-mono">frontdesk-engine.createPlannedVisitor</code> +{' '}
        <code className="font-mono">checkInVisitor</code>.
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <Label>Visitor name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label>Purpose</Label>
          <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>
      </Card>

      <CameraCapture label="Visitor photo" onPhotoAttached={setPhotoUrl} />

      <Button className="w-full" disabled={!name.trim()} onClick={handleCheckIn}>
        <UserCheck className="h-4 w-4 mr-1" /> Check in
      </Button>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Planned visitors ({planned.length})</h2>
        {planned.map((v) => (
          <Card key={v.id} className="p-2 text-xs">
            {v.name} · {v.purpose}
          </Card>
        ))}
      </section>
    </div>
  );
}
