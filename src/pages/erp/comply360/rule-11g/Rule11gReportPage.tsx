/**
 * @file        src/pages/erp/comply360/rule-11g/Rule11gReportPage.tsx
 * @purpose     THE HEADLINE PAGE · Rule 11(g) Auditor Report Generator
 *              CFO clicks "Generate" → 4-question report assembled across 8 S80 engines
 *              → preview rendered inline → JSON + PDF stub + audit-pack downloadable.
 * @sprint      Sprint 80f · T-Phase-5.B.2.1-PASS-F · THE HEADLINE
 * @consumes    comply360-rule-11g-report-engine (S80f · NEW)
 *              comply360-audit-framework-engine (S80a · BAP picker)
 *              comply360-auditor-workspace-engine (S80a · engagement)
 *              comply360-audit-retention-engine (S80d · cold-storage)
 *              comply360-audit-ready-score-engine (S80e · score history)
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  generateRule11gReport,
  exportRule11gReportJson,
  exportRule11gReportPdfStub,
  type Rule11gReport,
  type Rule11gVerdict,
} from '@/lib/comply360-rule-11g-report-engine';
import { getActiveBAPAccount } from '@/lib/comply360-audit-framework-engine';
import { getActiveEngagement } from '@/lib/comply360-auditor-workspace-engine';
import { listColdStorageExports } from '@/lib/comply360-audit-retention-engine';
import { listScoreSnapshots } from '@/lib/comply360-audit-ready-score-engine';

function verdictTone(v: Rule11gVerdict): string {
  if (v === 'COMPLIANT') return 'border-emerald-500/40 bg-emerald-500/10';
  if (v === 'PARTIAL') return 'border-amber-500/40 bg-amber-500/10';
  return 'border-destructive/40 bg-destructive/10';
}

function VerdictBadge({ verdict }: { verdict: Rule11gVerdict }): JSX.Element {
  const variant: 'default' | 'secondary' | 'destructive' =
    verdict === 'COMPLIANT' ? 'default' : verdict === 'PARTIAL' ? 'secondary' : 'destructive';
  return <Badge variant={variant} className="font-mono">{verdict}</Badge>;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Rule11gReportPage(): JSX.Element {
  const activeEng = useMemo(() => getActiveEngagement(), []);
  const activeBAP = useMemo(() => getActiveBAPAccount(), []);

  const [entityCode, setEntityCode] = useState<string>(activeEng?.entity_code ?? 'OPERIX-DEMO');
  const [entityName, setEntityName] = useState<string>(activeEng?.entity_code ?? 'Operix Demo Pvt Ltd');
  const [fy, setFy] = useState<string>(activeEng?.fy ?? 'FY 2025-26');
  const [caFirm, setCaFirm] = useState<string>('');
  const [auditorName, setAuditorName] = useState<string>('');
  const [icaiNo, setIcaiNo] = useState<string>('');
  const [place, setPlace] = useState<string>('Mumbai');

  const [report, setReport] = useState<Rule11gReport | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const handleGenerate = (): void => {
    setBusy(true);
    try {
      const r = generateRule11gReport({
        entity_code: entityCode,
        entity_name: entityName,
        fy,
        generated_by_bap: activeBAP,
        engagement_id: activeEng?.id,
        ca_firm_name: caFirm,
        auditor_name: auditorName || undefined,
        icai_membership_no: icaiNo || undefined,
        place,
      });
      setReport(r);
      toast.success(`Rule 11(g) report generated · ${r.overall_verdict}`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate Rule 11(g) report');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadJson = (): void => {
    if (!report) return;
    downloadBlob(exportRule11gReportJson(report), `rule-11g-${report.entity_code}-${report.fy}.json`);
  };

  const handleDownloadPdf = (): void => {
    if (!report) return;
    downloadBlob(exportRule11gReportPdfStub(report), `rule-11g-${report.entity_code}-${report.fy}.md`);
  };

  const handleDownloadAuditPack = (): void => {
    if (!report) return;
    const pack = {
      schema_version: '1.0',
      generated_at: new Date().toISOString(),
      rule_11g_report: report,
      cold_storage_exports: listColdStorageExports(report.entity_code, { fy: report.fy }),
      audit_ready_score_history: listScoreSnapshots(report.entity_code, { fy: report.fy }),
      // S88 promotes to true ZIP via jszip
    };
    downloadBlob(
      new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' }),
      `audit-pack-${report.entity_code}-${report.fy}.json`,
    );
    toast.success('Audit pack downloaded (JSON bundle · S88 promotes to ZIP)');
  };

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Rule 11(g) Auditor Report Generator</h1>
        <p className="text-sm text-muted-foreground">
          THE HEADLINE · auto-generates the ICAI-compliant Rule 11(g) 4-question audit-readiness report.
          Your auditor signs off in minutes instead of weeks.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engagement &amp; Auditor metadata</CardTitle>
          <CardDescription>Active engagement: {activeEng?.id ?? '— none —'} · BAP: {activeBAP}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="r11g-entity-code">Entity code</Label>
            <Input id="r11g-entity-code" value={entityCode} onChange={(e) => setEntityCode(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="r11g-entity-name">Entity legal name</Label>
            <Input id="r11g-entity-name" value={entityName} onChange={(e) => setEntityName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="r11g-fy">Financial year</Label>
            <Input id="r11g-fy" value={fy} onChange={(e) => setFy(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="r11g-ca-firm">CA firm name</Label>
            <Input id="r11g-ca-firm" value={caFirm} onChange={(e) => setCaFirm(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="r11g-auditor">Auditor name</Label>
            <Input id="r11g-auditor" value={auditorName} onChange={(e) => setAuditorName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="r11g-icai">ICAI membership no</Label>
            <Input id="r11g-icai" value={icaiNo} onChange={(e) => setIcaiNo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="r11g-place">Place</Label>
            <Input id="r11g-place" value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleGenerate} disabled={busy}>
          {busy ? 'Generating…' : 'Generate Rule 11(g) Report'}
        </Button>
        {report && (
          <>
            <Button variant="outline" onClick={handleDownloadJson}>Download JSON</Button>
            <Button variant="outline" onClick={handleDownloadPdf}>Download PDF (Phase 5 stub)</Button>
            <Button variant="outline" onClick={handleDownloadAuditPack}>Download Audit Pack (JSON)</Button>
          </>
        )}
      </div>

      {report && (
        <section className={`rounded-lg border-2 p-4 space-y-3 ${verdictTone(report.overall_verdict)}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-bold">
              Rule 11(g) Report · {report.fy} · {report.entity_name}
            </h2>
            <VerdictBadge verdict={report.overall_verdict} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Question (a) · Cannot Disable</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Verdict</span><VerdictBadge verdict={report.question_a_cannot_disable.verdict} /></div>
                <div className="text-muted-foreground">{report.question_a_cannot_disable.evidence}</div>
                <div>Hardened at: <span className="font-mono">{report.hardened_at_sprint}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Question (b) · Universal Coverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Verdict</span><VerdictBadge verdict={report.question_b_coverage.verdict} /></div>
                <div>Coverage: <span className="font-mono">{report.question_b_coverage.coverage_percentage.toFixed(1)}%</span></div>
                <div>Engines scanned: <span className="font-mono">{report.question_b_coverage.total_engines_scanned}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Question (c) · 8-Year Retention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Verdict</span><VerdictBadge verdict={report.question_c_retention.verdict} /></div>
                <div>Entries: <span className="font-mono">{report.question_c_retention.total_entries}</span> · Exports: <span className="font-mono">{report.question_c_retention.exports_performed}</span></div>
                <div>Warnings pending: <span className="font-mono">{report.question_c_retention.warnings_pending}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Question (d) · Operated Throughout Year</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Verdict</span><VerdictBadge verdict={report.question_d_continuity.verdict} /></div>
                <div>Status: <span className="font-mono">{report.question_d_continuity.operated_throughout_year_verdict}</span></div>
                <div>Chain integrity: <span className="font-mono">{report.question_d_continuity.chain_integrity}</span></div>
                <div className="font-mono text-[10px] truncate" title={report.question_d_continuity.chain_head_hash ?? ''}>
                  Head: {report.question_d_continuity.chain_head_hash ?? '—'}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Audit-Ready Score (OOB-1)</CardTitle></CardHeader>
              <CardContent>
                <p className="font-mono text-2xl">{report.audit_ready_score.overall_score}</p>
                <p className="text-xs uppercase text-muted-foreground">{report.audit_ready_score.band}</p>
                <ul className="text-xs list-disc pl-4 mt-2 space-y-0.5">
                  {report.audit_ready_score.top_recommendations.map((r, i) => (
                    <li key={`${r.action}-${i}`}>{r.action} · +{r.estimated_lift}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">CARO Clause Coverage</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1">
                <p className="font-mono text-2xl">{report.caro_clause_coverage.coverage_percentage.toFixed(0)}%</p>
                <p className="text-muted-foreground">
                  {report.caro_clause_coverage.clauses_with_tagged_evidence} of {report.caro_clause_coverage.total_applicable_clauses} clauses tagged
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Findings</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1">
                <div className="flex justify-between"><span>Open</span><span className="font-mono">{report.findings_summary.open}</span></div>
                <div className="flex justify-between"><span>In progress</span><span className="font-mono">{report.findings_summary.in_progress}</span></div>
                <div className="flex justify-between"><span>Resolved</span><span className="font-mono">{report.findings_summary.resolved}</span></div>
                <div className="flex justify-between"><span>Waived</span><span className="font-mono">{report.findings_summary.waived}</span></div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Auditor signature block</CardTitle></CardHeader>
            <CardContent className="text-xs grid grid-cols-1 md:grid-cols-2 gap-1">
              <div>Firm: <span className="font-mono">{report.auditor_signature_block.ca_firm_name || '—'}</span></div>
              <div>Auditor: <span className="font-mono">{report.auditor_signature_block.auditor_name ?? '—'}</span></div>
              <div>ICAI: <span className="font-mono">{report.auditor_signature_block.icai_membership_no ?? '—'}</span></div>
              <div>Date: <span className="font-mono">{report.auditor_signature_block.date}</span></div>
              <div>Place: <span className="font-mono">{report.auditor_signature_block.place || '—'}</span></div>
              <div>Signed: <span className="font-mono">{report.auditor_signature_block.signed ? 'YES' : 'pending'}</span></div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
