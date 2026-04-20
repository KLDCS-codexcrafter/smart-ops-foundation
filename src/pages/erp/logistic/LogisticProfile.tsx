/**
 * LogisticProfile.tsx — Transporter profile + rate card view (2 tabs).
 * Sprint 15c-2. Gold accent. Tab 1 = profile + change password.
 * Tab 2 = read-only view of the active TransporterRateCard for transparency.
 * [JWT] PUT /api/logistic/profile · PUT /api/logistic/password
 */
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LogisticLayout } from '@/features/logistic/LogisticLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ShieldCheck, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  getLogisticSession, updateLogisticPassword, loadLogistics, type LogisticMasterLite,
} from '@/lib/logistic-auth-engine';
import {
  transporterRateCardsKey, type TransporterRateCard,
} from '@/types/transporter-rate';

export default function LogisticProfile() {
  const session = getLogisticSession();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'rate-card' ? 'rate-card' : 'profile');
  const [pwOpen, setPwOpen] = useState(params.get('tab') === 'security');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [me, setMe] = useState<LogisticMasterLite | null>(null);
  const [card, setCard] = useState<TransporterRateCard | null>(null);

  useEffect(() => {
    if (!session) return;
    const list = loadLogistics(session.entity_code);
    const found = list.find(l => l.id === session.logistic_id) ?? null;
    setMe(found);
    try {
      const cards: TransporterRateCard[] = JSON.parse(
        localStorage.getItem(transporterRateCardsKey(session.entity_code)) ?? '[]',
      );
      const today = new Date();
      const active = cards.find(c =>
        c.logistic_id === session.logistic_id &&
        new Date(c.effective_from).getTime() <= today.getTime() &&
        (c.effective_to === null || new Date(c.effective_to).getTime() >= today.getTime()),
      ) ?? null;
      setCard(active);
    } catch { /* ignore */ }
  }, [session]);

  const submitPw = () => {
    if (!session) return;
    if (me?.password_hash && me.password_hash !== btoa(currentPw)) {
      return toast.error('Current password is incorrect');
    }
    if (newPw !== confirmPw) return toast.error('Passwords do not match');
    const r = updateLogisticPassword(session.logistic_id, newPw, session.entity_code);
    if (!r.ok) return toast.error(r.error ?? 'Failed');
    toast.success('Password updated. Please sign in again next time.');
    setPwOpen(false); setCurrentPw(''); setNewPw(''); setConfirmPw('');
    // Clear ?tab=security from URL
    const next = new URLSearchParams(params);
    next.delete('tab');
    setParams(next, { replace: true });
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const surfaceRates = useMemo(() => card?.zone_rates.filter(r => r.mode === 'surface') ?? [], [card]);

  if (!session) return <LogisticLayout><div /></LogisticLayout>;

  return (
    <LogisticLayout title="Profile & Rate Card" subtitle={session.party_name}>
      {session.must_change_password && (
        <div className="border rounded-lg p-3 mb-4 flex items-start gap-2"
          style={{ background: 'hsl(48 96% 53% / 0.1)', borderColor: 'hsl(48 96% 53% / 0.4)' }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'hsl(38 92% 45%)' }} />
          <p className="text-xs">You must change your temporary password to continue.</p>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="rate-card">Rate Card</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label className="text-xs">Party Code</Label><Input value={me?.partyCode ?? ''} disabled className="font-mono text-xs" /></div>
                <div><Label className="text-xs">Party Name</Label><Input value={me?.partyName ?? ''} disabled className="text-xs" /></div>
                <div><Label className="text-xs">Logistic Type</Label><Input value={me?.logisticType ?? ''} disabled className="text-xs" /></div>
                <div><Label className="text-xs">GSTIN</Label><Input value={me?.gstin ?? ''} disabled className="font-mono text-xs" /></div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Security
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {me?.password_updated_at ? `Password updated ${new Date(me.password_updated_at).toLocaleDateString('en-IN')}` : 'Set a new password'}
                    </p>
                  </div>
                  <Button onClick={() => setPwOpen(true)}
                    style={{ background: 'hsl(48 96% 53%)', color: 'hsl(222 47% 11%)' }}>
                    Change Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-card" className="mt-4">
          {!card ? (
            <Card><CardContent className="p-12 text-center">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Rate card not yet set up</p>
              <p className="text-xs text-muted-foreground mt-1">Contact the manufacturer admin to configure your rate card.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              <Card><CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{card.label}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Effective {card.effective_from} → {card.effective_to ?? 'active'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => toast.info('PDF export coming in 15c-3')}>
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </Button>
                </div>
              </CardContent></Card>

              <Card><CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Zones &amp; States</h3>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Zone</TableHead>
                    <TableHead className="text-xs">States</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {card.zone_definitions.map(z => (
                      <TableRow key={z.zone}>
                        <TableCell className="text-xs font-semibold">{z.label}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{z.states.join(', ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>

              <Card><CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Surface Rates (₹/kg)</h3>
                {surfaceRates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No surface rates defined.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Zone</TableHead>
                      <TableHead className="text-xs text-right">Rate / kg</TableHead>
                      <TableHead className="text-xs">Transit</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {surfaceRates.map(r => (
                        <TableRow key={`${r.zone}-${r.mode}`}>
                          <TableCell className="text-xs">{r.zone}</TableCell>
                          <TableCell className="text-xs font-mono text-right">{fmt(r.rate_per_kg)}</TableCell>
                          <TableCell className="text-xs">{r.transit_days_min}–{r.transit_days_max} days</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent></Card>

              <Card><CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Surcharges</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div><p className="text-muted-foreground">Statistical</p><p className="font-mono">{fmt(card.surcharges.statistical_flat)}</p></div>
                  <div><p className="text-muted-foreground">Fuel %</p><p className="font-mono">{card.surcharges.fuel_pct_of_basic}%</p></div>
                  <div><p className="text-muted-foreground">FOV %</p><p className="font-mono">{card.surcharges.fov_pct_of_invoice}%</p></div>
                  <div><p className="text-muted-foreground">COD</p><p className="font-mono">{fmt(card.surcharges.cod_flat_if_applicable)}</p></div>
                  <div><p className="text-muted-foreground">Demurrage free days</p><p className="font-mono">{card.surcharges.demurrage_free_days}</p></div>
                  <div><p className="text-muted-foreground">Demurrage / kg / day</p><p className="font-mono">{fmt(card.surcharges.demurrage_per_kg_per_day)}</p></div>
                </div>
              </CardContent></Card>

              <Card><CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Minimum Chargeable Weight (kg)</h3>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div><p className="text-muted-foreground">Surface</p><p className="font-mono">{card.minimum_chargeable.surface}</p></div>
                  <div><p className="text-muted-foreground">Train</p><p className="font-mono">{card.minimum_chargeable.train}</p></div>
                  <div><p className="text-muted-foreground">Air</p><p className="font-mono">{card.minimum_chargeable.air}</p></div>
                </div>
              </CardContent></Card>

              <Card><CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Fuel Escalation</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div><p className="text-muted-foreground">Base fuel price</p><p className="font-mono">{fmt(card.fuel_escalation.base_fuel_price)}</p></div>
                  <div><p className="text-muted-foreground">Current fuel price</p><p className="font-mono">{fmt(card.fuel_escalation.current_fuel_price)}</p></div>
                  <div><p className="text-muted-foreground">Ratio</p><p className="font-mono">{card.fuel_escalation.ratio_numerator} : {card.fuel_escalation.ratio_denominator}</p></div>
                </div>
              </CardContent></Card>

              <Card><CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">ODA Grid</h3>
                {card.oda_grid.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No ODA charges defined.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Weight (kg)</TableHead>
                      <TableHead className="text-xs text-right">20–50 km</TableHead>
                      <TableHead className="text-xs text-right">51–100 km</TableHead>
                      <TableHead className="text-xs text-right">101–150 km</TableHead>
                      <TableHead className="text-xs text-right">&gt;150 km</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {card.oda_grid.map((o, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{o.min_weight_kg}–{o.max_weight_kg}</TableCell>
                          <TableCell className="text-xs font-mono text-right">{fmt(o.distance_20_50_km)}</TableCell>
                          <TableCell className="text-xs font-mono text-right">{fmt(o.distance_51_100_km)}</TableCell>
                          <TableCell className="text-xs font-mono text-right">{fmt(o.distance_101_150_km)}</TableCell>
                          <TableCell className="text-xs font-mono text-right">{fmt(o.distance_gt_150_km)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent></Card>

              <Card><CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Contract</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div><p className="text-muted-foreground">Contract start</p><p className="font-mono">{card.contract_start || '—'}</p></div>
                  <div><p className="text-muted-foreground">Contract end</p><p className="font-mono">{card.contract_end || '—'}</p></div>
                  <div><p className="text-muted-foreground">Annual hike</p><Badge variant="outline">{card.annual_hike_pct}%</Badge></div>
                </div>
              </CardContent></Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Current password</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">New password (min 8 chars)</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Confirm new password</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button onClick={submitPw} style={{ background: 'hsl(48 96% 53%)', color: 'hsl(222 47% 11%)' }}>
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LogisticLayout>
  );
}
