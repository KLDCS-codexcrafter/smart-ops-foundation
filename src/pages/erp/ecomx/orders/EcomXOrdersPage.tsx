/**
 * @file   src/pages/erp/ecomx/orders/EcomXOrdersPage.tsx
 * @sprint Sprint 153 + Sprint 155.T1 · EcomX Orders + Packing Evidence
 *
 * Sprint 155.T1 deltas:
 *  - MediaRecorder camera capture (≤30s hard cap, live countdown).
 *    Stop → blob → IMMEDIATE browser download (filename generated locally).
 *    Then recordPackingEvidence is called with capturedVia='camera'
 *    and durationSec = the real recording length.
 *  - File-upload fallback retained; <input accept=".." capture="environment">
 *    so mobile browsers prefer the rear camera.
 *  - Honesty banner rendered VERBATIM near the capture controls
 *    (string source-of-truth: PACKING_EVIDENCE_HONESTY_BANNER).
 *  - Evidence Register tab: full EcPackingEvidence list with marketplace +
 *    order filters and a DocVault document-id link-out.
 *
 *  Binary clip is NEVER persisted to app storage — see DP-EC-11.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, FileUp, Paperclip, Receipt, Square, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listEcOrders, resolveUnmatchedOrder,
  recordPackingEvidence, listPackingEvidence, listMarketplaces,
  PACKING_EVIDENCE_HONESTY_BANNER,
} from '@/lib/ecomx-engine';
import { loadPartyMaster } from '@/lib/party-master-engine';
import type { EcOrderLayer, EcPackingEvidence } from '@/types/ecomx';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

type Tab = 'all' | 'b2c' | 'b2b_matched' | 'parked' | 'evidence';

const LAYER_LABEL: Record<EcOrderLayer, string> = {
  b2c_consolidated: 'B2C',
  b2b_matched:      'B2B matched',
  b2b_unmatched:    'B2B parked',
};

const MAX_CLIP_SECONDS = 30;

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function buildClipFileName(marketplaceOrderId: string, ext: string): string {
  const safe = marketplaceOrderId.replace(/[/\\:*?"<>|\s]/g, '_');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `packing_${safe}_${ts}.${ext}`;
}

export function EcomXOrdersPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tab, setTab] = useState<Tab>('all');
  const [tick, setTick] = useState(0);

  const rows = useMemo(() => {
    if (!entityCode) return [];
    if (tab === 'all') return listEcOrders(entityCode);
    if (tab === 'b2c') return listEcOrders(entityCode, { layer: 'b2c_consolidated' });
    if (tab === 'b2b_matched') return listEcOrders(entityCode, { layer: 'b2b_matched' });
    if (tab === 'parked') return listEcOrders(entityCode, { status: 'parked_unmatched' });
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tab, tick]);

  const parties = useMemo(() => entityCode ? loadPartyMaster(entityCode) : [], [entityCode]);

  const evidenceByOrder = useMemo(() => {
    if (!entityCode) return new Map<string, number>();
    const m = new Map<string, number>();
    listPackingEvidence(entityCode).forEach((e) => m.set(e.ecOrderId, (m.get(e.ecOrderId) ?? 0) + 1));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tick]);

  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const openOrder = useMemo(() => {
    if (!entityCode || !openOrderId) return null;
    return listEcOrders(entityCode).find((o) => o.id === openOrderId) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, openOrderId, tick]);

  const onResolve = useCallback((ecOrderId: string, partyId: string) => {
    if (!entityCode || !partyId) return;
    try {
      resolveUnmatchedOrder(entityCode, ecOrderId, partyId);
      toast.success('Parked order resolved → booked.');
      setTick((t) => t + 1);
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select an entity.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2"><Receipt className="h-5 w-5" /> Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">DP-EC-5 · dual-layer ingestion · parked rows carry NO voucher until resolved.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['all', 'b2c', 'b2b_matched', 'parked', 'evidence'] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>
            {t === 'all' ? 'All'
              : t === 'b2c' ? 'B2C'
              : t === 'b2b_matched' ? 'B2B matched'
              : t === 'parked' ? 'Parked B2B'
              : 'Evidence Register'}
          </Button>
        ))}
      </div>

      {tab === 'evidence' ? (
        <EvidenceRegisterPanel entityCode={entityCode} tick={tick} />
      ) : (
        <section className="glass-card rounded-2xl p-4">
          {rows.length === 0 ? (
            <div className="text-xs text-muted-foreground p-6 text-center">No orders in this view.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2">MP Order #</th>
                    <th className="text-left">Date</th>
                    <th className="text-left">Layer</th>
                    <th className="text-left">SO #</th>
                    <th className="text-left">Buyer</th>
                    <th className="text-left">State</th>
                    <th className="text-right">Gross ₹</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Evidence</th>
                    {tab === 'parked' && <th className="text-left">Resolve → party</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className="border-b border-border/40">
                      <td className="py-2 font-mono text-xs">{o.marketplaceOrderId}</td>
                      <td className="text-xs">{o.orderDate}</td>
                      <td>{LAYER_LABEL[o.layer]}</td>
                      <td className="font-mono text-xs">{o.soDocNo ?? '—'}</td>
                      <td>{o.endCustomerName || '—'}</td>
                      <td>{o.endCustomerState || '—'}</td>
                      <td className="text-right font-mono">{o.grossAmount.toFixed(2)}</td>
                      <td>{o.status}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setOpenOrderId(o.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent"
                          title="Attach packing evidence (metadata only)"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span className="font-mono">{evidenceByOrder.get(o.id) ?? 0}</span>
                        </button>
                      </td>
                      {tab === 'parked' && (
                        <td>
                          <select
                            className="px-2 py-1 rounded-md bg-background border border-border text-xs"
                            defaultValue=""
                            onChange={(e) => onResolve(o.id, e.target.value)}
                          >
                            <option value="">Pick party…</option>
                            {parties.map((p) => <option key={p.id} value={p.id}>{p.party_name}</option>)}
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <Dialog open={openOrderId !== null} onOpenChange={(o) => { if (!o) setOpenOrderId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Packing evidence</DialogTitle>
            <DialogDescription>
              {openOrder ? `Order ${openOrder.marketplaceOrderId}` : ''}
            </DialogDescription>
          </DialogHeader>
          {openOrder && (
            <EvidenceCapturePanel
              entityCode={entityCode}
              ecOrderId={openOrder.id}
              marketplaceOrderId={openOrder.marketplaceOrderId}
              onRecorded={() => { setTick((t) => t + 1); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── EvidenceCapturePanel ─────────────────────────────────────────────────
interface EvidenceCapturePanelProps {
  entityCode: string;
  ecOrderId: string;
  marketplaceOrderId: string;
  onRecorded: () => void;
}

function EvidenceCapturePanel({ entityCode, ecOrderId, marketplaceOrderId, onRecorded }: EvidenceCapturePanelProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTsRef = useRef<number>(0);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [recording, setRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(MAX_CLIP_SECONDS);

  const cleanup = useCallback(() => {
    if (tickIntervalRef.current) { clearInterval(tickIntervalRef.current); tickIntervalRef.current = null; }
    if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const finalize = useCallback((blob: Blob, mime: string, durationSec: number) => {
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    const fileName = buildClipFileName(marketplaceOrderId, ext);
    // 1) Immediate browser download — binary leaves the app, never persisted.
    downloadBlob(blob, fileName);
    // 2) Metadata only — capturedVia='camera', durationSec real.
    try {
      recordPackingEvidence(entityCode, {
        ecOrderId,
        fileName,
        sizeBytes: blob.size,
        durationSec,
        capturedVia: 'camera',
        note: '',
        uploadedBy: 'self',
        originatingDepartmentId: 'ecomx',
      });
      toast.success('Clip downloaded · evidence metadata recorded.');
      onRecorded();
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode, ecOrderId, marketplaceOrderId, onRecorded]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const md = (typeof navigator !== 'undefined' ? navigator.mediaDevices : null);
      if (!md || !md.getUserMedia || typeof MediaRecorder === 'undefined') {
        toast.error('Camera capture is not supported in this browser.');
        return;
      }
      const stream = await md.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
      }
      const mimeCandidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      const supported = mimeCandidates.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? '';
      const rec = supported ? new MediaRecorder(stream, { mimeType: supported }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev: BlobEvent) => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data); };
      rec.onstop = () => {
        const elapsedMs = Date.now() - startTsRef.current;
        const durationSec = Math.min(MAX_CLIP_SECONDS, Math.max(1, Math.round(elapsedMs / 1000)));
        const mime = rec.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        setRecording(false);
        cleanup();
        if (blob.size > 0) finalize(blob, mime, durationSec);
      };
      recorderRef.current = rec;
      startTsRef.current = Date.now();
      setSecondsLeft(MAX_CLIP_SECONDS);
      rec.start();
      setRecording(true);
      // hard 30s cap
      stopTimeoutRef.current = setTimeout(() => stopRecording(), MAX_CLIP_SECONDS * 1000);
      // countdown tick
      tickIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTsRef.current) / 1000);
        setSecondsLeft(Math.max(0, MAX_CLIP_SECONDS - elapsed));
      }, 250);
    } catch (e) {
      toast.error(`Camera unavailable: ${(e as Error).message}`);
      cleanup();
    }
  }, [cleanup, finalize, stopRecording]);

  const onFileSelected = useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    try {
      recordPackingEvidence(entityCode, {
        ecOrderId,
        fileName: file.name,
        sizeBytes: file.size,
        durationSec: null,
        capturedVia: 'file_upload',
        note: '',
        uploadedBy: 'self',
        originatingDepartmentId: 'ecomx',
      });
      toast.success('Packing evidence recorded (metadata only).');
      onRecorded();
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode, ecOrderId, onRecorded]);

  return (
    <div className="space-y-4">
      <p
        data-testid="packing-evidence-banner"
        className="text-xs leading-relaxed rounded-lg border border-warning/30 bg-warning/10 text-warning-foreground p-3"
      >
        {PACKING_EVIDENCE_HONESTY_BANNER}
      </p>

      <div className="rounded-lg bg-muted/30 border border-border aspect-video flex items-center justify-center overflow-hidden">
        {recording ? (
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        ) : (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Video className="h-4 w-4" /> Camera preview appears here when recording.
          </div>
        )}
      </div>

      {recording && (
        <div className="text-center font-mono text-sm" aria-live="polite">
          ⏺ {secondsLeft}s left (max {MAX_CLIP_SECONDS}s)
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <Button type="button" size="sm" onClick={startCamera} className="gap-1">
            <Camera className="h-4 w-4" /> Capture (≤{MAX_CLIP_SECONDS}s)
          </Button>
        ) : (
          <Button type="button" size="sm" variant="destructive" onClick={stopRecording} className="gap-1">
            <Square className="h-4 w-4" /> Stop & download
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1">
          <FileUp className="h-4 w-4" /> Upload file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={onFileSelected}
        />
      </div>
    </div>
  );
}

// ─── Evidence Register tab ────────────────────────────────────────────────
interface EvidenceRegisterPanelProps { entityCode: string; tick: number; }

function EvidenceRegisterPanel({ entityCode, tick }: EvidenceRegisterPanelProps): JSX.Element {
  const [mpFilter, setMpFilter] = useState<string>('');
  const [orderFilter, setOrderFilter] = useState<string>('');

  const marketplaces = useMemo(() => listMarketplaces(entityCode), [entityCode]);
  const all = useMemo(
    () => listPackingEvidence(entityCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );

  const filtered = useMemo(() => {
    return all.filter((r) => {
      if (mpFilter && r.marketplaceId !== mpFilter) return false;
      if (orderFilter && !r.marketplaceOrderId.toLowerCase().includes(orderFilter.toLowerCase())) return false;
      return true;
    });
  }, [all, mpFilter, orderFilter]);

  return (
    <section data-testid="evidence-register" className="glass-card rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          aria-label="Filter by marketplace"
          className="px-2 py-1 rounded-md bg-background border border-border text-xs"
          value={mpFilter}
          onChange={(e) => setMpFilter(e.target.value)}
        >
          <option value="">All marketplaces</option>
          {marketplaces.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input
          aria-label="Filter by marketplace order id"
          placeholder="Order id contains…"
          className="px-2 py-1 rounded-md bg-background border border-border text-xs flex-1 min-w-[12rem]"
          value={orderFilter}
          onChange={(e) => setOrderFilter(e.target.value)}
        />
        {(mpFilter || orderFilter) && (
          <Button type="button" size="sm" variant="ghost" onClick={() => { setMpFilter(''); setOrderFilter(''); }} className="gap-1">
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto font-mono">{filtered.length} / {all.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-xs text-muted-foreground p-6 text-center">No packing evidence rows.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2">Captured</th>
                <th className="text-left">Marketplace</th>
                <th className="text-left">Order #</th>
                <th className="text-left">File</th>
                <th className="text-right">Size</th>
                <th className="text-right">Duration</th>
                <th className="text-left">Via</th>
                <th className="text-left">DocVault</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: EcPackingEvidence) => {
                const mpName = marketplaces.find((m) => m.id === r.marketplaceId)?.name ?? r.marketplaceId;
                return (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="py-2 text-xs font-mono">{r.createdAt.slice(0, 19).replace('T', ' ')}</td>
                    <td className="text-xs">{mpName}</td>
                    <td className="font-mono text-xs">{r.marketplaceOrderId}</td>
                    <td className="text-xs truncate max-w-[16rem]" title={r.fileName}>{r.fileName}</td>
                    <td className="text-right font-mono text-xs">{r.sizeBytes}</td>
                    <td className="text-right font-mono text-xs">{r.durationSec != null ? `${r.durationSec}s` : '—'}</td>
                    <td className="text-xs">{r.capturedVia === 'camera' ? 'Camera' : 'Upload'}</td>
                    <td className="font-mono text-xs">
                      <a href={`#/erp/docvault?doc=${encodeURIComponent(r.docVaultDocumentId)}`} className="underline hover:text-primary">
                        {r.docVaultDocumentId.slice(0, 8)}…
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
