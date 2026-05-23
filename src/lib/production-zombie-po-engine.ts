/**
 * @file        src/lib/production-zombie-po-engine.ts
 * @sprint      T-Phase-3.PROD-1 · ST8 · PROD-LEAK-4 · Q-LOCK-11 · Q-LOCK-16
 * @purpose     Detect stale released/in_progress POs · WhatsApp notify on critical.
 *              Sub-helper · NOT a new SIBLING.
 * @[JWT]       GET /api/production/zombie-pos · POST /api/notify/whatsapp
 */
import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';
import type { WaTemplate } from '@/types/wa-template';

const ZOMBIE_WARNING_DAYS = 14;
const ZOMBIE_CRITICAL_DAYS = 30;
const ZOMBIE_CANCEL_SUGGEST_DAYS = 60;

export interface ZombiePOAlert {
  po_id: string;
  po_no: string;
  status: 'released' | 'in_progress';
  target_end: string;
  days_past_target: number;
  severity: 'warning' | 'critical' | 'cancel_suggested';
  created_by: string;
  created_by_email: string;
}

const waTemplatesKey = (entityCode: string): string =>
  `erp_wa_templates_${entityCode}`;

function lsRead<T>(key: string, fallback: T): T {
  try {
    // [JWT] GET /api/* (engine-side)
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite(key: string, value: unknown): void {
  try {
    // [JWT] POST/PUT /api/*
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

function daysBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function detectZombiePOs(entityCode: string): ZombiePOAlert[] {
  const pos = lsRead<ProductionOrder[]>(productionOrdersKey(entityCode), []);
  const now = new Date().toISOString();
  const out: ZombiePOAlert[] = [];

  for (const po of pos) {
    if (po.status !== 'released' && po.status !== 'in_progress') continue;
    if (!po.target_end_date) continue;
    const days = daysBetween(po.target_end_date, now);
    if (days < ZOMBIE_WARNING_DAYS) continue;
    const severity: ZombiePOAlert['severity'] =
      days >= ZOMBIE_CANCEL_SUGGEST_DAYS ? 'cancel_suggested'
      : days >= ZOMBIE_CRITICAL_DAYS ? 'critical'
      : 'warning';
    out.push({
      po_id: po.id,
      po_no: po.doc_no,
      status: po.status,
      target_end: po.target_end_date,
      days_past_target: days,
      severity,
      created_by: po.created_by,
      created_by_email: '',
    });
  }
  return out;
}

const ZOMBIE_CRITICAL_TEMPLATE_ID = 'production_zombie_po_critical';

function ensureZombieTemplate(entityCode: string): void {
  const templates = lsRead<WaTemplate[]>(waTemplatesKey(entityCode), []);
  if (templates.some(t => t.template_code === ZOMBIE_CRITICAL_TEMPLATE_ID)) return;
  const now = new Date().toISOString();
  const seeded: WaTemplate = {
    id: `wat-zombie-${entityCode}`,
    entity_id: entityCode,
    template_code: ZOMBIE_CRITICAL_TEMPLATE_ID,
    template_name: 'Production Zombie PO Critical Alert',
    category: 'reminder',
    body:
      'CRITICAL: Production Order {product} is {amount} days past target end. ' +
      'Owner {salesman} please action immediately.',
    language: 'en',
    is_active: true,
    use_count: 0,
    created_at: now,
    updated_at: now,
  };
  lsWrite(waTemplatesKey(entityCode), [...templates, seeded]);
}

const notifyLogKey = (entityCode: string): string =>
  `erp_zombie_po_notify_log_${entityCode}`;

export function notifyZombiePOCritical(alert: ZombiePOAlert, entityCode: string): void {
  ensureZombieTemplate(entityCode);
  // Idempotent · skip if already notified for this PO at this severity
  interface NotifyLogEntry { po_id: string; severity: string; notified_at: string; }
  const log = lsRead<NotifyLogEntry[]>(notifyLogKey(entityCode), []);
  const existing = log.find(e => e.po_id === alert.po_id && e.severity === alert.severity);
  if (existing) return;
  log.push({
    po_id: alert.po_id,
    severity: alert.severity,
    notified_at: new Date().toISOString(),
  });
  lsWrite(notifyLogKey(entityCode), log);
  // [JWT] POST /api/notify/whatsapp · template ZOMBIE_CRITICAL_TEMPLATE_ID
}
