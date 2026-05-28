/**
 * @file        src/pages/erp/comply360/external-audit/Form3CDPage.tsx
 * @purpose     Form 3CD surface · 44-clause particulars · Clause 44 READS caro-2020 (§Y frozen)
 * @sprint      Sprint 74a · T-Phase-5.A.1.6-PASS-A · Block 7
 * @decisions   DP-S74-3 (3CD reads caro-2020 · FR-19 · 0-DIFF)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClipboardCheck, FileJson, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  build3CD,
  countQualifiedClauses,
  type EntityMeta,
  type AuditorMeta,
  type Form3CD,
} from '@/lib/comply360-tax-audit-3cd-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

export default function Form3CDPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [entity, setEntity] = useState<EntityMeta>({
    entity_code: entityCode || 'ENT',
    pan: '',
    legal_name: '',
    fy_start: '2025-04-01',
    fy_end: '2026-03-31',
  });
  const [auditor, setAuditor] = useState<AuditorMeta>({
    auditor_name: '', membership_no: '', firm_name: '', audit_date: new Date().toISOString().slice(0, 10),
  });
  const [form, setForm] = useState<Form3CD | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);

  const handleBuild = (): void => {
    const f = build3CD({ ...entity, entity_code: entityCode || entity.entity_code }, auditor);
    setForm(f);
    const qf = countQualifiedClauses(f);
    if (qf > 0) toast.warning(`Form 3CD built · ${qf} clause(s) qualified (CARO 3(i) flags)`);
    else toast.success(`Form 3CD built · all ${f.clauses.length} clauses reported clean`);
  };

  const handleDownload = (): void => {
    if (!form) return;
    const blob = new Blob([JSON.stringify(form, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Form3CD_${form.entity.entity_code}_${form.entity.fy_end}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const qualifiedCount = useMemo(() => form ? countQualifiedClauses(form) : 0, [form]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6"><Card className="p-12 text-center">
        <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
      </Card></div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Form 3CD · 44-Clause Particulars</h1>
          <p className="text-muted-foreground text-sm">Clause 44 cross-links to CARO 2020 §3(i) — read-only from frozen engine.</p>
        </div>
        <Badge variant="outline">Reads caro-2020 · §Y frozen</Badge>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Entity + Auditor</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1"><Label>PAN</Label>
            <Input value={entity.pan} onChange={(e) => setEntity({ ...entity, pan: e.target.value.toUpperCase() })} placeholder="AAAAA9999A" /></div>
          <div className="space-y-1"><Label>Legal name</Label>
            <Input value={entity.legal_name} onChange={(e) => setEntity({ ...entity, legal_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>FY end</Label>
            <Input type="date" value={entity.fy_end} onChange={(e) => setEntity({ ...entity, fy_end: e.target.value })} /></div>
          <div className="space-y-1"><Label>Auditor name</Label>
            <Input value={auditor.auditor_name} onChange={(e) => setAuditor({ ...auditor, auditor_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Membership no.</Label>
            <Input value={auditor.membership_no} onChange={(e) => setAuditor({ ...auditor, membership_no: e.target.value })} /></div>
          <div className="space-y-1"><Label>Firm</Label>
            <Input value={auditor.firm_name} onChange={(e) => setAuditor({ ...auditor, firm_name: e.target.value })} /></div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={handleBuild}><ClipboardCheck className="h-4 w-4 mr-1" /> Build 3CD</Button>
          <Button variant="outline" onClick={() => setJsonOpen(true)} disabled={!form}>
            <FileJson className="h-4 w-4 mr-1" /> View JSON
          </Button>
        </div>
      </Card>

      {form && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Clauses · {form.clauses.length}</h2>
            {qualifiedCount > 0
              ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{qualifiedCount} qualified</Badge>
              : <Badge className="bg-emerald-600">All reported</Badge>}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Clause</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.clauses.map((c) => (
                <TableRow key={c.clause}>
                  <TableCell className="font-mono">{c.clause}</TableCell>
                  <TableCell>{c.label}</TableCell>
                  <TableCell>
                    {c.status === 'reported' && <Badge className="bg-emerald-600">reported</Badge>}
                    {c.status === 'qualified' && <Badge variant="destructive">qualified</Badge>}
                    {c.status === 'not_applicable' && <Badge variant="secondary">n/a</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.note ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Form 3CD Payload</DialogTitle></DialogHeader>
          <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[50vh]">
            {form ? JSON.stringify(form, null, 2) : '—'}
          </pre>
          <DialogFooter>
            <Button onClick={handleDownload}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
