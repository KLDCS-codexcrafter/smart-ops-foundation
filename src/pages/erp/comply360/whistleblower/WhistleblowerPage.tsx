/**
 * @file        src/pages/erp/comply360/whistleblower/WhistleblowerPage.tsx
 * @purpose     OOB-7 Whistleblower (Vigil Mechanism Section 177(9)) · standalone first-class page
 * @sprint      Sprint 85 · T-Phase-5.C.3.3 · DP-S85-8 v2 · OOB-7 FUNCTIONAL
 * @disciplines FR-7 · FR-13 · FR-19 · FR-106
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  fileComplaint, listComplaints, assignInvestigator, recordInvestigation,
  escalateToAuditCommittee, resolveEscalation, getWhistleblowerStats,
  verifyAnonymousProtection, listInvestigations, listEscalations,
  type ComplaintCategory, type ComplaintSeverity,
} from '@/lib/comply360-whistleblower-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

type SubTab = 'complaints' | 'investigations' | 'escalations' | 'anonymous-channel' | 'audit-committee';

const CATEGORIES: ComplaintCategory[] = [
  'financial_fraud', 'corruption_bribery', 'safety_violation', 'discrimination_harassment',
  'data_breach', 'environmental_violation', 'regulatory_non_compliance', 'other',
];
const SEVERITIES: ComplaintSeverity[] = ['low', 'medium', 'high', 'critical'];

function currentFY(): string {
  const y = new Date().getFullYear();
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

export default function WhistleblowerPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('complaints');
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());
  const [tick, setTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => getWhistleblowerStats(currentFY()), [tick]);
  const refresh = (): void => setTick((t) => t + 1);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Whistleblower / Vigil Mechanism</h1>
        <span className="ml-2 text-sm text-muted-foreground">Section 177(9) · OOB-7</span>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Total Complaints</div><div className="text-2xl font-mono">{stats.total_complaints}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Anonymous</div><div className="text-2xl font-mono">{stats.anonymous_count}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Escalated</div><div className="text-2xl font-mono">{stats.escalated_count}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Resolved</div><div className="text-2xl font-mono">{stats.resolved_count}</div></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="investigations">Investigations</TabsTrigger>
          <TabsTrigger value="escalations">Escalations</TabsTrigger>
          <TabsTrigger value="anonymous-channel">Anonymous Channel</TabsTrigger>
          <TabsTrigger value="audit-committee">Audit Committee View</TabsTrigger>
        </TabsList>

        <TabsContent value="complaints"><ComplaintsPanel bap={bap} tick={tick} onChange={refresh} /></TabsContent>
        <TabsContent value="investigations"><InvestigationsPanel bap={bap} tick={tick} onChange={refresh} /></TabsContent>
        <TabsContent value="escalations"><EscalationsPanel bap={bap} tick={tick} onChange={refresh} /></TabsContent>
        <TabsContent value="anonymous-channel"><AnonymousChannelPanel bap={bap} tick={tick} onChange={refresh} /></TabsContent>
        <TabsContent value="audit-committee"><AuditCommitteeViewPanel tick={tick} /></TabsContent>
      </Tabs>
    </div>
  );
}

interface PanelProps { bap: BAPAccountId; tick: number; onChange: () => void }

function ComplaintsPanel({ bap, tick, onChange }: PanelProps): JSX.Element {
  const [category, setCategory] = useState<ComplaintCategory>('financial_fraud');
  const [severity, setSeverity] = useState<ComplaintSeverity>('medium');
  const [summary, setSummary] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [identifier, setIdentifier] = useState('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const complaints = useMemo(() => listComplaints({ fy: currentFY() }), [tick]);

  const submit = (): void => {
    if (!summary.trim()) { toast.error('Summary required'); return; }
    fileComplaint({
      fy: currentFY(),
      complaint_date: new Date().toISOString().slice(0, 10),
      category, severity,
      is_anonymous: anonymous,
      complainant_identifier: anonymous ? null : (identifier || `bap-${bap}`),
      complaint_summary: summary,
      complaint_details_encrypted: btoa(summary),
    });
    setSummary(''); setIdentifier('');
    toast.success(`Complaint filed${anonymous ? ' anonymously' : ''}`);
    onChange();
  };

  return (
    <div className="p-6 space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-3">File New Complaint</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ComplaintCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as ComplaintSeverity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Summary</Label>
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief description" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={anonymous} onCheckedChange={setAnonymous} id="anon" />
            <Label htmlFor="anon">Anonymous</Label>
          </div>
          {!anonymous && (
            <div>
              <Label>Identifier</Label>
              <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Name or email" />
            </div>
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={submit}><Plus className="h-4 w-4 mr-1" /> File Complaint</Button>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Complaints ({complaints.length})</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Anon</TableHead></TableRow></TableHeader>
          <TableBody>
            {complaints.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No complaints</TableCell></TableRow>)}
            {complaints.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.complaint_date}</TableCell>
                <TableCell><Badge variant="secondary">{c.category}</Badge></TableCell>
                <TableCell><Badge>{c.severity}</Badge></TableCell>
                <TableCell><Badge>{c.status}</Badge></TableCell>
                <TableCell>{c.is_anonymous ? 'YES' : 'no'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function InvestigationsPanel({ bap, tick, onChange }: PanelProps): JSX.Element {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const complaints = useMemo(() => listComplaints({ fy: currentFY() }), [tick]);
  const assign = (complaintId: string): void => {
    assignInvestigator(complaintId, `dir-${Math.floor(Math.random() * 1000)}`, bap);
    recordInvestigation({
      complaint_id: complaintId, investigator_director_id: `dir-demo`,
      investigation_start_date: new Date().toISOString().slice(0, 10),
      investigation_end_date: null, findings_summary: 'Investigation initiated',
      evidence_refs: [], recommendation: 'corrective_action', recorded_by_bap: bap,
    });
    toast.success('Investigation assigned'); onChange();
  };
  return (
    <div className="p-6 space-y-3">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Open Complaints — Assign Investigator</h3>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Investigations</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {complaints.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No complaints</TableCell></TableRow>)}
            {complaints.map((c) => {
              const invs = listInvestigations(c.id);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.id.slice(0, 12)}</TableCell>
                  <TableCell><Badge variant="secondary">{c.category}</Badge></TableCell>
                  <TableCell><Badge>{c.status}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{invs.length}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => assign(c.id)}>Assign</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function EscalationsPanel({ bap, tick, onChange }: PanelProps): JSX.Element {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const complaints = useMemo(() => listComplaints({ fy: currentFY() }), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const escalations = useMemo(() => listEscalations(), [tick]);
  const escalate = (cid: string): void => {
    escalateToAuditCommittee({
      complaint_id: cid, escalation_date: new Date().toISOString().slice(0, 10),
      escalation_reason: 'Severity warrants audit committee attention', recorded_by_bap: bap,
    });
    toast.success('Escalated to audit committee'); onChange();
  };
  const resolve = (eid: string): void => {
    resolveEscalation(eid, 'Reviewed by audit committee', 'Corrective measures applied', bap);
    toast.success('Escalation resolved'); onChange();
  };
  return (
    <div className="p-6 space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Escalate Complaints</h3>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {complaints.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No complaints</TableCell></TableRow>)}
            {complaints.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.id.slice(0, 12)}</TableCell>
                <TableCell><Badge>{c.severity}</Badge></TableCell>
                <TableCell><Badge>{c.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" disabled={c.status === 'escalated_to_audit_committee' || c.status === 'resolved'} onClick={() => escalate(c.id)}>Escalate</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Escalations ({escalations.length})</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Complaint</TableHead><TableHead>Date</TableHead><TableHead>Resolved</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {escalations.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">None</TableCell></TableRow>)}
            {escalations.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.complaint_id.slice(0, 12)}</TableCell>
                <TableCell className="font-mono text-xs">{e.escalation_date}</TableCell>
                <TableCell>{e.resolved_at ? <Badge>resolved</Badge> : <Badge variant="secondary">pending</Badge>}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" disabled={!!e.resolved_at} onClick={() => resolve(e.id)}>Resolve</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function AnonymousChannelPanel({ bap, tick, onChange }: PanelProps): JSX.Element {
  const [summary, setSummary] = useState('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const anonymous = useMemo(() => listComplaints({ fy: currentFY() }).filter((c) => c.is_anonymous), [tick]);
  const submit = (): void => {
    if (!summary.trim()) { toast.error('Summary required'); return; }
    const c = fileComplaint({
      fy: currentFY(),
      complaint_date: new Date().toISOString().slice(0, 10),
      category: 'other', severity: 'medium',
      is_anonymous: true, complainant_identifier: null,
      complaint_summary: summary,
      complaint_details_encrypted: btoa(summary),
    });
    const verify = verifyAnonymousProtection(c.id);
    setSummary('');
    toast.success(`Anonymous complaint filed · ${verify.reason}`);
    onChange();
    // bap referenced to acknowledge identity is intentionally NOT recorded
    void bap;
  };
  return (
    <div className="p-6 space-y-4">
      <Card className="p-4 border-warning">
        <h3 className="font-semibold mb-2">Anonymous Channel</h3>
        <p className="text-xs text-muted-foreground mb-3">Identifier is NOT recorded · MCA-mandated protection for whistleblowers under Section 177(9)</p>
        <Label>Summary</Label>
        <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Anonymous report" />
        <div className="mt-3 flex justify-end"><Button onClick={submit}><Plus className="h-4 w-4 mr-1" /> File Anonymously</Button></div>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Anonymous Complaints ({anonymous.length})</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Protection</TableHead></TableRow></TableHeader>
          <TableBody>
            {anonymous.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No anonymous complaints</TableCell></TableRow>)}
            {anonymous.map((c) => {
              const v = verifyAnonymousProtection(c.id);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.complaint_date}</TableCell>
                  <TableCell><Badge variant="secondary">{c.category}</Badge></TableCell>
                  <TableCell><Badge>{c.severity}</Badge></TableCell>
                  <TableCell><Badge>{v.is_protected ? 'OK' : 'FAIL'}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function AuditCommitteeViewPanel({ tick }: { tick: number }): JSX.Element {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const escalated = useMemo(() => listComplaints({ fy: currentFY(), status: 'escalated_to_audit_committee' }), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const escalations = useMemo(() => listEscalations(), [tick]);
  return (
    <div className="p-6 space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Audit Committee · Escalated Complaints ({escalated.length})</h3>
        <p className="text-xs text-muted-foreground mb-2">Read-only view · MCA Rule 11(g) audit trail captures all whistleblower transactions</p>
        <Table>
          <TableHeader><TableRow><TableHead>Complaint</TableHead><TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {escalated.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No escalated complaints</TableCell></TableRow>)}
            {escalated.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.id.slice(0, 12)}</TableCell>
                <TableCell><Badge variant="secondary">{c.category}</Badge></TableCell>
                <TableCell><Badge>{c.severity}</Badge></TableCell>
                <TableCell><Badge>{c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold mb-2">All Escalations ({escalations.length})</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Escalation</TableHead><TableHead>Date</TableHead><TableHead>Response</TableHead><TableHead>Resolved</TableHead></TableRow></TableHeader>
          <TableBody>
            {escalations.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">None</TableCell></TableRow>)}
            {escalations.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.id.slice(0, 12)}</TableCell>
                <TableCell className="font-mono text-xs">{e.escalation_date}</TableCell>
                <TableCell className="text-xs">{e.audit_committee_response ?? '—'}</TableCell>
                <TableCell>{e.resolved_at ? <Badge>resolved</Badge> : <Badge variant="secondary">pending</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
