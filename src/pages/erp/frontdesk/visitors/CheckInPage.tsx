/**
 * @file        src/pages/erp/frontdesk/visitors/CheckInPage.tsx
 * @sprint      Sprint 145 · T-FrontDesk-A6F.1 · Block 4
 * @purpose     Walk-in check-in · enforces watchlist two-step ack + ID-CAPTURE CANON.
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEmployees } from '@/hooks/useEmployees';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { checkInVisitor, checkWatchlist } from '@/lib/frontdesk-engine';
import type { IdProofType, VisitPurpose } from '@/types/frontdesk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const PURPOSES: VisitPurpose[] = [
  'Vendor Meeting', 'Interview', 'Audit', 'Client Demo', 'General Visit',
  'Delivery', 'Maintenance', 'Government/Statutory',
];
const ID_TYPES: { v: IdProofType; l: string }[] = [
  { v: 'none', l: 'None' },
  { v: 'aadhaar', l: 'Aadhaar' },
  { v: 'pan', l: 'PAN' },
  { v: 'driving_license', l: 'Driving License' },
  { v: 'voter_id', l: 'Voter ID' },
  { v: 'passport', l: 'Passport' },
  { v: 'company_id', l: 'Company ID' },
];

interface Props { onDone?: () => void }

export function CheckInPage({ onDone }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { employees } = useEmployees();
  const me = useCurrentUser();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState<VisitPurpose>('General Visit');
  const [hostId, setHostId] = useState('');
  const [idProofType, setIdProofType] = useState<IdProofType>('none');
  const [idLast4, setIdLast4] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [ackWatchlist, setAckWatchlist] = useState(false);

  const watchHits = useMemo(
    () => (name.trim() ? checkWatchlist(entityCode, name, company, phone) : []),
    [entityCode, name, company, phone],
  );

  const submit = (): void => {
    try {
      const host = employees.find((e) => e.id === hostId);
      if (!host) throw new Error('Select a host');
      if (watchHits.length > 0 && !ackWatchlist) {
        throw new Error('Acknowledge the watchlist warning to proceed');
      }
      checkInVisitor(entityCode, me?.id ?? 'demo-user', {
        name, company: company || null, phone: phone || null,
        purpose,
        hostEmployeeId: hostId, hostName: host.displayName,
        idProofType, idProofLast4: idLast4 || null,
        vehicleNo: vehicleNo || null,
        acknowledgeWatchlistByUserId: watchHits.length > 0 ? (me?.id ?? 'demo-user') : undefined,
      });
      toast.success(`Checked in ${name}`);
      onDone?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6">
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Walk-in Check-in</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {watchHits.length > 0 && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Watchlist hit ({watchHits.length})</AlertTitle>
              <AlertDescription className="space-y-2">
                <ul className="text-xs list-disc pl-4">
                  {watchHits.map((w) => <li key={w.id}>{w.name} — {w.reason}</li>)}
                </ul>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={ackWatchlist} onChange={(e) => setAckWatchlist(e.target.checked)} />
                  I acknowledge this warning and accept responsibility for proceeding.
                </label>
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Visitor name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10} /></div>
            <div>
              <Label>Purpose</Label>
              <Select value={purpose} onValueChange={(v) => setPurpose(v as VisitPurpose)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Host *</Label>
              <Select value={hostId} onValueChange={setHostId}>
                <SelectTrigger><SelectValue placeholder="Choose host employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.displayName} · {e.empCode}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ID Proof type</Label>
              <Select value={idProofType} onValueChange={(v) => setIdProofType(v as IdProofType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ID_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>ID last 4 (ID-CAPTURE CANON)</Label>
              <Input value={idLast4} onChange={(e) => setIdLast4(e.target.value.slice(0, 4))} maxLength={4} placeholder="****" />
              <p className="text-[10px] text-muted-foreground mt-1">Only last 4 digits stored — full IDs are forbidden.</p>
            </div>
            <div className="col-span-2"><Label>Vehicle No</Label><Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onDone}>Cancel</Button>
            <Button onClick={submit}>Check in</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
