/**
 * EnquirySourceMaster.tsx — CRUD for enquiry source channels
 * Sprint 3 SalesX. Pattern follows HierarchyMaster.
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { useEnquirySources } from '@/hooks/useEnquirySources';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import type { EnquirySource } from '@/types/enquiry-source';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

interface FormState {
  source_code: string;
  source_name: string;
  description: string;
  is_active: boolean;
  editingId: string | null;
}

const BLANK: FormState = {
  source_code: '',
  source_name: '',
  description: '',
  is_active: true,
  editingId: null,
};

export function EnquirySourceMasterPanel({ entityCode }: Props) {
  const { sources, saveSource, deleteSource } = useEnquirySources(entityCode);
  const [form, setForm] = useState<FormState>(BLANK);

  const handleSave = useCallback(() => {
    if (!form.source_code.trim()) { toast.error('Source code is required'); return; }
    if (!form.source_name.trim()) { toast.error('Source name is required'); return; }
    const dup = sources.find(s =>
      s.source_code.toUpperCase() === form.source_code.toUpperCase() && s.id !== form.editingId);
    if (dup) { toast.error(`Code ${form.source_code} already exists`); return; }

    saveSource({
      id: form.editingId ?? undefined,
      entity_id: entityCode,
      source_code: form.source_code.toUpperCase().trim(),
      source_name: form.source_name.trim(),
      description: form.description.trim() || null,
      is_active: form.is_active,
    });
    toast.success(form.editingId ? 'Source updated' : 'Source added');
    setForm(BLANK);
  }, [form, sources, saveSource, entityCode]);

  const isFormActive = !!(form.source_name.trim() || form.editingId);
  useCtrlS(isFormActive ? handleSave : () => {});

  const handleEdit = (s: EnquirySource) => {
    setForm({
      source_code: s.source_code,
      source_name: s.source_name,
      description: s.description ?? '',
      is_active: s.is_active,
      editingId: s.id,
    });
  };

  return (
    <div data-keyboard-form className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Enquiry Sources</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm(BLANK)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No sources defined yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map(s => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => handleEdit(s)}>
                    <TableCell className="text-xs font-mono">{s.source_code}</TableCell>
                    <TableCell className="text-xs">{s.source_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        'text-[10px]',
                        s.is_active
                          ? 'bg-success/15 text-success border-success/30'
                          : 'bg-muted text-muted-foreground border-border',
                      )}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); deleteSource(s.id); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {form.editingId ? 'Edit Source' : 'New Source'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Code *</Label>
            <Input
              value={form.source_code}
              onChange={e => setForm(p => ({ ...p, source_code: e.target.value.toUpperCase().slice(0, 12) }))}
              onKeyDown={onEnterNext}
              placeholder="WEB"
              maxLength={12}
              className="h-8 text-xs font-mono"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Name *</Label>
            <Input
              value={form.source_name}
              onChange={e => setForm(p => ({ ...p, source_name: e.target.value }))}
              onKeyDown={onEnterNext}
              placeholder="Website / Walk-in / Referral"
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Active</Label>
            <Switch checked={form.is_active}
              onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button data-primary size="sm" onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
              <Save className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setForm(BLANK)}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EnquirySourceMaster(props: Props) {
  return <EnquirySourceMasterPanel {...props} />;
}
