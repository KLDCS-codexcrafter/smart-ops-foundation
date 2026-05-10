/**
 * @file        src/pages/erp/engineeringx/approvals/DrawingApprovalsPending.tsx
 * @purpose     Review queue · drawings with submitted versions · approve/reject inline · DocVault canonical workflow REUSED
 * @who         Engineering Lead · Document Controller · QualiCheck
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.11 EngineeringX Drawing Register + Version Control · Q-LOCK-4a + Q-LOCK-5a · Block E.1
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   FR-73 Hub-and-Spoke 5th CONSUMER · D-NEW-CO drawing version supersession · FR-30 11/11 header
 * @disciplines FR-29 · FR-30
 * @reuses      engineeringx-engine.listDrawingsByStatus · approveDrawingVersion · rejectDrawingVersion
 * @[JWT]       writes via engineeringx-engine → docvault-engine
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, CheckSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  listDrawingsByStatus, approveDrawingVersion, rejectDrawingVersion,
} from '@/lib/engineeringx-engine';
import { parseDrawingCustomTags } from '@/types/engineering-drawing';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';
import type { Document } from '@/types/docvault';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function DrawingApprovalsPending({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { userId } = useCardEntitlement();
  const [refresh, setRefresh] = useState(0);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const submitted: Document[] = entityCode
    ? listDrawingsByStatus(entityCode, 'submitted').filter(
        (d) => d.versions.find((v) => v.version_no === d.current_version)?.version_status === 'submitted',
      )
    : [];

  function handleApprove(d: Document): void {
    if (!entityCode) return;
    const r = approveDrawingVersion(entityCode, d.id, d.current_version, userId);
    if (r) {
      toast.success(`Approved ${d.title} v${d.current_version}`);
      setRefresh((x) => x + 1);
    } else {
      toast.error('Approval failed');
    }
    void refresh;
  }

  function handleReject(d: Document): void {
    if (!entityCode) return;
    const reason = rejectReason[d.id]?.trim();
    if (!reason) {
      toast.error('Reason required to reject');
      return;
    }
    const r = rejectDrawingVersion(entityCode, d.id, d.current_version, reason, userId);
    if (r) {
      toast.success(`Rejected ${d.title} v${d.current_version}`);
      setRejectReason((s) => ({ ...s, [d.id]: '' }));
      setRefresh((x) => x + 1);
    } else {
      toast.error('Reject failed');
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => onNavigate?.('welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-primary" /> Drawing Approvals Pending
        </h2>
      </div>

      <Card>
        <CardHeader><CardTitle>Submitted drawing versions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drawing No</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Reason (for reject)</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submitted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No submitted drawings awaiting approval.
                  </TableCell>
                </TableRow>
              ) : submitted.map((d) => {
                const meta = parseDrawingCustomTags(d.tags?.custom_tags);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono">{meta.drawing_no ?? d.id}</TableCell>
                    <TableCell>{d.title}</TableCell>
                    <TableCell className="font-mono">{d.current_version}</TableCell>
                    <TableCell>
                      <Input
                        value={rejectReason[d.id] ?? ''}
                        onChange={(e) => setRejectReason((s) => ({ ...s, [d.id]: e.target.value }))}
                        placeholder="rejection reason"
                      />
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" onClick={() => handleApprove(d)}>
                        <CheckSquare className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(d)}>
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
