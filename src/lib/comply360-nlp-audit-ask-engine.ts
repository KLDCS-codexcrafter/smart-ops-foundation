/**
 * @file        src/lib/comply360-nlp-audit-ask-engine.ts
 * @sibling     NEW @ Sprint 80f · Comply360 Floor 2 Audit-Suite FINALE · Pass F · OOB-2 STUB
 * @realizes    Natural-language audit query helper · Phase 5 pattern-match heuristic only.
 *              S87 promotes to LLM-driven via Lovable AI Gateway.
 * @reads-from  comply360-audit-framework-engine (S80a · findings)
 *              comply360-audit-analytics-engine (S80b · procedure runs)
 *              comply360-audit-trail-aggregator-engine (S78a)
 *              audit-trail-engine (Phase 4)
 * @sprint      Sprint 80f · T-Phase-5.B.2.1-PASS-F
 * [JWT] Phase 8: POST /api/comply360/nlp-audit-ask
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import { listFindings, type BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-framework-engine',
    'comply360-audit-analytics-engine',
    'comply360-audit-trail-aggregator-engine',
    'audit-trail-engine',
  ],
  storage_keys: ['erp_nlp_audit_queries'],
} as const;

const STORAGE_KEY = 'erp_nlp_audit_queries';

function AUD(t: string): LogAuditEntityType {
  return t as unknown as LogAuditEntityType;
}

export type AuditQueryIntent =
  | 'list_findings_high_severity'
  | 'list_pending_verifications'
  | 'show_recent_audit_trail'
  | 'caro_coverage_status'
  | 'audit_ready_score_current'
  | 'unknown';

export interface NLPQueryResult {
  id: string;
  raw_query: string;
  detected_intent: AuditQueryIntent;
  response_text: string;
  response_data: unknown;
  generated_at: string;
  engagement_id: string;
  // S87 promotes to LLM-driven
}

interface PatternEntry {
  intent: AuditQueryIntent;
  patterns: RegExp[];
  example_queries: string[];
}

const PATTERNS: PatternEntry[] = [
  {
    intent: 'list_findings_high_severity',
    patterns: [/high.*sever|critical.*finding|serious.*finding|major.*issue/i],
    example_queries: ['Show me high severity findings', 'List critical findings'],
  },
  {
    intent: 'list_pending_verifications',
    patterns: [/pending.*verif|unverified.*voucher|to.?do.*verif/i],
    example_queries: ['What verifications are pending?', 'List unverified vouchers'],
  },
  {
    intent: 'show_recent_audit_trail',
    patterns: [/recent.*audit.?trail|last.*change|recent.*activity|last.*entries/i],
    example_queries: ['Show recent audit trail entries', 'What changed recently?'],
  },
  {
    intent: 'caro_coverage_status',
    patterns: [/caro.*coverage|caro.*status|caro.*clause/i],
    example_queries: ['What is CARO coverage?', 'CARO clause status'],
  },
  {
    intent: 'audit_ready_score_current',
    patterns: [/audit.?ready.*score|readiness.*score|how.*ready.*audit/i],
    example_queries: ['What is my audit-ready score?', 'Show readiness score'],
  },
];

function detectIntent(raw: string): AuditQueryIntent {
  for (const p of PATTERNS) {
    if (p.patterns.some((r) => r.test(raw))) return p.intent;
  }
  return 'unknown';
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Pattern-match heuristic · returns structured response for common audit queries */
export function askAuditQuery(raw_query: string, engagement_id: string): NLPQueryResult {
  const detected = detectIntent(raw_query);
  let response_text = '';
  let response_data: unknown = null;

  switch (detected) {
    case 'list_findings_high_severity': {
      const high = listFindings(engagement_id)
        .filter((f) => f.severity === 'high' || f.severity === 'critical');
      response_data = high;
      response_text = `Found ${high.length} high/critical severity finding(s) for engagement ${engagement_id}.`;
      break;
    }
    case 'list_pending_verifications': {
      response_text = 'Pending verifications require activating the audit-framework verifications dashboard.';
      response_data = { hint: 'Use AuditFrameworkDashboardPage · Procedures section.' };
      break;
    }
    case 'show_recent_audit_trail': {
      response_text = 'Recent audit trail entries are available via the Audit Replay drawer (OOB-3).';
      response_data = { hint: 'Open Replay Sample Voucher on AuditFrameworkDashboardPage.' };
      break;
    }
    case 'caro_coverage_status': {
      response_text = 'CARO coverage is computed inside the Rule 11(g) report under "CARO Clause Coverage".';
      response_data = { hint: 'Generate a Rule 11(g) report to see clause-by-clause coverage.' };
      break;
    }
    case 'audit_ready_score_current': {
      response_text = 'Audit-Ready Score is displayed on the AuditFrameworkDashboardPage banner (OOB-1).';
      response_data = { hint: 'Click "Refresh score" on the dashboard.' };
      break;
    }
    default: {
      response_text = `Sorry, I did not recognize that query. Try one of the example patterns. (S87 promotes to LLM-driven understanding.)`;
      response_data = { supported_intents: PATTERNS.map((p) => p.intent) };
    }
  }

  const result: NLPQueryResult = {
    id: uid('nlpq'),
    raw_query,
    detected_intent: detected,
    response_text,
    response_data,
    generated_at: new Date().toISOString(),
    engagement_id,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr: NLPQueryResult[] = raw ? JSON.parse(raw) : [];
    arr.push(result);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(-200)));
  } catch { /* non-fatal */ }

  try {
    logAudit({
      entityCode: 'OPERIX-DEMO',
      action: 'create',
      entityType: AUD('nlp_audit_query'),
      recordId: result.id,
      recordLabel: `NLP query · ${detected}`,
      beforeState: null,
      afterState: { intent: detected, raw_query },
      sourceModule: 'comply360-nlp-audit-ask-engine',
    });
  } catch { /* non-fatal */ }

  return result;
}

/** Get available query patterns · for UI hints */
export function getQueryPatterns(): Array<{ intent: AuditQueryIntent; example_queries: string[] }> {
  return PATTERNS.map((p) => ({ intent: p.intent, example_queries: p.example_queries }));
}

/** List historical queries */
export function listQueryHistory(engagement_id: string): NLPQueryResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr: NLPQueryResult[] = raw ? JSON.parse(raw) : [];
    return arr.filter((r) => r.engagement_id === engagement_id);
  } catch {
    return [];
  }
}

// Helper used by tests only — keeps BAPAccountId import meaningful for future extensions.
export type AuditAskBAPHint = BAPAccountId;

registerAuditEntityType({ id: 'nlp_audit_query', module: 'audit-trail', label: 'NLP Audit-Ask Query (OOB-2 stub)' });
