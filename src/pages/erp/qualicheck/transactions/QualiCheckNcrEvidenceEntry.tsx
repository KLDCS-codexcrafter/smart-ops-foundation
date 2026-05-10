/**
 * @file        src/pages/erp/qualicheck/transactions/QualiCheckNcrEvidenceEntry.tsx
 * @purpose     NC-scoped document entry · creates Document with nc_id FK pre-set · D-NEW-CJ 4th CONSUMER
 * @sprint      T-Phase-1.SM.QualiCheck-NCR-Evidence · Q-LOCK-2a + Q-LOCK-3a + Q-LOCK-11a · Block C
 * @decisions   D-NEW-CJ Hub-and-Spoke (4th CONSUMER · INSTITUTIONAL FR PROMOTION THRESHOLD MET) ·
 *              D-NEW-CE FormCarryForwardKit (14th consumer)
 * @reuses      qualicheck-ncr-evidence-engine.ts · useCardEntitlement (QualiCheck canonical)
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
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  createNcrEvidence,
  listAvailableNcrs,
} from '@/lib/qualicheck-ncr-evidence-engine';
import type { DocumentType } from '@/types/docvault';
import type { QualiCheckModule } from '../QualiCheckSidebar.types';
import { toast } from 'sonner';
import { useFormCarryForwardChecklist } from '@/lib/form-carry-forward-kit';

interface QualiCheckNcrEvidenceEntryProps {
  onNavigate: (m: QualiCheckModule) => void;
}

export function QualiCheckNcrEvidenceEntryPanel({
  onNavigate,
}: QualiCheckNcrEvidenceEntryProps): JSX.Element {
  const { entityCode, userId } = useCardEntitlement();
  const ncrs = listAvailableNcrs(entityCode);

  const [ncId, setNcId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [documentType, setDocumentType] = useState<DocumentType>('other');
  const [versionNo, setVersionNo] = useState<string>('1.0');
  const [fileUrl, setFileUrl] = useState<string>('');

  // D-NEW-CE FormCarryForwardKit (14th consumer)
  useFormCarryForwardChecklist('qualicheck-ncr-evidence-entry', {
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
    if (!ncId || !title) {
      toast.error('NCR and title are required');
      return;
    }
    try {
      const doc = createNcrEvidence(
        entityCode,
        {
          ncId,
          title,
          description,
          documentType,
          originatingDepartmentId: 'qualicheck',
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
      toast.success(`Evidence ${doc.title} created · v${versionNo}`);
      onNavigate('ncr-evidence-register');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-2xl">
        <h2 className="text-2xl font-semibold">New NCR Evidence</h2>

        <Card>
          <CardHeader><CardTitle>Evidence Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ncr">NCR *</Label>
              <Select value={ncId} onValueChange={setNcId}>
                <SelectTrigger id="ncr"><SelectValue placeholder="Select NCR" /></SelectTrigger>
                <SelectContent>
                  {ncrs.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No NCRs found</div>
                  ) : ncrs.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.id} · {n.severity} · {n.status}
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
                  <SelectItem value="certification">Certification</SelectItem>
                  <SelectItem value="iso_iec_doc">ISO/IEC Doc</SelectItem>
                  <SelectItem value="mom">MOM</SelectItem>
                  <SelectItem value="drawing">Drawing</SelectItem>
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
                <Input
                  id="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="auto-generated if blank"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit}>Create Evidence</Button>
              <Button variant="outline" onClick={() => onNavigate('ncr-evidence-register')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
