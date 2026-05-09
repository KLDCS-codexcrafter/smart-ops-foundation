/**
 * @file src/pages/erp/qulicheak/WelderQualification.tsx
 * @purpose Welder Qualification module · 4 tabs (Welders/WPS/PQR/WPQ)
 * @sprint T-Phase-1.A.5.c-Qulicheak-Welder-Vendor-ISO-IQC
 * @decisions D-NEW-BN
 * @disciplines FR-50 · FR-51 · FR-30
 * @[JWT] writes via welder-engine
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  createWelder, listWelders, createWps, listWps, approveWps,
  createPqr, listPqr, createWpq, listWpq, recomputeWpqStatus,
} from '@/lib/welder-engine';
import {
  WELDING_STANDARD_LABELS, WELDING_PROCESS_LABELS, QUAL_STATUS_LABELS,
  type WeldingStandard, type WeldingProcess, type WeldingPosition,
  type WpsId, type WelderId,
} from '@/types/welder';

const PROCESS_OPTIONS: WeldingProcess[] = ['smaw', 'gmaw', 'gtaw', 'fcaw'];
const POSITION_OPTIONS: WeldingPosition[] = ['1G', '2G', '3G', '4G', '5G', '6G'];

interface ChipMultiProps<T extends string> {
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
  labelOf?: (v: T) => string;
}
function ChipMulti<T extends string>({ options, value, onChange, labelOf }: ChipMultiProps<T>): JSX.Element {
  const toggle = (opt: T): void => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <Badge
          key={o}
          variant={value.includes(o) ? 'default' : 'outline'}
          className="cursor-pointer text-xs"
          onClick={() => toggle(o)}
        >
          {labelOf ? labelOf(o) : o}
        </Badge>
      ))}
    </div>
  );
}

export function WelderQualification(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const user = useCurrentUser();
  const [tab, setTab] = useState<'welders' | 'wps' | 'pqr' | 'wpq'>('welders');
  const [refresh, setRefresh] = useState(0);
  const bump = (): void => setRefresh((n) => n + 1);

  // Welder form
  const [wForm, setWForm] = useState({ name: '', party: '', emp: '' });
  // WPS form
  const [wpsForm, setWpsForm] = useState({ no: '', standard: 'asme_ix' as WeldingStandard, base: '', filler: '' });
  const [wpsProcesses, setWpsProcesses] = useState<WeldingProcess[]>(['smaw']);
  const [wpsPositions, setWpsPositions] = useState<WeldingPosition[]>(['1G']);
  // PQR form
  const [pqrForm, setPqrForm] = useState({ no: '', wpsId: '', tensile: '' });
  // WPQ form
  const [wpqForm, setWpqForm] = useState({ no: '', welderId: '', wpsId: '', through: '', standard: 'asme_ix' as WeldingStandard });
  const [wpqProcesses, setWpqProcesses] = useState<WeldingProcess[]>(['smaw']);
  const [wpqPositions, setWpqPositions] = useState<WeldingPosition[]>(['1G']);

  const welders = listWelders(entityCode);
  const wpss = listWps(entityCode);
  const pqrs = listPqr(entityCode);
  const wpqs = listWpq(entityCode);

  // F-4 · auto-recompute WPQ status on tab open · ASME IX QW-322
  useEffect(() => {
    if (tab !== 'wpq') return;
    let any = false;
    for (const w of listWpq(entityCode)) {
      if (w.status !== 'qualified') continue;
      const before = w.status;
      const next = recomputeWpqStatus(entityCode, w.id);
      if (next && next.status !== before) any = true;
    }
    if (any) bump();
  }, [tab, entityCode]);

  const onAddWelder = useCallback((): void => {
    if (!user || !wForm.name.trim() || !wForm.party.trim()) {
      toast.error('Name and Party ID required');
      return;
    }
    createWelder(entityCode, user.id, {
      entity_id: entityId,
      party_id: wForm.party.trim(),
      full_name: wForm.name.trim(),
      employee_code: wForm.emp.trim() || null,
      joined_at: new Date().toISOString(),
      active: true,
    });
    setWForm({ name: '', party: '', emp: '' });
    toast.success('Welder added');
    bump();
  }, [user, wForm, entityCode, entityId]);

  const onAddWps = useCallback((): void => {
    if (!user || !wpsForm.no.trim()) { toast.error('WPS No required'); return; }
    if (wpsProcesses.length === 0 || wpsPositions.length === 0) {
      toast.error('Select ≥1 process and ≥1 position');
      return;
    }
    createWps(entityCode, user.id, {
      entity_id: entityId,
      wps_no: wpsForm.no.trim(),
      standard: wpsForm.standard,
      processes: wpsProcesses,
      positions: wpsPositions,
      base_metal_spec: wpsForm.base.trim() || 'A36',
      filler_metal_spec: wpsForm.filler.trim() || 'E7018',
      prepared_by: user.id,
      prepared_at: new Date().toISOString(),
    });
    setWpsForm({ no: '', standard: 'asme_ix', base: '', filler: '' });
    setWpsProcesses(['smaw']);
    setWpsPositions(['1G']);
    toast.success('WPS added');
    bump();
  }, [user, wpsForm, wpsProcesses, wpsPositions, entityCode, entityId]);

  const onApproveWps = useCallback((id: WpsId): void => {
    if (!user) return;
    const result = approveWps(entityCode, user.id, id);
    if (!result) { toast.error('WPS not found'); return; }
    toast.success(`WPS ${result.wps_no} approved`);
    bump();
  }, [user, entityCode]);

  const onAddPqr = useCallback((): void => {
    if (!user || !pqrForm.no.trim() || !pqrForm.wpsId) {
      toast.error('PQR No + WPS link required');
      return;
    }
    const created = createPqr(entityCode, user.id, {
      entity_id: entityId,
      pqr_no: pqrForm.no.trim(),
      related_wps_id: pqrForm.wpsId as WpsId,
      test_date: new Date().toISOString(),
      tensile_strength_mpa: Number(pqrForm.tensile) || 0,
      bend_test_result: 'pass',
      certified_by: user.id,
    });
    if (!created) { toast.error('Linked WPS not found'); return; }
    setPqrForm({ no: '', wpsId: '', tensile: '' });
    toast.success('PQR added');
    bump();
  }, [user, pqrForm, entityCode, entityId]);

  const onAddWpq = useCallback((): void => {
    if (!user || !wpqForm.no.trim() || !wpqForm.welderId || !wpqForm.wpsId || !wpqForm.through) {
      toast.error('All WPQ fields required');
      return;
    }
    if (wpqProcesses.length === 0 || wpqPositions.length === 0) {
      toast.error('Select ≥1 process and ≥1 position');
      return;
    }
    const created = createWpq(entityCode, user.id, {
      entity_id: entityId,
      wpq_no: wpqForm.no.trim(),
      related_welder_id: wpqForm.welderId as WelderId,
      related_wps_id: wpqForm.wpsId as WpsId,
      standard: wpqForm.standard,
      processes: wpqProcesses,
      positions: wpqPositions,
      qualified_at: new Date().toISOString(),
      qualified_through: new Date(wpqForm.through).toISOString(),
      qualified_by: user.id,
      status: 'qualified',
    });
    if (!created) { toast.error('Welder or WPS not found'); return; }
    setWpqForm({ no: '', welderId: '', wpsId: '', through: '', standard: 'asme_ix' });
    setWpqProcesses(['smaw']);
    setWpqPositions(['1G']);
    toast.success('WPQ added');
    bump();
  }, [user, wpqForm, wpqProcesses, wpqPositions, entityCode, entityId]);

  return (
    <div key={refresh} className="p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welder Qualification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ASME IX + AWS D1.1 · Welder → WPS → PQR → WPQ chain · Entity {entityCode}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="welders">Welders ({welders.length})</TabsTrigger>
          <TabsTrigger value="wps">WPS ({wpss.length})</TabsTrigger>
          <TabsTrigger value="pqr">PQR ({pqrs.length})</TabsTrigger>
          <TabsTrigger value="wpq">WPQ ({wpqs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="welders">
          <Card>
            <CardHeader><CardTitle className="text-base">Add Welder</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div><Label>Full Name</Label><Input value={wForm.name} onChange={(e) => setWForm({ ...wForm, name: e.target.value })} /></div>
              <div><Label>Party ID</Label><Input value={wForm.party} onChange={(e) => setWForm({ ...wForm, party: e.target.value })} /></div>
              <div><Label>Employee Code</Label><Input value={wForm.emp} onChange={(e) => setWForm({ ...wForm, emp: e.target.value })} /></div>
              <div className="flex items-end"><Button onClick={onAddWelder}>Add</Button></div>
            </CardContent>
          </Card>
          <div className="mt-4 border rounded-lg divide-y">
            {welders.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No welders yet.</div>
            ) : welders.map((w) => (
              <div key={w.id} className="p-3 grid grid-cols-4 text-sm">
                <span className="font-mono">{w.id}</span>
                <span>{w.full_name}</span>
                <span>{w.party_id}</span>
                <span>{w.active ? 'Active' : 'Inactive'}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="wps">
          <Card>
            <CardHeader><CardTitle className="text-base">Add WPS</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div><Label>WPS No</Label><Input value={wpsForm.no} onChange={(e) => setWpsForm({ ...wpsForm, no: e.target.value })} /></div>
              <div>
                <Label>Standard</Label>
                <select className="w-full border rounded h-9 px-2 bg-background"
                  value={wpsForm.standard}
                  onChange={(e) => setWpsForm({ ...wpsForm, standard: e.target.value as WeldingStandard })}>
                  <option value="asme_ix">ASME IX</option>
                  <option value="aws_d1_1">AWS D1.1</option>
                </select>
              </div>
              <div><Label>Base Metal</Label><Input value={wpsForm.base} onChange={(e) => setWpsForm({ ...wpsForm, base: e.target.value })} /></div>
              <div><Label>Filler Metal</Label><Input value={wpsForm.filler} onChange={(e) => setWpsForm({ ...wpsForm, filler: e.target.value })} /></div>
              <div className="flex items-end"><Button onClick={onAddWps}>Add</Button></div>
              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs">Processes</Label>
                <ChipMulti<WeldingProcess>
                  options={PROCESS_OPTIONS} value={wpsProcesses}
                  onChange={setWpsProcesses}
                  labelOf={(p) => WELDING_PROCESS_LABELS[p]}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">Positions</Label>
                <ChipMulti<WeldingPosition>
                  options={POSITION_OPTIONS} value={wpsPositions}
                  onChange={setWpsPositions}
                />
              </div>
            </CardContent>
          </Card>
          <div className="mt-4 border rounded-lg divide-y">
            {wpss.map((w) => (
              <div key={w.id} className="p-3 grid grid-cols-5 text-sm items-center">
                <span className="font-mono">{w.id}</span>
                <span>{w.wps_no}</span>
                <Badge variant="outline">{WELDING_STANDARD_LABELS[w.standard]}</Badge>
                <span>{w.approved_at ? <Badge>Approved</Badge> : <Badge variant="outline">Draft</Badge>}</span>
                <span className="text-right">
                  {!w.approved_at && (
                    <Button size="sm" variant="outline" onClick={() => onApproveWps(w.id)}>Approve</Button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pqr">
          <Card>
            <CardHeader><CardTitle className="text-base">Add PQR</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div><Label>PQR No</Label><Input value={pqrForm.no} onChange={(e) => setPqrForm({ ...pqrForm, no: e.target.value })} /></div>
              <div>
                <Label>Linked WPS</Label>
                <select className="w-full border rounded h-9 px-2 bg-background"
                  value={pqrForm.wpsId}
                  onChange={(e) => setPqrForm({ ...pqrForm, wpsId: e.target.value })}>
                  <option value="">— select —</option>
                  {wpss.map((w) => <option key={w.id} value={w.id}>{w.wps_no}</option>)}
                </select>
              </div>
              <div><Label>Tensile (MPa)</Label><Input className="font-mono" value={pqrForm.tensile} onChange={(e) => setPqrForm({ ...pqrForm, tensile: e.target.value })} /></div>
              <div className="flex items-end"><Button onClick={onAddPqr}>Add</Button></div>
            </CardContent>
          </Card>
          <div className="mt-4 border rounded-lg divide-y">
            {pqrs.map((p) => (
              <div key={p.id} className="p-3 grid grid-cols-4 text-sm">
                <span className="font-mono">{p.id}</span>
                <span>{p.pqr_no}</span>
                <span className="font-mono">{p.tensile_strength_mpa} MPa</span>
                <span>Bend: {p.bend_test_result}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="wpq">
          <Card>
            <CardHeader><CardTitle className="text-base">Add WPQ</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div><Label>WPQ No</Label><Input value={wpqForm.no} onChange={(e) => setWpqForm({ ...wpqForm, no: e.target.value })} /></div>
              <div>
                <Label>Welder</Label>
                <select className="w-full border rounded h-9 px-2 bg-background"
                  value={wpqForm.welderId}
                  onChange={(e) => setWpqForm({ ...wpqForm, welderId: e.target.value })}>
                  <option value="">— select —</option>
                  {welders.map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                </select>
              </div>
              <div>
                <Label>WPS</Label>
                <select className="w-full border rounded h-9 px-2 bg-background"
                  value={wpqForm.wpsId}
                  onChange={(e) => setWpqForm({ ...wpqForm, wpsId: e.target.value })}>
                  <option value="">— select —</option>
                  {wpss.map((w) => <option key={w.id} value={w.id}>{w.wps_no}</option>)}
                </select>
              </div>
              <div>
                <Label>Standard</Label>
                <select className="w-full border rounded h-9 px-2 bg-background"
                  value={wpqForm.standard}
                  onChange={(e) => setWpqForm({ ...wpqForm, standard: e.target.value as WeldingStandard })}>
                  <option value="asme_ix">ASME IX</option>
                  <option value="aws_d1_1">AWS D1.1</option>
                </select>
              </div>
              <div><Label>Qualified Through</Label><Input type="date" value={wpqForm.through} onChange={(e) => setWpqForm({ ...wpqForm, through: e.target.value })} /></div>
              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs">Processes</Label>
                <ChipMulti<WeldingProcess>
                  options={PROCESS_OPTIONS} value={wpqProcesses}
                  onChange={setWpqProcesses}
                  labelOf={(p) => WELDING_PROCESS_LABELS[p]}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">Positions</Label>
                <ChipMulti<WeldingPosition>
                  options={POSITION_OPTIONS} value={wpqPositions}
                  onChange={setWpqPositions}
                />
              </div>
              <div className="flex items-end"><Button onClick={onAddWpq}>Add</Button></div>
            </CardContent>
          </Card>
          <div className="mt-4 border rounded-lg divide-y">
            {wpqs.map((w) => (
              <div key={w.id} className="p-3 grid grid-cols-5 text-sm">
                <span className="font-mono">{w.id}</span>
                <span>{w.wpq_no}</span>
                <Badge variant="outline">{WELDING_STANDARD_LABELS[w.standard]}</Badge>
                <span className="font-mono">{w.qualified_through.slice(0, 10)}</span>
                <Badge>{QUAL_STATUS_LABELS[w.status]}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground italic">
        Process: {Object.values(WELDING_PROCESS_LABELS).join(' · ')} · positions 1G–6G · per ASME IX QW-322 expiry tracking
      </p>
    </div>
  );
}
