/**
 * @file        src/pages/erp/docvault/registers/SimilarityViewer.tsx
 * @purpose     File similarity viewer · Phase 1 duplicate hash groups · Phase 2 AI matches
 * @who         Document Controller · Quality
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.9 BUNDLED · Q-LOCK-4a + Block A.4
 * @iso         ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-BV Phase 1 mock · D-NEW-CJ canonical
 * @disciplines FR-30 · FR-19 sibling
 * @reuses      docvault-similarity-engine.findDuplicates
 * @[JWT]       Phase 2 AI similarity via similarity-engine
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import { findDuplicates } from '@/lib/docvault-similarity-engine';

export function SimilarityViewer(): JSX.Element {
  const { entityCode } = useEntityCode();
  const groups = useMemo(() => findDuplicates(entityCode), [entityCode]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Similarity Viewer</h1>
        <p className="text-sm text-muted-foreground">
          Phase 1 · hash-based duplicate detection. Phase 2 · AI vector similarity.
        </p>
      </div>
      {groups.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground py-8">
          No duplicates detected.
        </CardContent></Card>
      ) : groups.map((g) => (
        <Card key={g.hash}>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">hash</Badge>
              <span className="font-mono text-xs text-muted-foreground">{g.hash}</span>
            </div>
            <div className="space-y-1">
              {g.documents.map((d) => (
                <div key={d.id} className="text-sm">
                  • {d.title} <span className="text-xs text-muted-foreground">(v{d.current_version} · {d.document_type})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default SimilarityViewer;
