/**
 * @file        src/pages/erp/comply360/companies/ScheduleMPage.tsx
 * @purpose     Sprint 77b · Schedule M (Drugs & Cosmetics Rules) pharma GMP surface.
 *              Consumes Pass A schedule-m engine + deep-links to QualiCheck per CORR-5.
 * @sprint      Sprint 77b · T-Phase-5.A.1.9-PASS-B · Block 3
 * @disciplines FR-7 · FR-13 · FR-19 (engine 0-DIFF) · FR-91
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, AlertTriangle, CheckCircle2, ExternalLink, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  assessScheduleMCompliance,
  recordScheduleMFinding,
  closeScheduleMFinding,
  loadScheduleMFindings,
  type ScheduleMPart,
  type ScheduleMSeverity,
} from '@/lib/comply360-schedule-m-engine';

const PARTS: { id: ScheduleMPart; label: string }[] = [
  { id: 'premises_design', label: 'Premises & Design' },
  { id: 'personnel_qualification', label: 'Personnel Qualification' },
  { id: 'equipment_qualification', label: 'Equipment Qualification' },
  { id: 'documentation_sop', label: 'Documentation & SOP' },
  { id: 'quality_control', label: 'Quality Control' },
];

const SEVERITIES: ScheduleMSeverity[] = ['minor', 'major', 'critical'];

export default function ScheduleMPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [part, setPart] = useState<ScheduleMPart>('quality_control');
  const [areaRef, setAreaRef] = useState('QC-LAB-02');
  const [observation, setObservation] = useState('HPLC calibration log gap noted between 12 Mar and 18 Mar');
  const [severity, setSeverity] = useState<ScheduleMSeverity>('major');

  const assessment = useMemo(() => {
    if (!entityCode) return null;
    return assessScheduleMCompliance(entityCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tick]);

  const findings = useMemo(() => {
    if (!entityCode) return [];
    return loadScheduleMFindings(entityCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Schedule M assessment is entity-scoped.</p>
        </Card>
      </div>
    );
  }

  const handleRecord = (): void => {
    recordScheduleMFinding(entityCode, { part, area_ref: areaRef, observation, severity });
    setTick(t => t + 1);
    toast.success('Schedule M finding recorded');
  };

  const handleClose = (id: string): void => {
    closeScheduleMFinding(entityCode, id, `CAPA-${entityCode}-${Date.now()}`);
    setTick(t => t + 1);
    toast.success('Finding closed with CAPA reference');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Schedule M · Pharma GMP Compliance</h1>
          <p className="text-muted-foreground text-sm">5-part GMP assessment · severity-weighted scoring · CAPA closure.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/erp/qualicheck?module=qc-r-schedule-m-compliance')}
          >
            <ExternalLink className="h-4 w-4 mr-1" /> Open in QualiCheck
          </Button>
        </div>
      </div>

      {assessment && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Overall</h2>
            <Badge className={assessment.gmp_certifiable ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}>
              {assessment.gmp_certifiable ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
              {assessment.overall_compliance_pct}% · {assessment.gmp_certifiable ? 'Certifiable' : 'Below threshold'}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {assessment.parts.map(p => {
              const meta = PARTS.find(x => x.id === p.part);
              return (
                <div key={p.part} className="border rounded p-3">
                  <div className="text-xs uppercase text-muted-foreground">{meta?.label}</div>
                  <div className="font-mono text-xl">{p.compliance_pct}%</div>
                  <div className="text-xs">
                    open: {p.open_minor + p.open_major + p.open_critical}
                    {p.open_critical > 0 && <span className="text-destructive ml-1">· {p.open_critical} crit</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">closed: {p.closed}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Part</Label>
          <Select value={part} onValueChange={(v) => setPart(v as ScheduleMPart)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PARTS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Area Ref</Label><Input value={areaRef} onChange={(e) => setAreaRef(e.target.value)} className="font-mono" /></div>
        <div>
          <Label className="text-xs">Severity</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as ScheduleMSeverity)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-4"><Label className="text-xs">Observation</Label><Input value={observation} onChange={(e) => setObservation(e.target.value)} /></div>
      </Card>

      <Button onClick={handleRecord}>Record Finding</Button>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Findings ({findings.length})</h2>
        {findings.length === 0 ? (
          <div className="text-xs text-muted-foreground">No findings recorded yet.</div>
        ) : (
          <div className="space-y-2">
            {findings.slice().reverse().map(f => (
              <div key={f.id} className="flex items-center justify-between border-b py-2 last:border-0">
                <div>
                  <div className="font-mono text-xs">{f.id}</div>
                  <div className="text-sm">{f.observation}</div>
                  <div className="text-xs text-muted-foreground">{f.part} · {f.area_ref} · {f.severity}</div>
                </div>
                <div className="flex items-center gap-2">
                  {f.closed_at ? (
                    <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Closed</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleClose(f.id)}>Close (CAPA)</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
