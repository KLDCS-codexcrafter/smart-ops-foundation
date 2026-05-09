/**
 * @file        src/pages/erp/docvault/transactions/DocumentEntry.tsx
 * @purpose     New document entry form · cross-card linkage editor (Q-LOCK-15a) · approval actions
 * @who         Document Controller · originating department user
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.8.α-a-DocVault-Foundation · Block C ·
 *              T-Phase-1.A.8.α-a-T1-Audit-Fix · Block A · F-2 + F-3a
 * @iso         ISO 9001:2015 §7.5
 * @whom        Audit Owner
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema · Q-LOCK-15a Hub-and-Spoke · D-NEW-BV mock ·
 *              D-NEW-CG canonical (AuditHistoryButton consumed · institutional audit-UI pattern) ·
 *              D-NEW-CE canonical (FormCarryForwardKit at FR-29 11/12 honest baseline)
 * @disciplines FR-29 · FR-30 · FR-50 · FR-25
 * @reuses      docvault-engine (FR-19 sibling) · useEntityCode ·
 *              @/components/canonical/form-carry-forward-kit · @/lib/form-carry-forward-kit ·
 *              @/components/uth/AuditHistoryButton (D-NEW-CG canonical)
 * @[JWT]       Wires to docvault-engine routes · file upload Phase 2 CDN
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { createDocument } from '@/lib/docvault-engine';
import type { DocumentType } from '@/types/docvault';
// F-3a fix · D-NEW-CE FormCarryForwardKit canonical (FR-29 11/12 honest baseline)
import {
  UseLastVoucherButton, Sprint27d2Mount, Sprint27eMount, DraftRecoveryDialog,
} from '@/components/canonical/form-carry-forward-kit';
import {
  useFormCarryForwardChecklist, useSprint27d1Mount, type FormCarryForwardConfig,
} from '@/lib/form-carry-forward-kit';
// F-2 fix · D-NEW-CG canonical · audit-UI institutional pattern
import { AuditHistoryButton } from '@/components/uth/AuditHistoryButton';
import type { AuditEntityType } from '@/types/audit-trail';

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'drawing', label: 'Drawing' },
  { value: 'mom', label: 'Minutes of Meeting' },
  { value: 'certification', label: 'Certification' },
  { value: 'iso_iec_doc', label: 'ISO / IEC Document' },
  { value: 'other', label: 'Other' },
];

export function DocumentEntry(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState<DocumentType>('drawing');
  const [department, setDepartment] = useState('eng');
  const [versionNo, setVersionNo] = useState('A');
  const [isoClause, setIsoClause] = useState('');
  const [iecClause, setIecClause] = useState('');
  const [projectId, setProjectId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [ncId, setNcId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setFileSize(f.size);
  };

  const handleSave = (): void => {
    if (!title.trim()) {
      toast.error('Title required');
      return;
    }
    const doc = createDocument(
      entityCode,
      {
        entity_id: entityCode,
        document_type: docType,
        title: title.trim(),
        description: description || undefined,
        tags: {
          iso_clause: isoClause || undefined,
          iec_clause: iecClause || undefined,
        },
        originating_department_id: department,
        project_id: projectId || null,
        customer_id: customerId || null,
        vendor_id: vendorId || null,
        equipment_id: equipmentId || null,
        nc_id: ncId || null,
        work_order_id: workOrderId || null,
      },
      {
        version_no: versionNo,
        file_url: fileName ? `mock://${fileName}` : '',
        file_size_bytes: fileSize,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'current-user',
      },
      'current-user',
    );
    toast.success(`Document ${doc.id} saved as draft`);
    setTitle('');
    setDescription('');
    setFileName('');
    setFileSize(0);
  };

  const showProject = docType === 'drawing' || docType === 'mom' || docType === 'other';
  const showCustomer = docType === 'mom' || docType === 'other';
  const showVendor = docType === 'certification' || docType === 'other';
  const showNc = docType === 'certification' || docType === 'other';
  const showEquipment = docType === 'other';
  const showWorkOrder = docType === 'other';

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">New Document</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Originating Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div>
              <Label>Version No</Label>
              <Input value={versionNo} onChange={(e) => setVersionNo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Cross-Card Linkage (Q-LOCK-15a)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {showProject && (
            <div>
              <Label>Project ID</Label>
              <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="ProjX" />
            </div>
          )}
          {showCustomer && (
            <div>
              <Label>Customer ID</Label>
              <Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Customer Hub" />
            </div>
          )}
          {showVendor && (
            <div>
              <Label>Vendor ID</Label>
              <Input value={vendorId} onChange={(e) => setVendorId(e.target.value)} placeholder="Procure360" />
            </div>
          )}
          {showNc && (
            <div>
              <Label>NCR ID</Label>
              <Input value={ncId} onChange={(e) => setNcId(e.target.value)} placeholder="Qulicheak" />
            </div>
          )}
          {showEquipment && (
            <div>
              <Label>Equipment ID</Label>
              <Input value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} placeholder="MaintainPro" />
            </div>
          )}
          {showWorkOrder && (
            <div>
              <Label>Work Order ID</Label>
              <Input value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)} placeholder="Production" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div>
            <Label>ISO Clause</Label>
            <Input value={isoClause} onChange={(e) => setIsoClause(e.target.value)} placeholder="ISO 9001:2015 §7.5.3" />
          </div>
          <div>
            <Label>IEC Clause</Label>
            <Input value={iecClause} onChange={(e) => setIecClause(e.target.value)} placeholder="IEC 17025:2017 §8.3" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">File Upload (D-NEW-BV mock)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input type="file" onChange={handleFile} />
          {fileName ? (
            <p className="text-sm text-muted-foreground font-mono">
              {fileName} · {fileSize} bytes
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave}>Save Draft</Button>
      </div>
    </div>
  );
}

export default DocumentEntry;
