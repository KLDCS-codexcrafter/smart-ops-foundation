/**
 * @file        src/lib/comply360-legal-notices-engine.ts
 * @sibling     NEW @ Sprint 82 · DP-S82-5 · Q27a · 10-module Legal & Notices framework
 * @reads-from  comply360-audit-framework-engine · audit-trail-engine · aggregator
 * @sprint      Sprint 82 · T-Phase-5.B.2.3 · FLOOR 2 CLOSES
 * [JWT] Phase 8: POST /api/comply360/legal-notices/*
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-framework-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: [
    'erp_legal_notices', 'erp_gst_appeals', 'erp_it_notices',
    'erp_roc_notices', 'erp_litigation_cases', 'erp_notice_templates',
  ],
} as const;

const NOTICE_KEY = 'erp_legal_notices';
const APPEAL_KEY = 'erp_gst_appeals';
const LIT_KEY = 'erp_litigation_cases';
const TPL_KEY = 'erp_notice_templates';

function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJson(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
}

export type NoticeType =
  | 'IT_Section_143' | 'IT_Section_148' | 'IT_Section_154' | 'IT_Section_142_1'
  | 'ROC_Section_248' | 'ROC_Section_241'
  | 'GST_DRC_01' | 'GST_DRC_07' | 'GST_DRC_22' | 'Show_Cause' | 'Other';

export type NoticeStatus = 'received' | 'response_drafted' | 'responded' | 'appealed' | 'closed';
export type GSTAppealStage = 'APL_01_first_appeal' | 'APL_04_second_appeal' | 'high_court' | 'supreme_court';
export type LitigationCaseType = 'civil' | 'criminal' | 'tax_appeal' | 'company_law' | 'consumer' | 'arbitration' | 'other';

export interface LegalNotice {
  id: string;
  entity_code: string;
  notice_type: NoticeType;
  notice_number: string;
  issuing_authority: string;
  notice_date: string;
  response_deadline: string;
  amount_demanded_inr: number | null;
  subject: string;
  status: NoticeStatus;
  response_filed_at: string | null;
  recorded_by_bap: BAPAccountId;
  created_at: string;
}

export interface GSTAppeal {
  id: string;
  notice_id: string | null;
  stage: GSTAppealStage;
  filed_date: string;
  filing_authority: string;
  grounds_of_appeal: string;
  amount_disputed_inr: number;
  hearing_date: string | null;
  outcome: 'pending' | 'partly_allowed' | 'allowed' | 'dismissed' | null;
  recorded_by_bap: BAPAccountId;
  created_at: string;
}

export interface LitigationCase {
  id: string;
  case_number: string;
  case_title: string;
  court_name: string;
  case_type: LitigationCaseType;
  filed_date: string;
  next_hearing_date: string | null;
  counsel_name: string;
  amount_at_stake_inr: number | null;
  case_status: 'pending' | 'argued' | 'reserved' | 'disposed';
  outcome: string | null;
  recorded_by_bap: BAPAccountId;
  created_at: string;
}

export interface NoticeTemplate {
  id: string;
  template_name: string;
  template_type: NoticeType;
  template_body: string;
  variables: string[];
  authored_by_bap: BAPAccountId;
  created_at: string;
}

export function recordLegalNotice(
  input: Omit<LegalNotice, 'id' | 'created_at' | 'status' | 'response_filed_at'>,
): LegalNotice {
  const notice: LegalNotice = {
    ...input,
    id: uid('ln'),
    status: 'received',
    response_filed_at: null,
    created_at: new Date().toISOString(),
  };
  const all = readJson<LegalNotice[]>(NOTICE_KEY, []);
  all.push(notice);
  writeJson(NOTICE_KEY, all);
  logAudit({
    entityCode: input.entity_code,
    action: 'create',
    entityType: AUD('legal_notice'),
    recordId: notice.id,
    recordLabel: `Legal Notice · ${input.notice_type} · ${input.notice_number}`,
    beforeState: null,
    afterState: notice as unknown as Record<string, unknown>,
    sourceModule: 'comply360-legal-notices-engine',
  });
  return notice;
}

export function updateNoticeStatus(
  notice_id: string,
  status: NoticeStatus,
  by_bap: BAPAccountId,
  notes?: string,
): LegalNotice {
  const all = readJson<LegalNotice[]>(NOTICE_KEY, []);
  const idx = all.findIndex((n) => n.id === notice_id);
  if (idx < 0) throw new Error(`Notice not found: ${notice_id}`);
  const before = { ...all[idx] };
  all[idx] = {
    ...all[idx],
    status,
    response_filed_at: status === 'responded' ? new Date().toISOString() : all[idx].response_filed_at,
  };
  writeJson(NOTICE_KEY, all);
  logAudit({
    entityCode: all[idx].entity_code,
    action: 'update',
    entityType: AUD('legal_notice'),
    recordId: notice_id,
    recordLabel: `Notice status → ${status}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    reason: notes ?? `by ${by_bap}`,
    sourceModule: 'comply360-legal-notices-engine',
  });
  return all[idx];
}

export function listLegalNotices(
  entity_code: string,
  opts?: { notice_type?: NoticeType; status?: NoticeStatus },
): LegalNotice[] {
  return readJson<LegalNotice[]>(NOTICE_KEY, [])
    .filter((n) => n.entity_code === entity_code)
    .filter((n) => !opts?.notice_type || n.notice_type === opts.notice_type)
    .filter((n) => !opts?.status || n.status === opts.status);
}

export function fileGSTAppeal(
  input: Omit<GSTAppeal, 'id' | 'created_at' | 'outcome' | 'hearing_date'>,
): GSTAppeal {
  const appeal: GSTAppeal = {
    ...input,
    id: uid('apl'),
    outcome: 'pending',
    hearing_date: null,
    created_at: new Date().toISOString(),
  };
  const all = readJson<GSTAppeal[]>(APPEAL_KEY, []);
  all.push(appeal);
  writeJson(APPEAL_KEY, all);
  logAudit({
    entityCode: 'OPERIX-DEMO',
    action: 'create',
    entityType: AUD('gst_appeal'),
    recordId: appeal.id,
    recordLabel: `GST Appeal · ${input.stage} · ₹${input.amount_disputed_inr}`,
    beforeState: null,
    afterState: appeal as unknown as Record<string, unknown>,
    sourceModule: 'comply360-legal-notices-engine',
  });
  return appeal;
}

export function listGSTAppeals(
  _entity_code: string,
  opts?: { stage?: GSTAppealStage },
): GSTAppeal[] {
  return readJson<GSTAppeal[]>(APPEAL_KEY, [])
    .filter((a) => !opts?.stage || a.stage === opts.stage);
}

export function recordLitigationCase(
  input: Omit<LitigationCase, 'id' | 'created_at' | 'case_status' | 'outcome' | 'next_hearing_date'>,
): LitigationCase {
  const lit: LitigationCase = {
    ...input,
    id: uid('lit'),
    case_status: 'pending',
    outcome: null,
    next_hearing_date: null,
    created_at: new Date().toISOString(),
  };
  const all = readJson<LitigationCase[]>(LIT_KEY, []);
  all.push(lit);
  writeJson(LIT_KEY, all);
  logAudit({
    entityCode: 'OPERIX-DEMO',
    action: 'create',
    entityType: AUD('litigation_case'),
    recordId: lit.id,
    recordLabel: `Litigation · ${input.case_number} · ${input.case_type}`,
    beforeState: null,
    afterState: lit as unknown as Record<string, unknown>,
    sourceModule: 'comply360-legal-notices-engine',
  });
  return lit;
}

export function listLitigationCases(
  _entity_code: string,
  opts?: { case_type?: LitigationCaseType },
): LitigationCase[] {
  return readJson<LitigationCase[]>(LIT_KEY, [])
    .filter((l) => !opts?.case_type || l.case_type === opts.case_type);
}

export function createNoticeTemplate(
  input: Omit<NoticeTemplate, 'id' | 'created_at'>,
): NoticeTemplate {
  const tpl: NoticeTemplate = { ...input, id: uid('tpl'), created_at: new Date().toISOString() };
  const all = readJson<NoticeTemplate[]>(TPL_KEY, []);
  all.push(tpl);
  writeJson(TPL_KEY, all);
  logAudit({
    entityCode: 'OPERIX-DEMO',
    action: 'create',
    entityType: AUD('notice_template'),
    recordId: tpl.id,
    recordLabel: `Notice Template · ${input.template_name}`,
    beforeState: null,
    afterState: tpl as unknown as Record<string, unknown>,
    sourceModule: 'comply360-legal-notices-engine',
  });
  return tpl;
}

export function listNoticeTemplates(): NoticeTemplate[] {
  return readJson<NoticeTemplate[]>(TPL_KEY, []);
}

export function getUpcomingDeadlines(
  entity_code: string,
  days_ahead = 30,
): Array<{ notice_id: string; notice_number: string; response_deadline: string; days_remaining: number; notice_type: NoticeType }> {
  const today = new Date();
  const cutoff = new Date(today.getTime() + days_ahead * 86400000);
  return readJson<LegalNotice[]>(NOTICE_KEY, [])
    .filter((n) => n.entity_code === entity_code)
    .filter((n) => n.status !== 'closed' && n.status !== 'responded')
    .map((n) => {
      const dl = new Date(n.response_deadline);
      const days_remaining = Math.ceil((dl.getTime() - today.getTime()) / 86400000);
      return {
        notice_id: n.id,
        notice_number: n.notice_number,
        response_deadline: n.response_deadline,
        days_remaining,
        notice_type: n.notice_type,
      };
    })
    .filter((d) => new Date(d.response_deadline) <= cutoff)
    .sort((a, b) => a.days_remaining - b.days_remaining);
}

export function seedStandardNoticeTemplates(by_bap: BAPAccountId): NoticeTemplate[] {
  const seeds: Array<Omit<NoticeTemplate, 'id' | 'created_at' | 'authored_by_bap'>> = [
    { template_name: 'IT Notice Response · Section 143', template_type: 'IT_Section_143', template_body: 'To the Assessing Officer,\n\nIn response to notice {{notice_number}} dated {{notice_date}}, please find attached the requested information for {{fy}}.', variables: ['notice_number', 'notice_date', 'fy'] },
    { template_name: 'GST Appeal · APL-01 Grounds', template_type: 'GST_DRC_07', template_body: 'Grounds of appeal against order {{order_number}}: {{grounds_summary}}.', variables: ['order_number', 'grounds_summary'] },
    { template_name: 'DRC-03 Voluntary Payment', template_type: 'GST_DRC_01', template_body: 'Voluntary payment of ₹{{amount}} towards demand {{demand_ref}} under DRC-03.', variables: ['amount', 'demand_ref'] },
    { template_name: 'ROC Notice Response · Section 248', template_type: 'ROC_Section_248', template_body: 'Reply to ROC notice {{notice_number}}: the company is operational and submits filings as enclosed.', variables: ['notice_number'] },
    { template_name: 'Show-Cause Response', template_type: 'Show_Cause', template_body: 'In reply to your show-cause notice {{notice_number}} dated {{notice_date}}, our position is: {{position}}.', variables: ['notice_number', 'notice_date', 'position'] },
  ];
  return seeds.map((s) => createNoticeTemplate({ ...s, authored_by_bap: by_bap }));
}

registerAuditEntityType({ id: 'legal_notice', module: 'audit-trail', label: 'Legal · Notice Received' });
registerAuditEntityType({ id: 'gst_appeal', module: 'audit-trail', label: 'Legal · GST Appeal' });
registerAuditEntityType({ id: 'litigation_case', module: 'audit-trail', label: 'Legal · Litigation Case' });
registerAuditEntityType({ id: 'notice_template', module: 'audit-trail', label: 'Legal · Notice Template' });
registerAuditEntityType({ id: 'notice_deadline_alert', module: 'audit-trail', label: 'Legal · Notice Deadline Alert' });
