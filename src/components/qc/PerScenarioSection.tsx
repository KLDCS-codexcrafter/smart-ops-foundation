/**
 * @file     PerScenarioSection.tsx
 * @sprint   T-Phase-1.3-3b-pre-2 · Block H · D-633
 * @purpose  Q55=a · Per-scenario deterministic UI render (4 variants · data-driven).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Users, Briefcase, Globe } from 'lucide-react';
import type { QaInspectionRecord } from '@/types/qa-inspection';
import type { QCScenario } from '@/types/production-order';

export interface PerScenarioSectionProps {
  inspection: QaInspectionRecord;
}

// qc_scenario is propagated from production transactions but not declared on
// QaInspectionRecord (pre-1 zero-touch boundary). Read defensively.
function getScenario(inspection: QaInspectionRecord): QCScenario | null {
  const raw = (inspection as unknown as { qc_scenario?: string | null }).qc_scenario;
  if (!raw) return null;
  if (raw === 'internal_dept' || raw === 'customer_inspection' ||
      raw === 'third_party_agency' || raw === 'export_oriented') {
    return raw;
  }
  return null;
}

export function PerScenarioSection({ inspection }: PerScenarioSectionProps): JSX.Element | null {
  const scenario = getScenario(inspection);
  if (!scenario) return null;
  switch (scenario) {
    case 'internal_dept': return <InternalDeptSection inspection={inspection} />;
    case 'customer_inspection': return <CustomerInspectionSection inspection={inspection} />;
    case 'third_party_agency': return <ThirdPartyAgencySection inspection={inspection} />;
    case 'export_oriented': return <ExportOrientedSection inspection={inspection} />;
    default: return null;
  }
}

function InternalDeptSection({ inspection }: { inspection: QaInspectionRecord }): JSX.Element {
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
        <Building className="h-4 w-4 text-primary" /> Internal Department QC
        <Badge variant="outline">internal_dept</Badge>
      </CardTitle></CardHeader>
      <CardContent className="text-xs space-y-1 text-muted-foreground">
        <div>Inspector: <span className="font-mono">{inspection.inspector_user_id}</span></div>
        <div>Location: {inspection.inspection_location}</div>
        <div>
          Plant context · Factory <span className="font-mono">{inspection.factory_id ?? '—'}</span>
          {' · '}Machine <span className="font-mono">{inspection.machine_id ?? '—'}</span>
          {' · '}Work Center <span className="font-mono">{inspection.work_center_id ?? '—'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerInspectionSection({ inspection }: { inspection: QaInspectionRecord }): JSX.Element {
  return (
    <Card className="border-accent/40">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
        <Users className="h-4 w-4 text-accent-foreground" /> Customer Inspection
        <Badge variant="outline">customer_inspection</Badge>
      </CardTitle></CardHeader>
      <CardContent className="text-xs space-y-1">
        <div>Customer: <span className="font-medium">{inspection.customer_name ?? inspection.customer_id ?? '—'}</span></div>
        <div className="text-muted-foreground">Customer rep should sign off after inspection · CoA generation enabled.</div>
      </CardContent>
    </Card>
  );
}

function ThirdPartyAgencySection({ inspection }: { inspection: QaInspectionRecord }): JSX.Element {
  return (
    <Card className="border-warning/40">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-warning" /> Third Party Agency Inspection
        <Badge variant="outline">third_party_agency</Badge>
      </CardTitle></CardHeader>
      <CardContent className="text-xs space-y-1">
        <div>External Lab: {inspection.external_lab_party_id ?? <span className="text-destructive">⚠ Not assigned</span>}</div>
        <div>Sample Sent: <span className="font-mono">{inspection.external_lab_sample_sent_date ?? '—'}</span></div>
        <div>Report Received: <span className="font-mono">{inspection.external_lab_report_received_date ?? '—'}</span></div>
        {inspection.external_lab_report_url && (
          <a href={inspection.external_lab_report_url} target="_blank" rel="noreferrer" className="text-primary underline">
            View external lab report
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function ExportOrientedSection({ inspection: _inspection }: { inspection: QaInspectionRecord }): JSX.Element {
  return (
    <Card className="border-success/40">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
        <Globe className="h-4 w-4 text-success" /> Export-Oriented Inspection
        <Badge variant="outline">export_oriented</Badge>
      </CardTitle></CardHeader>
      <CardContent className="text-xs space-y-1 text-muted-foreground">
        <div>Compliance standards apply (per Factory.manufacturing_config).</div>
        <div>Pre-shipment CoA mandatory · linked to BL/AWB.</div>
        <div>External lab certification may be required for destination country.</div>
      </CardContent>
    </Card>
  );
}
