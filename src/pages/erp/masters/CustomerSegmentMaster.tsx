/**
 * CustomerSegmentMaster.tsx — Customer segment CRUD
 * Sprint 13a. Panel export for Command Center + Customer Hub.
 * Segments are referenced by Sprint 12 scheme engine (scope.customer_segments[]).
 * [JWT] GET/POST/PUT/DELETE /api/customer-segments
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Save, Trash2, Search, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { customerSegmentsKey } from '@/types/customer-loyalty';
import { logAudit } from '@/lib/card-audit-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';

const ENTITY = 'SMRT';

export interface CustomerSegment {
  id: string;
  entity_id: string;
  code: string;
  name: string;
  description: string;
  manual_customer_ids: string[];
  auto_rule: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function readSegments(): CustomerSegment[] {
  try {
    // [JWT] GET /api/customer-segments
    const raw = localStorage.getItem(customerSegmentsKey(ENTITY));
    if (raw) return JSON.parse(raw) as CustomerSegment[];
  } catch { /* ignore */ }
  return [];
}

function writeSegments(list: CustomerSegment[]): void {
  try {
    // [JWT] POST/PUT /api/customer-segments
    localStorage.setItem(customerSegmentsKey(ENTITY), JSON.stringify(list));
  } catch { /* ignore */ }
}

function seedDemoSegments(): CustomerSegment[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'seg-vip-kolkata', entity_id: ENTITY, code: 'VIP_KOLKATA',
      name: 'Kolkata VIPs', description: 'Kolkata customers in CLV vip / growth tier.',
      manual_customer_ids: [], auto_rule: 'city=Kolkata AND clv_tier IN (vip,growth)',
      active: true, created_at: now, updated_at: now,
    },
    {
      id: 'seg-festival', entity_id: ENTITY, code: 'FESTIVAL_BUYERS',
      name: 'Festival Buyers', description: 'Customers who purchased in any Indian festival month (Oct/Nov).',
      manual_customer_ids: [], auto_rule: 'placed_at.month IN (10,11)',
      active: true, created_at: now, updated_at: now,
    },
    {
      id: 'seg-new-30d', entity_id: ENTITY, code: 'NEW_30D',
      name: 'New Customers (30d)', description: 'First order placed within the last 30 days.',
      manual_customer_ids: [], auto_rule: 'days_since_first_order <= 30',
      active: true, created_at: now, updated_at: now,
    },
    {
      id: 'seg-at-risk', entity_id: ENTITY, code: 'AT_RISK',
      name: 'At Risk', description: 'No order in 90+ days, was previously active.',
      manual_customer_ids: [], auto_rule: 'days_since_last_order >= 90 AND historical_orders >= 3',
      active: true, created_at: now, updated_at: now,
    },
  ];
}

const blankSegment = (): CustomerSegment => {
  const now = new Date().toISOString();
  return {
    id: `seg-${Date.now()}`, entity_id: ENTITY, code: '', name: '',
    description: '', manual_customer_ids: [], auto_rule: '',
    active: true, created_at: now, updated_at: now,
  };
};

