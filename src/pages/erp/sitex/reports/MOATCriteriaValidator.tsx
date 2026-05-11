/**
 * @file        src/pages/erp/sitex/reports/MOATCriteriaValidator.tsx
 * @purpose     MOAT #22 SiteX 8-criteria validation panel · institutional record
 * @sprint      T-Phase-1.A.15a · Q-LOCK-17a · Block H.4
 */
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';

interface Props { onNavigate: (m: string) => void }

interface Criterion { id: number; label: string; status: 'banked' | 'pending'; note: string }

const CRITERIA: Criterion[] = [
  { id: 1, label: 'Site=Branch architectural breakthrough end-to-end', status: 'banked', note: 'A.14 + A.15a' },
  { id: 2, label: '12/12 Leak Register categories hit', status: 'banked', note: 'A.15a 11 OOBs + 5 originals' },
  { id: 3, label: '6/6 Master Plan §6.3 SiteX OOBs LIVE', status: 'banked', note: 'DPR + Snag + Customer Signoff + Commissioning + Turnkey + ServiceDesk Handoff bridge' },
  { id: 4, label: 'Sinha Mode 1 install/commission demo end-to-end', status: 'banked', note: 'NTPC blower' },
  { id: 5, label: 'Sinha Mode 3 CAPEX expansion demo end-to-end', status: 'banked', note: 'Internal capex' },
  { id: 6, label: 'Mobile site-engineer 5-step capture pattern × 4 captures', status: 'pending', note: 'A.15b mobile (scaffold ready)' },
  { id: 7, label: 'Path B own entity · 4th + 5th consumers (Imprest + RA Bill)', status: 'banked', note: 'DocVault Hub purity preserved · FR-73.1 absolute' },
  { id: 8, label: 'Status FLIPPED to active · 23/32 cards active', status: 'banked', note: 'Q-LOCK-16a' },
];

export function MOATCriteriaValidator({ onNavigate: _onNavigate }: Props): JSX.Element {
  const banked = CRITERIA.filter((c) => c.status === 'banked').length;
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MOAT #22 SiteX · Criteria Validator</h1>
        <p className="text-sm text-muted-foreground mt-1">{banked}/{CRITERIA.length} criteria banked at A.15a close</p>
      </div>
      <Card className="p-6 space-y-3">
        {CRITERIA.map((c) => (
          <div key={c.id} className="flex items-start gap-3 py-2 border-b last:border-0">
            {c.status === 'banked'
              ? <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
              : <Clock className="h-5 w-5 text-warning shrink-0 mt-0.5" />}
            <div className="flex-1">
              <div className="font-medium">#{c.id} · {c.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.note}</div>
            </div>
            <Badge variant="outline" className={c.status === 'banked' ? 'border-success text-success' : 'border-warning text-warning'}>
              {c.status === 'banked' ? 'BANKED' : 'PENDING'}
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
