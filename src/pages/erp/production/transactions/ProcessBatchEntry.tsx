/**
 * @file     ProcessBatchEntry.tsx
 * @sprint   T-Phase-3.PROD-3.5.PASS3 · ST10
 * @purpose  Process batch transaction page · create + start + complete batches.
 *           Consumes process-batch-engine (PASS 1) + recipe-formula-engine (PASS 1).
 *           Q-LOCK-3 Option A · ProcessBatch SEPARATE entity from ProductionOrder.
 *           Q-LOCK-9 Option A · consumer · ProcessBatch entity preserved.
 *           Mode-aware: visible only when entity manufacturingMode is 'process' or 'mixed_mode'.
 */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Beaker, Play, Square, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  createProcessBatch,
  startProcessBatch,
  completeProcessBatch,
  listProcessBatches,
} from '@/lib/process-batch-engine';
import { listRecipes } from '@/lib/recipe-formula-engine';
import type { ProcessBatch, ProcessBatchStatus } from '@/types/process-batch';
import type { Recipe } from '@/types/recipe';

const STATUS_BADGE_VARIANT: Record<ProcessBatchStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  running: 'default',
  paused: 'secondary',
  changeover: 'secondary',
  cip_clean: 'secondary',
  sampling: 'secondary',
  holding: 'secondary',
  completed: 'default',
  rejected: 'destructive',
  cancelled: 'destructive',
};

export function ProcessBatchEntryPanel(): JSX.Element {
  const navigate = useNavigate();
  const { entityCode, entityId } = useEntityCode();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [batches, setBatches] = useState<ProcessBatch[]>([]);
  const [recipeId, setRecipeId] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [plannedYield, setPlannedYield] = useState('');
  const [yieldUom, setYieldUom] = useState('kg');
  const [actualYield, setActualYield] = useState('');
  const [reactorId, setReactorId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!entityCode) return;
    setRecipes(listRecipes(entityCode).filter(r => r.status === 'approved'));
    setBatches(listProcessBatches(entityCode));
  }, [entityCode]);

  const selectedRecipe = useMemo(
    () => recipes.find(r => r.id === recipeId) ?? null,
    [recipes, recipeId],
  );

  const inFlightBatches = useMemo(
    () => batches.filter(b => b.status === 'draft' || b.status === 'running' || b.status === 'paused' || b.status === 'sampling'),
    [batches],
  );

  function reload(): void {
    if (!entityCode) return;
    setBatches(listProcessBatches(entityCode));
  }

  function handleCreate(): void {
    if (!selectedRecipe || !batchNo || !plannedYield) {
      toast.error('Recipe · batch number · planned yield are required');
      return;
    }
    try {
      const batch = createProcessBatch(
        {
          entity_id: entityId,
          batch_no: batchNo,
          recipe_id: selectedRecipe.id,
          recipe_name: selectedRecipe.recipe_name,
          recipe_version: selectedRecipe.version,
          planned_yield: parseFloat(plannedYield),
          yield_uom: yieldUom,
          reactor_id: reactorId || null,
          notes,
          start_date: new Date().toISOString().slice(0, 10),
        },
        { id: 'current-user', name: 'Operator' },
      );
      toast.success(`Batch ${batch.batch_no} created in draft status`);
      setBatchNo('');
      setPlannedYield('');
      setActualYield('');
      setReactorId('');
      setNotes('');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function handleStart(batchId: string): void {
    try {
      startProcessBatch(entityCode, batchId, { id: 'current-user', name: 'Operator' });
      toast.success('Batch started · status → running');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function handleComplete(batchId: string): void {
    if (!actualYield) {
      toast.error('Enter actual yield to complete batch');
      return;
    }
    try {
      completeProcessBatch(
        entityCode,
        batchId,
        {
          actual_yield: parseFloat(actualYield),
          end_date: new Date().toISOString().slice(0, 10),
        },
        { id: 'current-user', name: 'Operator' },
      );
      toast.success('Batch completed · status → completed');
      setActualYield('');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Beaker className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Process Batch Entry</h1>
        <Badge variant="outline">Process Mfg</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Recipe (approved only)</Label>
              <Select value={recipeId} onValueChange={setRecipeId}>
                <SelectTrigger><SelectValue placeholder="Select recipe..." /></SelectTrigger>
                <SelectContent>
                  {recipes.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.recipe_code} · {r.recipe_name} · v{r.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Batch Number</Label>
              <Input value={batchNo} onChange={e => setBatchNo(e.target.value)} placeholder="e.g. B-API-2026-0142" />
            </div>
            <div>
              <Label>Planned Yield</Label>
              <Input type="number" value={plannedYield} onChange={e => setPlannedYield(e.target.value)} />
            </div>
            <div>
              <Label>Yield UOM</Label>
              <Select value={yieldUom} onValueChange={setYieldUom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="litres">litres</SelectItem>
                  <SelectItem value="tonnes">tonnes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reactor ID (optional)</Label>
              <Input value={reactorId} onChange={e => setReactorId(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
          {selectedRecipe && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              Recipe expected yield: <strong>{selectedRecipe.expected_yield_pct}%</strong> ·
              Base qty: <strong>{selectedRecipe.base_quantity} {selectedRecipe.base_uom}</strong> ·
              Raw materials: <strong>{selectedRecipe.raw_materials.length}</strong> ·
              Co-products: <strong>{selectedRecipe.co_products.length}</strong> ·
              By-products: <strong>{selectedRecipe.by_products.length}</strong>
            </div>
          )}
          <Button onClick={handleCreate} className="gap-2">
            <Save className="h-4 w-4" /> Create Batch
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>In-Flight Batches ({inFlightBatches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {inFlightBatches.length === 0 && (
              <p className="text-sm text-muted-foreground">No batches in draft/running/paused/sampling state.</p>
            )}
            {inFlightBatches.map(b => (
              <div key={b.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_BADGE_VARIANT[b.status]}>{b.status}</Badge>
                  <div>
                    <p className="font-semibold font-mono">{b.batch_no}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.recipe_name} · v{b.recipe_version} · planned {b.planned_yield} {b.yield_uom}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {b.status === 'draft' && (
                    <Button size="sm" onClick={() => handleStart(b.id)} className="gap-1">
                      <Play className="h-3 w-3" /> Start
                    </Button>
                  )}
                  {b.status === 'running' && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Actual yield"
                        value={actualYield}
                        onChange={e => setActualYield(e.target.value)}
                        className="w-32"
                      />
                      <Button size="sm" onClick={() => handleComplete(b.id)} className="gap-1">
                        <Square className="h-3 w-3" /> Complete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
    </div>
  );
}
