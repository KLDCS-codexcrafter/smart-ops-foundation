/**
 * @file Sprint 76b · REG-31 suo-moto cancellation reply surface · consumes Pass A buildREG31.
 * @sprint Sprint 76b · T-Phase-5.A.1.8-PASS-B · Block 5
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildREG31 } from '@/lib/comply360-gstr-builder-engine';

export default function REG31Page(): JSX.Element {
  const [gstin, setGstin] = useState('27ABCDE1234F1Z5');
  const [scnRef, setScnRef] = useState('SCN/2026/MH/00451');
  const [scnDate, setScnDate] = useState('2026-04-15');
  const [responseDate, setResponseDate] = useState('2026-04-25');
  const [reply, setReply] = useState('Returns up to March 2026 have been filed; tax with interest paid via DRC-03. Request withdrawal of suo-moto cancellation under Rule 22(4).');

  const result = useMemo(() => buildREG31({
    gstin, scn_reference_no: scnRef, scn_date: scnDate,
    response_date: responseDate, reply_text: reply,
  }), [gstin, scnRef, scnDate, responseDate, reply]);

  const handleDownload = (): void => {
    const blob = new Blob([JSON.stringify(result.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `REG31_${gstin}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('REG-31 reply JSON downloaded');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">REG-31 · Suo-moto Cancellation Reply</h1>
          <p className="text-muted-foreground text-sm">Response to show-cause notice under Rule 22(4).</p>
        </div>
        <div className="flex items-center gap-2">
          {result.errors.length > 0
            ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{result.errors.length} errors</Badge>
            : <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>}
          {result.warnings.length > 0 && <Badge variant="secondary">{result.warnings.length} warn</Badge>}
        </div>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label className="text-xs">GSTIN</Label><Input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} className="font-mono" /></div>
        <div><Label className="text-xs">SCN Reference No</Label><Input value={scnRef} onChange={(e) => setScnRef(e.target.value)} className="font-mono" /></div>
        <div><Label className="text-xs">SCN Date</Label><Input type="date" value={scnDate} onChange={(e) => setScnDate(e.target.value)} /></div>
        <div><Label className="text-xs">Response Date</Label><Input type="date" value={responseDate} onChange={(e) => setResponseDate(e.target.value)} /></div>
        <div className="md:col-span-2">
          <Label className="text-xs">Reply Text</Label>
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={5} />
        </div>
      </Card>

      {(result.errors.length + result.warnings.length > 0) && (
        <Card className="p-4 space-y-1">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Diagnostics</h2>
          {result.errors.map((e, i) => <div key={`e-${i}`} className="text-xs text-destructive">[{e.code}] {e.message}</div>)}
          {result.warnings.map((w, i) => <div key={`w-${i}`} className="text-xs text-amber-500">[{w.code}] {w.message}</div>)}
        </Card>
      )}

      <Button onClick={handleDownload} disabled={result.errors.length > 0}>
        <Download className="h-4 w-4 mr-1" /> Download REG-31 Reply JSON
      </Button>
    </div>
  );
}