export function CustomerSegmentMasterPanel() {
  const { entityCode, userId } = useCardEntitlement();
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomerSegment | null>(null);

  // Initial load + seed
  useEffect(() => {
    let list = readSegments();
    if (list.length === 0) {
      list = seedDemoSegments();
      writeSegments(list);
    }
    setSegments(list);
    setSelectedId(list[0]?.id ?? null);
  }, []);

  // Sync draft with selection
  useEffect(() => {
    if (!selectedId) { setDraft(null); return; }
    const found = segments.find(s => s.id === selectedId) ?? null;
    setDraft(found ? { ...found } : null);
  }, [selectedId, segments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return segments;
    return segments.filter(s =>
      s.code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q));
  }, [segments, search]);

  const handleAdd = useCallback(() => {
    const seg = blankSegment();
    const next = [seg, ...segments];
    setSegments(next);
    writeSegments(next);
    setSelectedId(seg.id);
  }, [segments]);

  const handleSave = useCallback(() => {
    if (!draft) return;
    if (!draft.code.trim() || !draft.name.trim()) {
      toast.error('Code and Name are required');
      return;
    }
    const updated: CustomerSegment = {
      ...draft,
      code: draft.code.trim().toUpperCase().replace(/\s+/g, '_'),
      updated_at: new Date().toISOString(),
    };
    const next = segments.map(s => s.id === updated.id ? updated : s);
    setSegments(next);
    writeSegments(next);

    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'command-center',
      moduleId: 'crm-customer-segments',
      action: 'master_save',
      refType: 'customer_segment',
      refId: updated.id,
      refLabel: `${updated.code} — ${updated.name}`,
    });

    toast.success(`Saved ${updated.code}`);
  }, [draft, segments, entityCode, userId]);

  const handleDelete = useCallback(() => {
    if (!draft) return;
    const next = segments.filter(s => s.id !== draft.id);
    setSegments(next);
    writeSegments(next);
    setSelectedId(next[0]?.id ?? null);
    toast.success(`Removed ${draft.code}`);
  }, [draft, segments]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Tag className="h-5 w-5 text-teal-500" />
          <h1 className="text-xl font-bold text-foreground">Customer Segments</h1>
          <Badge variant="outline" className="text-[10px]">Used by Schemes</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Audience groupings for scheme targeting — VIPs, festival buyers, new and at-risk customers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px,1fr] gap-4">
        {/* LEFT — list */}
        <Card className="bg-card/60 backdrop-blur-xl">
          <CardContent className="p-3 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                <Input
                  className="pl-7 h-8 text-xs"
                  placeholder="Search segments…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button size="sm" className="h-8 bg-teal-500 hover:bg-teal-600 text-white" onClick={handleAdd}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-1 max-h-[480px] overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No segments yet. Click + to add one.
                </p>
              )}
              {filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left rounded-lg p-2 transition-colors border ${
                    selectedId === s.id
                      ? 'bg-teal-500/10 border-teal-500/40'
                      : 'border-transparent hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono font-semibold text-foreground truncate">{s.code || '—'}</p>
                    {!s.active && <Badge variant="outline" className="text-[9px] h-4 px-1">Inactive</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{s.name || 'Untitled'}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — form */}
        <Card className="bg-card/60 backdrop-blur-xl">
          <CardContent className="p-4 space-y-4">
            {!draft ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Select a segment to edit, or click + to create a new one.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Code</Label>
                    <Input
                      className="h-8 text-xs font-mono uppercase"
                      placeholder="VIP_KOLKATA"
                      value={draft.code}
                      onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Kolkata VIPs"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    className="text-xs min-h-[60px]"
                    placeholder="What this segment captures…"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Auto-Rule (note only — engine wires up in Sprint 13b)
                  </Label>
                  <Textarea
                    className="text-xs min-h-[50px] font-mono"
                    placeholder="city=Kolkata AND clv_tier IN (vip,growth)"
                    value={draft.auto_rule}
                    onChange={(e) => setDraft({ ...draft, auto_rule: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Manually Assigned Customer IDs (comma-separated)</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder="cust-001, cust-002"
                    value={draft.manual_customer_ids.join(', ')}
                    onChange={(e) => setDraft({
                      ...draft,
                      manual_customer_ids: e.target.value
                        .split(',').map(x => x.trim()).filter(Boolean),
                    })}
                  />
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={draft.active}
                      onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                    />
                    <Label className="text-xs">Active</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8" onClick={handleDelete}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 bg-teal-500 hover:bg-teal-600 text-white"
                      onClick={handleSave}
                    >
                      <Save className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CustomerSegmentMaster() {
  return <CustomerSegmentMasterPanel />;
}
