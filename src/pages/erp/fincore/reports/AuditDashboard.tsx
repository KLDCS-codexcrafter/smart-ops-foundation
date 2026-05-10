/**
 * AuditDashboard.tsx — Tax Audit Readiness Dashboard
 * Score display, 12 health cards, cross-validation, audit calendar.
 * [JWT] Replace with GET /api/compliance/audit-dashboard
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { computeAuditScore, runCrossValidations, type CrossValidationResult } from '@/lib/audit-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

const HEALTH_QUICK_ACTIONS: Record<string, { label: string; module: string }> = {
  'Trial Balance Balanced': { label: 'Open Day Book', module: 'fc-rpt-daybook' },
  'GSTR-1 Coverage': { label: 'Open GSTR-1', module: 'fc-gst-gstr1' },
  'GSTR-3B Coverage': { label: 'Open GSTR-3B', module: 'fc-gst-gstr3b' },
  'TDS Deposited on Time': { label: 'Open Challan Register', module: 'fc-rpt-challan' },
  'RCM Posted': { label: 'Open RCM Register', module: 'fc-gst-2a' },
  '26AS Reconciled': { label: 'Open Form 26AS', module: 'fc-rpt-26as' },
  'Clause 44 Setup': { label: 'Open Clause 44', module: 'fc-audit-clause44' },
  'Cash Payments': { label: 'View Clause 26', module: 'fc-audit-3cd' },
  'TDS Challan Deposited': { label: 'Open TDS Analytics', module: 'fc-tds-analytics' },
  'Open TDS Journals': { label: 'Open TDS Analytics', module: 'fc-tds-analytics' },
  'Related Party Tagged': { label: 'Open Vendor Master', module: 'fc-hub' },
  'Sec 43B Liabilities': { label: 'Open Trial Balance', module: 'fc-rpt-trial-balance' },
};

function getScoreBand(score: number) {
  if (score >= 90) return { label: 'Audit Ready', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', desc: 'Your books are well-prepared for tax audit.' };
  if (score >= 70) return { label: 'Minor Issues', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30', desc: 'A few items need attention before the audit.' };
  if (score >= 50) return { label: 'Needs Attention', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30', desc: 'Several compliance gaps should be resolved.' };
  return { label: 'High Risk', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30', desc: 'Significant compliance issues detected. Review immediately.' };
}

function getComplianceDueDates(): { label: string; dueDate: Date; category: string }[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const dates: { label: string; dueDate: Date; category: string }[] = [];

  // GSTR-1: 11th of following month
  const gstr1Date = new Date(m === 11 ? y + 1 : y, (m + 1) % 12, 11);
  dates.push({ label: 'GSTR-1', dueDate: gstr1Date, category: 'GST' });

  // GSTR-3B: 20th of following month
  const gstr3bDate = new Date(m === 11 ? y + 1 : y, (m + 1) % 12, 20);
  dates.push({ label: 'GSTR-3B', dueDate: gstr3bDate, category: 'GST' });

  // TDS Challan: 7th of following month (30th April for March)
  const tdsChallanDate = m === 2
    ? new Date(y, 3, 30)
    : new Date(m === 11 ? y + 1 : y, (m + 1) % 12, 7);
  dates.push({ label: 'TDS Challan', dueDate: tdsChallanDate, category: 'TDS' });

  // TDS Returns 26Q due dates
  const q26Dates: [number, number, number][] = [[y, 6, 31], [y, 9, 31], [y + 1, 0, 31], [y + 1, 4, 31]];
  for (const [yr, mn, dy] of q26Dates) {
    const d = new Date(yr, mn, dy);
    if (d > now) { dates.push({ label: 'TDS Return (26Q)', dueDate: d, category: 'TDS' }); break; }
  }

  // ITR filing: 31 October
  const itrDate = new Date(m >= 9 ? y + 1 : y, 9, 31);
  dates.push({ label: 'ITR Filing', dueDate: itrDate, category: 'Income Tax' });

  // Form 3CD: 30 September
  const form3cdDate = new Date(m >= 8 ? y + 1 : y, 8, 30);
  dates.push({ label: 'Form 3CD', dueDate: form3cdDate, category: 'Audit' });

  return dates.filter(d => d.dueDate > now).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

function getDaysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

interface AuditDashboardPanelProps {
  entityCode: string;
}

export function AuditDashboardPanel({ entityCode }: AuditDashboardPanelProps) {
  const today = new Date();
  const fyStart = today.getMonth() >= 3 ? `${today.getFullYear()}-04-01` : `${today.getFullYear() - 1}-04-01`;
  const fyEnd = today.getMonth() >= 3 ? `${today.getFullYear() + 1}-03-31` : `${today.getFullYear()}-03-31`;

  const [from] = useState(fyStart);
  const [to] = useState(fyEnd);
  const [validations, setValidations] = useState<CrossValidationResult[] | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const audit = useMemo(() => computeAuditScore(entityCode, from, to), [entityCode, from, to]);
  const scorePct = audit.max > 0 ? Math.round((audit.total / audit.max) * 100) : 0;
  const band = getScoreBand(scorePct);
  const dueDates = useMemo(() => getComplianceDueDates(), []);

  const handleRunValidations = () => {
    setRunning(true);
    setTimeout(() => {
      setValidations(runCrossValidations(entityCode, from, to));
      setLastRun(new Date().toLocaleString('en-IN'));
      setRunning(false);
    }, 600);
  };

  const statusIcon = (s: string) => {
    if (s === 'green' || s === 'pass') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (s === 'amber' || s === 'warn') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="p-6 space-y-6" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Tax Audit Dashboard</h2>
          <p className="text-xs text-muted-foreground">FY {from.substring(0, 4)}–{to.substring(0, 4)} | Audit Readiness Overview</p>
        </div>
      </div>

      {/* 7.1 — Audit Readiness Score */}
      <Card className={`border ${band.bg}`}>
        <CardContent className="p-6 flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className={`text-5xl font-bold font-mono ${band.color}`}>{scorePct}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
          <div>
            <Badge variant="outline" className={`text-xs ${band.bg} ${band.color}`}>{band.label}</Badge>
            <p className="text-sm mt-1">{band.desc}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Score = {audit.total} of {audit.max} points across {audit.checkpoints.length} checkpoints</p>
          </div>
        </CardContent>
      </Card>

      {/* 7.2 — 12 Health Indicator Cards */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Compliance Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {audit.checkpoints.map(cp => {
            const action = HEALTH_QUICK_ACTIONS[cp.label];
            return (
              <Card key={cp.label} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    {statusIcon(cp.status)}
                    <span className="text-[10px] font-mono text-muted-foreground">{cp.score}/{cp.maxPoints}</span>
                  </div>
                  <p className="text-xs font-medium leading-tight">{cp.label}</p>
                  {action && (
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-primary">
                      {action.label} <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 7.3 — Cross-Clause Validation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Cross-Clause Validation</CardTitle>
            <div className="flex items-center gap-2">
              {lastRun && <span className="text-[10px] text-muted-foreground">Last run: {lastRun}</span>}
              <Button variant="outline" size="sm" data-primary onClick={handleRunValidations} disabled={running}>
                {running ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                Run Now
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {!validations && (
            <p className="text-xs text-muted-foreground py-4 text-center">Click "Run Now" to execute cross-clause validations.</p>
          )}
          {validations?.map(v => (
            <div key={v.id} className="flex items-start gap-3 p-2 rounded border border-border/50">
              {statusIcon(v.status)}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold">{v.name}</span>
                <p className="text-[10px] text-muted-foreground">{v.message}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 7.4 — Audit Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Upcoming Compliance Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {dueDates.slice(0, 8).map((d, i) => {
              const days = getDaysUntil(d.dueDate);
              const urgency = days < 7 ? 'bg-red-500/10 text-red-600 border-red-500/30'
                : days < 14 ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
              return (
                <Badge key={`${d.label}-${i}`} variant="outline" className={`text-xs px-2 py-1 ${urgency}`}>
                  {d.label} — {days} day{days !== 1 ? 's' : ''}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditDashboard() {
  const { entityCode } = useEntityCode();
  return entityCode
    ? <AuditDashboardPanel entityCode={entityCode} />
    : <SelectCompanyGate title="Select a company to view Audit Dashboard" />;
}
