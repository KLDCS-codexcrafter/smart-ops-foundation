/**
 * @file        src/pages/erp/projx/transactions/ProjxDocumentEntry.tsx
 * @purpose     Project-scoped document entry form · creates Document with project_id FK pre-set · D-NEW-CJ 2nd consumer
 * @sprint      T-Phase-1.SM.ProjX-Documents · Q-LOCK-2a + Q-LOCK-3a + Q-LOCK-11a · Block C
 * @decisions   D-NEW-CJ Hub-and-Spoke (DocVault canonical · 2nd consumer at v18) ·
 *              D-NEW-CE FormCarryForwardKit (12th consumer at v18 · partial coverage)
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useProjects } from '@/hooks/useProjects';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { createProjectDocument } from '@/lib/projx-documents-engine';
import type { DocumentType } from '@/types/docvault';
import type { ProjXModule } from '../ProjXSidebar.types';
import { toast } from 'sonner';
import { useFormCarryForwardChecklist } from '@/lib/form-carry-forward-kit';

interface ProjxDocumentEntryProps {
  onNavigate: (m: ProjXModule) => void;
}

export function ProjxDocumentEntryPanel({ onNavigate }: ProjxDocumentEntryProps) {
  const { entityCode, userId } = useCardEntitlement();
  const { projects } = useProjects(entityCode);
  const activeProjects = projects.filter((p) => p.is_active);

  const [projectId, setProjectId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [documentType, setDocumentType] = useState<DocumentType>('drawing');
  const [versionNo, setVersionNo] = useState<string>('1.0');
  const [fileUrl, setFileUrl] = useState<string>('');

  // D-NEW-CE FormCarryForwardKit (12th consumer · partial coverage at v18)
  useFormCarryForwardChecklist('projx-document-entry', {
    useLastVoucher: false,
    sprint27d1: false,
    sprint27d2: false,
    sprint27e: false,
    keyboardOverlay: false,
    draftRecovery: false,
    decimalHelpers: false,
    fr30Header: true,
    smartDefaults: false,
    pinnedTemplates: false,
    ctrlSSave: false,
    saveAndNewCarryover: false,
  });

  const handleSubmit = (): void => {
    if (!projectId || !title) {
      toast.error('Project and title are required');
      return;
    }
    try {
      const doc = createProjectDocument(
        entityCode,
        {
          projectId,
          title,
          description,
          documentType,
          originatingDepartmentId: 'projx',
          initialVersion: {
            version_no: versionNo,
            file_url: fileUrl || `[JWT] /api/files/${Date.now()}`,
            file_size_bytes: 0,
            uploaded_at: new Date().toISOString(),
            uploaded_by: userId,
          },
        },
        userId,
      );
      toast.success(`Document ${doc.title} created · v${versionNo}`);
      onNavigate('t-documents');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-2xl">
        <h2 className="text-2xl font-semibold">New Project Document</h2>

        <Card>
          <CardHeader><CardTitle>Document Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="project">Project *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="project"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {activeProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_no} · {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="type">Document Type *</Label>
              <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="drawing">Drawing</SelectItem>
                  <SelectItem value="mom">MOM</SelectItem>
                  <SelectItem value="certification">Certification</SelectItem>
                  <SelectItem value="iso_iec_doc">ISO/IEC Doc</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="version">Version No *</Label>
                <Input id="version" value={versionNo} onChange={(e) => setVersionNo(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="url">File URL (mock)</Label>
                <Input id="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="auto-generated if blank" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit}>Create Document</Button>
              <Button variant="outline" onClick={() => onNavigate('t-documents')}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
