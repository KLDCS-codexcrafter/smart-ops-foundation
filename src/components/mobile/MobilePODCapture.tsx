/**
 * MobilePODCapture.tsx — OperixGo POD capture screen. Sprint 15a.
 * Uses Sprint 14c camera + geolocation bridges. Offline-aware.
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera, MapPin, PenLine, ShieldCheck, Send } from 'lucide-react';
import { toast } from 'sonner';
import { capturePhoto } from '@/lib/camera-bridge';
import { getCurrentLocation } from '@/lib/geolocation-bridge';
import {
  createEmptyPOD, generateOTP, maskMobile, haversineDistanceMeters, verifyPOD,
} from '@/lib/pod-engine';
import type { POD } from '@/types/pod';
import { podsKey } from '@/types/pod';
import { enqueueWrite } from '@/lib/offline-queue-engine';

const ENTITY = 'SMRT';

type Step = 1 | 2 | 3 | 4 | 5;

export default function MobilePODCapture() {
  const [step, setStep] = useState<Step>(1);
  const [dlnNo, setDlnNo] = useState('');
  const [pod, setPod] = useState<POD | null>(null);
  const [otp, setOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeMobile, setConsigneeMobile] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const startCapture = () => {
    if (!dlnNo.trim()) { toast.error('Enter DLN number'); return; }
    setPod(createEmptyPOD(`v-${dlnNo}`, dlnNo, ENTITY, 'mobile-driver', null, null));
    setStep(2);
  };

  const captureGPS = async () => {
    const r = await getCurrentLocation();
    if (!r.ok || !pod) { toast.error(r.reason ?? 'GPS failed'); return; }
    let dist: number | null = null;
    if (pod.ship_to_latitude != null && pod.ship_to_longitude != null && r.latitude && r.longitude) {
      dist = haversineDistanceMeters(r.latitude, r.longitude, pod.ship_to_latitude, pod.ship_to_longitude);
    }
    setPod({
      ...pod,
      gps_latitude: r.latitude ?? null,
      gps_longitude: r.longitude ?? null,
      gps_accuracy_m: r.accuracy_m ?? null,
      gps_timestamp: r.timestamp ?? new Date().toISOString(),
      distance_from_ship_to_m: dist,
      gps_verified: true,
    });
    toast.success(`GPS captured · ${Math.round(r.accuracy_m ?? 0)}m`);
  };

  const capturePhotoStep = async () => {
    const r = await capturePhoto();
    if (!r.ok || !pod) { toast.error(r.reason ?? 'Camera failed'); return; }
    setPod({
      ...pod, photo_data_url: r.data_url, photo_size_bytes: r.size_bytes,
      photo_verified: true,
    });
    toast.success('Photo captured');
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };
  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2; ctx.strokeStyle = '#1e40af';
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };
  const endDraw = () => { drawing.current = false; };
  const clearSig = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };
  const acceptSig = () => {
    if (!pod || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/svg+xml');
    setPod({ ...pod, signature_svg: dataUrl, signature_verified: true });
    setStep(5);
  };

  const sendOTP = () => {
    const code = generateOTP();
    setOtp(code);
    toast.info(`Demo OTP: ${code}`);
    if (pod && consigneeMobile) {
      setPod({ ...pod, otp_sent_to_mobile: maskMobile(consigneeMobile) });
    }
  };
  const verifyOTP = () => {
    if (!pod) return;
    if (otpInput !== otp) { toast.error('Incorrect OTP'); return; }
    setPod({
      ...pod, otp_verified: true,
      otp_verified_at: new Date().toISOString(),
      consignee: { ...pod.consignee, name: consigneeName, mobile: consigneeMobile },
    });
    toast.success('OTP verified');
  };

  const submitPOD = () => {
    if (!pod) return;
    const finalPod: POD = {
      ...pod,
      status: 'captured',
      consignee: { ...pod.consignee, name: consigneeName, mobile: consigneeMobile },
      updated_at: new Date().toISOString(),
    };
    const v = verifyPOD(finalPod);
    if (!v.verified) { toast.error(`Missing: ${v.missing.join(', ')}`); return; }
    if (!navigator.onLine) {
      enqueueWrite(finalPod.dln_voucher_id, 'rating_submit', finalPod);
      toast.success('POD queued — will sync when online');
    } else {
      try {
        const all: POD[] = JSON.parse(localStorage.getItem(podsKey(ENTITY)) ?? '[]');
        // [JWT] POST /api/dispatch/pods
        localStorage.setItem(podsKey(ENTITY), JSON.stringify([...all, { ...finalPod, status: 'verified' }]));
      } catch { /* ignore */ }
      toast.success('POD submitted');
    }
    setStep(1); setDlnNo(''); setPod(null); setOtp(''); setOtpInput('');
    setConsigneeName(''); setConsigneeMobile('');
  };

  useEffect(() => {
    if (step === 4 && canvasRef.current) {
      const c = canvasRef.current;
      c.width = c.clientWidth; c.height = 200;
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-md mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">POD Capture</h1>
        <Badge variant="outline">Step {step} / 5</Badge>
      </header>

      {step === 1 && (
        <div className="space-y-3">
          <Label>DLN Number</Label>
          <Input value={dlnNo} onChange={e => setDlnNo(e.target.value)} placeholder="DLN/2025/0042" />
          <Button onClick={startCapture} className="w-full bg-blue-600 hover:bg-blue-700 text-white">Continue</Button>
        </div>
      )}

      {step === 2 && pod && (
        <div className="space-y-3">
          <Button onClick={captureGPS} variant="outline" className="w-full">
            <MapPin className="h-4 w-4 mr-2" />Capture Location
          </Button>
          {pod.gps_verified && (
            <p className="text-xs text-emerald-600 font-mono">
              ✓ {Math.round(pod.gps_accuracy_m ?? 0)}m accuracy
              {pod.distance_from_ship_to_m != null && ` · ${Math.round(pod.distance_from_ship_to_m)}m from ship-to`}
            </p>
          )}
          <Button onClick={() => setStep(3)} disabled={!pod.gps_verified}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white">Continue</Button>
        </div>
      )}

      {step === 3 && pod && (
        <div className="space-y-3">
          <Button onClick={capturePhotoStep} variant="outline" className="w-full">
            <Camera className="h-4 w-4 mr-2" />Capture Photo
          </Button>
          {pod.photo_data_url && <img src={pod.photo_data_url} alt="POD" className="w-full rounded" />}
          <Button onClick={() => setStep(4)} disabled={!pod.photo_verified}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white">Continue</Button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2"><PenLine className="h-4 w-4" />Consignee Signature</Label>
          <canvas ref={canvasRef}
            onPointerDown={startDraw} onPointerMove={moveDraw}
            onPointerUp={endDraw} onPointerLeave={endDraw}
            className="border rounded w-full bg-white touch-none" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearSig} className="flex-1">Clear</Button>
            <Button onClick={acceptSig} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">Done</Button>
          </div>
        </div>
      )}

      {step === 5 && pod && (
        <div className="space-y-3">
          <Label>Consignee Name</Label>
          <Input value={consigneeName} onChange={e => setConsigneeName(e.target.value)} />
          <Label>Mobile</Label>
          <Input value={consigneeMobile} onChange={e => setConsigneeMobile(e.target.value)} placeholder="98XXXXXXXX" />
          <Button onClick={sendOTP} variant="outline" className="w-full">
            <ShieldCheck className="h-4 w-4 mr-2" />Send OTP
          </Button>
          {otp && (
            <div className="space-y-2">
              <Label>Enter OTP</Label>
              <Input value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="6-digit code" />
              <Button variant="outline" onClick={verifyOTP} className="w-full">Verify OTP</Button>
            </div>
          )}
          <Button onClick={submitPOD} disabled={!pod.otp_verified}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <Send className="h-4 w-4 mr-2" />Submit POD
          </Button>
        </div>
      )}
    </div>
  );
}
