/**
 * @file        src/pages/erp/servicedesk/phase2-preview/PSUGovServiceContract.tsx
 * @purpose     S36 PSU / Gov Service Contract · Tier-L FULL · promoted at A.3
 * @sprint      T-Phase-1.A.3 · T-A3-ServiceDesk-Capstone · Pass 3 of 3
 * @iso         Functional Suitability + Usability
 * @reuses      servicedesk-capstone-engine.PSU_CONTRACT_TEMPLATES (READ-ONLY)
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, ShieldCheck } from 'lucide-react';
import {
  PSU_CONTRACT_TEMPLATES,
  type PSUContractTerms,
} from '@/lib/servicedesk-capstone-engine';

export function PSUGovServiceContract(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string>(PSU_CONTRACT_TEMPLATES[0].contract_template_id);
  const selected: PSUContractTerms =
    PSU_CONTRACT_TEMPLATES.find((t) => t.contract_template_id === selectedId) ??
    PSU_CONTRACT_TEMPLATES[0];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">PSU / Gov Service Contract</h1>
          <Badge variant="default">S36 · Tier-L LIVE</Badge>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Contract template</h2>
        <div className="flex flex-wrap gap-2">
          {PSU_CONTRACT_TEMPLATES.map((t) => (
            <button
              key={t.contract_template_id}
              onClick={() => setSelectedId(t.contract_template_id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                selectedId === t.contract_template_id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/40'
              }`}
            >
              {t.template_label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 space-y-2">
          <h2 className="font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            SLA terms
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Response within</div>
            <div className="font-mono">{selected.sla_response_hours} h</div>
            <div className="text-muted-foreground">Resolve within</div>
            <div className="font-mono">{selected.sla_resolution_hours} h</div>
            <div className="text-muted-foreground">Escalation tiers</div>
            <div className="font-mono">{selected.escalation_levels}</div>
            <div className="text-muted-foreground">Uptime guarantee</div>
            <div className="font-mono">{selected.uptime_guarantee_pct}%</div>
            <div className="text-muted-foreground">Penalty per breach</div>
            <div className="font-mono">
              ₹{(selected.penalty_per_breach_paise / 100).toLocaleString('en-IN')}
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <h2 className="font-semibold">Mandatory audit documents</h2>
          <ul className="space-y-1 text-sm">
            {selected.mandatory_audit_doc_types.map((d) => (
              <li key={d} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="font-mono text-xs">{d}</span>
              </li>
            ))}
          </ul>
          <p className="pt-2 text-xs text-muted-foreground">
            Each ServiceTicket under this contract auto-checks the required doc set at close.
          </p>
        </Card>
      </div>
    </div>
  );
}
