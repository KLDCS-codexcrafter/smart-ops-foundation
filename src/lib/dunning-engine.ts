/**
 * dunning-engine.ts — Pure dunning helpers
 * Sprint 8. Stage selection, template rendering, overdue aggregation.
 * Pure — no localStorage, no React, no toast.
 */

import type { DunningStage, DunningTemplate, DunningEmail } from '@/types/dunning';
import type { OutstandingEntry } from '@/types/voucher';

const STAGE_ORDER: DunningStage[] = ['polite', 'firm', 'final', 'legal'];

/** Choose the stage based on days overdue and configured triggers. */
export function selectStage(
  daysOverdue: number,
  templates: DunningTemplate[],
  lastSentStage: DunningStage | null,
): DunningStage | null {
  const byStage = Object.fromEntries(templates.map(t => [t.stage, t])) as Record<DunningStage, DunningTemplate>;
  let chosen: DunningStage | null = null;
  for (const s of STAGE_ORDER) {
    const tpl = byStage[s];
    if (tpl && daysOverdue >= tpl.trigger_days_overdue) chosen = s;
  }
  if (!chosen) return null;
  if (lastSentStage) {
    const lastIdx = STAGE_ORDER.indexOf(lastSentStage);
    const chosenIdx = STAGE_ORDER.indexOf(chosen);
    if (chosenIdx <= lastIdx) {
      // Already sent this or higher; suggest next stage if available
      const nextIdx = lastIdx + 1;
      if (nextIdx < STAGE_ORDER.length) return STAGE_ORDER[nextIdx];
      return null;
    }
  }
  return chosen;
}

/** Render a template with variable substitution. */
export function renderDunningTemplate(
  template: DunningTemplate,
  vars: {
    party_name: string;
    voucher_nos: string;
    total_overdue: number;
    days_overdue: number;
    payment_link: string;
    sender_name: string;
  },
): { subject: string; body: string } {
  const replace = (s: string) =>
    s.replace(/\{party_name\}/g, vars.party_name)
      .replace(/\{voucher_nos\}/g, vars.voucher_nos)
      .replace(/\{total_overdue\}/g, vars.total_overdue.toLocaleString('en-IN'))
      .replace(/\{days_overdue\}/g, String(vars.days_overdue))
      .replace(/\{payment_link\}/g, vars.payment_link)
      .replace(/\{sender_name\}/g, vars.sender_name);
  return { subject: replace(template.subject), body: replace(template.body) };
}

export interface PartyOverdueAggregate {
  party_id: string;
  party_name: string;
  voucher_ids: string[];
  voucher_nos: string[];
  total_overdue: number;
  max_days_overdue: number;
}

/** Aggregate overdue outstanding entries per party. */
export function aggregateOverdueForParty(
  entries: OutstandingEntry[],
  today: string = new Date().toISOString().slice(0, 10),
): PartyOverdueAggregate[] {
  const todayMs = new Date(today).getTime();
  const map = new Map<string, PartyOverdueAggregate>();
  for (const e of entries) {
    if (e.status !== 'open' && e.status !== 'partial') continue;
    if (e.due_date >= today) continue;
    const days = Math.max(0, Math.floor((todayMs - new Date(e.due_date).getTime()) / 86400000));
    const cur = map.get(e.party_id) ?? {
      party_id: e.party_id, party_name: e.party_name,
      voucher_ids: [], voucher_nos: [], total_overdue: 0, max_days_overdue: 0,
    };
    cur.voucher_ids.push(e.voucher_id);
    cur.voucher_nos.push(e.voucher_no);
    cur.total_overdue += e.pending_amount;
    if (days > cur.max_days_overdue) cur.max_days_overdue = days;
    map.set(e.party_id, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.total_overdue - a.total_overdue);
}

/** Find the last dunning stage sent to a party. Returns null if never sent. */
export function lastSentStageFor(
  partyId: string, sent: DunningEmail[],
): DunningStage | null {
  const ordered = sent
    .filter(d => d.party_id === partyId)
    .sort((a, b) => b.sent_at.localeCompare(a.sent_at));
  return ordered[0]?.stage ?? null;
}
