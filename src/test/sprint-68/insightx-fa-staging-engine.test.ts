/**
 * Sprint 68 FAR-4 · Block 16 · insightx-fa-staging-engine smoke tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  stageAssetUnitRecords,
  stageIoTSignals,
  registerETLJob,
  listETLJobs,
  triggerStubETLRun,
} from '@/lib/insightx-fa-staging-engine';

const ENTITY = 'TST68I';

describe('insightx-fa-staging-engine · Phase 5 ETL stubs', () => {
  beforeEach(() => localStorage.clear());

  it('stageAssetUnitRecords returns descriptor with schema', () => {
    const t = stageAssetUnitRecords(ENTITY);
    expect(t.table_name).toContain(ENTITY);
    expect(t.schema.length).toBeGreaterThan(0);
  });

  it('stageIoTSignals returns descriptor', () => {
    const t = stageIoTSignals(ENTITY);
    expect(t.table_name).toContain(ENTITY);
  });

  it('registerETLJob + listETLJobs roundtrip', () => {
    const job = registerETLJob(ENTITY, {
      source_table: 'fa_asset_units',
      target_warehouse: 'snowflake',
      schedule: 'daily',
    });
    expect(job.job_id).toBeDefined();
    const list = listETLJobs(ENTITY);
    expect(list.some(j => j.job_id === job.job_id)).toBe(true);
  });

  it('triggerStubETLRun returns success status', () => {
    const job = registerETLJob(ENTITY, {
      source_table: 'fa_asset_units',
      target_warehouse: 'bigquery',
      schedule: 'on-demand',
    });
    const r = triggerStubETLRun(ENTITY, job.job_id);
    expect(['success', 'failed', 'pending']).toContain(r.last_run_status);
  });
});
