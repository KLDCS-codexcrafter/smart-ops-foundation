/**
 * @file        src/components/procurement/IndentLineageTreeSvg.tsx
 * @purpose     Sprint B.2 · Static SVG tree visualization of IndentLineageNode · consumes
 *              indent-cascade-lineage.buildLineageTree · simple recursive layout · per B2-Q3=B
 *              "show value progressively" philosophy · sufficient for Phase 1
 * @who         Internal procurement admin · invoked from ProcurementLineageBreadcrumb modal
 * @when        2026-05-19 (Sprint B.2)
 * @sprint      T-Phase-1.B-2-Procurement-Pulse-Enrichment-Demo-Seed
 * @iso         ISO 25010 Functional Suitability · Visual Clarity
 * @whom        Audit Owner
 * @decisions   D-NEW-EV lineage SVG tree pattern · static layout · Phase 2 promotes to interactive
 *              collapsible tree
 * @disciplines FR-30 · FR-67 (no duplicate tree implementations · this is THE canonical procurement
 *              lineage visualization)
 * @reuses      indent-cascade-lineage.buildLineageTree · IndentLineageNode + STATUS_LABEL types
 * @[JWT]       Phase 2: D3-based interactive tree with zoom · pan · expand/collapse
 */
import { useMemo } from 'react';
import { buildLineageTree } from '@/lib/indent-cascade-lineage';
import type { IndentLineageNode } from '@/types/requisition-common';
import { STATUS_LABEL } from '@/types/requisition-common';
import type { IndentStatus } from '@/types/material-indent';

interface IndentLineageTreeSvgProps {
  rootIndentId: string;
  entityCode: string;
  width?: number;
  height?: number;
}

interface LayoutNode {
  node: IndentLineageNode;
  x: number;
  y: number;
  level: number;
}

function layoutTree(root: IndentLineageNode): LayoutNode[] {
  const NODE_W = 140;
  const NODE_H = 40;
  const X_GAP = 20;
  const Y_GAP = 60;

  const byLevel: IndentLineageNode[][] = [];
  const visit = (n: IndentLineageNode, level: number): void => {
    if (!byLevel[level]) byLevel[level] = [];
    byLevel[level].push(n);
    for (const c of n.children) visit(c, level + 1);
  };
  visit(root, 0);

  const maxWidth = byLevel.reduce(
    (max, lvl) => Math.max(max, lvl.length * (NODE_W + X_GAP)),
    0,
  );

  const out: LayoutNode[] = [];
  for (let level = 0; level < byLevel.length; level += 1) {
    const lvl = byLevel[level];
    const lvlWidth = lvl.length * (NODE_W + X_GAP);
    const startX = (maxWidth - lvlWidth) / 2;
    for (let i = 0; i < lvl.length; i += 1) {
      out.push({
        node: lvl[i],
        x: startX + i * (NODE_W + X_GAP),
        y: level * (NODE_H + Y_GAP),
        level,
      });
    }
  }
  return out;
}

const STATUS_FILL: Partial<Record<IndentStatus, string>> = {
  draft: '#94a3b8', submitted: '#3b82f6', pending_hod: '#f59e0b',
  pending_purchase: '#f59e0b', pending_finance: '#f59e0b',
  approved: '#10b981', rejected: '#ef4444', hold: '#94a3b8',
  rfq_created: '#8b5cf6', po_created: '#10b981',
  partially_ordered: '#06b6d4', closed: '#475569',
};

export function IndentLineageTreeSvg({
  rootIndentId, entityCode, width = 700, height = 400,
}: IndentLineageTreeSvgProps): JSX.Element {
  const tree = useMemo(
    () => buildLineageTree(rootIndentId, entityCode),
    [rootIndentId, entityCode],
  );

  const nodes = useMemo(() => (tree ? layoutTree(tree) : []), [tree]);

  if (!tree || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        No lineage data available.
      </div>
    );
  }

  const maxX = Math.max(...nodes.map((n) => n.x + 140)) + 20;
  const maxY = Math.max(...nodes.map((n) => n.y + 40)) + 20;

  return (
    <div className="w-full overflow-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${maxX} ${maxY}`}
        preserveAspectRatio="xMidYMin meet"
        className="border border-slate-200 rounded"
      >
        {nodes.map((ln) =>
          ln.node.children.map((c) => {
            const child = nodes.find((other) => other.node.id === c.id);
            if (!child) return null;
            return (
              <line
                key={`edge-${ln.node.id}-${c.id}`}
                x1={ln.x + 70}
                y1={ln.y + 40}
                x2={child.x + 70}
                y2={child.y}
                stroke="#94a3b8"
                strokeWidth={1.5}
              />
            );
          })
        )}

        {nodes.map((ln) => {
          const fill = STATUS_FILL[ln.node.status] ?? '#94a3b8';
          return (
            <g key={`node-${ln.node.id}`} transform={`translate(${ln.x}, ${ln.y})`}>
              <rect
                width={140}
                height={40}
                rx={6}
                ry={6}
                fill={`${fill}15`}
                stroke={fill}
                strokeWidth={1.5}
              />
              <text
                x={70}
                y={16}
                textAnchor="middle"
                fontSize={11}
                fontFamily="monospace"
                fontWeight={600}
                fill="#0f172a"
              >
                {ln.node.voucher_no}
              </text>
              <text
                x={70}
                y={30}
                textAnchor="middle"
                fontSize={9}
                fill="#64748b"
              >
                {STATUS_LABEL[ln.node.status] ?? ln.node.status}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
