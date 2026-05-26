/**
 * @file        src/pages/erp/accounting/capital-assets/FAPhysicalVerification.tsx
 * @purpose     QR-driven physical verification cycle · FAR-CAP-13 · LEAK-1 + LEAK-5 closed
 * @sprint      T-Phase-4.FAR-2 · Block 8 · Q-LOCK-9 A
 * @[JWT]       localStorage mock · parallel storage key fa_verification_log_${entityCode}
 */
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ScanLine, ShieldAlert, CheckCircle2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface VerificationEntry {
  asset_unit_id: string;
  last_verified_date: string;
  last_verified_by: string;
  last_verified_photo_url: string;
  last_verified_gps: string;
}

const verificationKey = (entityCode: string): string => `fa_verification_log_${entityCode}`;

const loadVerification = (entityCode: string): Record<string, VerificationEntry> => {
  try {
    const r = localStorage.getItem(verificationKey(entityCode));
    return r ? (JSON.parse(r) as Record<string, VerificationEntry>) : {};
  } catch { return {}; }
};

const saveVerification = (entityCode: string, log: Record<string, VerificationEntry>): void => {
  try { localStorage.setItem(verificationKey(entityCode), JSON.stringify(log)); } catch { /* ignore */ }
};

const loadFAUnits = (entityCode: string): AssetUnitRecord[] => {
  try {
    const r = localStorage.getItem(faUnitsKey(entityCode));
    return r ? (JSON.parse(r) as AssetUnitRecord[]) : [];
  } catch { return []; }
};

interface Props { entityCode?: string }

export function FAPhysicalVerificationPanel({ entityCode = DEFAULT_ENTITY_SHORTCODE }: Props): JSX.Element {
  const [units] = useState<AssetUnitRecord[]>(() =>
    loadFAUnits(entityCode).filter(u => u.entity_id === entityCode && u.status === 'active'),
  );
  const [log, setLog] = useState<Record<string, VerificationEntry>>(() => loadVerification(entityCode));
  const [tab, setTab] = useState('pending');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<AssetUnitRecord | null>(null);
  const [scanId, setScanId] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('Admin');
  const [photoRef, setPhotoRef] = useState('');

  const enriched = useMemo(() => units.map(u => {
    const v = log[u.id];
    const days = v ? Math.floor((Date.now() - new Date(v.last_verified_date).getTime()) / 86400000) : Infinity;
    return { unit: u, verification: v, daysSinceVerification: days };
  }), [units, log]);

  const ghostRisk = enriched.filter(e => e.daysSinceVerification > 90);
  const verified = enriched.filter(e => e.verification && e.daysSinceVerification <= 90);
  const pending = enriched.filter(e => !e.verification);

  const openVerify = (u: AssetUnitRecord): void => {
    setSelectedUnit(u);
    setScanId(u.asset_id);
    setPhotoRef('');
    setDialogOpen(true);
  };

  const performVerification = async (): Promise<void> => {
    if (!selectedUnit) return;
    let gps = '';
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        gps = `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
      } catch { gps = 'gps-unavailable'; }
    }
    const entry: VerificationEntry = {
      asset_unit_id: selectedUnit.id,
      last_verified_date: new Date().toISOString().slice(0, 10),
      last_verified_by: verifiedBy,
      last_verified_photo_url: photoRef || 'no-photo',
      last_verified_gps: gps,
    };
    const next = { ...log, [selectedUnit.id]: entry };
    setLog(next);
    saveVerification(entityCode, next);
    toast.success(`${selectedUnit.asset_id} verified`);
    setDialogOpen(false);
    setSelectedUnit(null);
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <ScanLine className="h-6 w-6 text-teal-500" />
        <div>
          <h2 className="text-xl font-bold">FA Physical Verification</h2>
          <p className="text-xs text-muted-foreground">
            QR-driven verification cycle with photo + GPS capture · Ghost-risk auto-flagged at 90+ days
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Verified (≤ 90 days)</p>
          <p className="text-2xl font-bold text-emerald-600">{verified.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pending Verification</p>
          <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Ghost Risk (90+ days)</p>
          <p className="text-2xl font-bold text-red-600">{ghostRisk.length}</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="ghost">Ghost Risk ({ghostRisk.length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({verified.length})</TabsTrigger>
        </TabsList>

        {(['pending', 'ghost', 'verified'] as const).map(t => {
          const rows = t === 'pending' ? pending : t === 'ghost' ? ghostRisk : verified;
          return (
            <TabsContent key={t} value={t}>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Asset ID</TableHead>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Location</TableHead>
                    <TableHead className="text-xs">Custodian</TableHead>
                    <TableHead className="text-xs">Days Since</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No assets pending verification
                      </TableCell></TableRow>
                    ) : rows.map(({ unit, daysSinceVerification }) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-mono text-xs">{unit.asset_id}</TableCell>
                        <TableCell className="text-xs">{unit.item_name}</TableCell>
                        <TableCell className="text-xs">{unit.location || '—'}</TableCell>
                        <TableCell className="text-xs">{unit.custodian_name}</TableCell>
                        <TableCell>
                          {daysSinceVerification === Infinity ? (
                            <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-500">Never</Badge>
                          ) : daysSinceVerification > 90 ? (
                            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">
                              <ShieldAlert className="h-3 w-3 mr-1" />{daysSinceVerification}d
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />{daysSinceVerification}d
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openVerify(unit)}>
                            <ScanLine className="h-3 w-3 mr-1" /> Verify
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verify Asset · {selectedUnit?.asset_id}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Scanned Asset ID (or manual entry)</Label>
              <Input value={scanId} onChange={e => setScanId(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label className="text-xs">Verified By</Label>
              <Input value={verifiedBy} onChange={e => setVerifiedBy(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Photo Reference (URL or filename)</Label>
              <Input value={photoRef} onChange={e => setPhotoRef(e.target.value)} placeholder="photo-2026-05-26.jpg" />
            </div>
            <p className="text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 inline" /> GPS coordinates captured automatically on confirm
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void performVerification()}>Confirm Verification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FAPhysicalVerification(): JSX.Element {
  return <FAPhysicalVerificationPanel />;
}
