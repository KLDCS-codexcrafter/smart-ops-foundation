/**
 * @file        src/pages/erp/engineeringx/transactions/CloneDrawing.tsx
 * @sprint      T-Phase-1.A.12 · Q-LOCK-7a · Block D.2 · CloneDrawing form · D-NEW-CE 16th consumer
 * @decisions   D-NEW-CE FormCarryForwardKit 16th consumer · FR-29 12-item discipline ·
 *              D-NEW-CP institutional pattern (reference_source_drawing_id custom_tag) ·
 *              FR-73 5th consumer reuse (createDrawing wrapper)
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProjects } from '@/hooks/useProjects';
import { useFormCarryForwardChecklist } from '@/lib/form-carry-forward-kit';
import {
  listDrawings, getDrawing, createDrawing,
} from '@/lib/engineeringx-engine';
import {
  extractBomFromDrawing, listBomByDrawing, addBomEntry,
} from '@/lib/engineeringx-bom-engine';
import {
  DRAWING_CUSTOM_TAG_KEYS, parseDrawingCustomTags, buildDrawingCustomTags,
  type DrawingType,
} from '@/types/engineering-drawing';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function CloneDrawing({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const { projects } = useProjects(entityCode);

  const drawings = useMemo(
    () => (entityCode ? listDrawings(entityCode) : []),
    [entityCode],
  );

  const [sourceDrawingId, setSourceDrawingId] = useState<string>('');
  const [targetProjectId, setTargetProjectId] = useState<string>('');
  const [newDrawingNo, setNewDrawingNo] = useState('');
  const [cloneBom, setCloneBom] = useState(true);
  const [descriptionOverride, setDescriptionOverride] = useState('');

  // D-NEW-CE FormCarryForwardKit 16th consumer · FR-29 12-item discipline
  useFormCarryForwardChecklist('engineeringx-clone-drawing', {
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

  useEffect(() => {
    const seed = sessionStorage.getItem('engineeringx_clone_source_id');
    if (seed) {
      setSourceDrawingId(seed);
      sessionStorage.removeItem('engineeringx_clone_source_id');
    }
  }, []);

  function handleSubmit(): void {
    if (!entityCode) {
      toast.error('Select a company');
      return;
    }
    if (!sourceDrawingId || !newDrawingNo.trim()) {
      toast.error('Source drawing and new drawing number required');
      return;
    }
    const source = getDrawing(entityCode, sourceDrawingId);
    if (!source) {
      toast.error('Source drawing not found');
      return;
    }
    const sourceMeta = parseDrawingCustomTags(source.tags?.custom_tags);
    const drawingType = (sourceMeta.drawing_subtype ?? 'other') as DrawingType;
    const userId = user?.id ?? 'demo-user';

    const cloned = createDrawing(
      entityCode,
      {
        drawing_no: newDrawingNo.trim(),
        title: source.title,
        description: descriptionOverride || source.description,
        drawing_type: drawingType,
        related_project_id: targetProjectId || null,
        related_equipment_id: null,
        originating_department_id: source.originating_department_id,
        initial_version: {
          version_no: '1.0',
          file_url: `[JWT] /api/files/clone-${Date.now()}`,
          file_size_bytes: 0,
          uploaded_at: new Date().toISOString(),
          uploaded_by: userId,
        },
      },
      userId,
    );

    // D-NEW-CP institutional pattern · attach reference_source_drawing_id custom_tag
    try {
      const key = `erp_documents_${entityCode}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const docs = JSON.parse(raw) as typeof source[];
        const idx = docs.findIndex((d) => d.id === cloned.id);
        if (idx >= 0) {
          const meta = parseDrawingCustomTags(docs[idx].tags?.custom_tags);
          meta[DRAWING_CUSTOM_TAG_KEYS.reference_source_drawing_id] = sourceDrawingId;
          docs[idx] = {
            ...docs[idx],
            tags: { ...docs[idx].tags, custom_tags: buildDrawingCustomTags(meta) },
          };
          localStorage.setItem(key, JSON.stringify(docs));
        }
      }
    } catch {
      /* swallow */
    }

    if (cloneBom) {
      const sourceBom = listBomByDrawing(entityCode, sourceDrawingId);
      const userCtx = { id: userId, name: user?.name ?? 'Demo User' };
      if (sourceBom.length > 0) {
        for (const e of sourceBom) {
          addBomEntry(entityCode, {
            entity_id: entityCode,
            drawing_id: cloned.id,
            material_code: e.material_code,
            description: e.description,
            qty: e.qty,
            unit: e.unit,
            item_no: e.item_no,
          }, userCtx);
        }
      } else {
        extractBomFromDrawing(entityCode, cloned.id, userCtx);
      }
    }

    toast.success(`Cloned to ${cloned.title}`);
    onNavigate?.('drawing-register');
  }

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => onNavigate?.('reference-library')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Copy className="h-6 w-6 text-primary" /> Clone Drawing
        </h2>
      </div>

      <Card>
        <CardHeader><CardTitle>Clone settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Source drawing *</Label>
            <Select value={sourceDrawingId} onValueChange={setSourceDrawingId}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {drawings.map((d) => {
                  const meta = parseDrawingCustomTags(d.tags?.custom_tags);
                  return (
                    <SelectItem key={d.id} value={d.id}>
                      {meta.drawing_no ?? d.id} — {d.title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target project</Label>
            <Select value={targetProjectId} onValueChange={setTargetProjectId}>
              <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No projects</div>
                ) : projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="new_dno">New drawing no *</Label>
            <Input
              id="new_dno"
              value={newDrawingNo}
              onChange={(e) => setNewDrawingNo(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={cloneBom} onCheckedChange={setCloneBom} id="clonebom" />
            <Label htmlFor="clonebom">Clone BOM lines</Label>
          </div>

          <div>
            <Label htmlFor="descov">Description override (optional)</Label>
            <Textarea
              id="descov"
              value={descriptionOverride}
              onChange={(e) => setDescriptionOverride(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit}>Clone Drawing</Button>
            <Button variant="outline" onClick={() => onNavigate?.('reference-library')}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
