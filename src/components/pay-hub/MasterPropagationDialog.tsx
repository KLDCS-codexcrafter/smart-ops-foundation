/**
 * MasterPropagationDialog — shown after saving any group-level Pay Hub master.
 * Asks: copy this master to other entities? Yes-All / Select / This-Entity-Only.
 * Pattern mirrors EntitySetupDialog in Foundation.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Copy, Building2, Check } from 'lucide-react';

interface MasterPropagationDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  masterType: string;   // e.g. "Pay Grade" or "Leave Type"
  masterName: string;   // e.g. "L3 - Senior Manager"
  storageKey: string;   // key holding ALL records of this master type
  recordId: string;     // the record just saved
}

// Read all entities (Parent + Companies + Subsidiaries + Branches)
function loadEntityList(): {id: string; name: string}[] {
  const entities: {id: string; name: string}[] = [];
  try {
    // [JWT] GET /api/foundation/entities/all
    const p = JSON.parse(localStorage.getItem('erp_parent_company') || 'null');
    if (p?.legalEntityName) entities.push({ id: 'parent-root', name: p.legalEntityName });
    // [JWT] GET /api/foundation/companies
    const cos = JSON.parse(localStorage.getItem('erp_companies') || '[]');
    cos.forEach((c: any) => { if (c.id && c.legalEntityName) entities.push({ id: c.id, name: c.legalEntityName }); });
    // [JWT] GET /api/foundation/subsidiaries
    const subs = JSON.parse(localStorage.getItem('erp_subsidiaries') || '[]');
    subs.forEach((s: any) => { if (s.id && s.legalEntityName) entities.push({ id: s.id, name: s.legalEntityName }); });
    // [JWT] GET /api/foundation/branch-offices
    const brs = JSON.parse(localStorage.getItem('erp_branch_offices') || '[]');
    brs.forEach((b: any) => { if (b.id && b.name) entities.push({ id: b.id, name: b.name }); });
  } catch { /* ignore */ }
  return entities;
}

export function MasterPropagationDialog({
  open, onOpenChange, masterType, masterName, storageKey, recordId
}: MasterPropagationDialogProps) {
  const entities = loadEntityList();
  const [mode, setMode] = useState<'all' | 'select' | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Read the record from storage
  const getRecord = () => {
    try {
      // [JWT] GET /api/pay-hub/masters/:storageKey/:recordId
      const all = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return all.find((r: any) => r.id === recordId) ?? null;
    } catch { return null; }
  };

  // Propagation writes entityId-tagged copies to each selected entity
  const propagate = (targetIds: string[]) => {
    // [JWT] POST /api/pay-hub/masters/propagate { storageKey, recordId, targetEntityIds }
    const record = getRecord();
    if (!record) { toast.error('Record not found'); return; }
    // [JWT] GET /api/pay-hub/masters/:storageKey
    const all = JSON.parse(localStorage.getItem(storageKey) || '[]');
    let added = 0;
    targetIds.forEach(entityId => {
      const exists = all.some((r: any) => r.entityId === entityId && r.code === record.code);
      if (!exists) {
        all.push({ ...record, id: crypto.randomUUID(), entityId, propagatedFrom: recordId });
        added++;
      }
    });
    // [JWT] PUT /api/pay-hub/masters/:storageKey
    localStorage.setItem(storageKey, JSON.stringify(all));
    toast.success(`${masterType} propagated to ${added} entit${added === 1 ? 'y' : 'ies'}`);
    onOpenChange(false);
  };

  const handleAll = () => propagate(entities.map(e => e.id));
  const handleSelect = () => propagate([...selected]);
  const handleSkip = () => { toast.info('Kept in this entity only'); onOpenChange(false); };

  // Only show when more than 1 entity exists
  if (entities.length <= 1) { if (open) onOpenChange(false); return null; }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Propagate {masterType}?</DialogTitle>
          <DialogDescription>
            <Badge variant="outline" className="mr-1">{masterName}</Badge>
            was saved in this entity. Copy it to other entities?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {mode === 'select' && (
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3">
              {entities.map(e => (
                <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selected.has(e.id)}
                    onCheckedChange={v => setSelected(prev => {
                      const n = new Set(prev);
                      v ? n.add(e.id) : n.delete(e.id);
                      return n;
                    })} />
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  {e.name}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={handleAll} className="w-full">
            <Copy className="h-4 w-4 mr-2" /> Copy to All Entities ({entities.length})
          </Button>
          {mode !== 'select'
            ? <Button variant="outline" onClick={() => setMode('select')} className="w-full">
                Select Specific Entities
              </Button>
            : <Button variant="outline" onClick={handleSelect} disabled={selected.size === 0} className="w-full">
                <Check className="h-4 w-4 mr-2" /> Copy to Selected ({selected.size})
              </Button>}
          <Button variant="ghost" onClick={handleSkip} className="w-full">
            Keep in This Entity Only
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
