/**
 * @file        src/pages/erp/comply360/quality-standards/QualityStandardsDashboardPage.tsx
 * @purpose     Quality Standards dashboard · 5-tab · 20th First-Class Standalone Page
 * @sprint      Sprint 93 · T-Phase-5.F.5.5 · Floor 5.5 · Q37
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  listScheduleHRecords, listFSSAILicenses, listBISCerts, listISOCerts,
  listNABLScopes, listRecalls, getQualityComplianceSummary,
} from '@/lib/comply360-quality-standards-engine';

type TabKey = 'schedule-h' | 'fssai' | 'bis-iso' | 'nabl-lm' | 'recalls';

export default function QualityStandardsDashboardPage(): JSX.Element {
  const [tab, setTab] = useState<TabKey>('schedule-h');
  const summary = useMemo(() => getQualityComplianceSummary(), []);
  const schH = useMemo(() => listScheduleHRecords(), []);
  const fssai = useMemo(() => listFSSAILicenses(), []);
  const bis = useMemo(() => listBISCerts(), []);
  const iso = useMemo(() => listISOCerts(), []);
  const nabl = useMemo(() => listNABLScopes(), []);
  const recalls = useMemo(() => listRecalls(), []);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Quality & Standards · Q37</h1>
        <p className="text-sm text-muted-foreground">
          Schedule H/H1 · FSSAI · BIS ISI/Hallmark · ISO 9001/14001/27001/45001 · NABL · Legal Metrology
        </p>
      </header>

      <div className="grid grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{summary.fssai_active}</div>
          <div className="text-xs text-muted-foreground">FSSAI Active</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-warning">{summary.fssai_expired}</div>
          <div className="text-xs text-muted-foreground">FSSAI Expired</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{summary.bis_certs}</div>
          <div className="text-xs text-muted-foreground">BIS Certs</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{summary.iso_certs}</div>
          <div className="text-xs text-muted-foreground">ISO Certs</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-destructive">{summary.open_recalls}</div>
          <div className="text-xs text-muted-foreground">Open Recalls</div>
        </Card>
      </div>

      <div className="text-sm">
        Overall status:{' '}
        <Badge variant={summary.overall_status === 'compliant' ? 'default' : 'destructive'}>
          {summary.overall_status}
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="schedule-h">Schedule H/H1</TabsTrigger>
          <TabsTrigger value="fssai">FSSAI</TabsTrigger>
          <TabsTrigger value="bis-iso">BIS / ISO</TabsTrigger>
          <TabsTrigger value="nabl-lm">NABL / LM</TabsTrigger>
          <TabsTrigger value="recalls">Recalls / Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule-h">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Schedule H / H1 Drug Records</h2>
            {schH.length === 0 ? (
              <p className="text-xs text-muted-foreground">No records.</p>
            ) : (
              <ul className="space-y-1">
                {schH.map((r) => (
                  <li key={r.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{r.drug_name} · {r.batch_no} · {r.patient_name}</span>
                    <Badge>Sch {r.schedule_class}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="fssai">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">FSSAI Food Licenses</h2>
            {fssai.length === 0 ? (
              <p className="text-xs text-muted-foreground">No licenses.</p>
            ) : (
              <ul className="space-y-1">
                {fssai.map((l) => (
                  <li key={l.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{l.license_no} · {l.tier} · {l.fbo_name}</span>
                    <Badge variant={l.status === 'active' ? 'default' : 'destructive'}>{l.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="bis-iso">
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">BIS Certificates</h2>
              {bis.length === 0 ? (
                <p className="text-xs text-muted-foreground">No BIS certs.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {bis.map((c) => (
                    <li key={c.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">{c.is_standard} · {c.product}</span>
                      <Badge>{c.kind}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">ISO Management Systems</h2>
              {iso.length === 0 ? (
                <p className="text-xs text-muted-foreground">No ISO certs.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {iso.map((c) => (
                    <li key={c.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">ISO {c.standard} · {c.cert_no}</span>
                      <Badge>{c.certifying_body}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="nabl-lm">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">NABL Accreditation Scope</h2>
            {nabl.length === 0 ? (
              <p className="text-xs text-muted-foreground">No NABL scopes.</p>
            ) : (
              <ul className="space-y-1">
                {nabl.map((n) => (
                  <li key={n.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{n.cert_no} · {n.discipline}</span>
                    <Badge>{n.parameters.length} params</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="recalls">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Product Recalls</h2>
            {recalls.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recalls.</p>
            ) : (
              <ul className="space-y-1">
                {recalls.map((r) => (
                  <li key={r.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{r.product} · {r.batch_no}</span>
                    <Badge variant={r.status === 'closed' ? 'default' : 'destructive'}>
                      {r.severity} · {r.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
