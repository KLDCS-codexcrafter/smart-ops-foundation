/**
 * @file        src/pages/erp/eximx/compliance/EWSDashboard.tsx
 * @purpose     EWS · Early Warning System aggregator · 7-signal multi-source · NO new type (Q10=b)
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Clock } from 'lucide-react';
import { loadRealisations } from '@/lib/export-realisation-engine';
import { loadPCAAudits } from '@/lib/pca-audit-engine';
import { loadSoftexForms } from '@/lib/stpi-softex-engine';
import { loadTPDocs } from '@/lib/tp-benchmarking-engine';
import { loadSupplierDeclarations } from '@/lib/carotar-roo-engine';

interface EWSSignal {
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  description: string;
  action_required: string;
}

export function EWSDashboard(): JSX.Element {
  const tradingCode = 'sinha-trading';
  const steelCode = 'sinha-steel';
  const [signals, setSignals] = useState<EWSSignal[]>([]);

  useEffect(() => {
    const agg: EWSSignal[] = [];

    // Signal 1: FEMA 270-day critical/overdue (from sinha-trading exports)
    const realisations = loadRealisations(tradingCode);
    realisations.filter((r) => r.fema_state === 'critical' || r.fema_state === 'overdue').forEach((r) => {
      agg.push({ severity: r.fema_state === 'overdue' ? 'critical' : 'high', source: 'FEMA 270-day', description: `Realisation ${r.realisation_no} · ${r.fema_state}`, action_required: 'File FEMA extension or escalate to credit committee' });
    });

    // Signal 2: PCA audits with findings issued (from sinha-steel imports)
    loadPCAAudits(steelCode).filter((p) => p.status === 'findings_issued').forEach((p) => {
      agg.push({ severity: p.total_demand_inr > 100000 ? 'high' : 'medium', source: 'PCA Audit', description: `Case ${p.pca_case_no} · ₹${p.total_demand_inr.toLocaleString('en-IN')} demand`, action_required: 'Review findings · file appeal if applicable' });
    });

    // Signal 3: STPI Softex overdue
    loadSoftexForms(tradingCode).filter((s) => s.is_overdue).forEach((s) => {
      agg.push({ severity: 'high', source: 'STPI Softex', description: `Form ${s.softex_form_no} overdue`, action_required: 'File Softex with STPI immediately' });
    });

    // Signal 4: TP Form 3CEB deadline approaching
    loadTPDocs(tradingCode).filter((t) => t.form_3ceb_filed_at === null && t.is_above_threshold).forEach((t) => {
      const daysToDeadline = Math.ceil((new Date(t.form_3ceb_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysToDeadline <= 60) agg.push({ severity: daysToDeadline <= 30 ? 'high' : 'medium', source: 'Transfer Pricing', description: `${t.doc_ref} · Form 3CEB due in ${daysToDeadline} days`, action_required: 'Coordinate with CA for filing' });
    });

    // Signal 5: CAROTAR queried with deadline approaching
    loadSupplierDeclarations(steelCode).filter((sd) => sd.status === 'queried' && sd.customs_response_deadline).forEach((sd) => {
      const daysToDeadline = Math.ceil((new Date(sd.customs_response_deadline as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysToDeadline <= 15) agg.push({ severity: daysToDeadline <= 5 ? 'critical' : 'high', source: 'CAROTAR', description: `${sd.declaration_no} · query response due in ${daysToDeadline} days`, action_required: 'Respond to Customs query with supporting docs' });
    });

    setSignals(agg);
  }, []);

  const sevVariant: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
    critical: 'destructive', high: 'destructive', medium: 'secondary', low: 'outline',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold"><AlertTriangle className="w-5 h-5 inline mr-2" />EWS · Early Warning System</h2>
        <p className="text-sm text-muted-foreground">7-signal multi-source aggregator · FEMA + PCA + STPI + TP + CAROTAR + Sanctions + AEO Review · NO new transactional primitive (Q10=b)</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
          const count = signals.filter((s) => s.severity === sev).length;
          return <Card key={sev}><CardContent className="pt-6"><Badge variant={sevVariant[sev]}>{sev}</Badge><div className="text-2xl font-bold mt-2">{count}</div></CardContent></Card>;
        })}
      </div>

      <Card>
        <CardHeader><CardTitle><Shield className="w-4 h-4 inline mr-2" />Active Signals · {signals.length}</CardTitle></CardHeader>
        <CardContent>
          {signals.length === 0 ? <p className="text-sm text-muted-foreground">All systems nominal · no active compliance signals</p> : (
            <div className="space-y-3">
              {signals.map((s, i) => (
                <div key={`sig-${i}`} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <Badge variant={sevVariant[s.severity]}>{s.severity}</Badge>
                  <div className="flex-1 text-sm">
                    <div><strong>{s.source}</strong> · {s.description}</div>
                    <div className="text-xs text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />{s.action_required}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
