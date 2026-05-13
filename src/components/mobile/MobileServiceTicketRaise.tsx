/**
 * @file        src/components/mobile/MobileServiceTicketRaise.tsx
 * @purpose     OOB-M9 omnichannel 5-step ticket raise · D-NEW-DF consumer #9
 * @sprint      T-Phase-1.C.1a · Block G.4 · v2 spec
 * @iso        Usability + Functional Suitability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Camera, Check } from 'lucide-react';
import { toast } from 'sonner';
import { listActiveCallTypes } from '@/lib/servicedesk-engine';

type Channel = 'whatsapp' | 'email' | 'phone' | 'walkin' | 'web' | 'auto_pms';

interface Props {
  onClose: () => void;
}

export function MobileServiceTicketRaise({ onClose }: Props): JSX.Element {
  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState('');
  const [callTypeCode, setCallTypeCode] = useState('');
  const [channel, setChannel] = useState<Channel>('phone');
  const [description, setDescription] = useState('');
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const callTypes = listActiveCallTypes();

  const next = (): void => setStep((s) => Math.min(5, s + 1));
  const prev = (): void => setStep((s) => Math.max(1, s - 1));
  const submit = (): void => {
    toast.success(`Ticket raised · channel ${channel}`);
    onClose();
  };

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-bold text-sm">Raise Ticket · Step {step} of 5</h1>
      </div>

      <Card className="p-4 space-y-3">
        {step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="cust">Customer</Label>
            <Input id="cust" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Customer code or name" />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-2">
            <Label htmlFor="ct">Call Type</Label>
            <Select value={callTypeCode} onValueChange={setCallTypeCode}>
              <SelectTrigger id="ct"><SelectValue placeholder="Pick call type" /></SelectTrigger>
              <SelectContent>
                {callTypes.map((ct) => (
                  <SelectItem key={ct.id} value={ct.call_type_code}>{ct.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label htmlFor="ch" className="mt-3">Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
              <SelectTrigger id="ch"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="walkin">Walk-in</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="auto_pms">Auto-PMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-2">
            <Label htmlFor="desc">Issue Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
          </div>
        )}
        {step === 4 && (
          <div className="space-y-2">
            <Label>Photo</Label>
            <Button variant="outline" onClick={() => setPhotoCaptured(true)} className="w-full">
              <Camera className="h-4 w-4 mr-2" /> {photoCaptured ? 'Photo captured' : 'Capture photo'}
            </Button>
          </div>
        )}
        {step === 5 && (
          <div className="space-y-2 text-sm">
            <p><strong>Review</strong></p>
            <p>Customer: {customerId}</p>
            <p>Call type: {callTypeCode}</p>
            <p>Channel: {channel}</p>
            <p>Photo: {photoCaptured ? 'yes' : 'no'}</p>
          </div>
        )}

        <div className="flex justify-between pt-3">
          <Button variant="outline" size="sm" onClick={prev} disabled={step === 1}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          {step < 5 ? (
            <Button size="sm" onClick={next}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={submit}>
              <Check className="h-4 w-4 mr-1" /> Submit
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
