/**
 * @file        src/pages/erp/docvault/DocVaultWelcome.tsx
 * @purpose     DocVault welcome panel · landing dashboard · stats summary
 * @who         All departments · Document Controller · approval reviewers
 * @when        2026-05-09 (T1 backfill)
 * @sprint      T-Phase-1.A.8.α-a-T1-Audit-Fix · Block C · F-4 backfill
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema (CANONICAL · A.8 Foundation) ·
 *              D-NEW-BV Phase 1 mock pattern ·
 *              FR-30 11/11 header standard (T1 backfill per A.6.α-a-T1 institutional pattern)
 * @disciplines FR-30 · FR-67
 * @reuses      docvault-engine.loadDocuments · loadDocumentsByStatus · DocVaultModule type
 * @[JWT]       reads via docvault-engine · GET /api/docvault/documents (Phase 2)
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, FilePlus, CheckSquare } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadDocuments, loadDocumentsByStatus } from '@/lib/docvault-engine';
import type { DocVaultModule } from './DocVaultSidebar.types';

interface Props {
  onNavigate?: (m: DocVaultModule) => void;
}

export function DocVaultWelcome({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const docs = loadDocuments(entityCode);
  const pending = loadDocumentsByStatus(entityCode, 'submitted');

  const kpis = useMemo(
    () => ({
      total: docs.length,
      pending: pending.length,
      approved: docs.filter((d) => d.versions.some((v) => v.version_status === 'approved')).length,
    }),
    [docs, pending],
  );

  const tile = (
    label: string,
    value: number,
    target: DocVaultModule,
    Icon: typeof FileText,
  ): JSX.Element => (
    <Card
      className="cursor-pointer hover:bg-accent/30 transition"
      onClick={() => onNavigate?.(target)}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold font-mono">{value}</p>
          </div>
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">DocVault</h1>
        <p className="text-sm text-muted-foreground">
          Versioned document storage · drawings, MOMs, certifications, ISO/IEC docs.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tile('All Documents', kpis.total, 'documents-register', FileText)}
        {tile('Pending Approvals', kpis.pending, 'approvals-pending', CheckSquare)}
        {tile('New Document', kpis.approved, 'document-entry', FilePlus)}
      </div>
    </div>
  );
}
