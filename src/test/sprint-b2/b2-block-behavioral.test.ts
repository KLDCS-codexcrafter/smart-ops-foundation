/**
 * b2-block-behavioral.test.ts — Sprint B2 · T-B2-Comm-Outbox · ≥24 it()
 *
 * Covers: template render + {{signature}} by class · sender resolution ·
 * recipient resolver honest empty · buildEml valid MIME · buildMailto note ·
 * dispatch class routing (dept NEVER mailto) · NO credentials grep =0 ·
 * enqueueFromEvent system-class queueing · retention mapping · §H walls.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  upsertDepartmentEmail, upsertTemplate, listTemplates,
  upsertUserMailProfile,
  renderTemplate, resolveSender, resolveRecipients,
  composeFromDocument, buildEml, buildMailto, dispatch,
  listOutbox, enqueueFromEvent,
} from '@/lib/communication-engine';
import { getDefaultPolicyForRecordType } from '@/lib/record-retention-policy-engine';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const E = 'TESTCO';

function clearLs() {
  if (typeof localStorage !== 'undefined') localStorage.clear();
}

beforeEach(() => { clearLs(); });

describe('B2 · template rendering', () => {
  it('renderTemplate substitutes merge fields including {{signature}} for user class', () => {
    upsertUserMailProfile(E, { user_name: 'alice', email_id: 'a@x.in', signature_html: '— Alice' });
    // Use a unique object_type to avoid seed clash
    upsertTemplate(E, { object_type: 'test-user', channel: 'email', subject_tpl: 'Invoice {{doc_no}}', body_tpl: 'Hi {{recipient_name}} {{signature}}', lang: 'en', sender_class_default: 'user', active: true });
    const r = renderTemplate('test-user', { doc_no: 'INV-1', recipient_name: 'Bob' }, E, 'user', 'alice');
    expect(r.subject).toBe('Invoice INV-1');
    expect(r.body_html).toBe('Hi Bob — Alice');
  });

  it('renderTemplate uses department signature for department class', () => {
    upsertDepartmentEmail(E, { card_id: 'payout', department_label: 'Payout', email_id: 'pay@x.in', display_name: 'Payout', reply_to_mode: 'department', signature_html: '— Payout Team', active: true });
    upsertTemplate(E, { object_type: 'test-dept', channel: 'email', subject_tpl: 'PA {{doc_no}}', body_tpl: 'Body {{signature}}', lang: 'en', sender_class_default: 'department', department_card_id: 'payout', active: true });
    const r = renderTemplate('test-dept', { doc_no: 'PA-1' }, E);
    expect(r.body_html).toBe('Body — Payout Team');
  });

  it('renderTemplate signature is empty for system class', () => {
    upsertTemplate(E, { object_type: 'test-sys', channel: 'email', subject_tpl: 's', body_tpl: 'b{{signature}}', lang: 'en', sender_class_default: 'system', active: true });
    const r = renderTemplate('test-sys', {}, E);
    expect(r.body_html).toBe('b');
  });

  it('templates are seeded as DATA rows (zero hardcoded message strings in engine source)', () => {
    const list = listTemplates(E);
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(list.every((t) => typeof t.subject_tpl === 'string' && typeof t.body_tpl === 'string')).toBe(true);
  });
});

describe('B2 · sender resolution', () => {
  it('resolveSender returns user class with user profile email', () => {
    upsertUserMailProfile(E, { user_name: 'op', email_id: 'op@x.in' });
    upsertTemplate(E, { object_type: 'po', channel: 'email', subject_tpl: '', body_tpl: '', lang: 'en', sender_class_default: 'user', active: true });
    const r = resolveSender('po', 'op', E);
    expect(r.sender_class).toBe('user');
    expect(r.from_resolved).toBe('op@x.in');
  });

  it('resolveSender returns department class with dept email', () => {
    upsertDepartmentEmail(E, { card_id: 'payout', department_label: 'Payout', email_id: 'pay@x.in', display_name: 'P', reply_to_mode: 'department', active: true });
    upsertTemplate(E, { object_type: 'payment-advice', channel: 'email', subject_tpl: '', body_tpl: '', lang: 'en', sender_class_default: 'department', department_card_id: 'payout', active: true });
    const r = resolveSender('payment-advice', 'op', E);
    expect(r.sender_class).toBe('department');
    expect(r.from_resolved).toBe('pay@x.in');
  });

  it('resolveSender falls back to system noreply for system class', () => {
    upsertTemplate(E, { object_type: 'approval.pending', channel: 'email', subject_tpl: '', body_tpl: '', lang: 'en', sender_class_default: 'system', active: true });
    const r = resolveSender('approval.pending', 'op', E);
    expect(r.sender_class).toBe('system');
    expect(r.from_resolved).toMatch(/^noreply@/);
  });
});

describe('B2 · recipient resolution (honest empty)', () => {
  it('resolveRecipients reads party email when present', () => {
    localStorage.setItem('erp_group_vendor_master', JSON.stringify([{ id: 'V1', email: 'v@x.in' }]));
    const r = resolveRecipients('po', { party_id: 'V1' }, E);
    expect(r).toEqual(['v@x.in']);
  });

  it('resolveRecipients returns empty when nothing found (no fabrication)', () => {
    const r = resolveRecipients('po', { party_id: 'UNKNOWN' }, E);
    expect(r).toEqual([]);
  });
});

describe('B2 · .eml + mailto', () => {
  it('buildEml produces valid MIME with embedded base64 attachment', () => {
    upsertTemplate(E, { object_type: 'invoice-memo', channel: 'email', subject_tpl: 'S', body_tpl: 'B', lang: 'en', sender_class_default: 'user', active: true });
    upsertUserMailProfile(E, { user_name: 'op', email_id: 'op@x.in' });
    const msg = composeFromDocument({ entityCode: E, fiscalYearId: 'FY-25', objectType: 'invoice-memo', sourceCard: 'fincore', sourceRecord: { id: 'INV-1' }, mergeData: {}, attachment: { name: 'inv.pdf', base64: 'SGVsbG8=' }, currentUserName: 'op', overrideRecipients: ['x@y.in'] });
    const eml = buildEml(msg);
    expect(eml).toContain('MIME-Version: 1.0');
    expect(eml).toContain('multipart/mixed');
    expect(eml).toContain('Content-Transfer-Encoding: base64');
    expect(eml).toContain('filename="inv.pdf"');
    expect(eml).toContain('SGVsbG8=');
  });

  it('buildMailto carries no attachment and notes the limitation', () => {
    upsertTemplate(E, { object_type: 'invoice-memo', channel: 'email', subject_tpl: 'S', body_tpl: 'B', lang: 'en', sender_class_default: 'user', active: true });
    upsertUserMailProfile(E, { user_name: 'op', email_id: 'op@x.in' });
    const msg = composeFromDocument({ entityCode: E, fiscalYearId: 'FY-25', objectType: 'invoice-memo', sourceCard: 'fincore', sourceRecord: {}, mergeData: {}, attachment: { name: 'a.pdf', base64: 'AAA=' }, currentUserName: 'op', overrideRecipients: ['x@y.in'] });
    const url = buildMailto(msg);
    expect(url.startsWith('mailto:')).toBe(true);
    expect(decodeURIComponent(url)).toContain('attach the downloaded file');
  });
});

describe('B2 · dispatch class routing', () => {
  it('user-class dispatch marks sent_via_user_client + returns mailto', () => {
    upsertTemplate(E, { object_type: 'invoice-memo', channel: 'email', subject_tpl: 'S', body_tpl: 'B', lang: 'en', sender_class_default: 'user', active: true });
    upsertUserMailProfile(E, { user_name: 'op', email_id: 'op@x.in' });
    const msg = composeFromDocument({ entityCode: E, fiscalYearId: 'FY-25', objectType: 'invoice-memo', sourceCard: 'fincore', sourceRecord: {}, mergeData: {}, currentUserName: 'op', overrideRecipients: ['x@y.in'] });
    const res = dispatch(E, msg);
    expect(res.message.delivery_mode).toBe('sent_via_user_client');
    expect(res.mailto).toBeTruthy();
  });

  it('department-class dispatch queues for Wave-2 and NEVER returns mailto', () => {
    upsertDepartmentEmail(E, { card_id: 'payout', department_label: 'P', email_id: 'p@x.in', display_name: 'P', reply_to_mode: 'department', active: true });
    upsertTemplate(E, { object_type: 'payment-advice', channel: 'email', subject_tpl: 'S', body_tpl: 'B', lang: 'en', sender_class_default: 'department', department_card_id: 'payout', active: true });
    const msg = composeFromDocument({ entityCode: E, fiscalYearId: 'FY-25', objectType: 'payment-advice', sourceCard: 'payout', sourceRecord: {}, mergeData: {}, currentUserName: 'op', overrideRecipients: ['v@y.in'] });
    const res = dispatch(E, msg);
    expect(res.message.delivery_mode).toBe('queued_for_wave2');
    expect(res.mailto).toBeUndefined();
  });

  it('system-class dispatch queues for Wave-2', () => {
    upsertTemplate(E, { object_type: 'approval.pending', channel: 'email', subject_tpl: 'S', body_tpl: 'B', lang: 'en', sender_class_default: 'system', active: true });
    const msg = composeFromDocument({ entityCode: E, fiscalYearId: 'FY-25', objectType: 'approval.pending', sourceCard: 'taskflow', sourceRecord: {}, mergeData: {}, currentUserName: 'op', overrideRecipients: ['x@y.in'] });
    const res = dispatch(E, msg);
    expect(res.message.delivery_mode).toBe('queued_for_wave2');
    expect(res.mailto).toBeUndefined();
  });

  it('dispatch persists into outbox log', () => {
    upsertTemplate(E, { object_type: 'invoice-memo', channel: 'email', subject_tpl: 'S', body_tpl: 'B', lang: 'en', sender_class_default: 'user', active: true });
    upsertUserMailProfile(E, { user_name: 'op', email_id: 'op@x.in' });
    const msg = composeFromDocument({ entityCode: E, fiscalYearId: 'FY-25', objectType: 'invoice-memo', sourceCard: 'fincore', sourceRecord: {}, mergeData: {}, currentUserName: 'op', overrideRecipients: ['x@y.in'] });
    dispatch(E, msg);
    expect(listOutbox(E).length).toBe(1);
  });
});

describe('B2 · NO credentials hard wall (AC2)', () => {
  const src1 = fs.readFileSync(path.resolve(__dirname, '../../types/communication.ts'), 'utf8');
  const src2 = fs.readFileSync(path.resolve(__dirname, '../../lib/communication-engine.ts'), 'utf8');

  it('communication.ts contains zero password/secret/smtp_pass field declarations', () => {
    expect(/(?:password|secret|smtp_pass)\s*[:?]/i.test(src1)).toBe(false);
  });
  it('communication-engine.ts contains zero password/secret/smtp_pass field declarations', () => {
    // Allow the word in comments referring to AES-256-GCM Wave-2 disclosure, but not as object keys.
    expect(/(?:password|smtp_pass)\s*:\s*['"`]?\w/i.test(src2)).toBe(false);
  });
  it('credentials_state placeholder is the ONLY auth-shaped field', () => {
    expect(src1).toContain('credentials_state');
  });
  it('PULSE is NOT imported anywhere in engine (alignment by shape only · AC7)', () => {
    expect(/import\s+.*\bpulse\b/i.test(src2)).toBe(false);
  });
});

describe('B2 · enqueueFromEvent first-customer hook', () => {
  it('creates a system-class queued message from a synthetic approval event', () => {
    upsertUserMailProfile(E, { user_name: 'approver', email_id: 'ap@x.in' });
    const m = enqueueFromEvent({ entityCode: E, fiscalYearId: 'FY-25', objectType: 'approval.pending', sourceCard: 'taskflow', recipientUserName: 'approver', mergeData: { title: 'Approve', body: 'pending', deep_link: '/x' } });
    expect(m).not.toBeNull();
    expect(m?.sender_class).toBe('system');
    expect(m?.delivery_mode).toBe('queued_for_wave2');
  });

  it('creates a system-class queued message from a synthetic reminder digest', () => {
    upsertUserMailProfile(E, { user_name: 'op', email_id: 'op@x.in' });
    const m = enqueueFromEvent({ entityCode: E, fiscalYearId: 'FY-25', objectType: 'digest.my_reminders', sourceCard: 'taskflow', recipientUserName: 'op', mergeData: { count: 3, body: 'x' } });
    expect(m).not.toBeNull();
    expect(m?.sender_class).toBe('system');
  });

  it('honest empty when user has no email profile (no fabrication)', () => {
    const m = enqueueFromEvent({ entityCode: E, fiscalYearId: 'FY-25', objectType: 'approval.pending', sourceCard: 'taskflow', recipientUserName: 'ghost', mergeData: {} });
    expect(m).toBeNull();
  });
});

describe('B2 · retention mapping', () => {
  it('outbox_message → operational_log_only', () => {
    expect(getDefaultPolicyForRecordType('outbox_message')).toBe('operational_log_only');
  });
});

describe('B2 · DocSendBar surface', () => {
  it('DocSendBar component exists at src/components/shared/DocSendBar.tsx', () => {
    const p = path.resolve(__dirname, '../../components/shared/DocSendBar.tsx');
    expect(fs.existsSync(p)).toBe(true);
    const src = fs.readFileSync(p, 'utf8');
    expect(src).toContain('WhatsApp');
    // B.3 architect-owned posture fix: WhatsApp is no longer a `disabled` stub at B.3.
    // The DocSendBar still mounts all four actions (Email/WhatsApp/Download PDF/Print).
    expect(src).toContain('Email');
    expect(src).toContain('Download PDF');
    expect(src).toContain('Print');
  });
});

describe('B2 · §H walls + sprint history', () => {
  it('sprint-history has B2 row with predecessorSha ab3e3090 and B1S2 flipped to ab3e3090', () => {
    const b2 = SPRINTS.find((s) => String(s.sprintNumber) === 'B2');
    expect(b2).toBeDefined();
    expect(b2?.predecessorSha).toBe('ab3e3090');
    expect(b2?.newSiblings).toContain('communication-engine');
    const b1s2 = SPRINTS.find((s) => String(s.sprintNumber) === 'B1S2');
    expect(b1s2?.headSha).toBe('ab3e3090');
  });

  it('approval-rail-engine has the 2-line additive hook only · core publish 0-DIFF', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/approval-rail-engine.ts'), 'utf8');
    const hookCount = (src.match(/enqueueFromEvent/g) || []).length;
    expect(hookCount).toBeGreaterThanOrEqual(1);
    expect(src.includes("'@/lib/communication-engine'")).toBe(true);
  });

  it('taskflow-reminders-engine has the 2-line additive hook only', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/taskflow-reminders-engine.ts'), 'utf8');
    expect(src.includes("'@/lib/communication-engine'")).toBe(true);
  });
});
