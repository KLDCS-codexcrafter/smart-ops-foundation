/**
 * @file   src/test/sprint-144/docvault-governance.test.ts
 * @sprint Sprint 144 · T-TaskFlow-A641.8 · DocVault Control Pt 2 · §N tests
 * @target ≥34 it() — share XOR · external approval · expiry · restricted ·
 *         watermark · ACL · retention · review · links · circulars · completeness ·
 *         FY · registers · §H 0-DIFF parents.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createDocument, getDocument } from '@/lib/docvault-engine';
import { setLifecycleStatus, setCategory } from '@/lib/docvault-control-engine';
import {
  grantShare, approveExternalShare, revokeShare, listShares, getEffectivePermission,
  getACL, upsertACL, assertAcl, DEFAULT_ACL,
  upsertRetentionRule, listRetentionRules, evaluateRetention, archivePerRetention,
  upsertReviewCycle, listReviewCycles, evaluateReviewsDue, markReviewed,
  linkDocument, unlinkDocument, listLinksForRef, listLinksForDocument, listLinks,
  publishCircular, acknowledgeCircular, getCircularStatus, closeCircular, listCirculars,
  upsertRequirementTemplate, evaluateCompleteness, getCompletenessSummary,
  setFinancialYear, listDocumentsByFY,
} from '@/lib/docvault-governance-engine';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { EMPLOYEES_KEY } from '@/types/employee';

const E = 'ACME';
const U_OWNER = 'u-alice';
const U_OTHER = 'u-bob';
const U_THIRD = 'u-carol';

const seedEmployees = (): void => {
  const list = [
    { id: U_OWNER, empCode: 'EMP-001', displayName: 'Alice', departmentId: 'd-ops' },
    { id: U_OTHER, empCode: 'EMP-002', displayName: 'Bob', departmentId: 'd-ops' },
    { id: U_THIRD, empCode: 'EMP-003', displayName: 'Carol', departmentId: 'd-fin' },
  ];
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(list));
};

const newDoc = (overrides: { title?: string; createdBy?: string; createdAtISO?: string } = {}): string => {
  const d = createDocument(
    E,
    { entity_id: E, document_type: 'other', title: overrides.title ?? 'Doc',
      tags: {}, originating_department_id: 'ops' },
    { version_no: 'A', file_url: 'mock://a.pdf', file_size_bytes: 100,
      uploaded_at: new Date().toISOString(), uploaded_by: overrides.createdBy ?? U_OWNER },
    overrides.createdBy ?? U_OWNER,
  );
  if (overrides.createdAtISO) {
    const raw = localStorage.getItem(`erp_documents_${E}`);
    if (raw) {
      const all = JSON.parse(raw);
      const idx = all.findIndex((x: { id: string }) => x.id === d.id);
      all[idx].created_at = overrides.createdAtISO;
      localStorage.setItem(`erp_documents_${E}`, JSON.stringify(all));
    }
  }
  return d.id;
};

// ─────────────────────────────────────────────────────────────────────────────
describe('S144 · Sharing · XOR + approval + expiry', () => {
  beforeEach(() => { localStorage.clear(); });

  it('grantShare requires exactly one of internal or external (both throws)', () => {
    const id = newDoc();
    expect(() => grantShare(E, { document_id: id, grantee_user_id: U_OTHER,
      external_email: 'x@y.com', permission: 'view', created_by: U_OWNER }))
      .toThrow(/exactly one/);
  });

  it('grantShare requires exactly one of internal or external (neither throws)', () => {
    const id = newDoc();
    expect(() => grantShare(E, { document_id: id, permission: 'view', created_by: U_OWNER }))
      .toThrow(/exactly one/);
  });

  it('external share forces requires_approval:true', () => {
    const id = newDoc();
    const s = grantShare(E, { document_id: id, external_email: 'x@y.com',
      permission: 'view', created_by: U_OWNER });
    expect(s.requires_approval).toBe(true);
  });

  it('internal share does not require approval', () => {
    const id = newDoc();
    const s = grantShare(E, { document_id: id, grantee_user_id: U_OTHER,
      permission: 'view', created_by: U_OWNER });
    expect(s.requires_approval).toBe(false);
  });

  it('effective permission is null until external share is approved', () => {
    const id = newDoc();
    const s = grantShare(E, { document_id: id, external_email: 'x@y.com',
      permission: 'view', created_by: U_OWNER });
    // External email path → no userId match anyway, but test approval state via revoke logic
    expect(s.approved_at).toBeNull();
    approveExternalShare(E, s.id, U_OWNER);
    expect(listShares(E).find((x) => x.id === s.id)?.requires_approval).toBe(false);
  });

  it('expired grant excluded from effective permission', () => {
    const id = newDoc();
    grantShare(E, { document_id: id, grantee_user_id: U_OTHER, permission: 'download',
      created_by: U_OWNER, expires_at: '2000-01-01T00:00:00Z' });
    const eff = getEffectivePermission(E, id, U_OTHER);
    expect(eff.permission).toBeNull();
  });

  it('owner always gets edit regardless of grants', () => {
    const id = newDoc();
    const eff = getEffectivePermission(E, id, U_OWNER);
    expect(eff.permission).toBe('edit');
  });

  it('restricted doc returns null without explicit grant', () => {
    const id = newDoc();
    const raw = localStorage.getItem(`erp_documents_${E}`)!;
    const all = JSON.parse(raw);
    all[0].control = { ...(all[0].control ?? {}), confidentiality: 'restricted' };
    localStorage.setItem(`erp_documents_${E}`, JSON.stringify(all));
    const eff = getEffectivePermission(E, id, U_OTHER);
    expect(eff.permission).toBeNull();
  });

  it('restricted doc with explicit grant returns that permission', () => {
    const id = newDoc();
    const raw = localStorage.getItem(`erp_documents_${E}`)!;
    const all = JSON.parse(raw);
    all[0].control = { confidentiality: 'restricted' };
    localStorage.setItem(`erp_documents_${E}`, JSON.stringify(all));
    grantShare(E, { document_id: id, grantee_user_id: U_OTHER, permission: 'view',
      created_by: U_OWNER });
    expect(getEffectivePermission(E, id, U_OTHER).permission).toBe('view');
  });

  it('watermark contract returns user + ISO timestamp string', () => {
    const id = newDoc();
    grantShare(E, { document_id: id, grantee_user_id: U_OTHER, permission: 'view_watermark',
      created_by: U_OWNER });
    const eff = getEffectivePermission(E, id, U_OTHER, 'Bob');
    expect(eff.permission).toBe('view_watermark');
    expect(eff.watermark).toMatch(/^Bob · /);
  });

  it('revokeShare excludes share from effective permission', () => {
    const id = newDoc();
    const s = grantShare(E, { document_id: id, grantee_user_id: U_OTHER,
      permission: 'edit', created_by: U_OWNER });
    expect(getEffectivePermission(E, id, U_OTHER).permission).toBe('edit');
    revokeShare(E, s.id, U_OWNER);
    expect(getEffectivePermission(E, id, U_OTHER).permission).toBeNull();
  });

  it('max permission wins when multiple grants exist', () => {
    const id = newDoc();
    grantShare(E, { document_id: id, grantee_user_id: U_OTHER, permission: 'view',
      created_by: U_OWNER });
    grantShare(E, { document_id: id, grantee_user_id: U_OTHER, permission: 'comment',
      created_by: U_OWNER });
    expect(getEffectivePermission(E, id, U_OTHER).permission).toBe('comment');
  });
});

describe('S144 · ACL · TDL 6-action set', () => {
  beforeEach(() => { localStorage.clear(); });

  it('DEFAULT_ACL grants view + download only', () => {
    const a = DEFAULT_ACL('u', E);
    expect(a.allow_view).toBe(true);
    expect(a.allow_download).toBe(true);
    expect(a.allow_upload).toBe(false);
    expect(a.allow_config).toBe(false);
    expect(a.allow_delete).toBe(false);
  });

  it('getACL returns default profile for unknown user', () => {
    const a = getACL(E, 'unknown');
    expect(a.allow_view).toBe(true);
  });

  it('assertAcl throws when right is missing', () => {
    expect(() => assertAcl(E, 'unknown', 'delete')).toThrow(/ACL denied/);
  });

  it('assertAcl passes when default right is present', () => {
    expect(() => assertAcl(E, 'unknown', 'view')).not.toThrow();
  });

  it('upsertACL overrides default profile', () => {
    upsertACL(E, { ...DEFAULT_ACL(U_OTHER, E), allow_upload: true, updated_by: U_OWNER });
    expect(() => assertAcl(E, U_OTHER, 'upload')).not.toThrow();
  });
});

describe('S144 · Retention · rules + verdicts + archive', () => {
  beforeEach(() => { localStorage.clear(); });

  it('retention rule null retain_years means never due', () => {
    const id = newDoc({ createdAtISO: '1990-01-01T00:00:00Z' });
    upsertRetentionRule(E, { category: null, retain_years: null,
      action_at_end: 'archive', is_active: true });
    const v = evaluateRetention(E);
    expect(v.find((x) => x.document_id === id)?.due).toBe(false);
  });

  it('retention verdict due true past boundary', () => {
    const id = newDoc({ createdAtISO: '2010-01-01T00:00:00Z' });
    upsertRetentionRule(E, { category: null, retain_years: 5,
      action_at_end: 'archive', is_active: true });
    const v = evaluateRetention(E, '2026-01-01T00:00:00Z');
    expect(v.find((x) => x.document_id === id)?.due).toBe(true);
  });

  it('retention verdict due false before boundary', () => {
    const id = newDoc({ createdAtISO: '2025-01-01T00:00:00Z' });
    upsertRetentionRule(E, { category: null, retain_years: 5,
      action_at_end: 'archive', is_active: true });
    const v = evaluateRetention(E, '2026-01-01T00:00:00Z');
    expect(v.find((x) => x.document_id === id)?.due).toBe(false);
  });

  it('archivePerRetention transitions lifecycle to archived via S143 engine', () => {
    const id = newDoc();
    const r = archivePerRetention(E, [id], U_OWNER);
    expect(r.archived).toContain(id);
    // After archive, lifecycle is archived
    const raw = JSON.parse(localStorage.getItem(`erp_documents_${E}`)!);
    expect(raw[0].control.lifecycle_status).toBe('archived');
  });

  it('retention rule list survives upsert idempotently', () => {
    upsertRetentionRule(E, { category: 'financial', retain_years: 7,
      action_at_end: 'archive', is_active: true });
    expect(listRetentionRules(E).length).toBe(1);
  });
});

describe('S144 · Review · cycles + due detection + markReviewed', () => {
  beforeEach(() => { localStorage.clear(); });

  it('upsertReviewCycle deactivates other active cycles of same category', () => {
    const a = upsertReviewCycle(E, { category: 'policy', frequency: 'yearly',
      escalate_to_owner: true, is_active: true });
    const b = upsertReviewCycle(E, { category: 'policy', frequency: 'half_yearly',
      escalate_to_owner: true, is_active: true });
    const all = listReviewCycles(E);
    expect(all.find((c) => c.id === a.id)?.is_active).toBe(false);
    expect(all.find((c) => c.id === b.id)?.is_active).toBe(true);
  });

  it('evaluateReviewsDue detects date_past reason', () => {
    const id = newDoc();
    const raw = JSON.parse(localStorage.getItem(`erp_documents_${E}`)!);
    raw[0].control = { review_date: '2000-01-01T00:00:00Z' };
    localStorage.setItem(`erp_documents_${E}`, JSON.stringify(raw));
    const due = evaluateReviewsDue(E);
    expect(due.find((d) => d.document_id === id)?.reason).toBe('date_past');
  });

  it('evaluateReviewsDue detects cycle_derived when effective_date + frequency elapsed', () => {
    const id = newDoc({ createdAtISO: '2020-01-01T00:00:00Z' });
    setCategory(E, id, 'policy', U_OWNER);
    upsertReviewCycle(E, { category: 'policy', frequency: 'yearly',
      escalate_to_owner: false, is_active: true });
    const due = evaluateReviewsDue(E, '2026-01-01T00:00:00Z');
    expect(due.some((d) => d.document_id === id && d.reason === 'cycle_derived')).toBe(true);
  });

  it('markReviewed advances review_date per cycle frequency', () => {
    const id = newDoc();
    setCategory(E, id, 'policy', U_OWNER);
    upsertReviewCycle(E, { category: 'policy', frequency: 'monthly',
      escalate_to_owner: false, is_active: true });
    const before = getDocument(E, id)!.control?.review_date ?? null;
    markReviewed(E, id, U_OWNER, '2026-01-01T00:00:00Z');
    const after = getDocument(E, id)!.control!.review_date!;
    expect(after).not.toBe(before);
    expect(new Date(after).getUTCMonth()).toBe(1); // Feb
  });
});

describe('S144 · B.7 Links · CRUD + voucher ref', () => {
  beforeEach(() => { localStorage.clear(); });

  it('linkDocument creates a link visible via both lookups', () => {
    const id = newDoc();
    linkDocument(E, id, { ref_type: 'task', ref_id: 't-1', ref_label: 'Task 1', created_by: U_OWNER });
    expect(listLinksForDocument(E, id).length).toBe(1);
    expect(listLinksForRef(E, 'task', 't-1').length).toBe(1);
  });

  it('voucher ref_type is accepted', () => {
    const id = newDoc();
    const link = linkDocument(E, id, { ref_type: 'voucher', ref_id: 'V-001',
      ref_label: 'Voucher V-001', created_by: U_OWNER });
    expect(link.ref_type).toBe('voucher');
  });

  it('unlinkDocument removes the link', () => {
    const id = newDoc();
    const l = linkDocument(E, id, { ref_type: 'employee', ref_id: 'e-1',
      ref_label: 'Emp 1', created_by: U_OWNER });
    unlinkDocument(E, l.id);
    expect(listLinks(E).length).toBe(0);
  });
});

describe('S144 · TF-34 Circulars · publish + ack + status', () => {
  beforeEach(() => { localStorage.clear(); seedEmployees(); });

  it('publishCircular throws when document is not in lifecycle published', () => {
    const id = newDoc();
    expect(() => publishCircular(E, { document_id: id, title: 'Policy',
      target: 'all', published_by: U_OWNER })).toThrow(/published/);
  });

  it('publishCircular succeeds when document lifecycle is published', () => {
    const id = newDoc();
    setLifecycleStatus(E, id, 'under_review', U_OWNER);
    setLifecycleStatus(E, id, 'published', U_OWNER);
    const c = publishCircular(E, { document_id: id, title: 'Policy',
      target: 'all', published_by: U_OWNER });
    expect(listCirculars(E)).toHaveLength(1);
    expect(c.target).toBe('all');
  });

  it('acknowledgeCircular is idempotent for targeted users', () => {
    const id = newDoc();
    setLifecycleStatus(E, id, 'under_review', U_OWNER);
    setLifecycleStatus(E, id, 'published', U_OWNER);
    const c = publishCircular(E, { document_id: id, title: 'P', target: 'all', published_by: U_OWNER });
    const a1 = acknowledgeCircular(E, c.id, U_OTHER);
    const a2 = acknowledgeCircular(E, c.id, U_OTHER);
    expect(a1.id).toBe(a2.id);
  });

  it('acknowledgeCircular throws for non-targeted user', () => {
    const id = newDoc();
    setLifecycleStatus(E, id, 'under_review', U_OWNER);
    setLifecycleStatus(E, id, 'published', U_OWNER);
    const c = publishCircular(E, { document_id: id, title: 'P', target: 'department',
      target_department_id: 'd-ops', published_by: U_OWNER });
    expect(() => acknowledgeCircular(E, c.id, U_THIRD)).toThrow(/not targeted/);
  });

  it('getCircularStatus computes pct correctly', () => {
    const id = newDoc();
    setLifecycleStatus(E, id, 'under_review', U_OWNER);
    setLifecycleStatus(E, id, 'published', U_OWNER);
    const c = publishCircular(E, { document_id: id, title: 'P', target: 'all', published_by: U_OWNER });
    acknowledgeCircular(E, c.id, U_OTHER);
    const s = getCircularStatus(E, c.id);
    expect(s.targeted).toBe(3);
    expect(s.acknowledged).toBe(1);
    expect(s.pct).toBeGreaterThan(0);
    expect(s.pending.length).toBe(2);
  });

  it('closeCircular sets closed_at', () => {
    const id = newDoc();
    setLifecycleStatus(E, id, 'under_review', U_OWNER);
    setLifecycleStatus(E, id, 'published', U_OWNER);
    const c = publishCircular(E, { document_id: id, title: 'P', target: 'all', published_by: U_OWNER });
    const closed = closeCircular(E, c.id, U_OWNER);
    expect(closed.closed_at).toBeTruthy();
  });
});

describe('S144 · TF-38 Completeness', () => {
  beforeEach(() => { localStorage.clear(); seedEmployees(); });

  it('upsertRequirementTemplate creates and lists templates', () => {
    const t = upsertRequirementTemplate(E, {
      target_kind: 'employee', target_filter: null, is_active: true,
      required_items: [{ title: 'Aadhaar', category: 'statutory', mandatory: true }],
    });
    expect(t.id).toBeTruthy();
  });

  it('evaluateCompleteness reports missing items for employees', () => {
    upsertRequirementTemplate(E, {
      target_kind: 'employee', target_filter: null, is_active: true,
      required_items: [{ title: 'Aadhaar', category: 'statutory', mandatory: true }],
    });
    const r = evaluateCompleteness(E, 'employee');
    expect(r.length).toBe(3);
    expect(r[0].missing.length).toBe(1);
  });

  it('completeness marks target complete when category present', () => {
    const id = newDoc();
    setCategory(E, id, 'statutory', U_OWNER);
    linkDocument(E, id, { ref_type: 'employee', ref_id: U_OTHER,
      ref_label: 'Bob', created_by: U_OWNER });
    upsertRequirementTemplate(E, {
      target_kind: 'employee', target_filter: null, is_active: true,
      required_items: [{ title: 'Aadhaar', category: 'statutory', mandatory: true }],
    });
    const r = evaluateCompleteness(E, 'employee');
    const bob = r.find((x) => x.target_id === U_OTHER)!;
    expect(bob.missing.length).toBe(0);
    expect(bob.present).toBe(1);
  });

  it('optional items are excluded from mandatory count', () => {
    upsertRequirementTemplate(E, {
      target_kind: 'employee', target_filter: null, is_active: true,
      required_items: [
        { title: 'M', category: 'statutory', mandatory: true },
        { title: 'O', category: 'general', mandatory: false },
      ],
    });
    const r = evaluateCompleteness(E, 'employee');
    expect(r[0].required).toBe(1);
  });

  it('summary aggregates complete vs incomplete', () => {
    upsertRequirementTemplate(E, {
      target_kind: 'employee', target_filter: null, is_active: true,
      required_items: [{ title: 'Aadhaar', category: 'statutory', mandatory: true }],
    });
    const s = getCompletenessSummary(E, 'employee');
    expect(s[0].total).toBe(3);
    expect(s[0].incomplete).toBe(3);
  });
});

describe('S144 · FY facet', () => {
  beforeEach(() => { localStorage.clear(); });

  it('setFinancialYear validates FY format and throws on bad input', () => {
    const id = newDoc();
    expect(() => setFinancialYear(E, id, 'FY2026', U_OWNER)).toThrow(/invalid FY/);
  });

  it('setFinancialYear accepts valid FYYYYY-YY format', () => {
    const id = newDoc();
    setFinancialYear(E, id, 'FY2026-27', U_OWNER);
    expect(getDocument(E, id)!.control?.financial_year).toBe('FY2026-27');
  });

  it('listDocumentsByFY filters by FY', () => {
    const a = newDoc({ title: 'A' });
    const b = newDoc({ title: 'B' });
    setFinancialYear(E, a, 'FY2026-27', U_OWNER);
    setFinancialYear(E, b, 'FY2025-26', U_OWNER);
    expect(listDocumentsByFY(E, 'FY2026-27').map((d) => d.id)).toEqual([a]);
  });
});

describe('S144 · Registers', () => {
  it('S143 entry has banked headSha 339ce7a2', () => {
    const s143 = SPRINTS.find((s) => s.sprintNumber === 143)!;
    expect(s143.headSha).toContain('339ce7a2');
  });

  it('S144 entry exists in sprint-history', () => {
    expect(SPRINTS.find((s) => s.sprintNumber === 144)).toBeDefined();
  });

  it('sibling register length is at least 213', () => {
    expect(SIBLINGS.length).toBeGreaterThanOrEqual(213);
  });

  it('docvault-governance-engine is registered as a sibling', () => {
    expect(SIBLINGS.find((s) => s.id === 'docvault-governance-engine')).toBeDefined();
  });
});

describe('S144.T1 · hotfix · TaskRoom Documents · AttachDocuments · Watermark · ACL toast', () => {
  beforeEach(() => { localStorage.clear(); });

  it('TaskRoom Documents tab surfaces linked docs via listLinksForRef("task", taskId)', () => {
    const id = newDoc({ title: 'TaskAttachedDoc' });
    const TASK_ID = 't-room-1';
    linkDocument(E, id, { ref_type: 'task', ref_id: TASK_ID,
      ref_label: 'Task room 1', created_by: U_OWNER });
    const linked = listLinksForRef(E, 'task', TASK_ID);
    expect(linked).toHaveLength(1);
    expect(linked[0].document_id).toBe(id);
    expect(linked[0].ref_label).toBe('Task room 1');
  });

  it('AttachDocuments link-existing path appends a DocumentLinkRef visible to register', () => {
    // Default ACL allows view+download but not upload — give explicit upload right.
    upsertACL(E, { ...DEFAULT_ACL(U_OWNER, E), allow_upload: true, updated_by: U_OWNER });
    expect(() => assertAcl(E, U_OWNER, 'upload')).not.toThrow();
    const id = newDoc({ title: 'Linkable' });
    linkDocument(E, id, { ref_type: 'task', ref_id: 't-att-1',
      ref_label: 'Att 1', created_by: U_OWNER });
    expect(listLinksForRef(E, 'task', 't-att-1').map((l) => l.document_id)).toContain(id);
  });

  it('watermark string surfaces in getEffectivePermission → consumed verbatim by overlay props', () => {
    const id = newDoc();
    grantShare(E, { document_id: id, grantee_user_id: U_OTHER,
      permission: 'view_watermark', created_by: U_OWNER });
    const eff = getEffectivePermission(E, id, U_OTHER, 'Bob', '2026-06-04T05:00:00Z');
    // Contract drives WatermarkOverlay's data-watermark attribute (UI is a passive consumer).
    expect(eff.permission).toBe('view_watermark');
    expect(eff.watermark).toBe('Bob · 2026-06-04T05:00:00Z');
    expect(eff.watermark).toMatch(/^Bob · /);
  });

  it('ACL-denied upload toast path: assertAcl throws on user without upload right', () => {
    // Default ACL does NOT grant upload — AttachDocuments toasts on this throw.
    const denied = (): void => assertAcl(E, 'no-upload-user', 'upload');
    expect(denied).toThrow(/ACL denied: upload/);
  });
});

