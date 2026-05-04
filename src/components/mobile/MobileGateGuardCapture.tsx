/**
 * MobileGateGuardCapture.tsx — Sprint 4-pre-3 · Block C · D-312 (Q2=A · Q5=A · Q6=A)
 * OperixGo Gate Guard 5-step capture-and-verify flow.
 *
 * Pattern: MIRRORS MobilePODCapture (Step type · setStep state · 5 sequential steps).
 * Pattern note: NO [tick, setTick] + useMemo anti-pattern · uses local state with explicit setters.
 *
 * Step 1 = Vehicle scan (QR primary · manual fallback) · auto-fills from vehicle-master
 * Step 2 = Driver verify (name + phone + license capture)
 * Step 3 = Purpose + direction + linked voucher + counterparty
 * Step 4 = Photos (vehicle inspection + ANPR + POD pre-stage multi)
 * Step 5 = Review + Submit (createInwardEntry/createOutwardEntry · offline-queue fallback)
 *
 * Reuses (read-only / public API · NO modifications):
 *   - gateflow-engine.createInwardEntry/createOutwardEntry (4-pre-1 · ZERO TOUCH)
 *   - vehicle-master-engine.findByVehicleNo (4-pre-2 · auto-fill from QR)
 *   - driver-master-engine.getDriver (4-pre-2 · driver pre-fill)
 *   - QRCameraScanner (Sprint 14b · Capacitor + web fallback)
 *   - camera-bridge.capturePhoto (Sprint 14c)
 *   - offline-queue-engine.enqueueWrite (Sprint 15 · matches MobilePODCapture)
 *   - OfflineIndicator (Sprint 14c)
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ScanLine, Camera, Send, ArrowLeft, ArrowRight, LogIn, LogOut, IdCard, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { capturePhoto } from '@/lib/camera-bridge';
import { QRCameraScanner } from '@/components/mobile/QRCameraScanner';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { enqueueWrite } from '@/lib/offline-queue-engine';
import { findByVehicleNo } from '@/lib/vehicle-master-engine';
import { getDriver } from '@/lib/driver-master-engine';
import { createInwardEntry, createOutwardEntry } from '@/lib/gateflow-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import type { GatePassDirection, LinkedVoucherType } from '@/types/gate-pass';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;
type Step = 1 | 2 | 3 | 4 | 5;

interface FormState {
  direction: GatePassDirection;
  vehicleNo: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  driverLicenseNo: string;
  purpose: string;
  counterpartyName: string;
  linkedVoucherType: LinkedVoucherType;
  linkedVoucherNo: string;
  remarks: string;
  driverLicenseImageUrl?: string;
  vehicleInspectionImageUrl?: string;
  anprImageUrl?: string;
  podImageUrls: string[];
}

const EMPTY: FormState = {
  direction: 'inward', vehicleNo: '', vehicleType: 'truck',
  driverName: '', driverPhone: '', driverLicenseNo: '',
  purpose: '', counterpartyName: '',
  linkedVoucherType: null, linkedVoucherNo: '', remarks: '',
  podImageUrls: [],
};

function canProceed(s: FormState, step: Step): boolean {
  if (step === 1) return s.vehicleNo.trim().length >= 4;
  if (step === 2) return s.driverName.trim().length >= 2 && /^[6-9]\d{9}$/.test(s.driverPhone.trim());
  if (step === 3) return s.purpose.trim().length >= 3 && s.counterpartyName.trim().length >= 2;
  if (step === 4) return true; // photos optional
  return false;
}

export default function MobileGateGuardCapture() {
  const [step, setStep] = useState<Step>(1);
  const [s, setS] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<FormState>) => setS((prev) => ({ ...prev, ...patch }));

  const handleQRPayload = (credential: string) => {
    // QR payload reuse: 'credential' carries vehicle_no for gate-guard flow.
    autoFillVehicle(credential);
  };

  const autoFillVehicle = (vNo: string) => {
    const norm = vNo.trim().toUpperCase();
    update({ vehicleNo: norm });
    const v = findByVehicleNo(norm, ENTITY);
    if (v) {
      update({ vehicleType: v.vehicle_type });
      if (v.default_driver_id) {
        const d = getDriver(v.default_driver_id, ENTITY);
        if (d) {
          update({
            driverName: d.driver_name,
            driverPhone: d.driver_phone,
            driverLicenseNo: d.driver_license_no,
          });
        }
      }
      toast.success(`Vehicle ${norm} auto-filled`);
    } else {
      toast.info(`Vehicle ${norm} not in master · manual entry`);
    }
  };

  const captureLicense = async () => {
    const r = await capturePhoto();
    if (!r.ok || !r.data_url) { toast.error(r.reason ?? 'Camera failed'); return; }
    update({ driverLicenseImageUrl: r.data_url });
    toast.success('License captured');
  };

  const captureVehicleInspection = async () => {
    const r = await capturePhoto();
    if (!r.ok || !r.data_url) { toast.error(r.reason ?? 'Camera failed'); return; }
    update({ vehicleInspectionImageUrl: r.data_url });
    toast.success('Vehicle photo captured');
  };

  const captureANPR = async () => {
    const r = await capturePhoto();
    if (!r.ok || !r.data_url) { toast.error(r.reason ?? 'Camera failed'); return; }
    update({ anprImageUrl: r.data_url });
    toast.success('ANPR captured');
  };

  const capturePOD = async () => {
    const r = await capturePhoto();
    if (!r.ok || !r.data_url) { toast.error(r.reason ?? 'Camera failed'); return; }
    setS((prev) => ({ ...prev, podImageUrls: [...prev.podImageUrls, r.data_url!] }));
    toast.success('POD photo added');
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const input = {
        vehicle_no: s.vehicleNo,
        vehicle_type: s.vehicleType,
        driver_name: s.driverName,
        driver_phone: s.driverPhone,
        driver_license_no: s.driverLicenseNo || undefined,
        linked_voucher_type: s.linkedVoucherType,
        linked_voucher_no: s.linkedVoucherNo || undefined,
        counterparty_name: s.counterpartyName,
        purpose: s.purpose,
        remarks: s.remarks || undefined,
      };
      if (!navigator.onLine) {
        // [JWT] Offline queue · matches MobilePODCapture pattern
        enqueueWrite(ENTITY, 'rating_submit', { kind: 'gate_pass', direction: s.direction, input });
        toast.success('Gate pass queued — will sync when online');
      } else {
        if (s.direction === 'inward') {
          await createInwardEntry(input, ENTITY, 'mobile-guard');
        } else {
          await createOutwardEntry(input, ENTITY, 'mobile-guard');
        }
        toast.success(`Gate pass created · ${s.direction}`);
      }
      setS(EMPTY);
      setStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-md mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Gate Guard</h1>
        <div className="flex items-center gap-2">
          <OfflineIndicator />
          <Badge variant="outline">Step {step} / 5</Badge>
        </div>
      </header>
      <Progress value={(step / 5) * 100} className="h-2" />

      {step === 1 && (
        <div className="space-y-3">
          <Label>Direction</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={s.direction === 'inward' ? 'default' : 'outline'}
              onClick={() => update({ direction: 'inward' })}
              className="w-full"
            >
              <LogIn className="h-4 w-4 mr-2" />Inward
            </Button>
            <Button
              variant={s.direction === 'outward' ? 'default' : 'outline'}
              onClick={() => update({ direction: 'outward' })}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />Outward
            </Button>
          </div>

          <Label>Scan vehicle QR</Label>
          <QRCameraScanner onPayload={(cred) => handleQRPayload(cred)} />

          <div className="text-xs text-muted-foreground text-center">— or manual entry —</div>
          <Label>Vehicle Number</Label>
          <Input
            value={s.vehicleNo}
            onChange={(e) => update({ vehicleNo: e.target.value })}
            onBlur={() => s.vehicleNo && autoFillVehicle(s.vehicleNo)}
            placeholder="KA-01-AB-1234"
            className="font-mono uppercase"
          />
          <Label>Vehicle Type</Label>
          <Select value={s.vehicleType} onValueChange={(v) => update({ vehicleType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="truck">Truck</SelectItem>
              <SelectItem value="tempo">Tempo</SelectItem>
              <SelectItem value="van">Van</SelectItem>
              <SelectItem value="car">Car</SelectItem>
              <SelectItem value="two-wheeler">Two Wheeler</SelectItem>
              <SelectItem value="walk-in">Walk-in</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <Label>Driver Name</Label>
          <Input value={s.driverName} onChange={(e) => update({ driverName: e.target.value })} />
          <Label>Driver Phone (10-digit)</Label>
          <Input
            value={s.driverPhone}
            onChange={(e) => update({ driverPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="98XXXXXXXX"
            className="font-mono"
            inputMode="numeric"
          />
          <Label>License Number (optional)</Label>
          <Input
            value={s.driverLicenseNo}
            onChange={(e) => update({ driverLicenseNo: e.target.value })}
            className="font-mono uppercase"
          />
          <Button onClick={captureLicense} variant="outline" className="w-full">
            <IdCard className="h-4 w-4 mr-2" />
            {s.driverLicenseImageUrl ? 'Re-capture License' : 'Capture License Photo'}
          </Button>
          {s.driverLicenseImageUrl && (
            <img src={s.driverLicenseImageUrl} alt="License" className="w-full rounded border" />
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <Label>Purpose</Label>
          <Input
            value={s.purpose}
            onChange={(e) => update({ purpose: e.target.value })}
            placeholder="Material delivery"
          />
          <Label>Counterparty (Vendor / Customer)</Label>
          <Input
            value={s.counterpartyName}
            onChange={(e) => update({ counterpartyName: e.target.value })}
            placeholder="ACME Traders"
          />
          <Label>Linked Voucher (optional)</Label>
          <Select
            value={s.linkedVoucherType ?? 'none'}
            onValueChange={(v) =>
              update({ linkedVoucherType: v === 'none' ? null : (v as LinkedVoucherType) })
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None / Walk-in</SelectItem>
              <SelectItem value="po">Purchase Order</SelectItem>
              <SelectItem value="git_stage1">GIT Stage 1</SelectItem>
              <SelectItem value="dln">Delivery Note</SelectItem>
              <SelectItem value="som">Sample Outward Memo</SelectItem>
              <SelectItem value="dom">Demo Outward Memo</SelectItem>
              <SelectItem value="gst_invoice">GST Invoice</SelectItem>
            </SelectContent>
          </Select>
          {s.linkedVoucherType !== null && (
            <>
              <Label>Voucher Number</Label>
              <Input
                value={s.linkedVoucherNo}
                onChange={(e) => update({ linkedVoucherNo: e.target.value })}
                className="font-mono"
              />
            </>
          )}
          <Label>Remarks (optional)</Label>
          <Input value={s.remarks} onChange={(e) => update({ remarks: e.target.value })} />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <Button onClick={captureVehicleInspection} variant="outline" className="w-full">
            <Camera className="h-4 w-4 mr-2" />
            {s.vehicleInspectionImageUrl ? 'Re-capture Vehicle Photo' : 'Capture Vehicle Photo'}
          </Button>
          {s.vehicleInspectionImageUrl && (
            <img src={s.vehicleInspectionImageUrl} alt="Vehicle" className="w-full rounded border" />
          )}
          <Button onClick={captureANPR} variant="outline" className="w-full">
            <ScanLine className="h-4 w-4 mr-2" />
            {s.anprImageUrl ? 'Re-capture ANPR' : 'Capture ANPR (Number Plate)'}
          </Button>
          {s.anprImageUrl && (
            <img src={s.anprImageUrl} alt="ANPR" className="w-full rounded border" />
          )}
          <Button onClick={capturePOD} variant="outline" className="w-full">
            <Camera className="h-4 w-4 mr-2" />
            Add POD Pre-stage Photo ({s.podImageUrls.length})
          </Button>
          {s.podImageUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {s.podImageUrls.map((url, i) => (
                <img key={`pod-${i}-${url.slice(-12)}`} src={url} alt={`POD ${i + 1}`} className="rounded border" />
              ))}
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border p-3 space-y-1 bg-card">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-semibold">Review</span>
            </div>
            <div><span className="text-muted-foreground">Direction:</span> {s.direction}</div>
            <div className="font-mono"><span className="text-muted-foreground font-sans">Vehicle:</span> {s.vehicleNo} ({s.vehicleType})</div>
            <div><span className="text-muted-foreground">Driver:</span> {s.driverName} · <span className="font-mono">{s.driverPhone}</span></div>
            <div><span className="text-muted-foreground">Purpose:</span> {s.purpose}</div>
            <div><span className="text-muted-foreground">Counterparty:</span> {s.counterpartyName}</div>
            {s.linkedVoucherType && (
              <div><span className="text-muted-foreground">Linked:</span> {s.linkedVoucherType} · {s.linkedVoucherNo}</div>
            )}
            <div><span className="text-muted-foreground">Photos:</span> {[
              s.driverLicenseImageUrl && 'license',
              s.vehicleInspectionImageUrl && 'vehicle',
              s.anprImageUrl && 'ANPR',
              s.podImageUrls.length > 0 && `POD×${s.podImageUrls.length}`,
            ].filter(Boolean).join(' · ') || 'none'}</div>
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting…' : 'Submit Gate Pass'}
          </Button>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep((step - 1) as Step)}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
        )}
        {step < 5 && (
          <Button
            onClick={() => setStep((step + 1) as Step)}
            disabled={!canProceed(s, step)}
            className="flex-1"
          >
            Next<ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

export { canProceed as canProceedForTests };
