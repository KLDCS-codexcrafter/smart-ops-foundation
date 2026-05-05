/**
 * PODDetailDialog.tsx — Sprint 6-pre-3 · Block D · D-372
 * FT-DISPATCH-002 partial closure · POD register link.
 *
 * Pure read-only consumer of pod-engine.ts / types/pod.ts (NO modifications).
 * Reused by LRTracker + DispatchExceptions panels.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Camera, FileSignature, MessageSquare, AlertTriangle } from 'lucide-react';
import type { POD } from '@/types/pod';

interface Props {
  pod: POD | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function statusVariant(s: POD['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'verified') return 'default';
  if (s === 'disputed' || s === 'rejected') return 'destructive';
  if (s === 'captured') return 'secondary';
  return 'outline';
}

export function PODDetailDialog({ pod, open, onOpenChange }: Props): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>POD Details</DialogTitle>
          <DialogDescription>
            {pod ? `For DLN ${pod.dln_voucher_no}` : 'No POD captured for this delivery.'}
          </DialogDescription>
        </DialogHeader>

        {!pod ? (
          <Card>
            <CardContent className="pt-5 text-center text-sm text-muted-foreground">
              No proof of delivery has been captured yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <Badge variant={statusVariant(pod.status)} className="capitalize">{pod.status}</Badge>
              {pod.is_exception && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />Exception
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-muted-foreground">Captured at</div>
              <div className="font-mono">{new Date(pod.captured_at).toLocaleString('en-IN')}</div>
              <div className="text-muted-foreground">Captured by</div>
              <div className="font-mono">{pod.captured_by}</div>
              <div className="text-muted-foreground">Recipient</div>
              <div>{pod.consignee?.name ?? '—'}</div>
              {pod.consignee?.designation && (
                <>
                  <div className="text-muted-foreground">Designation</div>
                  <div>{pod.consignee.designation}</div>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant={pod.gps_verified ? 'default' : 'outline'} className="gap-1">
                <MapPin className="h-3 w-3" />GPS {pod.gps_verified ? '✓' : '—'}
              </Badge>
              <Badge variant={pod.photo_verified ? 'default' : 'outline'} className="gap-1">
                <Camera className="h-3 w-3" />Photo {pod.photo_verified ? '✓' : '—'}
              </Badge>
              <Badge variant={pod.signature_verified ? 'default' : 'outline'} className="gap-1">
                <FileSignature className="h-3 w-3" />Sign {pod.signature_verified ? '✓' : '—'}
              </Badge>
              <Badge variant={pod.otp_verified ? 'default' : 'outline'} className="gap-1">
                <MessageSquare className="h-3 w-3" />OTP {pod.otp_verified ? '✓' : '—'}
              </Badge>
            </div>

            {pod.distance_from_ship_to_m != null && (
              <div className="text-xs text-muted-foreground font-mono">
                Distance from ship-to: {Math.round(pod.distance_from_ship_to_m)}m
              </div>
            )}

            {pod.exception_type && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs">
                <div className="font-semibold capitalize">{pod.exception_type.replace('_', ' ')}</div>
                {pod.exception_notes && <div className="text-muted-foreground mt-1">{pod.exception_notes}</div>}
              </div>
            )}
            {pod.dispute_reason && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
                <div className="font-semibold">Dispute</div>
                <div className="text-muted-foreground mt-1">{pod.dispute_reason}</div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PODDetailDialog;
