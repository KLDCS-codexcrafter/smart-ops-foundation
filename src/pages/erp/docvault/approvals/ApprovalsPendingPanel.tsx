/**
 * @file        src/pages/erp/docvault/approvals/ApprovalsPendingPanel.tsx
 * @purpose     Approvals pending list · consumes loadDocumentsByStatus('submitted') from docvault-engine
 * @who         Document Controller · approvers · originating department leads
 * @when        2026-05-09 (T1 backfill)
 * @sprint      T-Phase-1.A.8.α-a-T1-Audit-Fix · Block C · F-4 backfill
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema (CANONICAL · A.8 Foundation) ·
 *              D-NEW-BV Phase 1 mock pattern ·
 *              FR-30 11/11 header standard (T1 backfill per A.6.α-a-T1 institutional pattern)
 * @disciplines FR-30 · FR-67
 * @reuses      docvault-engine.loadDocumentsByStatus · @/components/ui/* · useEntityCode
 * @[JWT]       reads via docvault-engine · GET /api/docvault/documents?status=submitted (Phase 2)
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadDocumentsByStatus } from '@/lib/docvault-engine';

export function ApprovalsPendingPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const pending = loadDocumentsByStatus(entityCode, 'submitted');

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Approvals Pending</h1>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                    No documents awaiting approval.
                  </TableCell>
                </TableRow>
              ) : pending.map((d) => {
                const ver = d.versions.find((v) => v.version_status === 'submitted');
                return (
                  <TableRow key={d.id}>
                    <TableCell>{d.title}</TableCell>
                    <TableCell><Badge variant="outline">{d.document_type}</Badge></TableCell>
                    <TableCell className="font-mono">{ver?.version_no ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ver?.submitted_at
                        ? new Date(ver.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
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

export default ApprovalsPendingPanel;
