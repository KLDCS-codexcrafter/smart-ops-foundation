/**
 * @file     process-batch-engine.ts
 * @sprint   T-Phase-3.PROD-3.5.PASS1 · ST3 · 32nd SIBLING ⭐
 * @purpose  Process/continuous-flow batch lifecycle engine.
 *           Q-LOCK-3 Option A · SEPARATE 8-state machine from discrete 6-state.
 *           Q-LOCK-9 Option A · own entity · own storage key.
 *           ProductionOrder 6-state machine stays 0-diff (invariant #3).
 *           FR-19 SIBLING (single-source: process batch lifecycle) · FR-26 entity-scoped.
 *           Q-LOCK-1 generic Indian SMB pattern · NO vendor-specific reactor adapters.
 * @reuses   period-lock-engine (period locks) · machine.ts (reactor as Machine)
 * @[JWT]    Phase 2: POST /api/process-batch/create
 */
import type {
  ProcessBatch,
  ProcessBatchStatus,
  ProcessBatchStatusEvent,
  ProcessBatchByProduct,
  ProcessBatchCoProduct,
  ProcessBatchSample,
  ProcessParameterTrace,
  CIPRecord,
} from '@/types/process-batch';
import { processBatchesKey } from '@/types/process-batch';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';

// Local lsRead/lsWrite helpers (matches Sprint 58 pattern · no shared import)
const lsRead = <T>(key: string, def: T): T => {
  try {
    // [JWT] GET /api/process-batch/list
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : def;
  } catch {
    return def;
  }
};
const lsWrite = <T>(key: string, value: T): void => {
  try {
    // [JWT] PUT /api/process-batch/persist
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

// ============================================================================
// 8-STATE MACHINE · SEPARATE from ProductionOrder 6-state (invariant #3)
// ============================================================================

const ALLOWED_PROCESS_TRANSITIONS: Record<ProcessBatchStatus, ProcessBatchStatus[]> = {
  draft: ['running', 'cancelled'],
  running: ['paused', 'sampling', 'changeover', 'completed', 'rejected', 'cancelled'],
  paused: ['running', 'rejected', 'cancelled'],
  sampling: ['running', 'holding'],
  changeover: ['cip_clean', 'cancelled'],
  cip_clean: ['draft', 'completed'],
  holding: ['running', 'rejected'],
  completed: [],
  rejected: [],
  cancelled: [],
};

export function canProcessTransition(
  from: ProcessBatchStatus,
  to: ProcessBatchStatus,
): boolean {
  return ALLOWED_PROCESS_TRANSITIONS[from].includes(to);
}

export function transitionProcessBatchState(
  batch: ProcessBatch,
  to: ProcessBatchStatus,
  user: { id: string; name: string },
  note: string,
): ProcessBatch {
  if (!canProcessTransition(batch.status, to)) {
    throw new Error(`Process batch: cannot transition from ${batch.status} to ${to}`);
  }
  const event: ProcessBatchStatusEvent = {
    id: `pbse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from_status: batch.status,
    to_status: to,
    changed_by_id: user.id,
    changed_by_name: user.name,
    changed_at: new Date().toISOString(),
    note,
  };
  return {
    ...batch,
    status: to,
    status_history: [...batch.status_history, event],
    updated_at: event.changed_at,
  };
}

// ============================================================================
// CRUD · CREATE / LIFECYCLE / READ
// ============================================================================

export interface CreateProcessBatchInput {
  entity_id: string;
  batch_no: string;
  recipe_id: string;
  recipe_name: string;
  recipe_version: string;
  planned_yield: number;
  yield_uom: string;
  reactor_id?: string | null;
  operator_ids?: string[];
  shift_id?: string | null;
  notes?: string;
  start_date?: string;
}

export function createProcessBatch(
  input: CreateProcessBatchInput,
  user: { id: string; name: string },
): ProcessBatch {
  // Sprint 58 PASS 2B-i institutional canon: period-lock + future-date guards
  if (input.start_date) {
    if (isPeriodLocked(input.start_date, input.entity_id)) {
      throw new Error(periodLockMessage(input.start_date, input.entity_id) ?? 'Period locked');
    }
    const today = new Date().toISOString().slice(0, 10);
    if (input.start_date > today) {
      throw new Error('Transaction date cannot be in the future');
    }
  }

  const now = new Date().toISOString();
  const batch: ProcessBatch = {
    id: `pb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: input.entity_id,
    batch_no: input.batch_no,
    recipe_id: input.recipe_id,
    recipe_name: input.recipe_name,
    recipe_version: input.recipe_version,
    planned_yield: input.planned_yield,
    actual_yield: null,
    yield_uom: input.yield_uom,
    start_time: null,
    end_time: null,
    reactor_id: input.reactor_id ?? null,
    operator_ids: input.operator_ids ?? [],
    shift_id: input.shift_id ?? null,
    status: 'draft',
    raw_material_lots: [],
    by_products: [],
    co_products: [],
    in_process_samples: [],
    process_parameters: [],
    yield_variance: 0,
    status_history: [
      {
        id: `pbse-${Date.now()}-init`,
        from_status: null,
        to_status: 'draft',
        changed_by_id: user.id,
        changed_by_name: user.name,
        changed_at: now,
        note: 'Process batch created',
      },
    ],
    cip_record: null,
    notes: input.notes ?? '',
    created_at: now,
    updated_at: now,
  };

  const all = lsRead<ProcessBatch[]>(processBatchesKey(input.entity_id), []);
  all.unshift(batch);
  lsWrite(processBatchesKey(input.entity_id), all);

  return batch;
}

export function startProcessBatch(
  entityCode: string,
  batchId: string,
  user: { id: string; name: string },
): ProcessBatch {
  const batch = getProcessBatch(entityCode, batchId);
  if (!batch) throw new Error(`Process batch not found: ${batchId}`);
  const updated = transitionProcessBatchState(batch, 'running', user, 'Batch started');
  updated.start_time = new Date().toISOString();
  persistProcessBatch(entityCode, updated);
  return updated;
}

export function pauseProcessBatch(
  entityCode: string,
  batchId: string,
  user: { id: string; name: string },
  reason: string,
): ProcessBatch {
  const batch = getProcessBatch(entityCode, batchId);
  if (!batch) throw new Error(`Process batch not found: ${batchId}`);
  const updated = transitionProcessBatchState(batch, 'paused', user, `Paused: ${reason}`);
  persistProcessBatch(entityCode, updated);
  return updated;
}

export function recordProcessParameters(
  entityCode: string,
  batchId: string,
  params: Omit<ProcessParameterTrace, 'recorded_at'>[],
): ProcessBatch {
  const batch = getProcessBatch(entityCode, batchId);
  if (!batch) throw new Error(`Process batch not found: ${batchId}`);
  if (batch.status !== 'running') {
    throw new Error(`Cannot record parameters in status: ${batch.status}`);
  }
  const now = new Date().toISOString();
  const newParams: ProcessParameterTrace[] = params.map(p => ({ ...p, recorded_at: now }));
  const updated: ProcessBatch = {
    ...batch,
    process_parameters: [...batch.process_parameters, ...newParams],
    updated_at: now,
  };
  persistProcessBatch(entityCode, updated);
  return updated;
}

export function takeSample(
  entityCode: string,
  batchId: string,
  sample: Omit<ProcessBatchSample, 'id' | 'taken_at'>,
): ProcessBatch {
  const batch = getProcessBatch(entityCode, batchId);
  if (!batch) throw new Error(`Process batch not found: ${batchId}`);
  const now = new Date().toISOString();
  const newSample: ProcessBatchSample = {
    ...sample,
    id: `pbs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    taken_at: now,
  };
  const updated: ProcessBatch = {
    ...batch,
    in_process_samples: [...batch.in_process_samples, newSample],
    updated_at: now,
  };
  persistProcessBatch(entityCode, updated);
  return updated;
}

export interface CompleteProcessBatchInput {
  actual_yield: number;
  by_products?: ProcessBatchByProduct[];
  co_products?: ProcessBatchCoProduct[];
  end_date?: string;
}

export function completeProcessBatch(
  entityCode: string,
  batchId: string,
  input: CompleteProcessBatchInput,
  user: { id: string; name: string },
): ProcessBatch {
  const batch = getProcessBatch(entityCode, batchId);
  if (!batch) throw new Error(`Process batch not found: ${batchId}`);

  // Sprint 58 institutional canon: period-lock + future-date guards
  if (input.end_date) {
    if (isPeriodLocked(input.end_date, batch.entity_id)) {
      throw new Error(periodLockMessage(input.end_date, batch.entity_id) ?? 'Period locked');
    }
    const today = new Date().toISOString().slice(0, 10);
    if (input.end_date > today) {
      throw new Error('Transaction date cannot be in the future');
    }
  }

  const transitioned = transitionProcessBatchState(batch, 'completed', user, 'Batch completed');
  const yieldVariance =
    batch.planned_yield > 0
      ? ((input.actual_yield - batch.planned_yield) / batch.planned_yield) * 100
      : 0;

  const completed: ProcessBatch = {
    ...transitioned,
    actual_yield: input.actual_yield,
    by_products: input.by_products ?? [],
    co_products: input.co_products ?? [],
    yield_variance: yieldVariance,
    end_time: new Date().toISOString(),
  };
  persistProcessBatch(entityCode, completed);
  return completed;
}

export function rejectProcessBatch(
  entityCode: string,
  batchId: string,
  user: { id: string; name: string },
  reason: string,
): ProcessBatch {
  const batch = getProcessBatch(entityCode, batchId);
  if (!batch) throw new Error(`Process batch not found: ${batchId}`);
  const updated = transitionProcessBatchState(batch, 'rejected', user, `Rejected: ${reason}`);
  updated.end_time = new Date().toISOString();
  persistProcessBatch(entityCode, updated);
  return updated;
}

export function recordCIP(
  entityCode: string,
  batchId: string,
  cip: Omit<CIPRecord, 'cip_id'>,
  user: { id: string; name: string },
): ProcessBatch {
  const batch = getProcessBatch(entityCode, batchId);
  if (!batch) throw new Error(`Process batch not found: ${batchId}`);
  const cipRecord: CIPRecord = {
    ...cip,
    cip_id: `cip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  const transitioned = transitionProcessBatchState(batch, 'cip_clean', user, 'CIP recorded');
  const updated: ProcessBatch = { ...transitioned, cip_record: cipRecord };
  persistProcessBatch(entityCode, updated);
  return updated;
}

// ============================================================================
// READ HELPERS
// ============================================================================

export function listProcessBatches(entityCode: string): ProcessBatch[] {
  return lsRead<ProcessBatch[]>(processBatchesKey(entityCode), []);
}

export function getProcessBatch(entityCode: string, batchId: string): ProcessBatch | null {
  const all = listProcessBatches(entityCode);
  return all.find(b => b.id === batchId) ?? null;
}

export function listProcessBatchesByStatus(
  entityCode: string,
  status: ProcessBatchStatus,
): ProcessBatch[] {
  return listProcessBatches(entityCode).filter(b => b.status === status);
}

export function listProcessBatchesByRecipe(
  entityCode: string,
  recipeId: string,
): ProcessBatch[] {
  return listProcessBatches(entityCode).filter(b => b.recipe_id === recipeId);
}

// ============================================================================
// PERSIST HELPER
// ============================================================================

export function persistProcessBatch(entityCode: string, batch: ProcessBatch): void {
  const all = lsRead<ProcessBatch[]>(processBatchesKey(entityCode), []);
  const idx = all.findIndex(b => b.id === batch.id);
  if (idx >= 0) {
    all[idx] = batch;
  } else {
    all.unshift(batch);
  }
  lsWrite(processBatchesKey(entityCode), all);
}
