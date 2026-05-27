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
    expect(stageIoTSignals(ENTITY).table_name).toContain(ENTITY);
  });

  it('registerETLJob + listETLJobs roundtrip', () => {
    const job = registerETLJob(ENTITY, {
      source_table: 'fa_asset_unit_records',
      target_warehouse: 'snowflake',
      schedule: 'daily',
    });
    expect(job.job_id).toBeDefined();
    expect(listETLJobs(ENTITY).some(j => j.job_id === job.job_id)).toBe(true);
  });

  it('triggerStubETLRun returns success status', () => {
    const job = registerETLJob(ENTITY, {
      source_table: 'fa_asset_unit_records',
      target_warehouse: 'bigquery',
      schedule: 'on-demand',
    });
    const r = triggerStubETLRun(ENTITY, job.job_id);
    expect(r.status).toBe('success');
    expect(typeof r.rows_staged).toBe('number');
  });
});
