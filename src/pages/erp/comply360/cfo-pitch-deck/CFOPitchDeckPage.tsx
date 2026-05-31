/**
 * @file        src/pages/erp/comply360/cfo-pitch-deck/CFOPitchDeckPage.tsx
 * @purpose     CFO Compliance Pitch Deck generator · OOB-3 FUNCTIONAL
 * @sprint      Sprint 87 · T-Phase-5.D.4.2 · DP-S87-15 · FLOOR 4 CLOSES
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Presentation } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateCFOPitchDeckPDF, listCFOPitchDecks, getLatestROISnapshot,
} from '@/lib/comply360-cfo-pitch-deck-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

function currentFY(): string {
  const y = new Date().getFullYear();
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

export default function CFOPitchDeckPage(): JSX.Element {
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());
  const [fy, setFy] = useState<string>(currentFY());
  const [companyName, setCompanyName] = useState<string>('Operix Demo Pvt Ltd');
  const [auditReadyScore, setAuditReadyScore] = useState<number>(85);
  const [decks, setDecks] = useState(() => listCFOPitchDecks());
  const roi = useMemo(() => getLatestROISnapshot(fy), [fy]);

  const handleGenerate = (): void => {
    try {
      const deck = generateCFOPitchDeckPDF({
        fy, company_name: companyName,
        audit_ready_score: auditReadyScore,
        roi_percentage: roi.roi_percentage,
        cost_savings_inr: roi.cost_savings_inr,
        prepared_by_bap: bap,
      });
      if (deck.pdf_bytes_base64) {
        const a = document.createElement('a');
        a.href = `data:application/pdf;base64,${deck.pdf_bytes_base64}`;
        a.download = `cfo-pitch-deck-${companyName.replace(/\s+/g, '-')}-${fy}.pdf`;
        a.click();
      }
      setDecks(listCFOPitchDecks());
      toast.success('CFO Pitch Deck generated · PDF downloaded');
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Presentation className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">CFO Pitch Deck</h1>
        <span className="ml-2 text-sm text-muted-foreground">OOB-3 · Compliance pitch PDF · BAP {bap}</span>
      </div>

      <Card className="p-4 mb-4">
        <h3 className="font-semibold mb-3">Generate New Pitch Deck</h3>
        <div className="grid grid-cols-4 gap-3 items-end">
          <div>
            <Label htmlFor="cfo-fy">FY</Label>
            <Input id="cfo-fy" value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="cfo-company">Company</Label>
            <Input id="cfo-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cfo-score">Audit Readiness %</Label>
            <Input id="cfo-score" type="number" value={auditReadyScore} onChange={(e) => setAuditReadyScore(Number(e.target.value))} className="font-mono" />
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Latest ROI snapshot for FY {fy}: <span className="font-mono">{roi.roi_percentage}%</span> · savings ₹<span className="font-mono">{roi.cost_savings_inr.toLocaleString('en-IN')}</span>
        </div>
        <div className="mt-4">
          <Button onClick={handleGenerate}>Generate PDF</Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Generated Decks ({decks.length})</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>FY</TableHead><TableHead>Company</TableHead>
              <TableHead>Audit Score</TableHead><TableHead>ROI %</TableHead>
              <TableHead>Generated At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {decks.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono">{d.fy}</TableCell>
                <TableCell>{d.company_name}</TableCell>
                <TableCell className="font-mono">{d.audit_ready_score}%</TableCell>
                <TableCell className="font-mono">{d.roi_percentage}%</TableCell>
                <TableCell className="font-mono text-xs">{d.generated_at}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
