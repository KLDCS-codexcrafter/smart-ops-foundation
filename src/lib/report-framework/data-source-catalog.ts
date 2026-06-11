/**
 * @file        data-source-catalog.ts
 * @sprint      RPT-3b · Plant the Data Source Catalog (DSC)
 * @purpose     The spine for the RPT-9 report builder and RPT-11 InsightX
 *              aggregator. A React-free, read-only catalog of every data
 *              source any report/dashboard can consume.
 *
 * Read-only-lock: this file has ZERO react imports, ZERO localStorage.setItem,
 * ZERO post*/save*/write* helpers. The builder's non-mutation guarantee
 * starts here — a test grep-asserts it.
 */

export interface DataSourceField {
  key: string;
  label: string;
  kind: 'dimension' | 'measure';
}

export interface DataSource {
  id: string;
  label: string;
  card: string;
  kind: 'daybook' | 'register' | 'kpi';
  fields: DataSourceField[];
  entitlementKey?: string;
  read: (entityCode: string) => Record<string, unknown>[];
}

const CATALOG: DataSource[] = [];

/** Idempotent register by id. Re-register replaces the entry in-place. */
export function registerSource(src: DataSource): void {
  const idx = CATALOG.findIndex((s) => s.id === src.id);
  if (idx >= 0) CATALOG[idx] = src;
  else CATALOG.push(src);
}

export function getSource(id: string): DataSource | undefined {
  return CATALOG.find((s) => s.id === id);
}

export function listSources(): DataSource[] {
  return [...CATALOG];
}

export function listSourcesByCard(card: string): DataSource[] {
  return CATALOG.filter((s) => s.card === card);
}

/** Test-only · clears the catalog. Not exported from the barrel. */
export function __resetDataSourceCatalogForTests(): void {
  CATALOG.length = 0;
}
