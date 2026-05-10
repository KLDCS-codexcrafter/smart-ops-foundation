/**
 * @file        src/pages/erp/docvault/registers/DrawingRegisterTree.tsx
 * @purpose     Drawing register tree visualization · parent/child + supersedes chain · institutional pattern
 * @who         Engineering · Quality · Production departments · ProjX (post-A.9 sub-module)
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.9 BUNDLED · Q-LOCK-2a + Q-LOCK-14a + Block A.1
 * @iso         ISO 9001:2015 §7.5 (document control · drawing revision history)
 * @whom        Audit Owner · Engineering Manager · Document Controller
 * @decisions   D-NEW-CL-docvault-version-tree-pattern (CANONICAL · 11th at v14 · institutional tree pattern) ·
 *              D-NEW-CL helper extracted to docvault-tree-util.ts (Q-LOCK-T1-F2 · FR-21 no eslint-disable) ·
 *              D-NEW-CJ-docvault-file-metadata-schema (consumes Document.versions[] + supersedes_version) ·
 *              D-NEW-BV Phase 1 mock pattern (uses existing loadDocuments)
 * @disciplines FR-30 (this header) · FR-50 multi-entity · FR-25 dept-scoped visibility
 * @reuses      docvault-engine.loadDocuments (read-only consumer) · DocumentVersion.supersedes_version field
 * @[JWT]       Phase 2: API may return tree-shaped JSON directly · Phase 1 builds tree client-side
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadDocuments } from '@/lib/docvault-engine';
import { buildVersionTree, type VersionNode } from '@/lib/docvault-tree-util';
import type { Document } from '@/types/docvault';

function TreeNode({ node, depth }: { node: VersionNode; depth: number }): JSX.Element {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 hover:bg-accent/30 rounded cursor-pointer"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
        ) : <span className="w-3" />}
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm">v{node.version.version_no}</span>
        <Badge variant="secondary" className="text-xs">{node.version.version_status}</Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(node.version.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>
      {open && node.children.map((c) => (
        <TreeNode key={c.version.version_no} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

export function DrawingRegisterTree(): JSX.Element {
  const { entityCode } = useEntityCode();
  const drawings = useMemo(
    () => loadDocuments(entityCode).filter((d) => d.document_type === 'drawing'),
    [entityCode],
  );

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Drawing Register · Tree</h1>
        <p className="text-sm text-muted-foreground">
          Version history with supersedes chains · ISO 9001:2015 §7.5.3 revision visibility.
        </p>
      </div>
      {drawings.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground py-8">
          No drawings yet · upload via DocumentEntry.
        </CardContent></Card>
      ) : drawings.map((doc: Document) => {
        const tree = buildVersionTree(doc.versions);
        return (
          <Card key={doc.id}>
            <CardContent className="pt-6">
              <div className="font-semibold mb-2">{doc.title}</div>
              <div className="text-xs text-muted-foreground mb-3">
                {doc.originating_department_id} · current v{doc.current_version}
              </div>
              <div className="border-t pt-2">
                {tree.map((n) => (
                  <TreeNode key={n.version.version_no} node={n} depth={0} />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default DrawingRegisterTree;
