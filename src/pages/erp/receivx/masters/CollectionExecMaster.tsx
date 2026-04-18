/**
 * CollectionExecMaster.tsx — Collection executive CRUD
 */
import { useState, useCallback } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { receivxExecsKey, type CollectionExec } from '@/types/receivx';

interface Props { entityCode: string }

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/receivx/execs
    return JSON.parse(localStorage.getItem(k) || '[]');
  } catch { return []; }
}

export function CollectionExecMasterPanel({ entityCode }: Props) {
  const [list, setList] = useState<CollectionExec[]>(() => ls<CollectionExec>(receivxExecsKey(entityCode)));
  const [selectedId, setSelectedId] = useState<string | null>(list[0]?.id ?? null);
  const selected = list.find(e => e.id === selectedId) ?? null;

  const persist = useCallback((next: CollectionExec[]) => {
    setList(next);
    try {
      // [JWT] POST /api/receivx/execs
      localStorage.setItem(receivxExecsKey(entityCode), JSON.stringify(next));
    } catch { toast.error('Save failed'); }
  }, [entityCode]);

  const handleSave = useCallback(() => {
    if (!selected) return;
    persist(list.map(e => e.id === selected.id ? { ...selected, updated_at: new Date().toISOString() } : e));
    toast.success('Executive saved');
  }, [selected, list, persist]);

  useCtrlS(selected ? handleSave : () => {});

  const addExec = () => {
    const now = new Date().toISOString();
    const e: CollectionExec = {
      id: `cx-${Date.now()}`, entity_id: entityCode,
      exec_code: `CX-${list.length + 1}`, exec_name: 'New Executive',
      phone: '', email: '', territory_ids: [], customer_category_ids: [],
      manager_id: null, max_active_tasks: 50, is_active: true,
      created_at: now, updated_at: now,
    };
    persist([...list, e]);
    setSelectedId(e.id);
  };

  const update = (patch: Partial<CollectionExec>) => {
    if (!selected) return;
    setList(list.map(e => e.id === selected.id ? { ...selected, ...patch } : e));
  };

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Collection Executives</h1>
          <p className="text-xs text-muted-foreground">Assign collection staff and territories</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addExec}><Plus className="h-3.5 w-3.5 mr-1" />New</Button>
          <Button data-primary size="sm" onClick={handleSave} className="bg-amber-500 hover:bg-amber-600">
            <Save className="h-3.5 w-3.5 mr-1" />Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-4 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Executives ({list.length})</p>
          {list.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No executives yet</p>
          ) : (
            <div className="space-y-1">
              {list.map(e => (
                <button key={e.id} onClick={() => setSelectedId(e.id)}
                  className={`w-full text-left p-2 rounded text-xs ${selectedId === e.id ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'hover:bg-muted'}`}>
                  <p className="font-medium">{e.exec_name}</p>
                  <p className="text-muted-foreground text-[10px]">{e.exec_code} • {e.phone || '—'}</p>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="col-span-8 p-4">
          {!selected ? (
            <p className="text-xs text-muted-foreground text-center py-8">Select or create an executive</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Code</Label><Input className="text-xs mt-1" value={selected.exec_code} onKeyDown={onEnterNext} onChange={e => update({ exec_code: e.target.value })} /></div>
              <div><Label className="text-xs">Name</Label><Input className="text-xs mt-1" value={selected.exec_name} onKeyDown={onEnterNext} onChange={e => update({ exec_name: e.target.value })} /></div>
              <div><Label className="text-xs">Phone</Label><Input className="text-xs mt-1" value={selected.phone} onKeyDown={onEnterNext} onChange={e => update({ phone: e.target.value })} /></div>
              <div><Label className="text-xs">Email</Label><Input className="text-xs mt-1" value={selected.email} onKeyDown={onEnterNext} onChange={e => update({ email: e.target.value })} /></div>
              <div><Label className="text-xs">Max Active Tasks</Label><Input type="number" className="text-xs mt-1" value={selected.max_active_tasks} onKeyDown={onEnterNext} onChange={e => update({ max_active_tasks: +e.target.value })} /></div>
              <div className="flex items-center gap-2 mt-5"><Switch checked={selected.is_active} onCheckedChange={v => update({ is_active: v })} /><Label className="text-xs">Active</Label></div>
              <div className="col-span-2">
                <Button variant="outline" size="sm" className="text-destructive"
                  onClick={() => { persist(list.filter(e => e.id !== selected.id)); setSelectedId(null); }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function CollectionExecMaster() {
  return <CollectionExecMasterPanel entityCode="SMRT" />;
}
