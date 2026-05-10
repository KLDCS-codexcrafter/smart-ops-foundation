/**
 * @file        src/pages/erp/qualicheck/transactions/QualiCheckNcrEvidenceRegister.tsx
 * @purpose     NC-scoped document register · all-NCs view + nc_id filter · D-NEW-CJ 4th CONSUMER
 * @sprint      T-Phase-1.SM.QualiCheck-NCR-Evidence · Q-LOCK-2a + Q-LOCK-3a + Q-LOCK-8b · Block B
 * @decisions   D-NEW-CJ Hub-and-Spoke (4th consumer · INSTITUTIONAL FR PROMOTION THRESHOLD MET)
 * @reuses      qualicheck-ncr-evidence-engine.ts · useCardEntitlement (QualiCheck canonical)
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FileText, Plus } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  listAllNcrEvidence,
  listAvailableNcrs,
} from '@/lib/qualicheck-ncr-evidence-engine';
import type { QualiCheckModule } from '../QualiCheckSidebar.types';

interface QualiCheckNcrEvidenceRegisterProps {
  onNavigate: (m: QualiCheckModule) => void;
}

export function QualiCheckNcrEvidenceRegisterPanel({
  onNavigate,
}: QualiCheckNcrEvidenceRegisterProps): JSX.Element {
  const { profile } = useCardEntitlement();
  const entityCode = profile?.activeEntityCode ?? '';
  const ncrs = useMemo(() => listAvailableNcrs(entityCode), [entityCode]);
  const [filterNcId, setFilterNcId] = useState<string>('all');

  const allDocs = useMemo(() => listAllNcrEvidence(entityCode), [entityCode]);
  const filteredDocs = useMemo(
    () => filterNcId === 'all' ? allDocs : allDocs.filter((d) => d.nc_id === filterNcId),
    [allDocs, filterNcId],
  );

  const ncrLabel = (id: string | null | undefined): string => {
    if (!id) return '—';
    const ncr = ncrs.find((n) => n.id === id);
    return ncr ? `${ncr.id} · ${ncr.severity}` : id;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              NCR Evidence
            </h2>
            <p className="text-sm text-muted-foreground">
              All documents linked to NCRs · {filteredDocs.length} of {allDocs.length}
            </p>
          </div>
          <Button onClick={() => onNavigate('ncr-evidence-entry')} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Evidence
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter by NCR</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={filterNcId} onValueChange={setFilterNcId}>
              <SelectTrigger className="w-[320px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All NCRs</SelectItem>
                {ncrs.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.id} · {n.severity} · {n.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NCR</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No NCR evidence found
                    </TableCell>
                  </TableRow>
                ) : filteredDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono text-sm">{ncrLabel(doc.nc_id)}</TableCell>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell><Badge variant="secondary">{doc.document_type}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{doc.current_version}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {doc.versions.find((v) => v.version_no === doc.current_version)?.version_status ?? 'draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
