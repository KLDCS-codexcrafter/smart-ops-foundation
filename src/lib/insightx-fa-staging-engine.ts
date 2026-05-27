/**
 * @file        src/lib/insightx-fa-staging-engine.ts
 * @sibling     NEW @ Sprint 68 FAR-4 · 54th SIBLING
 * @purpose     Data lake staging hooks + ETL stubs for Phase 5 InsightX capstone.
 * @approach    Q-LOCK-10 A · staging-only · NO live data-lake integration ·
 *              Phase 5 InsightX capstone lights up actual ETL.
 * [JWT] Phase 5 REST endpoints: POST /api/insightx/etl-jobs · POST /api/insightx/staging/run
 */
import type { AssetUnitRecord } from '@/types/fixed-asset';

export interface StagingColumn {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  nullable: boolean;
}

export interface StagingTable {
  table_name: string;
  schema: StagingColumn[];
  last_staged_at?: string;
  row_count: number;
}

export interface ETLJobStub {
  job_id: string;
  source_table: string;
  target_warehouse: 'snowflake' | 'bigquery' | 'redshift' | 'lake-local';
  schedule: 'daily' | 'hourly' | 'on-demand';
  last_run_at?: string;
  last_run_status: 'pending' | 'success' | 'failed';
}

const assetKey = (e: string) => `4ds_fa_asset_unit_records_${e}`;
const iotKey = (e: string, a: string) => `4ds_iot_asset_stream_${e}_${a}`;
const jobsKey = (e: string) => `4ds_insightx_etl_jobs_${e}`;

const ASSET_SCHEMA: StagingColumn[] = [
  { name: 'asset_unit_record_id', type: 'string', nullable: false },
  { name: 'asset_code', type: 'string', nullable: false },
  { name: 'asset_name', type: 'string', nullable: false },
  { name: 'gross_block_paise', type: 'number', nullable: false },
  { name: 'acquired_on', type: 'date', nullable: true },
  { name: 'custodian_employee_id', type: 'string', nullable: true },
  { name: 'category_code', type: 'string', nullable: true },
  { name: 'iot_signal_payload', type: 'json', nullable: true },
];

const IOT_SCHEMA: StagingColumn[] = [
  { name: 'signal_id', type: 'string', nullable: false },
  { name: 'asset_unit_record_id', type: 'string', nullable: false },
  { name: 'signal_type', type: 'string', nullable: false },
  { name: 'value', type: 'number', nullable: false },
  { name: 'unit', type: 'string', nullable: true },
  { name: 'captured_at', type: 'date', nullable: false },
];

/**
 * Stage AssetUnitRecord rows for InsightX consumption · returns staging
 * table descriptor with current row count.
 */
export function stageAssetUnitRecords(entityCode: string): StagingTable {
  let rows: AssetUnitRecord[] = [];
  try {
    // [JWT] GET /api/fa/asset-unit-records?entity={entityCode}
    const raw = localStorage.getItem(assetKey(entityCode));
    if (raw) rows = JSON.parse(raw) as AssetUnitRecord[];
  } catch {
    rows = [];
  }
  return {
    table_name: `insightx_stg_fa_asset_unit_records_${entityCode}`,
    schema: ASSET_SCHEMA,
    last_staged_at: new Date().toISOString(),
    row_count: rows.length,
  };
}

/**
 * Stage IoT signal stream for InsightX time-series analytics.
 */
export function stageIoTSignals(entityCode: string, since?: string): StagingTable {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(`4ds_iot_asset_stream_${entityCode}_`)) continue;
      void iotKey;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const arr = JSON.parse(raw) as Array<{ captured_at?: string }>;
      if (!Array.isArray(arr)) continue;
      const filtered = since ? arr.filter((s) => (s.captured_at ?? '') >= since) : arr;
      total += filtered.length;
    }
  } catch {
    total = 0;
  }
  return {
    table_name: `insightx_stg_fa_iot_signals_${entityCode}`,
    schema: IOT_SCHEMA,
    last_staged_at: new Date().toISOString(),
    row_count: total,
  };
}

/**
 * Register an ETL job stub (Phase 5 lights up real warehouse connection).
 */
export function registerETLJob(
  entityCode: string,
  job: Omit<ETLJobStub, 'job_id' | 'last_run_status'>,
): ETLJobStub {
  const stub: ETLJobStub = {
    ...job,
    job_id: `etl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    last_run_status: 'pending',
  };
  try {
    // [JWT] POST /api/insightx/etl-jobs
    const raw = localStorage.getItem(jobsKey(entityCode));
    const arr = raw ? (JSON.parse(raw) as ETLJobStub[]) : [];
    arr.push(stub);
    localStorage.setItem(jobsKey(entityCode), JSON.stringify(arr));
  } catch {
    /* ignore */
  }
  return stub;
}

/**
 * List all registered ETL jobs for an entity.
 */
export function listETLJobs(entityCode: string): ETLJobStub[] {
  try {
    // [JWT] GET /api/insightx/etl-jobs?entity={entityCode}
    const raw = localStorage.getItem(jobsKey(entityCode));
    if (!raw) return [];
    const arr = JSON.parse(raw) as ETLJobStub[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Trigger a stub ETL run (Phase 5 does real execution).
 */
export function triggerStubETLRun(
  entityCode: string,
  job_id: string,
): { status: 'success'; rows_staged: number } {
  const jobs = listETLJobs(entityCode);
  const idx = jobs.findIndex((j) => j.job_id === job_id);
  let rows_staged = 0;
  if (idx >= 0) {
    const job = jobs[idx];
    if (job.source_table.includes('asset_unit_records')) {
      rows_staged = stageAssetUnitRecords(entityCode).row_count;
    } else if (job.source_table.includes('iot_signals')) {
      rows_staged = stageIoTSignals(entityCode).row_count;
    }
    jobs[idx] = {
      ...job,
      last_run_at: new Date().toISOString(),
      last_run_status: 'success',
    };
    try {
      // [JWT] POST /api/insightx/staging/run
      localStorage.setItem(jobsKey(entityCode), JSON.stringify(jobs));
    } catch {
      /* ignore */
    }
  }
  return { status: 'success', rows_staged };
}
