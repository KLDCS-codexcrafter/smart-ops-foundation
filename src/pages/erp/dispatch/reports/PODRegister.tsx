/**
 * PODRegister.tsx — UPRA-1 Phase A · T1-6
 * Sidebar route: dh-r-pod
 * [JWT] GET /api/dispatch/pods/:entityCode
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Smartphone, Monitor } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import { podsKey, type POD, type PODStatus } from '@/types/pod';
import { PODDetailPanel } from './detail/PODDetailPanel';
import { PODPrint } from './print/PODPrint';

// Sprint 46 Pass 1 · B.3 · mobile/web capture source detection
type CaptureSource = 'all' | 'mobile' | 'web';
function isMobileCapture(p: POD): boolean {
  if (p.captured_by.startsWith('driver-') || p.captured_by.startsWith('mobile-')) return true;
  if (p.gps_latitude !== null && p.gps_accuracy_m !== null && p.gps_accuracy_m <= 50) return true;
  return false;
}

const STATUS_LABELS: Record<PODStatus, string> = {
  pending: 'Pending', captured: 'Captured', verified: 'Verified',
  disputed: 'Disputed', rejected: 'Rejected',
};
const STATUS_TONE: Record<PODStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  captured: 'bg-primary/10 text-primary',
  verified: 'bg-success/10 text-success',
  disputed: 'bg-warning/10 text-warning',
  rejected: 'bg-destructive/10 text-destructive',
};

function seedIfEmpty(entity: string): void {
  try {
    if (localStorage.getItem(podsKey(entity))) return;
    const now = new Date().toISOString();
    const seed: POD[] = [
      {
        id: 'pod-seed-1', entity_id: entity, fiscal_year_id: 'FY-2025-26',
        dln_voucher_id: 'dln-1', dln_voucher_no: 'DLN/25-26/0001',
        captured_at: now, captured_by: 'driver-101',
        gps_latitude: 19.0760, gps_longitude: 72.8777, gps_accuracy_m: 15,
        gps_timestamp: now, ship_to_latitude: 19.0762, ship_to_longitude: 72.8779,
        distance_from_ship_to_m: 25, gps_verified: true,
        photo_verified: true, signature_verified: true, otp_verified: true,
        consignee: { name: 'Rakesh', mobile: '9876543210' },
        status: 'verified', is_exception: false,
        created_at: now, updated_at: now,
      },
      {
        id: 'pod-seed-2', entity_id: entity, fiscal_year_id: 'FY-2025-26',
        dln_voucher_id: 'dln-2', dln_voucher_no: 'DLN/25-26/0002',
        captured_at: now, captured_by: 'driver-102',
        gps_latitude: 18.5204, gps_longitude: 73.8567, gps_accuracy_m: 30,
        gps_timestamp: now, ship_to_latitude: 18.5210, ship_to_longitude: 73.8570,
        distance_from_ship_to_m: 90, gps_verified: true,
        photo_verified: true, signature_verified: false, otp_verified: true,
        consignee: { name: 'Sundar', mobile: '9123456780' },
        status: 'captured', is_exception: false,
        created_at: now, updated_at: now,
      },
      {
        id: 'pod-seed-3', entity_id: entity, fiscal_year_id: 'FY-2025-26',
        dln_voucher_id: 'dln-3', dln_voucher_no: 'DLN/25-26/0003',
        captured_at: now, captured_by: 'driver-103',
        gps_latitude: 19.9975, gps_longitude: 73.7898, gps_accuracy_m: 20,
        gps_timestamp: now, ship_to_latitude: 19.9970, ship_to_longitude: 73.7900,
        distance_from_ship_to_m: 60, gps_verified: true,
        photo_verified: true, signature_verified: true, otp_verified: false,
        consignee: { name: 'Suresh', mobile: '9012345678' },
        status: 'disputed', dispute_reason: '20 mtr PVC damaged in transit',
        is_exception: true, exception_type: 'damage', exception_notes: '20 mtr damaged',
        created_at: now, updated_at: now,
      },
    ];
    localStorage.setItem(podsKey(entity), JSON.stringify(seed));
  } catch { /* quota silent */ }
}

