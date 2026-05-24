/**
 * @file     MobileProductionConfirmationPage.tsx
 * @sprint   T-Phase-1.3-3a-pre-3 · Block H · D-563 · Q17=a
 *           Sprint T-Phase-3.PROD-3 · ST5 (offline) · ST6 (voice) · ST7 (barcode)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Mic, ScanBarcode } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useGodowns } from '@/hooks/useGodowns';
import { createProductionConfirmation } from '@/lib/production-confirmation-engine';
import { enqueueWrite } from '@/lib/offline-queue-engine';

// Sprint T-Phase-3.PROD-3 · ST6/ST7 · browser-native API minimal declarations
interface MinSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
}
interface MinBarcodeDetector {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
}

interface SessionLite { user_id: string | null; display_name: string }
function readSession(): SessionLite | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? JSON.parse(raw) as SessionLite : null; } catch { return null; }
}

export default function MobileProductionConfirmationPage(): JSX.Element {
  const navigate = useNavigate();
  const session = readSession();
  const { orders } = useProductionOrders();
  const { godowns } = useGodowns();
  const inProgressPOs = orders.filter(o => o.status === 'in_progress' || o.status === 'released');

  const [poId, setPoId] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [godownId, setGodownId] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [busy, setBusy] = useState(false);

  // ST6 · voice
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // ST7 · barcode
  const [scanning, setScanning] = useState(false);

  function parseVoiceTranscript(transcript: string): void {
    const completedMatch = transcript.match(/completed\s+(\d+)/i);
    const rejectMatch = transcript.match(/(\d+)\s+rejects?/i);
    if (completedMatch) {
      setActualQty(completedMatch[1]);
      toast.success(`Voice: ${completedMatch[1]} completed`);
    }
    if (rejectMatch) {
      toast.info(`Voice: ${rejectMatch[1]} rejects noted`);
    }
  }

  function startVoiceInput(): void {
    const w = window as unknown as {
      SpeechRecognition?: new () => MinSpeechRecognition;
      webkitSpeechRecognition?: new () => MinSpeechRecognition;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { toast.error('Voice input not supported'); return; }
    const recognition = new Ctor();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    setVoiceListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(transcript);
      parseVoiceTranscript(transcript);
      setVoiceListening(false);
    };
    recognition.onerror = () => { setVoiceListening(false); toast.error('Voice failed · use manual entry'); };
    recognition.start();
  }

  async function startBarcodeScan(): Promise<void> {
    const w = window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => MinBarcodeDetector };
    if (!w.BarcodeDetector) { toast.error('Barcode scanning not supported'); return; }
    setScanning(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const detector = new w.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });
      const barcodes = await detector.detect(video);
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;
        const match = inProgressPOs.find(p => p.doc_no === code || p.id === code);
        if (match) { setPoId(match.id); toast.success(`PO ${match.doc_no} selected`); }
        else { toast.warning(`Scanned ${code} · no matching PO`); }
      } else { toast.error('No barcode detected'); }
    } catch (err) {
      toast.error(`Scan failed: ${(err as Error).message}`);
    } finally {
      stream?.getTracks().forEach(t => t.stop());
      setScanning(false);
    }
  }

  const handleSave = async (): Promise<void> => {
    const qty = Number(actualQty);
    if (!poId || qty <= 0 || !godownId) { toast.error('Fill all fields'); return; }
    setBusy(true);
    try {
      const po = inProgressPOs.find(p => p.id === poId);
      if (!po) throw new Error('PO not found');
      // Sprint T-Phase-3.PROD-3 · ST5 · offline-first save
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const queued = enqueueWrite(po.entity_id, 'production_confirmation', { poId, qty, godownId, batchNo });
        toast.info(`Saved offline · will sync when online (${queued.id})`);
        navigate('/operix-go');
        return;
      }
      const pc = createProductionConfirmation({
        entity_id: po.entity_id,
        production_order: po,
        confirmation_date: new Date().toISOString().slice(0, 10),
        actual_qty: qty,
        destination_godown_id: godownId,
        destination_godown_name: godowns.find(g => g.id === godownId)?.name ?? '',
        batch_no: batchNo || null,
        serial_nos: [], heat_no: null,
        department_id: po.department_id,
        department_name: po.department_name ?? '',
        confirmed_by_user_id: session?.user_id ?? 'mobile',
        confirmed_by_name: session?.display_name ?? 'Mobile User',
        remarks: 'Mobile capture',
        notes: '',
      }, { enableQualiCheck: false, enableIncomingInspection: false, enableOutgoingInspection: false, quarantineGodownId: null } as never);
      toast.success(`PC ${pc.doc_no} created`);
      navigate('/operix-go');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <h1 className="text-xl font-bold">Production Confirmation</h1>
      <Card className="p-4 space-y-3">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={startBarcodeScan} disabled={scanning} className="gap-1">
            <ScanBarcode className="h-3 w-3" /> {scanning ? 'Scanning…' : 'Scan PO'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={startVoiceInput} disabled={voiceListening} className="gap-1">
            <Mic className="h-3 w-3" /> {voiceListening ? 'Listening…' : 'Voice'}
          </Button>
        </div>
        {voiceTranscript && <p className="text-xs italic text-muted-foreground">"{voiceTranscript}"</p>}
        <div><Label>Production Order</Label>
          <Select value={poId} onValueChange={setPoId}>
            <SelectTrigger><SelectValue placeholder="Select PO..." /></SelectTrigger>
            <SelectContent>{inProgressPOs.map(p => <SelectItem key={p.id} value={p.id}>{p.doc_no}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Actual Qty</Label>
          <Input type="number" inputMode="decimal" value={actualQty} onChange={e => setActualQty(e.target.value)} className="font-mono" />
        </div>
        <div><Label>FG Godown</Label>
          <Select value={godownId} onValueChange={setGodownId}>
            <SelectTrigger><SelectValue placeholder="Select godown..." /></SelectTrigger>
            <SelectContent>{godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Batch No (optional)</Label><Input value={batchNo} onChange={e => setBatchNo(e.target.value)} /></div>
        <Button className="w-full" size="lg" onClick={handleSave} disabled={busy}>
          <Save className="h-4 w-4 mr-1" /> {busy ? 'Saving…' : 'Confirm'}
        </Button>
      </Card>
    </div>
  );
}
