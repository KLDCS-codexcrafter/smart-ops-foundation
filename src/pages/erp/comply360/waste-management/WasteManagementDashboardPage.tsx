/**
 * @file        src/pages/erp/comply360/waste-management/WasteManagementDashboardPage.tsx
 * @purpose     Waste Management dashboard · 6-tab · 17th First-Class Standalone Page
 * @sprint      Sprint 91 · T-Phase-5.F.5.3 · Q35
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  listHazardousForm1, listHazardousForm4, listHazardousForm10,
  listEWasteForm1, listEWasteForm6EPR, listEWasteForm1A,
  listPlasticForm1, listPlasticAnnualReturns,
  listBatteryForm1, listBatteryForm5,
  listBioMedicalForm2, listBioMedicalForm4,
  listEPRConsolidated,
  getWasteManagementComplianceSummary,
} from '@/lib/comply360-waste-management-engine';

type TabKey = 'hazardous' | 'e-waste' | 'plastic' | 'battery' | 'bio-medical' | 'epr';

export default function WasteManagementDashboardPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('hazardous');
  const fy = 'FY25-26';
  const summary = useMemo(() => getWasteManagementComplianceSummary(fy), []);
  const hw1 = useMemo(() => listHazardousForm1(), []);
  const hw4 = useMemo(() => listHazardousForm4({ fy }), []);
  const hw10 = useMemo(() => listHazardousForm10(), []);
  const ew1 = useMemo(() => listEWasteForm1(), []);
  const ew6 = useMemo(() => listEWasteForm6EPR({ fy }), []);
  const ew1a = useMemo(() => listEWasteForm1A({ fy }), []);
  const pw1 = useMemo(() => listPlasticForm1(), []);
  const pwar = useMemo(() => listPlasticAnnualReturns({ fy }), []);
  const bw1 = useMemo(() => listBatteryForm1(), []);
  const bw5 = useMemo(() => listBatteryForm5({ fy }), []);
  const bmw2 = useMemo(() => listBioMedicalForm2(), []);
  const bmw4 = useMemo(() => listBioMedicalForm4({ fy }), []);
  const epr = useMemo(() => listEPRConsolidated({ fy }), []);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Waste Management Compliance</h1>
        <p className="text-sm text-muted-foreground">
          Hazardous · E-Waste · Plastic · Battery · Bio-Medical · EPR
        </p>
      </header>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">
            {summary.hazardous_active_auth_count + summary.ewaste_active_auth_count +
             summary.plastic_active_reg_count + summary.battery_active_reg_count +
             summary.biomedical_active_auth_count}
          </div>
          <div className="text-xs text-muted-foreground">Active Authorisations</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-warning">{summary.expiring_auths_next_90_days}</div>
          <div className="text-xs text-muted-foreground">Expiring (90d)</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-success">{summary.annual_returns_filed_current_fy}</div>
          <div className="text-xs text-muted-foreground">Annual Returns Filed</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-destructive">{summary.epr_shortfall_count}</div>
          <div className="text-xs text-muted-foreground">EPR Shortfalls</div>
        </Card>
      </div>

      <div className="text-sm">
        Overall status:{' '}
        <Badge variant={summary.overall_status === 'compliant' ? 'default' : 'destructive'}>
          {summary.overall_status}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="hazardous">Hazardous</TabsTrigger>
          <TabsTrigger value="e-waste">E-Waste</TabsTrigger>
          <TabsTrigger value="plastic">Plastic</TabsTrigger>
          <TabsTrigger value="battery">Battery</TabsTrigger>
          <TabsTrigger value="bio-medical">Bio-Medical</TabsTrigger>
          <TabsTrigger value="epr">EPR</TabsTrigger>
        </TabsList>

        <TabsContent value="hazardous">
          <Card className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Hazardous Waste Rules 2016</h2>
            <Section title="Form 1 · Authorisation" empty={hw1.length === 0}>
              {hw1.map((r) => (
                <Row key={r.id} label={`${r.authorisation_number} · ${r.schedules.join(',')}`} badge={r.status} />
              ))}
            </Section>
            <Section title="Form 4 · Annual Return" empty={hw4.length === 0}>
              {hw4.map((r) => (
                <Row key={r.id} label={`${r.fy} · gen ${r.generated_mt} MT`} badge={r.filing_status} />
              ))}
            </Section>
            <Section title="Form 10 · Manifest" empty={hw10.length === 0}>
              {hw10.map((r) => (
                <Row key={r.id} label={`${r.manifest_number} · ${r.waste_category} · ${r.quantity_mt} MT`} badge={r.date} />
              ))}
            </Section>
          </Card>
        </TabsContent>

        <TabsContent value="e-waste">
          <Card className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">E-Waste Rules 2022</h2>
            <Section title="Form 1 · Authorisation" empty={ew1.length === 0}>
              {ew1.map((r) => (
                <Row key={r.id} label={`${r.authorisation_number} · ${r.product_categories.join(',')}`} badge={r.status} />
              ))}
            </Section>
            <Section title="Form 6 · EPR Plan" empty={ew6.length === 0}>
              {ew6.map((r) => (
                <Row key={r.id} label={`${r.fy} · ${r.producer_id} · ${r.achieved_collection_mt}/${r.target_collection_mt} MT`} badge={r.filing_status} />
              ))}
            </Section>
            <Section title="Form 1A · Annual Return" empty={ew1a.length === 0}>
              {ew1a.map((r) => (
                <Row key={r.id} label={`${r.fy} · placed ${r.placed_market_mt} · recycled ${r.recycled_mt} MT`} badge={r.filing_status} />
              ))}
            </Section>
          </Card>
        </TabsContent>

        <TabsContent value="plastic">
          <Card className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Plastic Waste Rules 2022</h2>
            <Section title="Form I · Registration" empty={pw1.length === 0}>
              {pw1.map((r) => (
                <Row key={r.id} label={`${r.registration_number} · ${r.entity_role}`} badge={r.status} />
              ))}
            </Section>
            <Section title="Annual Return" empty={pwar.length === 0}>
              {pwar.map((r) => (
                <Row key={r.id} label={`${r.fy} · ${r.entity_role} · EPR ${r.epr_achieved_mt}/${r.epr_target_mt} MT`} badge={r.filing_status} />
              ))}
            </Section>
          </Card>
        </TabsContent>

        <TabsContent value="battery">
          <Card className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Battery Waste Rules 2022</h2>
            <Section title="Form 1 · Registration" empty={bw1.length === 0}>
              {bw1.map((r) => (
                <Row key={r.id} label={`${r.registration_number} · ${r.chemistry}`} badge={r.status} />
              ))}
            </Section>
            <Section title="Form 5 · Annual Return" empty={bw5.length === 0}>
              {bw5.map((r) => (
                <Row key={r.id} label={`${r.fy} · EPR ${r.epr_achieved_pct}/${r.epr_target_pct}%`} badge={r.filing_status} />
              ))}
            </Section>
          </Card>
        </TabsContent>

        <TabsContent value="bio-medical">
          <Card className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Bio-Medical Waste Rules</h2>
            <Section title="Form II · Authorisation" empty={bmw2.length === 0}>
              {bmw2.map((r) => (
                <Row key={r.id} label={`${r.authorisation_number} · ${r.facility_type} · ${r.beds_count} beds`} badge={r.status} />
              ))}
            </Section>
            <Section title="Form IV · Annual Report" empty={bmw4.length === 0}>
              {bmw4.map((r) => (
                <Row key={r.id} label={`${r.fy} · Y${r.yellow_kg} R${r.red_kg} W${r.white_kg} B${r.blue_kg} kg`} badge={r.filing_status} />
              ))}
            </Section>
          </Card>
        </TabsContent>

        <TabsContent value="epr">
          <Card className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">EPR Consolidated Tracker</h2>
            {epr.length === 0 ? (
              <p className="text-sm text-muted-foreground">No EPR entries recorded.</p>
            ) : (
              <ul className="space-y-2">
                {epr.map((r) => (
                  <li key={r.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span>{r.regime} · {r.fy} · {r.producer_id} · shortfall {r.shortfall_mt} MT</span>
                    <Badge variant={r.status === 'achieved' ? 'default' : 'destructive'}>{r.status}</Badge>
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

function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      {empty ? (
        <p className="text-xs text-muted-foreground">No records.</p>
      ) : (
        <ul className="space-y-1">{children}</ul>
      )}
    </div>
  );
}

function Row({ label, badge }: { label: string; badge: string }): JSX.Element {
  return (
    <li className="text-sm border rounded-lg p-2 flex justify-between">
      <span className="font-mono">{label}</span>
      <Badge>{badge}</Badge>
    </li>
  );
}