export function PODRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<POD | null>(null);
  const [printing, setPrinting] = useState<POD | null>(null);
  const [tick, setTick] = useState(0);
  const [source, setSource] = useState<CaptureSource>('all');

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const allRows = useMemo<POD[]>(() => {
    try { return JSON.parse(localStorage.getItem(podsKey(safeEntity)) || '[]') as POD[]; }
    catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEntity, tick]);

  const rows = useMemo<POD[]>(() => {
    if (source === 'all') return allRows;
    return allRows.filter(p => source === 'mobile' ? isMobileCapture(p) : !isMobileCapture(p));
  }, [allRows, source]);

  const meta: RegisterMeta<POD> = {
    registerCode: 'pod_register',
    title: 'POD Register',
    description: 'Proof of delivery · GPS · photo · signature · OTP',
    dateAccessor: r => r.captured_at.slice(0, 10),
  };

  const columns: RegisterColumn<POD>[] = [
    { key: 'id', label: 'POD ID', clickable: true, render: r => r.id, exportKey: 'id' },
    { key: 'dln', label: 'DLN No', render: r => r.dln_voucher_no, exportKey: 'dln_voucher_no' },
    { key: 'date', label: 'Captured', render: r => r.captured_at.slice(0, 10), exportKey: r => r.captured_at.slice(0, 10) },
    { key: 'consignee', label: 'Consignee', render: r => r.consignee.name, exportKey: r => r.consignee.name },
    { key: 'mobile', label: 'Mobile', render: r => r.consignee.mobile ?? '—', exportKey: r => r.consignee.mobile ?? '' },
    { key: 'gps', label: 'GPS', render: r => r.gps_verified ? '✓' : '—', exportKey: r => r.gps_verified ? 'Yes' : 'No' },
    { key: 'photo', label: 'Photo', render: r => r.photo_verified ? '✓' : '—', exportKey: r => r.photo_verified ? 'Yes' : 'No' },
    { key: 'sig', label: 'Sign', render: r => r.signature_verified ? '✓' : '—', exportKey: r => r.signature_verified ? 'Yes' : 'No' },
    { key: 'otp', label: 'OTP', render: r => r.otp_verified ? '✓' : '—', exportKey: r => r.otp_verified ? 'Yes' : 'No' },
    // Sprint 46 Pass 1 · B.3 · Source column
    {
      key: 'source', label: 'Source',
      render: r => isMobileCapture(r)
        ? <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30"><Smartphone className="h-3 w-3 mr-1 inline" />Mobile</Badge>
        : <Badge variant="outline" className="text-[10px] text-muted-foreground"><Monitor className="h-3 w-3 mr-1 inline" />Web</Badge>,
      exportKey: r => isMobileCapture(r) ? 'Mobile' : 'Web',
    },
    { key: 'status', label: 'Status', render: r => (
      <Badge className={`text-[10px] ${STATUS_TONE[r.status]}`}>{STATUS_LABELS[r.status]}</Badge>
    ), exportKey: 'status' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as PODStatus[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: POD[]): SummaryCard[] => [
    { label: 'Total PODs', value: String(f.length) },
    { label: 'Verified', value: String(f.filter(r => r.status === 'verified').length), tone: 'positive' },
    { label: 'Pending', value: String(f.filter(r => r.status === 'pending').length), tone: 'warning' },
    { label: 'Disputed', value: String(f.filter(r => r.status === 'disputed').length), tone: 'negative' },
    { label: 'Exceptions', value: String(f.filter(r => r.is_exception).length), tone: 'warning' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      {/* Sprint 46 Pass 1 · B.3 · Capture source filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Capture Source:</span>
        {([
          { v: 'all',    l: 'All Sources' },
          { v: 'web',    l: 'Web Capture' },
          { v: 'mobile', l: 'Mobile Capture (OperixGo)' },
        ] as const).map(o => (
          <Button
            key={o.v}
            size="sm"
            variant={source === o.v ? 'default' : 'outline'}
            onClick={() => setSource(o.v)}
            className="h-7 text-xs"
          >{o.l}</Button>
        ))}
      </div>
      <UniversalRegisterGrid<POD>
        entityCode={safeEntity}
        meta={meta}
        rows={rows}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="status"
        summaryBuilder={summaryBuilder}
        onNavigateToRecord={setSelected}
      />
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && <PODDetailPanel pod={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <PODPrint pod={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PODRegisterPanel;
