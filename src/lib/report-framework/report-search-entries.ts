/**
 * @file        report-search-entries.ts
 * @sprint      RPT-12a · Block 3 · Global fuzzy report-finder
 * @purpose     Registers one CommandEntry per (a) registered DSC source,
 *              (b) seeded KPI, (c) saved report definition into the EXISTING
 *              command-palette-registry. Consumes the registry's own
 *              CommandEntry type — no new matcher; the palette's existing
 *              fuzzy matcher (matchCommands) does the scoring.
 *
 *              command-palette-registry.ts stays 0-DIFF; integration is via
 *              its exported types + mutating its exported BASE_COMMANDS array.
 *              Idempotent.
 */

import { BASE_COMMANDS, type CommandEntry } from '@/lib/command-palette-registry';
import type { CardId } from '@/types/card-entitlement';
import { listSources } from './data-source-catalog';
import { listKpis } from './kpi-registry';
import { REPORT_DEFINITIONS_KEY, type ReportDefinition } from './report-definitions';

let didRegister = false;
const OWNED_PREFIX = 'rpt12a-';

function safeReadDefs(): ReportDefinition[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(REPORT_DEFINITIONS_KEY);
    return raw ? (JSON.parse(raw) as ReportDefinition[]) : [];
  } catch {
    return [];
  }
}

function cardRoute(cardId: string): string {
  // Maps a card id to its top-level ERP route. The palette navigates here;
  // each card's sidebar surfaces the *-rpt-report-builder module that already
  // renders the embedded <ReportBuilder>. Heuristic — for unknown cards we
  // emit /erp/<cardId>.
  return `/erp/${cardId}`;
}

export function buildReportSearchEntries(): CommandEntry[] {
  const out: CommandEntry[] = [];

  // (a) Registered DSC sources
  for (const s of listSources()) {
    out.push({
      id: `${OWNED_PREFIX}src-${s.id}`,
      label: `Report · ${s.label}`,
      keywords: `report builder source ${s.id} ${s.card} ${s.kind} ${s.fields.map((f) => f.key).join(' ')}`,
      card_id: s.card as CardId,
      action: 'navigate_module',
      target_route: cardRoute(s.card),
      subtitle: `DSC · ${s.kind}`,
    });
  }

  // (b) Seeded KPIs
  for (const k of listKpis()) {
    // Best-effort card derivation: KPI ids are typically `<card-prefix>-…`.
    const prefix = k.id.split('-')[0];
    out.push({
      id: `${OWNED_PREFIX}kpi-${k.id}`,
      label: `KPI · ${k.label}`,
      keywords: `kpi metric ${k.id} ${k.dataSource} ${k.label.toLowerCase()}`,
      card_id: prefix as CardId,
      action: 'navigate_module',
      target_route: cardRoute(prefix),
      subtitle: 'KPI',
    });
  }

  // (c) Saved report definitions
  for (const d of safeReadDefs()) {
    out.push({
      id: `${OWNED_PREFIX}saved-${d.id}`,
      label: `Saved · ${d.name}`,
      keywords: `saved report ${d.name.toLowerCase()} ${d.sourceId} ${d.cardId} ${d.scope}`,
      card_id: d.cardId as CardId,
      action: 'navigate_module',
      target_route: cardRoute(d.cardId),
      subtitle: `Saved · ${d.scope}`,
    });
  }

  return out;
}

/**
 * Idempotent: pushes report search entries into BASE_COMMANDS in place.
 * Safe to call multiple times — previous owned entries are removed first.
 */
export function registerReportSearchEntries(): CommandEntry[] {
  // Remove any previously-registered owned entries
  for (let i = BASE_COMMANDS.length - 1; i >= 0; i--) {
    if (BASE_COMMANDS[i].id.startsWith(OWNED_PREFIX)) BASE_COMMANDS.splice(i, 1);
  }
  const entries = buildReportSearchEntries();
  for (const e of entries) BASE_COMMANDS.push(e);
  didRegister = true;
  return entries;
}

export function isReportSearchRegistered(): boolean {
  return didRegister;
}

/** Test-only · reset registration state. */
export function __resetReportSearchRegistrationForTests(): void {
  for (let i = BASE_COMMANDS.length - 1; i >= 0; i--) {
    if (BASE_COMMANDS[i].id.startsWith(OWNED_PREFIX)) BASE_COMMANDS.splice(i, 1);
  }
  didRegister = false;
}
