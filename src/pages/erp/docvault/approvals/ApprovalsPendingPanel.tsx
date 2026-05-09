/**
 * @file        src/pages/erp/docvault/approvals/ApprovalsPendingPanel.tsx
 * @sprint      T-Phase-1.A.8.α-a-DocVault-Foundation · Block D.2
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
