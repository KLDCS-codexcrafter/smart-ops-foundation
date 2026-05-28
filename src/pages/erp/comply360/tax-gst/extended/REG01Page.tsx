/**
 * @file Sprint 76b · REG-01 new GST registration surface · consumes Pass A buildREG01.
 * @sprint Sprint 76b · T-Phase-5.A.1.8-PASS-B · Block 5
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { buildREG01 } from '@/lib/comply360-gstr-builder-engine';

const CONSTITUTIONS = [
  'proprietorship', 'partnership', 'llp', 'private_limited',
  'public_limited', 'huf', 'society', 'trust', 'others',
] as const;
const REASONS = [
  'voluntary', 'crossed_threshold', 'interstate', 'casual', 'tds_collector', 'tcs_collector',
] as const;

export default function REG01Page(): JSX.Element {
  const [legalName, setLegalName] = useState('Sinha Industries Private Limited');
  const [tradeName, setTradeName] = useState('Sinha Industries');
  const [pan, setPan] = useState('AAACS1234F');
  const [stateCode, setStateCode] = useState('27');
  const [constitution, setConstitution] = useState<typeof CONSTITUTIONS[number]>('private_limited');
  const [commencement, setCommencement] = useState('2026-04-01');
  const [place, setPlace] = useState('Mumbai · Maharashtra');
  const [reason, setReason] = useState<typeof REASONS[number]>('crossed_threshold');
  const [signatoryPan, setSignatoryPan] = useState('AKLPS9876C');

  const result = useMemo(() => buildREG01({
    legal_name: legalName, trade_name: tradeName, pan, state_code: stateCode,
    business_constitution: constitution, commencement_date: commencement,
    principal_place: place, reason_for_registration: reason,
    authorized_signatory_pan: signatoryPan,
  }), [legalName, tradeName, pan, stateCode, constitution, commencement, place, reason, signatoryPan]);

  const handleDownload = (): void => {
    const blob = new Blob([JSON.stringify(result.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `REG01_${pan}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('REG-01 JSON downloaded');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">REG-01 · New GST Registration</h1>
          <p className="text-muted-foreground text-sm">Initial registration application under §22/§24 of CGST Act.</p>
        </div>
        <div className="flex items-center gap-2">
          {result.errors.length > 0
            ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{result.errors.length} errors</Badge>
            : <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>}
          {result.warnings.length > 0 && <Badge variant="secondary">{result.warnings.length} warn</Badge>}
        </div>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label className="text-xs">Legal Name</Label><Input value={legalName} onChange={(e) => setLegalName(e.target.value)} /></div>
        <div><Label className="text-xs">Trade Name</Label><Input value={tradeName} onChange={(e) => setTradeName(e.target.value)} /></div>
        <div><Label className="text-xs">PAN</Label><Input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} className="font-mono" /></div>
        <div><Label className="text-xs">State Code</Label><Input value={stateCode} onChange={(e) => setStateCode(e.target.value)} className="font-mono w-24" /></div>
        <div>
          <Label className="text-xs">Constitution</Label>
          <Select value={constitution} onValueChange={(v) => setConstitution(v as typeof CONSTITUTIONS[number])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CONSTITUTIONS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Reason</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as typeof REASONS[number])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{REASONS.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Commencement Date</Label><Input type="date" value={commencement} onChange={(e) => setCommencement(e.target.value)} /></div>
        <div><Label className="text-xs">Authorised Signatory PAN</Label><Input value={signatoryPan} onChange={(e) => setSignatoryPan(e.target.value.toUpperCase())} className="font-mono" /></div>
        <div className="md:col-span-2"><Label className="text-xs">Principal Place of Business</Label><Input value={place} onChange={(e) => setPlace(e.target.value)} /></div>
      </Card>

      {(result.errors.length + result.warnings.length > 0) && (
        <Card className="p-4 space-y-1">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Diagnostics</h2>
          {result.errors.map((e, i) => <div key={`e-${i}`} className="text-xs text-destructive">[{e.code}] {e.message}</div>)}
          {result.warnings.map((w, i) => <div key={`w-${i}`} className="text-xs text-amber-500">[{w.code}] {w.message}</div>)}
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={handleDownload} disabled={result.errors.length > 0}>
          <Download className="h-4 w-4 mr-1" /> Download REG-01 JSON
        </Button>
        <Button variant="outline" disabled>
          <FileText className="h-4 w-4 mr-1" /> Preview ARN
        </Button>
      </div>
    </div>
  );
}
