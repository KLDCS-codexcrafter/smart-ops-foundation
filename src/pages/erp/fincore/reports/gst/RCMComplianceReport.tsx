/**
 * RCMComplianceReport.tsx — RCM Compliance Report
 * Sprint T-Phase-2.7-a · Q5-b · Q6-c-expanded
 *
 * Reads from erp_rcm_compliance_log_{entityCode} written by finecore-engine.
 * Severity tiers HIGH/MED/LOW/INFO + outcome facets. Sibling to RCMRegister
 * (which tracks JV-postable lifecycle) — this view tracks DETECTION coverage.
 *
 * [JWT] GET /api/finecore/rcm-compliance-log/:entityCode
 */
import { useMemo, useState } from 'react';
import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  rcmComplianceLogKey,
  RCM_SEVERITY_LABELS,
  RCM_OUTCOME_LABELS,
  type RCMComplianceLogEntry,
  type RCMSeverity,
  type RCMOutcomeStatus,
} from '@/types/rcm-compliance-log';

interface RCMComplianceReportPanelProps { entityCode: string; }

function loadLog(entityCode: string): RCMComplianceLogEntry[] {
  try {
    // [JWT] GET /api/finecore/rcm-compliance-log/:entityCode
    const raw = localStorage.getItem(rcmComplianceLogKey(entityCode));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const SEVERITY_BADGE: Record<RCMSeverity, string> = {
  HIGH: 'bg-destructive/15 text-destructive border-destructive/30',
  MED:  'bg-warning/15 text-warning border-warning/30',
  LOW:  'bg-muted text-muted-foreground border-border',
  INFO: 'bg-secondary text-secondary-foreground border-border',
};

function fmtINR(paise: number): string {
  const rupees = (paise || 0) / 100;
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RCMComplianceReportPanel({ entityCode }: RCMComplianceReportPanelProps) {
  const [entries] = useState<RCMComplianceLogEntry[]>(() => loadLog(entityCode));
  const [severityFilter, setSeverityFilter] = useState<'all' | RCMSeverity>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | RCMOutcomeStatus>('all');

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
      if (outcomeFilter !== 'all' && e.outcome !== outcomeFilter) return false;
      return true;
    });
  }, [entries, severityFilter, outcomeFilter]);

  const counts = useMemo(() => {
    const c: Record<RCMSeverity, number> = { HIGH: 0, MED: 0, LOW: 0, INFO: 0 };
    for (const e of entries) c[e.severity] = (c[e.severity] ?? 0) + 1;
    return c;
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['HIGH', 'MED', 'LOW', 'INFO'] as RCMSeverity[]).map(s => (
          <Card key={s} className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                {RCM_SEVERITY_LABELS[s]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-semibold">{counts[s] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            RCM Compliance Log
          </CardTitle>
          <div className="flex gap-2">
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as 'all' | RCMSeverity)}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MED">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={outcomeFilter} onValueChange={(v) => setOutcomeFilter(v as 'all' | RCMOutcomeStatus)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Outcome" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outcomes</SelectItem>
                {(Object.keys(RCM_OUTCOME_LABELS) as RCMOutcomeStatus[]).map(k => (
                  <SelectItem key={k} value={k}>{RCM_OUTCOME_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Voucher</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Signals</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    No compliance log entries yet — post a purchase-side voucher.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.voucher_date}</TableCell>
                  <TableCell className="font-mono text-xs">{e.voucher_no}</TableCell>
                  <TableCell className="text-sm">{e.vendor_name ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{e.vendor_gstin ?? 'URP'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={SEVERITY_BADGE[e.severity]}>
                      {RCM_SEVERITY_LABELS[e.severity]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs space-x-1">
                    {e.signals.signal_urp && <Badge variant="outline">URP</Badge>}
                    {e.signals.signal_composition && <Badge variant="outline">Comp</Badge>}
                    {e.signals.signal_hsn_notified && <Badge variant="outline">HSN-9(3)</Badge>}
                    {!e.signals.signal_urp && !e.signals.signal_composition && !e.signals.signal_hsn_notified && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{RCM_OUTCOME_LABELS[e.outcome]}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtINR(e.taxable_amount_paise)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{e.note ?? ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RCMComplianceReport() {
  // [JWT] GET /api/auth/active-entity
  const entityCode = localStorage.getItem('active_entity_code') || 'ENT001';
  return <RCMComplianceReportPanel entityCode={entityCode} />;
}
