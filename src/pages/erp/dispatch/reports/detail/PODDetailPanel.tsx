/**
 * PODDetailPanel.tsx — UPRA-1 Phase A · T1-6
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import type { POD } from '@/types/pod';

interface Props { pod: POD; onPrint: () => void }

export function PODDetailPanel({ pod, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{pod.dln_voucher_no} · POD</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Captured by {pod.captured_by} on {pod.captured_at.slice(0, 16).replace('T', ' ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">{pod.status}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Consignee</div><div>{pod.consignee.name}</div></div>
          <div><div className="text-xs text-muted-foreground">Mobile</div><div className="font-mono">{pod.consignee.mobile ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Designation</div><div>{pod.consignee.designation ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">ID</div><div>{pod.consignee.id_type ?? '—'} {pod.consignee.id_last4 ?? ''}</div></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm border-t pt-3">
          <div><div className="text-xs text-muted-foreground">GPS Verified</div><div>{pod.gps_verified ? 'Yes' : 'No'}</div></div>
          <div><div className="text-xs text-muted-foreground">Distance from ship-to</div><div className="font-mono">{pod.distance_from_ship_to_m ?? '—'} m</div></div>
          <div><div className="text-xs text-muted-foreground">GPS Accuracy</div><div className="font-mono">{pod.gps_accuracy_m ?? '—'} m</div></div>
          <div><div className="text-xs text-muted-foreground">Lat / Lng</div><div className="font-mono text-[11px]">{pod.gps_latitude?.toFixed(4)}, {pod.gps_longitude?.toFixed(4)}</div></div>
          <div><div className="text-xs text-muted-foreground">Photo</div><div>{pod.photo_verified ? 'Captured' : 'Missing'}</div></div>
          <div><div className="text-xs text-muted-foreground">Signature</div><div>{pod.signature_verified ? 'Captured' : 'Missing'}</div></div>
          <div><div className="text-xs text-muted-foreground">OTP</div><div>{pod.otp_verified ? 'Verified' : 'Missing'}</div></div>
          <div><div className="text-xs text-muted-foreground">FY</div><div>{pod.fiscal_year_id ?? '—'}</div></div>
        </div>
        {pod.is_exception && (
          <div className="bg-warning/10 border border-warning/30 rounded p-3 text-sm">
            <p className="font-semibold text-warning">Exception: {pod.exception_type}</p>
            <p className="mt-1">{pod.exception_notes ?? '—'}</p>
          </div>
        )}
        {pod.dispute_reason && (
          <div className="bg-destructive/10 border border-destructive/30 rounded p-3 text-sm">
            <p className="font-semibold text-destructive">Dispute</p>
            <p className="mt-1">{pod.dispute_reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
