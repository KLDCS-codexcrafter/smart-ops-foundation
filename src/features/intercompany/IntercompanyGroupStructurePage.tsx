/**
 * @file        IntercompanyGroupStructurePage.tsx
 * @purpose     Standalone Page #34 — Intercompany Group Structure dashboard.
 *              Ownership tree (parent → subs/branches/JVs/associates) + per-entity
 *              ownership %, relationship, and recommended Ind AS consolidation
 *              method. Editable upsert form via intercompany-group-structure-engine.
 * @reads       intercompany-group-structure-engine · loadEntities
 * @writes      side-store via upsertGroupStructure (NEVER mutates mock-entities).
 * @sprint      T-Phase-6.C.1.1 · Sprint 105 · Block 4 · Arc 2 OPENER
 * @scope-wall  DP-A2-9 · NO consolidated statements / eliminations / multi-currency.
 */
import { useMemo, useState } from 'react';
import { Network, Pencil, Save, ShieldCheck, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  CONSOLIDATION_METHODS,
  GROUP_RELATIONSHIPS,
  getGroupTree,
  recommendConsolidationMethod,
  upsertGroupStructure,
  type ConsolidationMethod,
  type GroupRelationship,
  type GroupTreeRow,
} from '@/lib/intercompany-group-structure-engine';

interface DraftState {
  entity_id: string;
  parent_entity_id: string | null;
  relationship: GroupRelationship;
  ownership_pct: number;
  consolidation_method: ConsolidationMethod;
  effective_from: string;
}

