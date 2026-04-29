/**
 * MobileVisitCheckInPage.tsx — Mobile-optimized GPS check-in
 * Sprint T-Phase-1.1.1l-a · Reuses VisitLog + signature-pad
 */
import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, MapPin, CheckCircle2, AlertTriangle, Loader2, Camera, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SignaturePad, type SignaturePadHandle } from '@/components/ui/signature-pad';
import type { MobileSession } from '../MobileRouter';
import {
  type VisitLog, type VisitOutcome, type VisitPurpose, type GeoPoint,
  visitLogsKey, VISIT_OUTCOME_LABELS, VISIT_PURPOSE_LABELS,
  DEFAULT_CHECK_IN_RADIUS_METERS,
} from '@/types/visit-log';
import { getCurrentLocation } from '@/lib/geolocation-bridge';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

interface CustomerLite {
  id: string;
  name: string;
  geo_lat: number | null;
  geo_lng: number | null;
  address?: string;
}

function loadCustomers(): CustomerLite[] {
  try {
    const raw = localStorage.getItem('erp_group_customer_master');
    if (!raw) return [];
    return (JSON.parse(raw) as Array<{ id: string; name?: string; legal_name?: string; geo_lat?: number; geo_lng?: number; address?: string }>)
      .map(c => ({
        id: c.id,
        name: c.name ?? c.legal_name ?? '',
        geo_lat: c.geo_lat ?? null,
        geo_lng: c.geo_lng ?? null,
        address: c.address,
      }));
  } catch { return []; }
}

function loadVisits(entityCode: string): VisitLog[] {
  try {
    const raw = localStorage.getItem(visitLogsKey(entityCode));
    return raw ? (JSON.parse(raw) as VisitLog[]) : [];
  } catch { return []; }
}

function saveVisits(entityCode: string, list: VisitLog[]): void {
  // [JWT] POST /api/salesx/visit-logs
  localStorage.setItem(visitLogsKey(entityCode), JSON.stringify(list));
}

