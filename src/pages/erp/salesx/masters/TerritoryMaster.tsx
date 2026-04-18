/**
 * TerritoryMaster.tsx — Sales-ops territory CRUD
 * Sprint 7. List + form. Hierarchical via parent_territory_id.
 * [JWT] GET/POST/PUT/DELETE /api/salesx/territories
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Save, Trash2, X, MapPin } from 'lucide-react';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { indianStates } from '@/data/india-geography';
import {
  type Territory, territoriesKey,
} from '@/types/territory';
import {
  type SAMPerson, samPersonsKey,
} from '@/types/sam-person';

interface Props { entityCode: string }

interface FormState {
  territory_code: string;
  territory_name: string;
  parent_territory_id: string;
  assigned_salesman_ids: string[];
  state_codes: string[];
  district_codes: string[];
  city_codes: string[];
  is_active: boolean;
  notes: string;
  editingId: string | null;
}

const BLANK: FormState = {
  territory_code: '',
  territory_name: '',
  parent_territory_id: '',
  assigned_salesman_ids: [],
  state_codes: [],
  district_codes: [],
  city_codes: [],
  is_active: true,
  notes: '',
  editingId: null,
};

const NOW = () => new Date().toISOString();

function loadTerritories(entityCode: string): Territory[] {
  try {
    // [JWT] GET /api/salesx/territories
    const raw = localStorage.getItem(territoriesKey(entityCode));
    return raw ? (JSON.parse(raw) as Territory[]) : [];
  } catch { return []; }
}

function saveTerritories(entityCode: string, list: Territory[]): void {
  try {
    // [JWT] PUT /api/salesx/territories
    localStorage.setItem(territoriesKey(entityCode), JSON.stringify(list));
  } catch { /* noop */ }
}

function loadSalesmen(entityCode: string): SAMPerson[] {
  try {
    // [JWT] GET /api/salesx/sam/persons
    const raw = localStorage.getItem(samPersonsKey(entityCode));
    const all = raw ? (JSON.parse(raw) as SAMPerson[]) : [];
    return all.filter(p => (p.person_type === 'salesman' || p.treat_as_salesman) && p.is_active);
  } catch { return []; }
}

