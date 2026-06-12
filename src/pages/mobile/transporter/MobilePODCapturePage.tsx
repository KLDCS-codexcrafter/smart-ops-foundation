/**
 * MobilePODCapturePage.tsx — Transporter Proof-of-Delivery capture.
 * CONSUMES podsKey. Writes the SAME POD shape the desktop reads.
 * Honest offline queue: POD record is born with status='pending' (the existing
 * PODStatus 'pending' acts as the pending_sync state for the POD store).
 */
import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Camera, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import { type POD, podsKey } from '@/types/pod';
import { ReportSendHeader } from '@/components/operix-core/report-framework/ReportSendHeader';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

export default function MobilePODCapturePage(): JSX.Element {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const [dlnNo, setDlnNo] = useState('');
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeMobile, setConsigneeMobile] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<POD | null>(null);
  const [version, setVersion] = useState(0);

  const recent = useMemo<POD[]>(() => {
    if (!session) return [];
    return loadList<POD>(podsKey(session.entity_code))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, version]);

  // E-sign canvas init
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  }, []);

  function pointerDown(e: React.PointerEvent<HTMLCanvasElement>): void {
    drawing.current = true;
    const c = canvasRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  }
  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (!drawing.current) return;
    const c = canvasRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke();
  }
  function pointerUp(): void { drawing.current = false; }
  function clearSig(): void {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
  }

  function onPhotoSelect(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhotoDataUrl(String(r.result));
    r.readAsDataURL(f);
  }

  function submit(): void {
    if (!session) return;
    if (!dlnNo.trim() || !consigneeName.trim() || !photoDataUrl) {
      toast.error('DLN, consignee, and photo are required'); return;
    }
    const c = canvasRef.current;
    const sigPath = c?.toDataURL('image/png') ?? '';
    const now = new Date().toISOString();
    const pod: POD = {
      id: `pod_${Date.now()}`,
      entity_id: session.entity_code,
      dln_voucher_id: dlnNo.trim(),
      dln_voucher_no: dlnNo.trim(),
      captured_at: now,
      captured_by: session.display_name || session.user_id || 'transporter',
      gps_latitude: null, gps_longitude: null, gps_accuracy_m: null, gps_timestamp: null,
      ship_to_latitude: null, ship_to_longitude: null, distance_from_ship_to_m: null,
      gps_verified: false,
      photo_data_url: photoDataUrl, photo_size_bytes: photoDataUrl.length, photo_verified: false,
      signature_svg: sigPath, signature_verified: false,
      otp_verified: false,
      consignee: { name: consigneeName.trim(), mobile: consigneeMobile.trim() || undefined },
      status: 'pending', // honest pending_sync — the POD store's own queue state
      is_exception: false,
      created_at: now, updated_at: now,
    };
    const key = podsKey(session.entity_code);
    const list = loadList<POD>(key);
    list.push(pod);
    localStorage.setItem(key, JSON.stringify(list));
    setLastSaved(pod);
    toast.success(`POD queued (pending_sync) for ${pod.dln_voucher_no}`);
    setDlnNo(''); setConsigneeName(''); setConsigneeMobile(''); setPhotoDataUrl(null); clearSig();
    setVersion(v => v + 1);
  }

  if (!session) return <div className="p-6 text-center text-sm text-muted-foreground">Session required</div>;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">POD Capture</h1>
      </div>

      <Card className="p-3 space-y-3">
        <Input placeholder="DLN voucher no" value={dlnNo} onChange={e => setDlnNo(e.target.value)} />
        <Input placeholder="Consignee name" value={consigneeName} onChange={e => setConsigneeName(e.target.value)} />
        <Input placeholder="Consignee mobile (optional)" inputMode="tel" value={consigneeMobile} onChange={e => setConsigneeMobile(e.target.value)} />

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Delivery photo</label>
          {photoDataUrl ? (
            <div className="relative">
              <img src={photoDataUrl} alt="POD" className="rounded-lg border w-full" />
              <Button type="button" size="sm" variant="ghost" className="absolute top-1 right-1" onClick={() => setPhotoDataUrl(null)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="border rounded-lg p-4 flex flex-col items-center gap-1 cursor-pointer hover:border-primary/40">
              <Camera className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tap to capture</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhotoSelect} />
            </label>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-muted-foreground">Receiver signature</label>
            <Button type="button" size="sm" variant="ghost" onClick={clearSig}>Clear</Button>
          </div>
          <canvas ref={canvasRef} width={320} height={120}
            className="border rounded-lg w-full bg-white touch-none"
            onPointerDown={pointerDown} onPointerMove={pointerMove}
            onPointerUp={pointerUp} onPointerLeave={pointerUp} />
        </div>

        <Button className="w-full" onClick={submit}><Check className="h-4 w-4 mr-1" />Submit POD</Button>
      </Card>

      {lastSaved && (
        <Card className="p-3 space-y-2">
          <div className="text-xs font-semibold">POD confirmation</div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">DLN</span><span className="font-mono">{lastSaved.dln_voucher_no}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Status</span><span className="font-mono">{lastSaved.status} · pending_sync</span></div>
          <ReportSendHeader
            title={`POD ${lastSaved.dln_voucher_no}`}
            rows={[{ dln: lastSaved.dln_voucher_no, consignee: lastSaved.consignee.name, status: lastSaved.status }]}
          />
        </Card>
      )}

      <div>
        <div className="text-xs font-semibold mb-2 text-muted-foreground">Recent PODs</div>
        {recent.length === 0
          ? <Card className="p-4 text-center text-xs text-muted-foreground">None yet</Card>
          : <div className="space-y-1">{recent.map(p => (
              <Card key={p.id} className="p-2 text-xs flex justify-between">
                <span className="font-mono truncate">{p.dln_voucher_no}</span>
                <span className="text-muted-foreground">{p.status}</span>
              </Card>
            ))}</div>}
      </div>
    </div>
  );
}
