/**
 * @file        src/components/mobile/MobileServiceCompletion.tsx
 * @purpose     5-step service completion · Channel 1 HappyCode OTP MANDATORY gate
 * @sprint      T-Phase-1.C.1a · Block G.5 · v2 spec
 * @decisions   D-NEW-DF consumer #10
 * @iso        Usability + Functional Suitability + Reliability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Camera, Check, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { generateOTPForTicketClose, verifyOTPForTicketClose } from '@/lib/servicedesk-engine';

interface Props {
  ticketId: string;
  onClose: () => void;
}

export function MobileServiceCompletion({ ticketId, onClose }: Props): JSX.Element {
  const [step, setStep] = useState(1);
  const [summary, setSummary] = useState('');
  const [sparesUsed, setSparesUsed] = useState('');
  const [signatureCaptured, setSignatureCaptured] = useState(false);
  const [otpGenerated, setOtpGenerated] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  const next = (): void => setStep((s) => Math.min(5, s + 1));
  const prev = (): void => setStep((s) => Math.max(1, s - 1));

  const handleGenerateOTP = (): void => {
    const { otp } = generateOTPForTicketClose(ticketId);
    setOtpGenerated(otp);
    toast.info(`OTP sent to customer · demo OTP: ${otp}`);
  };

  const handleVerifyOTP = (): void => {
    if (verifyOTPForTicketClose(ticketId, otpInput)) {
      setOtpVerified(true);
      toast.success('OTP verified');
    } else {
      toast.error('Invalid or expired OTP');
    }
  };

  const submit = (): void => {
    if (!otpVerified) {
      toast.error('OTP verification mandatory · cannot complete without HappyCode Channel 1');
      return;
    }
    toast.success('Service complete · HappyCode captured');
    onClose();
  };

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-bold text-sm">Complete Service · Step {step} of 5</h1>
      </div>

      <Card className="p-4 space-y-3">
        {step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="sum">Service Summary</Label>
            <Textarea id="sum" rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-2">
            <Label htmlFor="sp">Spare Parts Used</Label>
            <Textarea id="sp" rows={4} value={sparesUsed} onChange={(e) => setSparesUsed(e.target.value)} placeholder="Part code · qty · serial" />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-2">
            <Label>Customer Signoff (signature)</Label>
            <Button variant="outline" onClick={() => setSignatureCaptured(true)} className="w-full">
              <Camera className="h-4 w-4 mr-2" /> {signatureCaptured ? 'Signature captured' : 'Capture signature'}
            </Button>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-orange-600" />
              <span className="font-semibold text-sm">HappyCode Channel 1 · OTP gate</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Engineer cannot complete the ticket without customer OTP. This is the mandatory close-gate per v5 §3 / v4 §3.1.
            </p>
            {!otpGenerated ? (
              <Button size="sm" onClick={handleGenerateOTP}>Send OTP to customer</Button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input id="otp" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} maxLength={6} />
                <Button size="sm" onClick={handleVerifyOTP} disabled={otpVerified}>
                  <ShieldCheck className="h-4 w-4 mr-1" /> {otpVerified ? 'Verified ✓' : 'Verify'}
                </Button>
              </div>
            )}
          </div>
        )}
        {step === 5 && (
          <div className="space-y-2 text-sm">
            <p><strong>Review</strong></p>
            <p>Summary: {summary || '—'}</p>
            <p>Spares: {sparesUsed || '—'}</p>
            <p>Signature: {signatureCaptured ? 'yes' : 'no'}</p>
            <p>OTP verified: {otpVerified ? 'yes' : 'NO · cannot submit'}</p>
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
            <Button size="sm" onClick={submit} disabled={!otpVerified}>
              <Check className="h-4 w-4 mr-1" /> Submit
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