export function TerritoryMasterPanel({ entityCode }: Props) {
  const [territories, setTerritories] = useState<Territory[]>(() => loadTerritories(entityCode));
  const [form, setForm] = useState<FormState>(BLANK);
  const salesmen = useMemo(() => loadSalesmen(entityCode), [entityCode]);

  useEffect(() => {
    setTerritories(loadTerritories(entityCode));
  }, [entityCode]);

  const handleSave = useCallback(() => {
    if (!form.territory_name.trim()) { toast.error('Territory name required'); return; }
    const code = form.territory_code.trim() || `TER-${String(territories.length + 1).padStart(4, '0')}`;
    const dup = territories.find(t => t.territory_code.toUpperCase() === code.toUpperCase() && t.id !== form.editingId);
    if (dup) { toast.error(`Code ${code} already exists`); return; }

    const now = NOW();
    const next: Territory = {
      id: form.editingId ?? `ter-${Date.now()}`,
      entity_id: entityCode,
      territory_code: code.toUpperCase(),
      territory_name: form.territory_name.trim(),
      parent_territory_id: form.parent_territory_id || null,
      assigned_salesman_ids: form.assigned_salesman_ids,
      state_codes: form.state_codes,
      district_codes: form.district_codes,
      city_codes: form.city_codes,
      is_active: form.is_active,
      notes: form.notes.trim() || null,
      created_at: form.editingId
        ? (territories.find(t => t.id === form.editingId)?.created_at ?? now)
        : now,
      updated_at: now,
    };
    const updated = form.editingId
      ? territories.map(t => t.id === form.editingId ? next : t)
      : [...territories, next];
    setTerritories(updated);
    saveTerritories(entityCode, updated);
    toast.success(form.editingId ? 'Territory updated' : 'Territory added');
    setForm(BLANK);
  }, [form, territories, entityCode]);

  const isFormActive = !!(form.territory_name.trim() || form.editingId);
  useCtrlS(isFormActive ? handleSave : () => { /* noop */ });

  const handleEdit = (t: Territory) => {
    setForm({
      territory_code: t.territory_code,
      territory_name: t.territory_name,
      parent_territory_id: t.parent_territory_id ?? '',
      assigned_salesman_ids: t.assigned_salesman_ids,
      state_codes: t.state_codes,
      district_codes: t.district_codes,
      city_codes: t.city_codes,
      is_active: t.is_active,
      notes: t.notes ?? '',
      editingId: t.id,
    });
  };

  const handleDelete = (id: string) => {
    const updated = territories.filter(t => t.id !== id);
    setTerritories(updated);
    saveTerritories(entityCode, updated);
    toast.success('Territory removed');
    if (form.editingId === id) setForm(BLANK);
  };

  const toggleSalesman = (id: string) => {
    setForm(p => ({
      ...p,
      assigned_salesman_ids: p.assigned_salesman_ids.includes(id)
        ? p.assigned_salesman_ids.filter(x => x !== id)
        : [...p.assigned_salesman_ids, id],
    }));
  };

  const toggleState = (code: string) => {
    setForm(p => ({
      ...p,
      state_codes: p.state_codes.includes(code)
        ? p.state_codes.filter(x => x !== code)
        : [...p.state_codes, code],
    }));
  };

  const parentOptions = territories.filter(t => t.id !== form.editingId);

  return (
    <div data-keyboard-form className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Tree / list — left */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-orange-500" /> Territories
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm(BLANK)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {territories.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No territories defined yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Parent</TableHead>
                  <TableHead className="text-xs text-right">Salesmen</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {territories.map(t => {
                  const parent = territories.find(p => p.id === t.parent_territory_id);
                  return (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => handleEdit(t)}>
                      <TableCell className="text-xs font-mono">{t.territory_code}</TableCell>
                      <TableCell className="text-xs">{t.territory_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{parent?.territory_name ?? '—'}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{t.assigned_salesman_ids.length}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={t.is_active
                          ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px]'
                          : 'bg-muted text-muted-foreground text-[10px]'}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form — right */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {form.editingId ? 'Edit Territory' : 'New Territory'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Code</Label>
              <Input
                value={form.territory_code}
                onChange={e => setForm(p => ({ ...p, territory_code: e.target.value.toUpperCase().slice(0, 16) }))}
                onKeyDown={onEnterNext}
                placeholder="Auto"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="flex items-end justify-between">
              <Label className="text-xs">Active</Label>
              <Switch checked={form.is_active}
                onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Territory Name *</Label>
            <Input
              value={form.territory_name}
              onChange={e => setForm(p => ({ ...p, territory_name: e.target.value }))}
              onKeyDown={onEnterNext}
              placeholder="Mumbai West"
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Parent Territory</Label>
            <Select
              value={form.parent_territory_id || '__none__'}
              onValueChange={v => setForm(p => ({ ...p, parent_territory_id: v === '__none__' ? '' : v }))}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {parentOptions.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.territory_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Assigned Salesmen</Label>
            <div className="border rounded p-2 max-h-32 overflow-auto space-y-1">
              {salesmen.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">No active salesmen.</p>
              ) : salesmen.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.assigned_salesman_ids.includes(s.id)}
                    onChange={() => toggleSalesman(s.id)}
                    className="h-3 w-3 accent-orange-500"
                  />
                  <span>{s.display_name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono ml-auto">{s.person_code}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">State Coverage</Label>
            <div className="border rounded p-2 max-h-28 overflow-auto space-y-1">
              {indianStates.map(s => (
                <label key={s.code} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.state_codes.includes(s.gstStateCode)}
                    onChange={() => toggleState(s.gstStateCode)}
                    className="h-3 w-3 accent-orange-500"
                  />
                  <span>{s.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono ml-auto">{s.gstStateCode}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button data-primary size="sm" onClick={handleSave}
              className="bg-orange-500 hover:bg-orange-600">
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

export default function TerritoryMaster(props: Props) {
  return <TerritoryMasterPanel {...props} />;
}
