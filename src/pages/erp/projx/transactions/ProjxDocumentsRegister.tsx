/**
 * @file        src/pages/erp/projx/transactions/ProjxDocumentsRegister.tsx
 * @purpose     Project-scoped document register · all-projects view with project_id filter · D-NEW-CJ 2nd consumer
 * @sprint      T-Phase-1.SM.ProjX-Documents · Q-LOCK-2a + Q-LOCK-3a + Q-LOCK-8b · Block B
 * @decisions   D-NEW-CJ Hub-and-Spoke (DocVault canonical · 2nd consumer at v18)
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
import { FolderOpen, Plus } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { listAllProjectDocuments } from '@/lib/projx-documents-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { ProjXModule } from '../ProjXSidebar.types';

interface ProjxDocumentsRegisterProps {
  onNavigate: (m: ProjXModule) => void;
}

export function ProjxDocumentsRegisterPanel({ onNavigate }: ProjxDocumentsRegisterProps) {
  const { entityCode } = useCardEntitlement();
  const { projects } = useProjects(entityCode);
  const [filterProjectId, setFilterProjectId] = useState<string>('all');

  const allDocs = useMemo(() => listAllProjectDocuments(entityCode), [entityCode]);

  const filteredDocs = useMemo(
    () => filterProjectId === 'all'
      ? allDocs
      : allDocs.filter((d) => d.project_id === filterProjectId),
    [allDocs, filterProjectId],
  );

  const projectName = (id: string | null | undefined): string => {
    if (!id) return '—';
    const p = projects.find((proj) => proj.id === id);
    return p?.project_no ?? id;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <FolderOpen className="h-6 w-6" />
              Project Documents
            </h2>
            <p className="text-sm text-muted-foreground">
              All documents linked to projects · {filteredDocs.length} of {allDocs.length}
            </p>
          </div>
          <Button onClick={() => onNavigate('t-document-entry')} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Document
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter by project</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={filterProjectId} onValueChange={setFilterProjectId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.filter((p) => p.is_active).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.project_no}</SelectItem>
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
                  <TableHead>Project</TableHead>
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
                      No project documents found
                    </TableCell>
                  </TableRow>
                ) : filteredDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{projectName(doc.project_id)}</TableCell>
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
