/**
 * @file        src/pages/erp/procure-hub/transactions/Procure360VendorAgreementEntry.tsx
 * @sprint      T-Phase-1.SM.Procure360-Vendor-Agreements · Block C
 * @decisions   D-NEW-CJ Hub-and-Spoke 3rd consumer · D-NEW-CE FormCarryForwardKit 13th consumer
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
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  createVendorAgreement,
  loadVendors,
} from '@/lib/procure360-vendor-agreements-engine';
import type { DocumentType } from '@/types/docvault';
import type { Procure360Module } from '../Procure360Sidebar.types';
import { toast } from 'sonner';
import { useFormCarryForwardChecklist } from '@/lib/form-carry-forward-kit';

interface Procure360VendorAgreementEntryProps {
  onNavigate: (m: Procure360Module) => void;
}

export function Procure360VendorAgreementEntryPanel({
  onNavigate,
}: Procure360VendorAgreementEntryProps) {
  const { entityCode } = useEntityCode();
  const userId = 'user_demo'; // [JWT] Phase 1 mock
  const vendors = loadVendors();

  const [vendorId, setVendorId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [documentType, setDocumentType] = useState<DocumentType>('certification');
  const [versionNo, setVersionNo] = useState<string>('1.0');
  const [fileUrl, setFileUrl] = useState<string>('');

  // D-NEW-CE FormCarryForwardKit (13th consumer)
  useFormCarryForwardChecklist('procure360-vendor-agreement-entry', {
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
    if (!vendorId || !title) {
      toast.error('Vendor and title are required');
      return;
    }
    try {
      const doc = createVendorAgreement(
        entityCode,
        {
          vendorId,
          title,
          description,
          documentType,
          originatingDepartmentId: 'procure360',
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
      toast.success(`Agreement ${doc.title} created · v${versionNo}`);
      onNavigate('vendor-agreements-register');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-2xl">
        <h2 className="text-2xl font-semibold">New Vendor Agreement</h2>

        <Card>
          <CardHeader><CardTitle>Agreement Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="vendor">Vendor *</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger id="vendor"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {vendors.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No vendors found</div>
                  ) : vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}{v.vendorCode ? ` · ${v.vendorCode}` : ''}
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
              <Button onClick={handleSubmit}>Create Agreement</Button>
              <Button variant="outline" onClick={() => onNavigate('vendor-agreements-register')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
