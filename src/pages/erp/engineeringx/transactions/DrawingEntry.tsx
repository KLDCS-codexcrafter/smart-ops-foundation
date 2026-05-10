/**
 * @file        src/pages/erp/engineeringx/transactions/DrawingEntry.tsx
 * @purpose     Drawing Entry form · D-NEW-CE FormCarryForwardKit 15th consumer · creates DocVault Document
 * @who         Engineering · Document Controller
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.11 EngineeringX Drawing Register + Version Control · Q-LOCK-3a + Q-LOCK-11a · Block D
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   FR-73 Hub-and-Spoke 5th CONSUMER · D-NEW-CE FormCarryForwardKit 15th consumer ·
 *              D-NEW-BV Phase 1 mock · FR-30 11/11 header · FR-29 12-item discipline
 * @disciplines FR-29 · FR-30 · FR-58
 * @reuses      engineeringx-engine.createDrawing · useEntityCode · useProjects · useFormCarryForwardChecklist
 * @[JWT]       writes via engineeringx-engine → docvault-engine createDocument
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
import { ArrowLeft, FilePlus } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProjects } from '@/hooks/useProjects';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { useFormCarryForwardChecklist } from '@/lib/form-carry-forward-kit';
import { createDrawing } from '@/lib/engineeringx-engine';
import { DRAWING_TYPE_LABELS } from '@/types/engineering-drawing';
import type { DrawingType } from '@/types/engineering-drawing';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function DrawingEntry({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { userId } = useCardEntitlement();
  const { projects } = useProjects(entityCode);

  const [drawingNo, setDrawingNo] = useState('');
  const [title, setTitle] = useState('');
  const [drawingType, setDrawingType] = useState<DrawingType>('part');
  const [projectId, setProjectId] = useState<string>('');
  const [equipmentId, setEquipmentId] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [versionNo, setVersionNo] = useState('1.0');

  // D-NEW-CE FormCarryForwardKit 15th consumer
  useFormCarryForwardChecklist('engineeringx-drawing-entry', {
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

  function handleSubmit(): void {
    if (!entityCode) {
      toast.error('Select a company to continue');
      return;
    }
    if (!drawingNo.trim() || !title.trim()) {
      toast.error('Drawing No and Title are required');
      return;
    }
    try {
      const drw = createDrawing(
        entityCode,
        {
          drawing_no: drawingNo.trim(),
          title: title.trim(),
          description: description || undefined,
          drawing_type: drawingType,
          related_project_id: projectId || null,
          related_equipment_id: equipmentId.trim() || null,
          originating_department_id: 'engineering',
          initial_version: {
            version_no: versionNo,
            file_url: fileUrl || `[JWT] /api/files/${Date.now()}`,
            file_size_bytes: 0,
            uploaded_at: new Date().toISOString(),
            uploaded_by: userId,
          },
        },
        userId,
      );
      toast.success(`Drawing ${drw.title} created · v${versionNo}`);
      onNavigate?.('drawing-register');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => onNavigate?.('drawing-register')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FilePlus className="h-6 w-6 text-primary" /> New Drawing
        </h2>
      </div>

      <Card>
        <CardHeader><CardTitle>Drawing details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="drawing_no">Drawing No *</Label>
              <Input id="drawing_no" value={drawingNo} onChange={(e) => setDrawingNo(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="version">Initial Version *</Label>
              <Input id="version" value={versionNo} onChange={(e) => setVersionNo(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Drawing Type *</Label>
              <Select value={drawingType} onValueChange={(v) => setDrawingType(v as DrawingType)}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DRAWING_TYPE_LABELS) as DrawingType[]).map((k) => (
                    <SelectItem key={k} value={k}>{DRAWING_TYPE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="project">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="project"><SelectValue placeholder="(none)" /></SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No projects</div>
                  ) : projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="equipment">Equipment ID (optional)</Label>
            <Input
              id="equipment" value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              placeholder="raw FK · MaintainPro master pending"
            />
          </div>

          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="file">File URL (mock)</Label>
            <Input
              id="file" value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="auto-generated if blank"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit}>Create Drawing</Button>
            <Button variant="outline" onClick={() => onNavigate?.('drawing-register')}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
