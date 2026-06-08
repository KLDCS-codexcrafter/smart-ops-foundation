/**
 * b3-block-behavioral.test.ts — Sprint B3 · T-B3-WhatsApp-Channel · Pillar-B B.3 CLOSE
 *
 * Coverage targets:
 *   - E.164 normalization honest (null > fabrication)
 *   - Recipient resolver reads party phone fields
 *   - WhatsApp render: 1024-cap + HTML strip + honest truncation
 *   - buildWaMeLink encodes correctly
 *   - dispatchWhatsApp class routing (user → wa.me · dept/system → queued_for_wave2 NEVER wa.me)
 *   - NO BSP token field anywhere (grep =0 in new files)
 *   - Reminder/approval WhatsApp via same EnqueueEventInput shape
 *   - approval-rail-engine + taskflow-reminders-engine 0-DIFF for channel routing
 *   - Template Master channel union accepts whatsapp
 *   - §H walls + sprint-history B3 row + B2 flipped to f6f5fcc9
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  normalizePhoneE164,
  resolveWhatsAppRecipient,
  renderWhatsAppMessage,
  buildWaMeLink,
  dispatchWhatsApp,
  enqueueWhatsAppFromEvent,
  listWhatsAppOutbox,
  WA_MAX_BODY_CHARS,
} from '@/lib/whatsapp-channel-engine';
import { listOutbox, listTemplates, upsertUserMailProfile, upsertTemplate, enqueueFromEvent } from '@/lib/communication-engine';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import type { TemplateRow } from '@/types/communication';

const ENTITY = 'B3TEST';

function resetLs() {
  if (typeof localStorage !== 'undefined') localStorage.clear();
}

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf-8');
}

describe('Sprint B3 · WhatsApp Channel', () => {
  beforeEach(() => resetLs());

  // ─── Phone normalization (AC3 honest) ──────────────────────────────────
  it('normalizePhoneE164: bare 10-digit Indian mobile → +91 prefix', () => {
    expect(normalizePhoneE164('9876543210')).toBe('+919876543210');
  });
  it('normalizePhoneE164: international with + preserved', () => {
    expect(normalizePhoneE164('+1 415 555 1212')).toBe('+14155551212');
  });
  it('normalizePhoneE164: 91-prefixed without + → +91xxxx', () => {
    expect(normalizePhoneE164('919876543210')).toBe('+919876543210');
  });
  it('normalizePhoneE164: unparseable returns null (no fabrication)', () => {
    expect(normalizePhoneE164('abc')).toBeNull();
    expect(normalizePhoneE164('')).toBeNull();
    expect(normalizePhoneE164('12345')).toBeNull();
    expect(normalizePhoneE164(null)).toBeNull();
    expect(normalizePhoneE164(undefined)).toBeNull();
  });
  it('normalizePhoneE164: rejects bare 10-digit not starting 6-9', () => {
    expect(normalizePhoneE164('1234567890')).toBeNull();
  });

  // ─── Recipient resolver ────────────────────────────────────────────────
  it('resolveWhatsAppRecipient: direct field on record wins', () => {
    const phone = resolveWhatsAppRecipient('invoice-memo', { id: 'r1', phone: '9876543210' }, ENTITY);
    expect(phone).toBe('+919876543210');
  });
  it('resolveWhatsAppRecipient: reads vendor master phone field', () => {
    localStorage.setItem('erp_group_vendor_master', JSON.stringify([{ id: 'v1', phone: '9988776655' }]));
    expect(resolveWhatsAppRecipient('po', { party_id: 'v1' }, ENTITY)).toBe('+919988776655');
  });
  it('resolveWhatsAppRecipient: honest null when nothing found (no fabrication)', () => {
    expect(resolveWhatsAppRecipient('po', { party_id: 'ghost' }, ENTITY)).toBeNull();
  });

  // ─── Template render (1024-cap · HTML strip) ───────────────────────────
  it('renderWhatsAppMessage: returns empty when no template seeded', () => {
    // Use an object_type with no WA template.
    const out = renderWhatsAppMessage('does-not-exist', {}, ENTITY);
    expect(out.body).toBe('');
  });
  it('renderWhatsAppMessage: uses channel=whatsapp template and merges fields', () => {
    listTemplates(ENTITY); // seed defaults
    const out = renderWhatsAppMessage('invoice-memo', { doc_no: 'INV/001', amount: '₹500', doc_date: '01 Jun 2026', recipient_name: 'Anil', entity_name: 'Acme' }, ENTITY);
    expect(out.body).toContain('INV/001');
    expect(out.body).toContain('Anil');
    expect(out.body.length).toBeLessThanOrEqual(WA_MAX_BODY_CHARS);
  });
  it('renderWhatsAppMessage: strips HTML and reports it honestly', () => {
    upsertTemplate(ENTITY, { object_type: 'html-test', channel: 'whatsapp', subject_tpl: '', body_tpl: 'Hello <b>{{name}}</b><br/>line', lang: 'en', sender_class_default: 'user', active: true });
    const out = renderWhatsAppMessage('html-test', { name: 'X' }, ENTITY);
    expect(out.hadHtml).toBe(true);
    expect(out.body).not.toMatch(/<[^>]+>/);
    expect(out.body).toContain('Hello');
  });
  it('renderWhatsAppMessage: truncates beyond 1024 with honest "(truncated)" note', () => {
    const longBody = 'a'.repeat(1500);
    upsertTemplate(ENTITY, { object_type: 'long-test', channel: 'whatsapp', subject_tpl: '', body_tpl: longBody, lang: 'en', sender_class_default: 'user', active: true });
    const out = renderWhatsAppMessage('long-test', {}, ENTITY);
    expect(out.truncated).toBe(true);
    expect(out.body.length).toBeLessThanOrEqual(WA_MAX_BODY_CHARS);
    expect(out.body.endsWith('(truncated)')).toBe(true);
  });

  // ─── wa.me link builder ────────────────────────────────────────────────
  it('buildWaMeLink: strips + and encodes message correctly', () => {
    const link = buildWaMeLink('+919876543210', 'Hello world!');
    expect(link.startsWith('https://wa.me/919876543210?text=')).toBe(true);
    expect(link).toContain(encodeURIComponent('Hello world!'));
  });

  // ─── dispatchWhatsApp class routing (AC4) ──────────────────────────────
  it('dispatchWhatsApp: user-class routes to wa.me + opened_in_whatsapp', () => {
    listTemplates(ENTITY); // seed
    const res = dispatchWhatsApp({
      entityCode: ENTITY,
      objectType: 'invoice-memo',
      sourceCard: 'fincore',
      sourceRecord: { id: 'r1', phone: '9876543210' },
      mergeData: { doc_no: 'INV/1', amount: '₹100', recipient_name: 'Anil' },
      currentUserName: 'op',
    });
    expect(res.ok).toBe(true);
    expect(res.waMeUrl).toBeDefined();
    expect(res.waMeUrl!.startsWith('https://wa.me/')).toBe(true);
    expect(res.message?.delivery_mode).toBe('opened_in_whatsapp');
    expect(res.message?.channel).toBe('whatsapp');
  });
  it('dispatchWhatsApp: department-class queued_for_wave2 — NEVER wa.me', () => {
    // payment-advice WA template is department-class
    listTemplates(ENTITY);
    const res = dispatchWhatsApp({
      entityCode: ENTITY,
      objectType: 'payment-advice',
      sourceCard: 'payout',
      sourceRecord: { id: 'r2', phone: '9876543210' },
      mergeData: { doc_no: 'PA/1', amount: '₹500', recipient_name: 'Vendor' },
      currentUserName: 'op',
    });
    expect(res.ok).toBe(true);
    expect(res.waMeUrl).toBeUndefined();
    expect(res.message?.delivery_mode).toBe('queued_for_wave2');
  });
  it('dispatchWhatsApp: system-class queued_for_wave2 — NEVER wa.me', () => {
    listTemplates(ENTITY);
    const res = dispatchWhatsApp({
      entityCode: ENTITY,
      objectType: 'approval.pending',
      sourceCard: 'taskflow',
      sourceRecord: { id: 'r3', phone: '9876543210' },
      mergeData: { title: 'PO #1', recipient_name: 'Manager' },
      currentUserName: 'op',
    });
    expect(res.ok).toBe(true);
    expect(res.waMeUrl).toBeUndefined();
    expect(res.message?.delivery_mode).toBe('queued_for_wave2');
  });
  it('dispatchWhatsApp: honest reason when no template', () => {
    const res = dispatchWhatsApp({
      entityCode: ENTITY, objectType: 'ghost-type', sourceCard: 'x',
      sourceRecord: { id: 'r4', phone: '9876543210' }, mergeData: {}, currentUserName: 'op',
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('no_whatsapp_template');
  });
  it('dispatchWhatsApp: honest reason when user-class has no phone', () => {
    listTemplates(ENTITY);
    const res = dispatchWhatsApp({
      entityCode: ENTITY, objectType: 'invoice-memo', sourceCard: 'fincore',
      sourceRecord: { id: 'r5' }, mergeData: { doc_no: 'X' }, currentUserName: 'op',
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('no_recipient_phone');
  });

  // ─── Outbox persistence + channel filter ───────────────────────────────
  it('dispatchWhatsApp: appends to SAME outbox log with channel=whatsapp', () => {
    listTemplates(ENTITY);
    dispatchWhatsApp({
      entityCode: ENTITY, objectType: 'invoice-memo', sourceCard: 'fincore',
      sourceRecord: { id: 'r6', phone: '9876543210' }, mergeData: { doc_no: 'INV/2' }, currentUserName: 'op',
    });
    const all = listOutbox(ENTITY);
    expect(all.length).toBeGreaterThan(0);
    expect(all[0].channel).toBe('whatsapp');
    expect(listWhatsAppOutbox(ENTITY).length).toBe(1);
  });

  // ─── enqueueFromEvent shape reuse (AC8 · approval/reminders 0-DIFF) ────
  it('enqueueWhatsAppFromEvent: emits WA queued msg when profile has wa_phone', () => {
    upsertUserMailProfile(ENTITY, { user_name: 'op', email_id: 'op@x.in', display_name: 'Op' } as never);
    // Manually inject wa_phone via store edit (Wave-2 will expose this on UserMailProfile).
    const profKey = `erp_user_mail_profiles_${ENTITY}`;
    const list = JSON.parse(localStorage.getItem(profKey) || '[]');
    list[0].wa_phone = '9876543210';
    localStorage.setItem(profKey, JSON.stringify(list));
    listTemplates(ENTITY); // seed
    const msg = enqueueWhatsAppFromEvent({
      entityCode: ENTITY, fiscalYearId: 'FY-26', objectType: 'approval.pending',
      sourceCard: 'taskflow', recipientUserName: 'op', mergeData: { title: 'PO #2', body: '...' },
    });
    expect(msg).not.toBeNull();
    expect(msg!.channel).toBe('whatsapp');
    expect(msg!.delivery_mode).toBe('queued_for_wave2');
  });
  it('enqueueWhatsAppFromEvent: honest null when recipient has no phone (no fabrication)', () => {
    upsertUserMailProfile(ENTITY, { user_name: 'op2', email_id: 'op2@x.in' });
    listTemplates(ENTITY);
    const msg = enqueueWhatsAppFromEvent({
      entityCode: ENTITY, fiscalYearId: 'FY-26', objectType: 'approval.pending',
      sourceCard: 'taskflow', recipientUserName: 'op2', mergeData: {},
    });
    expect(msg).toBeNull();
  });
  it('communication-engine.enqueueFromEvent with channel=whatsapp returns null (callers use WA sibling directly · keeps engines 0-DIFF)', () => {
    const out = enqueueFromEvent({
      entityCode: ENTITY, fiscalYearId: 'FY-26', objectType: 'approval.pending',
      sourceCard: 'x', recipientUserName: 'nobody', mergeData: {}, channel: 'whatsapp',
    });
    expect(out).toBeNull();
  });

  // ─── Template channel union ────────────────────────────────────────────
  it('TemplateRow accepts channel=whatsapp + wa_category', () => {
    const row: TemplateRow = {
      id: 't1', object_type: 'x', channel: 'whatsapp', subject_tpl: '', body_tpl: 'hi',
      lang: 'en', sender_class_default: 'user', wa_category: 'marketing', active: true,
    };
    expect(row.channel).toBe('whatsapp');
    expect(row.wa_category).toBe('marketing');
  });
  it('Template seed includes ≥5 WhatsApp variants (high-traffic object types)', () => {
    const tpls = listTemplates(ENTITY).filter((t) => t.channel === 'whatsapp');
    expect(tpls.length).toBeGreaterThanOrEqual(5);
  });

  // ─── AC2 · NO BSP token field in new files ─────────────────────────────
  it('AC2: zero BSP token/apikey/secret in new whatsapp-channel-engine.ts', () => {
    const src = read('src/lib/whatsapp-channel-engine.ts');
    expect(/\b(bsp_token|bsp_secret|wa_api_key|whatsapp_token|apiKey|api_key|access_token)\b/i.test(src)).toBe(false);
  });

  // ─── AC7 walls ─────────────────────────────────────────────────────────
  it('AC7: PULSE is NOT imported from whatsapp-channel-engine.ts', () => {
    const src = read('src/lib/whatsapp-channel-engine.ts');
    expect(/from\s+['"]@\/lib\/pulse|from\s+['"]pulse-/.test(src)).toBe(false);
  });
  it('AC7: distributor-whatsapp-notify.ts NOT forked (still single-file precedent)', () => {
    expect(existsSync(resolve(process.cwd(), 'src/lib/distributor-whatsapp-notify.ts'))).toBe(true);
    // No additional fork files
    expect(existsSync(resolve(process.cwd(), 'src/lib/distributor-whatsapp-notify-v2.ts'))).toBe(false);
  });
  it('AC11: approval-rail-engine.ts does NOT import whatsapp-channel-engine (0-DIFF posture)', () => {
    const src = read('src/lib/approval-rail-engine.ts');
    expect(src.includes('whatsapp-channel-engine')).toBe(false);
  });
  it('AC11: taskflow-reminders-engine.ts does NOT import whatsapp-channel-engine (0-DIFF posture)', () => {
    const src = read('src/lib/taskflow-reminders-engine.ts');
    expect(src.includes('whatsapp-channel-engine')).toBe(false);
  });
  it('AC11: DocSendBar WhatsApp button enabled (no longer disabled stub)', () => {
    const src = read('src/components/shared/DocSendBar.tsx');
    expect(/disabled\s+title="WhatsApp arrives with B\.3"/.test(src)).toBe(false);
    expect(src.includes('dispatchWhatsApp')).toBe(true);
  });

  // ─── Sprint history (B3 row + B2 flipped) ──────────────────────────────
  it('sprint-history: B3 row present with predecessorSha=f6f5fcc9 + WA sibling', () => {
    const b3 = SPRINTS.find((s) => (s.code ?? '') === 'T-B3-WhatsApp-Channel');
    expect(b3).toBeDefined();
    expect(b3!.predecessorSha).toBe('f6f5fcc9');
    expect(b3!.newSiblings).toContain('whatsapp-channel-engine');
  });
  it('sprint-history: B2 row headSha flipped to f6f5fcc9', () => {
    const b2 = SPRINTS.find((s) => (s.code ?? '') === 'T-B2-Comm-Outbox');
    expect(b2).toBeDefined();
    expect(b2!.headSha).toBe('f6f5fcc9');
  });
});
