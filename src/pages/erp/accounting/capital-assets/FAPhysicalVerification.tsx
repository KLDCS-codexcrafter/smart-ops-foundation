/**
 * FAPhysicalVerification.tsx — Sprint 66 FAR-2 · Block 8 · FAR-CAP-13
 * QR-driven physical verification cycle for AssetUnitRecords.
 * Captures last_verified_date + photo + GPS into parallel entity-scoped log
 * (does NOT mutate AssetUnitRecord · FR-19 SIBLING-untouched).
 * [JWT] Replace with GET/POST /api/fa/physical-verification
 */
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, ScanLine, Camera, MapPin, AlertTriangle } from 'lucide-react';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';

interface VerificationLogEntry {
  asset_unit_id: string;
  last_verified_date: string;
  last_verified_by: string;
  last_verified_photo_url?: string;
  gps_lat?: number;
  gps_lng?: number;
}

const verificationLogKey = (entityCode: string): string =>
  `fa_verification_log_${entityCode}`;

const ls = <T,>(k: string): T[] => {
  try {
    // [JWT] GET /api/fa/physical-verification?entityCode=...
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
};
const ss = <T,>(k: string, d: T[]): void => {
  // [JWT] POST /api/fa/physical-verification
  try { localStorage.setItem(k, JSON.stringify(d)); } catch { /* ignore quota */ }
};

const daysBetween = (iso: string): number => {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
};

interface Props { entityCode: string; }

export function FAPhysicalVerificationPanel({ entityCode }: Props) {
  const [units, setUnits] = useState<AssetUnitRecord[]>([]);
  const [log, setLog] = useState<VerificationLogEntry[]>([]);
  const [query, setQuery] = useState('');
  const [showGhostOnly, setShowGhostOnly] = useState(false);

  useEffect(() => {
    setUnits(ls<AssetUnitRecord>(faUnitsKey(entityCode))
      .filter(u => u.entity_id === entityCode && u.status === 'active'));
    setLog(ls<VerificationLogEntry>(verificationLogKey(entityCode)));
  }, [entityCode]);

  const verifiedMap = useMemo(() => {
    const m = new Map<string, VerificationLogEntry>();
    log.forEach(e => m.set(e.asset_unit_id, e));
    return m;
  }, [log]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return units
      .filter(u => !q || u.asset_id.toLowerCase().includes(q) || u.item_name.toLowerCase().includes(q))
      .filter(u => {
        if (!showGhostOnly) return true;
        const e = verifiedMap.get(u.id);
        return daysBetween(e?.last_verified_date ?? '') > 90;
      })
      .sort((a, b) => {
        const da = daysBetween(verifiedMap.get(a.id)?.last_verified_date ?? '');
        const db = daysBetween(verifiedMap.get(b.id)?.last_verified_date ?? '');
        return db - da;
      });
  }, [units, query, showGhostOnly, verifiedMap]);

  const handleVerify = (assetUnitId: string): void => {
    let gps_lat: number | undefined;
    let gps_lng: number | undefined;
    const persist = (): void => {
      const entry: VerificationLogEntry = {
        asset_unit_id: assetUnitId,
        last_verified_date: new Date().toISOString(),
        last_verified_by: 'Current User',
        last_verified_photo_url: '/mock/verification-photo.jpg',
        gps_lat, gps_lng,
      };
      const next = log.filter(e => e.asset_unit_id !== assetUnitId).concat(entry);
      ss(verificationLogKey(entityCode), next);
      setLog(next);
      toast.success('Verification recorded');
    };
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { gps_lat = pos.coords.latitude; gps_lng = pos.coords.longitude; persist(); },
        () => persist(),
        { timeout: 3000 },
      );
    } else {
      persist();
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ScanLine className="h-5 w-5" /> FA Physical Verification
          </h2>
          <p className="text-sm text-muted-foreground">
            QR-scan + photo + GPS verification cycle · 90-day ghost-asset flag.
          </p>
        </div>
        <Button
          variant={showGhostOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowGhostOnly(v => !v)}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          {showGhostOnly ? 'Showing Ghost Risk' : 'All Assets'}
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search asset ID or name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset ID</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Custodian</TableHead>
            <TableHead>Last Verified</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No assets pending verification
              </TableCell>
            </TableRow>
          ) : rows.map(u => {
            const e = verifiedMap.get(u.id);
            const days = daysBetween(e?.last_verified_date ?? '');
            const ghost = days > 90;
            return (
              <TableRow key={u.id}>
                <TableCell className="font-mono">{u.asset_id}</TableCell>
                <TableCell>{u.item_name}</TableCell>
                <TableCell>{u.location}</TableCell>
                <TableCell>{u.custodian_name || '—'}</TableCell>
                <TableCell>
                  {e?.last_verified_date
                    ? new Date(e.last_verified_date).toLocaleDateString('en-IN')
                    : <span className="text-muted-foreground">Never</span>}
                </TableCell>
                <TableCell>
                  {ghost ? (
                    <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">
                      Ghost Risk
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      Current
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => handleVerify(u.id)}>
                    <Camera className="h-3 w-3 mr-1" />
                    <MapPin className="h-3 w-3 mr-1" />
                    Verify
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default FAPhysicalVerificationPanel;
