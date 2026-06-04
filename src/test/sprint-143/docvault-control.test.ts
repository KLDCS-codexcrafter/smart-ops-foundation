/**
 * @file   src/test/sprint-143/docvault-control.test.ts
 * @sprint Sprint 143 · T-TaskFlow-A641.7 · DocVault Control Pt 1 · §N tests
 * @target ≥30 it() — defaults · numbering · lifecycle · expiries · ownership ·
 *         confidentiality · lock · folders · category/dates · audit ·
 *         handover transfer · registers · legacy-doc backward compatibility.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createDocument, addVersion, getDocument } from '@/lib/docvault-engine';
import {
  getControl,
  upsertNumberingConfig, listNumberingConfigs, previewNextDocumentCode,
  getActiveNumberingConfigForCategory, assignDocumentCode,
  setLifecycleStatus, evaluateExpiries,
  transferDocumentOwnership, listDocumentsOwnedBy,
  setConfidentiality,
  lockDocument, unlockDocument, guardedAddVersion,
  createFolder, updateFolder, deleteFolder, listFolders, listFolderTree,
  moveDocumentToFolder, getFolder,
  setCategory, setControlDates,
  listControlAudit,
} from '@/lib/docvault-control-engine';
import { generateHandoverPacket, executeHandover } from '@/lib/operix-handover-engine';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const E = 'ACME';
const U_OWNER = 'u-alice';
const U_OTHER = 'u-bob';

const newDoc = (overrides: { title?: string; createdBy?: string } = {}): string => {
  const d = createDocument(
    E,
    {
      entity_id: E, document_type: 'other', title: overrides.title ?? 'Doc',
      tags: {}, originating_department_id: 'ops',
    },
    {
      version_no: 'A', file_url: 'mock://a.pdf', file_size_bytes: 100,
      uploaded_at: new Date().toISOString(), uploaded_by: overrides.createdBy ?? U_OWNER,
    },
    overrides.createdBy ?? U_OWNER,
  );
  return d.id;
};

describe('S143 · DocVault Control Pt 1 · defaults / migration-on-read', () => {
  beforeEach(() => { localStorage.clear(); });

  it('legacy doc gets default control via getControl() without persisting', () => {
    const id = newDoc();
    const doc = getDocument(E, id)!;
    expect(doc.control).toBeUndefined();
    const c = getControl(doc);
    expect(c.lifecycle_status).toBe('active');
    expect(c.confidentiality).toBe('internal');
    expect(c.owner_id).toBe(U_OWNER);
    // Re-read: still no persisted control field
    expect(getDocument(E, id)!.control).toBeUndefined();
  });

  it('getControl materialises owner_id from created_by for legacy docs', () => {
    const id = newDoc({ createdBy: 'legacy-user' });
    const c = getControl(getDocument(E, id)!);
    expect(c.owner_id).toBe('legacy-user');
  });
});

describe('S143 · Numbering', () => {
  beforeEach(() => { localStorage.clear(); });

  it('upsertNumberingConfig rejects bad prefix', () => {
    expect(() => upsertNumberingConfig(E, {
      category: 'policy', numbering_prefix: 'bad', next_sequence: 1, is_active: true,
    })).toThrow();
  });

  it('upsertNumberingConfig rejects non-positive sequence', () => {
    expect(() => upsertNumberingConfig(E, {
      category: 'policy', numbering_prefix: 'POL', next_sequence: 0, is_active: true,
    })).toThrow();
  });

  it('only one active config per category survives upsert', () => {
    upsertNumberingConfig(E, { category: 'policy', numbering_prefix: 'POL', next_sequence: 1, is_active: true });
    upsertNumberingConfig(E, { category: 'policy', numbering_prefix: 'POLX', next_sequence: 9, is_active: true });
    const active = listNumberingConfigs(E).filter((c) => c.category === 'policy' && c.is_active);
    expect(active).toHaveLength(1);
    expect(active[0].numbering_prefix).toBe('POLX');
  });

  it('previewNextDocumentCode produces {prefix}-{pad6}', () => {
    upsertNumberingConfig(E, { category: 'policy', numbering_prefix: 'POL', next_sequence: 42, is_active: true });
    expect(previewNextDocumentCode(E, 'policy')).toBe('POL-000042');
    expect(previewNextDocumentCode(E, 'contract')).toBeNull();
  });

  it('assignDocumentCode requires category', () => {
    const id = newDoc();
    upsertNumberingConfig(E, { category: 'policy', numbering_prefix: 'POL', next_sequence: 1, is_active: true });
    expect(() => assignDocumentCode(E, id, U_OWNER)).toThrow(/category/);
  });

  it('assignDocumentCode requires active numbering config', () => {
    const id = newDoc();
    setCategory(E, id, 'policy', U_OWNER);
    expect(() => assignDocumentCode(E, id, U_OWNER)).toThrow(/numbering/);
  });

  it('assignDocumentCode assigns and advances sequence', () => {
    upsertNumberingConfig(E, { category: 'policy', numbering_prefix: 'POL', next_sequence: 1, is_active: true });
    const id = newDoc();
    setCategory(E, id, 'policy', U_OWNER);
    const r = assignDocumentCode(E, id, U_OWNER);
    expect(r.code).toBe('POL-000001');
    expect(getActiveNumberingConfigForCategory(E, 'policy')!.next_sequence).toBe(2);
  });

  it('re-assigning a code throws (idempotency)', () => {
    upsertNumberingConfig(E, { category: 'policy', numbering_prefix: 'POL', next_sequence: 1, is_active: true });
    const id = newDoc();
    setCategory(E, id, 'policy', U_OWNER);
    assignDocumentCode(E, id, U_OWNER);
    expect(() => assignDocumentCode(E, id, U_OWNER)).toThrow(/already/);
  });
});

describe('S143 · Lifecycle', () => {
  beforeEach(() => { localStorage.clear(); });

  it('legal transition active → under_review', () => {
    const id = newDoc();
    setLifecycleStatus(E, id, 'under_review', U_OWNER);
    expect(getControl(getDocument(E, id)!).lifecycle_status).toBe('under_review');
  });

  it('legal chain under_review → published → expired → archived', () => {
    const id = newDoc();
    setLifecycleStatus(E, id, 'under_review', U_OWNER);
    setLifecycleStatus(E, id, 'published', U_OWNER);
    setLifecycleStatus(E, id, 'expired', U_OWNER);
    setLifecycleStatus(E, id, 'archived', U_OWNER);
    expect(getControl(getDocument(E, id)!).lifecycle_status).toBe('archived');
  });

  it('illegal: active → published throws', () => {
    const id = newDoc();
    expect(() => setLifecycleStatus(E, id, 'published', U_OWNER)).toThrow(/illegal/);
  });

  it('illegal: archived → anything throws', () => {
    const id = newDoc();
    setLifecycleStatus(E, id, 'archived', U_OWNER);
    expect(() => setLifecycleStatus(E, id, 'active', U_OWNER)).toThrow(/illegal/);
  });

  it('illegal: expired → published throws', () => {
    const id = newDoc();
    setLifecycleStatus(E, id, 'under_review', U_OWNER);
    setLifecycleStatus(E, id, 'published', U_OWNER);
    setLifecycleStatus(E, id, 'expired', U_OWNER);
    expect(() => setLifecycleStatus(E, id, 'published', U_OWNER)).toThrow(/illegal/);
  });

  it('evaluateExpiries flags past-due, ignores future, ignores archived', () => {
    const past = newDoc({ title: 'past' });
    const future = newDoc({ title: 'future' });
    const arch = newDoc({ title: 'arch' });
    setControlDates(E, past, { expiry_date: '2020-01-01' }, U_OWNER);
    setControlDates(E, future, { expiry_date: '2099-01-01' }, U_OWNER);
    setControlDates(E, arch, { expiry_date: '2020-01-01' }, U_OWNER);
    setLifecycleStatus(E, arch, 'archived', U_OWNER);
    const r = evaluateExpiries(E, '2026-06-04T00:00:00Z');
    const ids = r.toExpire.map((x) => x.documentId);
    expect(ids).toContain(past);
    expect(ids).not.toContain(future);
    expect(ids).not.toContain(arch);
  });

  it('evaluateExpiries reviewDue surfaces past review dates', () => {
    const id = newDoc();
    setControlDates(E, id, { review_date: '2020-01-01' }, U_OWNER);
    const r = evaluateExpiries(E, '2026-06-04T00:00:00Z');
    expect(r.reviewDue.map((x) => x.documentId)).toContain(id);
  });
});

describe('S143 · Ownership (closes S142 TF-35 deferral)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('transferDocumentOwnership requires non-empty reason', () => {
    const id = newDoc();
    expect(() => transferDocumentOwnership(E, id, U_OTHER, U_OWNER, '')).toThrow(/reason/);
    expect(() => transferDocumentOwnership(E, id, U_OTHER, U_OWNER, '   ')).toThrow(/reason/);
  });

  it('transferDocumentOwnership flips owner_id and audits before/after', () => {
    const id = newDoc();
    transferDocumentOwnership(E, id, U_OTHER, U_OWNER, 'role change');
    expect(getControl(getDocument(E, id)!).owner_id).toBe(U_OTHER);
    const audit = listControlAudit(E, id).filter((a) => a.action === 'owner_transferred');
    expect(audit).toHaveLength(1);
    expect((audit[0].before as { owner_id: string }).owner_id).toBe(U_OWNER);
    expect((audit[0].after as { owner_id: string }).owner_id).toBe(U_OTHER);
  });

  it('listDocumentsOwnedBy reflects current owner (including legacy default)', () => {
    const legacy = newDoc({ createdBy: U_OWNER });
    const transferred = newDoc({ createdBy: U_OWNER });
    transferDocumentOwnership(E, transferred, U_OTHER, U_OWNER, 'reshuffle');
    expect(listDocumentsOwnedBy(E, U_OWNER).map((d) => d.id)).toContain(legacy);
    expect(listDocumentsOwnedBy(E, U_OTHER).map((d) => d.id)).toContain(transferred);
  });

  it('handover packet selects documents by getControl().owner_id', () => {
    const id = newDoc({ createdBy: U_OWNER });
    transferDocumentOwnership(E, id, U_OTHER, U_OWNER, 'r');
    const packet = generateHandoverPacket(E, U_OTHER);
    expect(packet.ownedDocuments.map((d) => d.documentId)).toContain(id);
  });

  it('executeHandover actually transfers document ownership (deferral closed)', () => {
    const id = newDoc({ createdBy: U_OWNER });
    const rec = executeHandover(E, U_OWNER, U_OTHER, 'admin', { note: 'exit' });
    expect(rec.documentIds).toContain(id);
    expect(getControl(getDocument(E, id)!).owner_id).toBe(U_OTHER);
  });
});

describe('S143 · Confidentiality + folder floor', () => {
  beforeEach(() => { localStorage.clear(); });

  it('setConfidentiality flips and audits', () => {
    const id = newDoc();
    setConfidentiality(E, id, 'restricted', U_OWNER);
    expect(getControl(getDocument(E, id)!).confidentiality).toBe('restricted');
    expect(listControlAudit(E, id).some((a) => a.action === 'confidentiality_changed')).toBe(true);
  });

  it('setConfidentiality below folder floor throws', () => {
    const f = createFolder(E, { name: 'Top', confidentiality_floor: 'restricted' }, U_OWNER);
    const id = newDoc();
    setConfidentiality(E, id, 'restricted', U_OWNER); // bring up to floor first
    moveDocumentToFolder(E, id, f.id, U_OWNER);
    expect(() => setConfidentiality(E, id, 'public', U_OWNER)).toThrow(/floor/);
  });

  it('moveDocumentToFolder throws if doc confidentiality below floor', () => {
    const f = createFolder(E, { name: 'Top', confidentiality_floor: 'restricted' }, U_OWNER);
    const id = newDoc();
    // default doc confidentiality 'internal' < 'restricted'
    expect(() => moveDocumentToFolder(E, id, f.id, U_OWNER)).toThrow(/floor/);
  });
});

describe('S143 · Lock / guardedAddVersion', () => {
  beforeEach(() => { localStorage.clear(); });

  const vNext = (n: string) => ({
    version_no: n, file_url: `mock://${n}.pdf`, file_size_bytes: 1,
    uploaded_at: new Date().toISOString(), uploaded_by: U_OWNER,
  });

  it('lockDocument by non-locker re-throws when another user holds it', () => {
    const id = newDoc();
    lockDocument(E, id, U_OWNER);
    expect(() => lockDocument(E, id, U_OTHER)).toThrow(/locked/);
  });

  it('guardedAddVersion is blocked when locked by another user', () => {
    const id = newDoc();
    lockDocument(E, id, U_OTHER);
    expect(() => guardedAddVersion(E, id, vNext('B'), U_OWNER)).toThrow(/locked/);
  });

  it('guardedAddVersion succeeds for the locker', () => {
    const id = newDoc();
    lockDocument(E, id, U_OWNER);
    const r = guardedAddVersion(E, id, vNext('B'), U_OWNER);
    expect(r?.current_version).toBe('B');
  });

  it('only locker or owner may unlock', () => {
    const id = newDoc({ createdBy: U_OWNER });
    lockDocument(E, id, U_OTHER);
    expect(() => unlockDocument(E, id, 'u-charlie')).toThrow(/locker or the owner/);
    unlockDocument(E, id, U_OWNER); // owner can unlock
    expect(getControl(getDocument(E, id)!).locked_by).toBeNull();
  });
});

describe('S143 · Folders CRUD + tree + cycles', () => {
  beforeEach(() => { localStorage.clear(); });

  it('createFolder requires name', () => {
    expect(() => createFolder(E, { name: '' }, U_OWNER)).toThrow();
  });

  it('createFolder rejects missing parent', () => {
    expect(() => createFolder(E, { name: 'X', parent_folder_id: 'nope' }, U_OWNER)).toThrow(/parent/);
  });

  it('listFolderTree nests children under parents', () => {
    const root = createFolder(E, { name: 'Root' }, U_OWNER);
    const child = createFolder(E, { name: 'Child', parent_folder_id: root.id }, U_OWNER);
    const tree = listFolderTree(E);
    expect(tree).toHaveLength(1);
    expect(tree[0].folder.id).toBe(root.id);
    expect(tree[0].children[0].folder.id).toBe(child.id);
  });

  it('updateFolder prevents self-parent', () => {
    const a = createFolder(E, { name: 'A' }, U_OWNER);
    expect(() => updateFolder(E, a.id, { parent_folder_id: a.id })).toThrow(/parent|cycle/);
  });

  it('updateFolder prevents grandparent cycle', () => {
    const a = createFolder(E, { name: 'A' }, U_OWNER);
    const b = createFolder(E, { name: 'B', parent_folder_id: a.id }, U_OWNER);
    expect(() => updateFolder(E, a.id, { parent_folder_id: b.id })).toThrow(/cycle/);
  });

  it('deleteFolder removes folder', () => {
    const a = createFolder(E, { name: 'A' }, U_OWNER);
    deleteFolder(E, a.id);
    expect(listFolders(E)).toHaveLength(0);
    expect(getFolder(E, a.id)).toBeNull();
  });

  it('moveDocumentToFolder records folder_id and audits', () => {
    const f = createFolder(E, { name: 'X' }, U_OWNER);
    const id = newDoc();
    moveDocumentToFolder(E, id, f.id, U_OWNER);
    expect(getControl(getDocument(E, id)!).folder_id).toBe(f.id);
    expect(listControlAudit(E, id).some((a) => a.action === 'folder_moved')).toBe(true);
  });
});

describe('S143 · Audit + registers + additivity', () => {
  beforeEach(() => { localStorage.clear(); });

  it('every mutation appends a control audit entry', () => {
    upsertNumberingConfig(E, { category: 'policy', numbering_prefix: 'POL', next_sequence: 1, is_active: true });
    const id = newDoc();
    setCategory(E, id, 'policy', U_OWNER);
    assignDocumentCode(E, id, U_OWNER);
    setLifecycleStatus(E, id, 'under_review', U_OWNER);
    setConfidentiality(E, id, 'confidential', U_OWNER);
    transferDocumentOwnership(E, id, U_OTHER, U_OWNER, 'reorg');
    lockDocument(E, id, U_OTHER);
    unlockDocument(E, id, U_OTHER);
    const actions = listControlAudit(E, id).map((a) => a.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'category_set', 'code_assigned', 'lifecycle_changed',
        'confidentiality_changed', 'owner_transferred', 'locked', 'unlocked',
      ]),
    );
  });

  it('S143 sibling docvault-control-engine registered · SIBLINGS.length ≥ 212', () => {
    expect(SIBLINGS.some((s) => s.id === 'docvault-control-engine')).toBe(true);
    expect(SIBLINGS.length).toBeGreaterThanOrEqual(212);
  });

  it('S142 backfilled to 3b53dd5e and S143 is last entry as TBD_AT_BANK', () => {
    const s142 = SPRINTS.find((s) => s.sprintNumber === 142);
    expect(s142?.headSha).toBe('3b53dd5e');
    const s143 = SPRINTS.find((s) => s.sprintNumber === 143);
    expect(s143?.predecessorSha).toBe('3b53dd5e');
    expect(s143?.headSha).toBe('TBD_AT_BANK');
  });

  it('existing Document fields and version states untouched (additivity proof)', () => {
    const id = newDoc();
    const before = getDocument(E, id)!;
    expect(before.versions[0].version_status).toBe('draft');
    // add a version via the untouched engine
    addVersion(E, id, {
      version_no: 'B', file_url: 'mock://b.pdf', file_size_bytes: 1,
      uploaded_at: new Date().toISOString(), uploaded_by: U_OWNER,
    });
    expect(getDocument(E, id)!.current_version).toBe('B');
  });
});
