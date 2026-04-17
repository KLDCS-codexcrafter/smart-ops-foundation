/**
 * HierarchyMaster.tsx — SAM hierarchy levels
 * Only relevant when enableHierarchyMaster = true in SAM Config.
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { useSAMHierarchy } from '@/hooks/useSAMPersons';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import type { SAMHierarchyLevel } from '@/types/sam-person';

interface Props { entityCode: string }

interface FormState {
  level_number: number | '';
  level_name: string;
  level_code: string;
  reports_to_level: number | null;
  editingId: string | null;
}

const BLANK: FormState = {
  level_number: '',
  level_name: '',
  level_code: '',
  reports_to_level: null,
  editingId: null,
};

export function HierarchyMasterPanel({ entityCode }: Props) {
  const { levels, saveLevel, deleteLevel } = useSAMHierarchy(entityCode);
  const [form, setForm] = useState<FormState>(BLANK);

  const handleSave = useCallback(() => {
    if (!form.level_number || form.level_number < 1) {
      toast.error('Level number is required');
      return;
    }
    if (!form.level_name.trim()) {
      toast.error('Level name is required');
      return;
    }
    if (!form.level_code.trim()) {
      toast.error('Level code is required');
      return;
    }

    // unique level_number / level_code
    const dupNum = levels.find(l =>
      l.level_number === form.level_number && l.id !== form.editingId);
    if (dupNum) {
      toast.error(`Level ${form.level_number} already exists`);
      return;
    }
    const dupCode = levels.find(l =>
      l.level_code.toUpperCase() === form.level_code.toUpperCase() && l.id !== form.editingId);
    if (dupCode) {
      toast.error(`Code ${form.level_code} already exists`);
      return;
    }

    saveLevel({
      entity_id: entityCode,
      level_number: Number(form.level_number),
      level_name: form.level_name.trim(),
      level_code: form.level_code.toUpperCase().trim(),
      reports_to_level: form.reports_to_level ?? null,
    });
    setForm(BLANK);
  }, [form, levels, saveLevel, entityCode]);

  useCtrlS(handleSave);

  const handleEdit = (l: SAMHierarchyLevel) => {
    setForm({
      level_number: l.level_number,
      level_name: l.level_name,
      level_code: l.level_code,
      reports_to_level: l.reports_to_level ?? null,
      editingId: l.id,
    });
  };

  return (
    <div data-keyboard-form className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Hierarchy Levels</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm(BLANK)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {levels.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No levels defined yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Reports</TableHead>
                  <TableHead className="text-xs w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map(l => (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => handleEdit(l)}>
                    <TableCell className="text-xs font-mono">{l.level_number}</TableCell>
                    <TableCell className="text-xs font-mono">{l.level_code}</TableCell>
                    <TableCell className="text-xs">{l.level_name}</TableCell>
                    <TableCell className="text-xs">{l.reports_to_level ?? '—'}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); deleteLevel(l.level_number); }}>
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

      {/* Form */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {form.editingId ? 'Edit Level' : 'New Level'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Level Number *</label>
              <Input
                type="number"
                min={1}
                value={form.level_number}
                onChange={e => setForm(p => ({
                  ...p,
                  level_number: e.target.value === '' ? '' : Number(e.target.value),
                }))}
                onKeyDown={onEnterNext}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Level Code *</label>
              <Input
                value={form.level_code}
                onChange={e => setForm(p => ({
                  ...p,
                  level_code: e.target.value.toUpperCase().slice(0, 8),
                }))}
                onKeyDown={onEnterNext}
                placeholder="NSM"
                maxLength={8}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Level Name *</label>
            <Input
              value={form.level_name}
              onChange={e => setForm(p => ({ ...p, level_name: e.target.value }))}
              onKeyDown={onEnterNext}
              placeholder="National Sales Manager"
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Reports To</label>
            <Select
              value={form.reports_to_level == null ? 'none' : String(form.reports_to_level)}
              onValueChange={v => setForm(p => ({
                ...p,
                reports_to_level: v === 'none' ? null : Number(v),
              }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Top level —</SelectItem>
                {levels
                  .filter(l => l.level_number !== form.level_number)
                  .map(l => (
                    <SelectItem key={l.id} value={String(l.level_number)}>
                      {l.level_number} — {l.level_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button data-primary size="sm" onClick={handleSave}>
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

export default function HierarchyMaster(props: Props) {
  return <HierarchyMasterPanel {...props} />;
}
