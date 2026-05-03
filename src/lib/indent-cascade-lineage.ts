/**
 * @file        indent-cascade-lineage.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @card        Card #3 · P2P arc · RequestX
 * @purpose     OOB-27 (CORE) cascade lineage tree builder for indents.
 * @decisions   D-220 (lineage CORE)
 * @disciplines SD-15
 * @[JWT]       /api/audit/lineage/:id
 */
import { materialIndentsKey, type MaterialIndent } from '@/types/material-indent';
import type { IndentLineageNode, IndentVoucherKind } from '@/types/requisition-common';

interface LineageEvent {
  id: string;
  parent_id: string | null;
  cascade_reason: 'short_supply' | 'qc_rejection' | 'substitute' | null;
  voucher_no: string;
  date: string;
  status: string;
  kind: IndentVoucherKind;
  at: string;
}

function loadMaterialIndents(entityCode: string): MaterialIndent[] {
  // [JWT] GET /api/requestx/material-indents
  try {
    const raw = localStorage.getItem(materialIndentsKey(entityCode));
    return raw ? (JSON.parse(raw) as MaterialIndent[]) : [];
  } catch {
    return [];
  }
}

function toNode(i: MaterialIndent): IndentLineageNode {
  return {
    id: i.id,
    voucher_no: i.voucher_no,
    kind: 'material',
    status: i.status,
    date: i.date,
    parent_id: i.parent_indent_id,
    cascade_reason: i.cascade_reason,
    children: [],
  };
}

export function buildLineageTree(rootIndentId: string, entityCode: string): IndentLineageNode | null {
  const all = loadMaterialIndents(entityCode);
  const byId = new Map(all.map(i => [i.id, i]));
  let cur = byId.get(rootIndentId);
  if (!cur) return null;
  // walk up to root
  while (cur.parent_indent_id && byId.has(cur.parent_indent_id)) {
    cur = byId.get(cur.parent_indent_id) as MaterialIndent;
  }
  // build tree downward
  const buildDown = (node: IndentLineageNode): IndentLineageNode => {
    const children = all.filter(x => x.parent_indent_id === node.id).map(toNode).map(buildDown);
    return { ...node, children };
  };
  return buildDown(toNode(cur));
}

export function walkAncestors(indentId: string, entityCode: string): IndentLineageNode[] {
  const all = loadMaterialIndents(entityCode);
  const byId = new Map(all.map(i => [i.id, i]));
  const out: IndentLineageNode[] = [];
  let cur = byId.get(indentId);
  while (cur && cur.parent_indent_id) {
    const p = byId.get(cur.parent_indent_id);
    if (!p) break;
    out.push(toNode(p));
    cur = p;
  }
  return out;
}

export function walkDescendants(indentId: string, entityCode: string): IndentLineageNode[] {
  const all = loadMaterialIndents(entityCode);
  const result: IndentLineageNode[] = [];
  const stack: string[] = [indentId];
  while (stack.length) {
    const cur = stack.pop() as string;
    for (const c of all.filter(x => x.parent_indent_id === cur)) {
      result.push(toNode(c));
      stack.push(c.id);
    }
  }
  return result;
}

export function getCascadeAuditTrail(indentId: string, entityCode: string): LineageEvent[] {
  const tree = buildLineageTree(indentId, entityCode);
  if (!tree) return [];
  const events: LineageEvent[] = [];
  const visit = (n: IndentLineageNode): void => {
    events.push({
      id: n.id,
      parent_id: n.parent_id,
      cascade_reason: n.cascade_reason,
      voucher_no: n.voucher_no,
      date: n.date,
      status: n.status,
      kind: n.kind,
      at: n.date,
    });
    for (const c of n.children) visit(c);
  };
  visit(tree);
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

export function formatLineagePath(node: IndentLineageNode): string {
  const parts: string[] = [node.voucher_no];
  const walk = (n: IndentLineageNode): void => {
    for (const c of n.children) {
      parts.push(`→ ${c.voucher_no}${c.cascade_reason ? ` (${c.cascade_reason})` : ''}`);
      walk(c);
    }
  };
  walk(node);
  return parts.join(' ');
}
