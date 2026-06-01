/**
 * @file        HierarchicalLedgerTreePage.tsx
 * @purpose     Standalone Page #24 — 7-tier hierarchical ledger tree viewer.
 *              Reads the persisted hierarchical-ledger registry via
 *              getTierLedgerTree() and renders a collapsible tree with
 *              tier badges, ledger counts, and reciprocal markers.
 * @sprint      T-Phase-6.A.0.2 · Sprint 97 · Block 4
 * @reads       hierarchical-ledger-engine (use-site)
 * @writes      none (read-only viewer)
 */
import { useMemo, useState } from 'react';
import { ChevronDown, Layers, Building2, GitBranch, Network, FolderTree, Briefcase, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  getTierLedgerTree,
  type HierarchyTier,
  type TierLedgerNode,
} from '@/lib/hierarchical-ledger-engine';

const TIER_ICON: Record<HierarchyTier, typeof Layers> = {
  parent: Building2,
  subsidiary: GitBranch,
  branch: Network,
  division: FolderTree,
  department: Layers,
  project: Briefcase,
  site: MapPin,
};

const TIER_LABEL: Record<HierarchyTier, string> = {
  parent: 'Parent',
  subsidiary: 'Subsidiary',
  branch: 'Branch',
  division: 'Division',
  department: 'Department',
  project: 'Project',
  site: 'Site',
};

interface NodeRowProps {
  node: TierLedgerNode;
  depth: number;
}

function NodeRow({ node, depth }: NodeRowProps) {
  const [open, setOpen] = useState(depth < 2);
  const Icon = TIER_ICON[node.tier];
  const hasChildren = node.children.length > 0;
  const paddingLeft = 12 + depth * 20;

  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-2 w-full py-2 pr-3 hover:bg-muted/40 transition-colors text-left rounded-md"
        style={{ paddingLeft }}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ${
            hasChildren ? (open ? '' : '-rotate-90') : 'opacity-0'
          }`}
        />
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">{node.scope_name}</span>
        <Badge variant="outline" className="text-[10px]">{TIER_LABEL[node.tier]}</Badge>
        <Badge variant="secondary" className="text-[10px] font-mono">
          {node.ledgers.length} ledger{node.ledgers.length === 1 ? '' : 's'}
        </Badge>
      </button>

      {open && (
        <div>
          {node.ledgers.length > 0 && (
            <ul className="ml-2 my-1 space-y-0.5" style={{ paddingLeft: paddingLeft + 24 }}>
              {node.ledgers.map((name) => (
                <li
                  key={`${node.scope_id}:${name}`}
                  className="text-[11px] text-muted-foreground font-mono truncate"
                >
                  • {name}
                </li>
              ))}
            </ul>
          )}
          {node.children.map((child) => (
            <NodeRow key={`${child.tier}:${child.scope_id}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HierarchicalLedgerTreePage() {
  const { entityCode } = useEntityCode();
  const tree = useMemo(
    () => (entityCode ? getTierLedgerTree({ entity_code: entityCode }) : []),
    [entityCode],
  );

  const stats = useMemo(() => {
    let nodes = 0;
    let ledgers = 0;
    const walk = (n: TierLedgerNode) => {
      nodes += 1;
      ledgers += n.ledgers.length;
      n.children.forEach(walk);
    };
    tree.forEach(walk);
    return { nodes, ledgers };
  }, [tree]);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Hierarchical Ledger Tree
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            7-tier auto-created ledger registry: Parent → Subsidiary → Branch → Division →
            Department → Project → Site. Reciprocal entries marked for subsidiaries.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-[10px] font-mono">
            {stats.nodes} scopes
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {stats.ledgers} ledgers
          </Badge>
        </div>
      </div>

      <Card className="glass-card">
        <CardContent className="p-3">
          {tree.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-12">
              No hierarchical ledgers created yet for entity{' '}
              <span className="font-mono">{entityCode || '—'}</span>.
              Ledgers are auto-created when a new tier scope is registered.
            </div>
          ) : (
            <div className="space-y-1">
              {tree.map((root) => (
                <NodeRow key={`${root.tier}:${root.scope_id}`} node={root} depth={0} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