const fmtPct = (n: number) =>
  `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;

function relBadgeVariant(r: GroupRelationship): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (r === 'parent') return 'default';
  if (r === 'subsidiary' || r === 'branch') return 'secondary';
  if (r === 'joint_venture') return 'destructive';
  return 'outline';
}

export default function IntercompanyGroupStructurePage() {
  const [, setTick] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);

  const tree: GroupTreeRow[] = useMemo(() => getGroupTree(), []);
  const entities = tree.map((t) => t.entity);

  // Group rollup counts (structure only — DP-A2-9 scope wall · NO consolidation).
  const counts = tree.reduce(
    (acc, row) => {
      if (!row.node) acc.untagged++;
      else acc[row.node.consolidation_method]++;
      return acc;
    },
    { full: 0, proportional: 0, equity: 0, untagged: 0 } as Record<string, number>,
  );

  const beginEdit = (row: GroupTreeRow) => {
    setEditing(row.entity.id);
    setDraft({
      entity_id: row.entity.id,
      parent_entity_id: row.node?.parent_entity_id ?? null,
      relationship: row.node?.relationship ?? (row.entity.type === 'parent' ? 'parent' : row.entity.type),
      ownership_pct: row.node?.ownership_pct ?? (row.entity.type === 'parent' ? 100 : 0),
      consolidation_method: row.node?.consolidation_method ?? 'full',
      effective_from: row.node?.effective_from ?? new Date().toISOString().slice(0, 10),
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft(null);
  };

  const onDraftChange = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const suggestedMethod: ConsolidationMethod | null = draft
    ? recommendConsolidationMethod(draft.ownership_pct, draft.relationship)
    : null;

  const applySuggestion = () => {
    if (!draft || !suggestedMethod) return;
    onDraftChange('consolidation_method', suggestedMethod);
  };

  const save = () => {
    if (!draft) return;
    try {
      upsertGroupStructure({
        entity_id: draft.entity_id,
        parent_entity_id: draft.parent_entity_id || null,
        relationship: draft.relationship,
        ownership_pct: Number(draft.ownership_pct),
        consolidation_method: draft.consolidation_method,
        effective_from: draft.effective_from,
      });
      toast.success('Group structure saved · audit logged');
      cancelEdit();
      setTick((t) => t + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Intercompany Group Structure
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Ownership · relationship · Ind AS consolidation method per entity. Structure only
            (Arc 2 scope wall · consolidated statements land in Arc 3).
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-[10px] font-mono">{entities.length} entities</Badge>
          <Badge variant="secondary" className="text-[10px] font-mono">{counts.full} full</Badge>
          <Badge variant="secondary" className="text-[10px] font-mono">{counts.proportional} proportional</Badge>
          <Badge variant="secondary" className="text-[10px] font-mono">{counts.equity} equity</Badge>
          {counts.untagged > 0 && (
            <Badge variant="destructive" className="text-[10px] font-mono">{counts.untagged} untagged</Badge>
          )}
        </div>
      </div>

      <Card className="glass-card">
        <CardContent className="p-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Entity</TableHead>
                <TableHead className="text-[11px]">Parent</TableHead>
                <TableHead className="text-[11px]">Relationship</TableHead>
                <TableHead className="text-[11px] text-right">Ownership %</TableHead>
                <TableHead className="text-[11px]">Method (Ind AS)</TableHead>
                <TableHead className="text-[11px]">Children</TableHead>
                <TableHead className="text-[11px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tree.map((row) => {
                const parentEntity = row.node?.parent_entity_id
                  ? entities.find((e) => e.id === row.node?.parent_entity_id)
                  : null;
                return (
                  <TableRow key={row.entity.id}>
                    <TableCell className="text-[11px] font-mono">
                      {row.entity.shortCode}
                      <div className="text-muted-foreground">{row.entity.name}</div>
                    </TableCell>
                    <TableCell className="text-[11px] font-mono">
                      {parentEntity ? parentEntity.shortCode : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {row.node ? (
                        <Badge variant={relBadgeVariant(row.node.relationship)} className="text-[10px]">
                          {row.node.relationship}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">untagged</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] font-mono text-right">
                      {row.node ? fmtPct(row.node.ownership_pct) : '—'}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {row.node ? (
                        <Badge variant="secondary" className="text-[10px]">
                          <ShieldCheck className="h-3 w-3 mr-1" /> {row.node.consolidation_method}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] font-mono">
                      {row.children.length > 0 ? row.children.length : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => beginEdit(row)}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && draft && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Edit structure · {entities.find((e) => e.id === editing)?.name ?? editing}
              </h2>
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Parent entity</Label>
                <Select
                  value={draft.parent_entity_id ?? 'none'}
                  onValueChange={(v) => onDraftChange('parent_entity_id', v === 'none' ? null : v)}
                >
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— (root)</SelectItem>
                    {entities.filter((e) => e.id !== draft.entity_id).map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.shortCode} · {e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Relationship</Label>
                <Select
                  value={draft.relationship}
                  onValueChange={(v) => onDraftChange('relationship', v as GroupRelationship)}
                >
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GROUP_RELATIONSHIPS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Ownership %</Label>
                <Input
                  className="rounded-lg font-mono"
                  type="number" min={0} max={100} step={0.01}
                  value={draft.ownership_pct}
                  onChange={(e) => onDraftChange('ownership_pct', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Consolidation method (Ind AS)</Label>
                <Select
                  value={draft.consolidation_method}
                  onValueChange={(v) => onDraftChange('consolidation_method', v as ConsolidationMethod)}
                >
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONSOLIDATION_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {suggestedMethod && suggestedMethod !== draft.consolidation_method && (
                  <button
                    type="button"
                    className="text-[10px] text-primary underline mt-1"
                    onClick={applySuggestion}
                  >
                    Suggested: {suggestedMethod} — apply
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Effective from</Label>
                <Input
                  className="rounded-lg font-mono"
                  type="date"
                  value={draft.effective_from}
                  onChange={(e) => onDraftChange('effective_from', e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
              <Button size="sm" onClick={save}>
                <Save className="h-3 w-3 mr-1" /> Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-[10px] text-muted-foreground">
        Scope wall (DP-A2-9): structure only · no consolidated P&L / BS / CF · no eliminations · no
        multi-currency / NCI / goodwill — those land in Arc 3 (S108+).
      </p>
    </div>
  );
}