function distanceMetres(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function MobileVisitCheckInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const session = useMemo(() => readSession(), []);
  const customers = useMemo(() => loadCustomers(), []);

  const customerId = searchParams.get('customerId') ?? '';
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId);
  const customer = useMemo(
    () => customers.find(c => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const [phase, setPhase] = useState<'idle' | 'getting-location' | 'checked-in' | 'submitting'>('idle');
  const [checkInGeo, setCheckInGeo] = useState<GeoPoint | null>(null);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<VisitPurpose>('regular_visit');
  const [outcome, setOutcome] = useState<VisitOutcome>('order_captured');
  const [notes, setNotes] = useState('');
  const [orderValue, setOrderValue] = useState('0');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const signaturePadRef = useRef<SignaturePadHandle>(null);
  const [signatureCaptured, setSignatureCaptured] = useState<string | null>(null);
  const [signatureEmpty, setSignatureEmpty] = useState(true);

  const distanceFromCustomer = useMemo(() => {
    if (!checkInGeo || customer?.geo_lat == null || customer?.geo_lng == null) return null;
    return distanceMetres(checkInGeo, {
      latitude: customer.geo_lat, longitude: customer.geo_lng, accuracy_meters: null,
    });
  }, [checkInGeo, customer]);

  const withinRadius = distanceFromCustomer === null
    ? true
    : distanceFromCustomer <= DEFAULT_CHECK_IN_RADIUS_METERS;

  const handleCheckIn = useCallback(async () => {
    if (!session || !customer) {
      toast.error('Select a customer first');
      return;
    }
    setPhase('getting-location');
    const reading = await getCurrentLocation();
    if (!reading.ok || reading.latitude === undefined || reading.longitude === undefined) {
      toast.error(reading.reason ?? 'GPS unavailable');
      setPhase('idle');
      return;
    }
    const geo: GeoPoint = {
      latitude: reading.latitude,
      longitude: reading.longitude,
      accuracy_meters: reading.accuracy_m ?? null,
    };
    setCheckInGeo(geo);
    const newVisit: VisitLog = {
      id: `vl-${Date.now()}`,
      entity_id: session.entity_code,
      salesman_id: session.user_id ?? '',
      salesman_name: session.display_name,
      customer_id: customer.id,
      customer_name: customer.name,
      beat_id: null,
      check_in_time: new Date().toISOString(),
      check_in_geo: geo,
      check_out_time: null,
      check_out_geo: null,
      customer_geo: customer.geo_lat != null && customer.geo_lng != null
        ? { latitude: customer.geo_lat, longitude: customer.geo_lng, accuracy_meters: null }
        : null,
      distance_from_customer_meters: distanceFromCustomer,
      within_radius: withinRadius,
      purpose: 'regular_visit',
      outcome: 'order_captured',
      notes: '',
      order_captured_value: 0,
      order_voucher_id: null,
      next_visit_date: null,
      photo_urls: [],
      signature_data_url: null,
      signature_captured_at: null,
      created_at: new Date().toISOString(),
    };
    const all = loadVisits(session.entity_code);
    all.push(newVisit);
    saveVisits(session.entity_code, all);
    setActiveVisitId(newVisit.id);
    setPhase('checked-in');
    toast.success('Checked in');
  }, [session, customer, distanceFromCustomer, withinRadius]);

  const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoUrls.length >= 3) {
      toast.error('Maximum 3 photos per visit');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrls(prev => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  }, [photoUrls]);

  const handleCheckOut = useCallback(async () => {
    if (!session || !activeVisitId) return;
    setPhase('submitting');
    const reading = await getCurrentLocation();
    if (!reading.ok || reading.latitude === undefined || reading.longitude === undefined) {
      toast.error(reading.reason ?? 'GPS unavailable');
      setPhase('checked-in');
      return;
    }
    const outGeo: GeoPoint = {
      latitude: reading.latitude,
      longitude: reading.longitude,
      accuracy_meters: reading.accuracy_m ?? null,
    };
    const all = loadVisits(session.entity_code);
    const idx = all.findIndex(v => v.id === activeVisitId);
    if (idx < 0) {
      toast.error('Visit not found');
      setPhase('checked-in');
      return;
    }
    // APPEND-ONLY: only check_out fields + outcome details mutated; check-in fields untouched.
    all[idx] = {
      ...all[idx],
      check_out_time: new Date().toISOString(),
      check_out_geo: outGeo,
      purpose,
      outcome,
      notes,
      order_captured_value: outcome === 'order_captured' ? Number(orderValue) || 0 : 0,
      photo_urls: photoUrls,
      signature_data_url: signatureCaptured,
      signature_captured_at: signatureCaptured ? new Date().toISOString() : null,
    };
    saveVisits(session.entity_code, all);
    toast.success('Visit logged');
    navigate('/mobile/salesman/visit-log');
  }, [session, activeVisitId, purpose, outcome, notes, orderValue, photoUrls, signatureCaptured, navigate]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-20">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/salesman')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Visit Check-In</h1>
      </div>

      {phase === 'idle' && (
        <Card className="p-3 space-y-2">
          <Label className="text-xs">Customer</Label>
          <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
            <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {customer && (
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              {customer.address && (
                <p className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{customer.address}
                </p>
              )}
              {customer.geo_lat != null && customer.geo_lng != null && (
                <p className="font-mono">{customer.geo_lat.toFixed(4)}, {customer.geo_lng.toFixed(4)}</p>
              )}
            </div>
          )}
          <Button className="w-full" disabled={!customer} onClick={handleCheckIn}>
            <MapPin className="h-4 w-4 mr-2" /> Get GPS &amp; Check In
          </Button>
        </Card>
      )}

      {phase === 'getting-location' && (
        <Card className="p-6 text-center space-y-2">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-orange-500" />
          <p className="text-sm">Getting GPS location...</p>
        </Card>
      )}

      {phase !== 'idle' && phase !== 'getting-location' && checkInGeo && (
        <>
          <Card className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              {withinRadius ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Within {DEFAULT_CHECK_IN_RADIUS_METERS}m
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {distanceFromCustomer?.toFixed(0)}m away
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              {checkInGeo.latitude.toFixed(5)}, {checkInGeo.longitude.toFixed(5)} (±{checkInGeo.accuracy_meters?.toFixed(0) ?? '–'}m)
            </p>
          </Card>

          <Card className="p-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Purpose</Label>
              <Select value={purpose} onValueChange={v => setPurpose(v as VisitPurpose)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VISIT_PURPOSE_LABELS).map(([k, lbl]) => (
                    <SelectItem key={k} value={k}>{lbl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Outcome</Label>
              <Select value={outcome} onValueChange={v => setOutcome(v as VisitOutcome)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VISIT_OUTCOME_LABELS).map(([k, lbl]) => (
                    <SelectItem key={k} value={k}>{lbl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {outcome === 'order_captured' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Order Value (₹)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={orderValue}
                  onChange={e => setOrderValue(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What happened in this visit?"
              />
            </div>
          </Card>

          <Card className="p-3 space-y-2">
            <Label className="text-xs font-medium">Photos ({photoUrls.length}/3)</Label>
            <div className="grid grid-cols-3 gap-2">
              {photoUrls.map((url, i) => (
                <div key={`photo-${i}`} className="relative aspect-square">
                  <img src={url} alt={`Visit ${i + 1}`} className="w-full h-full object-cover rounded border" />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                    onClick={() => setPhotoUrls(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {photoUrls.length < 3 && (
                <label className="aspect-square border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />
                </label>
              )}
            </div>
          </Card>

          <Card className="p-3 space-y-2">
            <Label className="text-xs font-medium">Customer Signature (optional)</Label>
            {signatureCaptured ? (
              <div className="space-y-2">
                <img src={signatureCaptured} alt="Signature" className="border rounded bg-white max-w-full" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSignatureCaptured(null);
                    setSignatureEmpty(true);
                    signaturePadRef.current?.clear();
                  }}
                >
                  Re-sign
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <SignaturePad
                  ref={signaturePadRef}
                  width={320}
                  height={120}
                  onChange={empty => setSignatureEmpty(empty)}
                />
                <Button
                  size="sm"
                  disabled={signatureEmpty}
                  onClick={() => {
                    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
                      setSignatureCaptured(signaturePadRef.current.toDataURL());
                      toast.success('Signature captured');
                    }
                  }}
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Confirm Signature
                </Button>
              </div>
            )}
          </Card>

          <Button
            className="w-full"
            disabled={phase === 'submitting'}
            onClick={handleCheckOut}
          >
            {phase === 'submitting'
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Check Out &amp; Save Visit
          </Button>
        </>
      )}
    </div>
  );
}
