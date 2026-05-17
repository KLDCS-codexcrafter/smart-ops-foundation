/**
 * MaterialIssueNoteRegister.tsx — UPRA-4 Phase A · T1-1 NEW canonical Register
 * Canonical UniversalRegisterGrid<MaterialIssueNote> consumer.
 * Sidebar route: rpt-material-issue-note-register (NEW additive · ProductionPage switch case)
 * Export name: MaterialIssueNoteRegisterPanel (named export · no default per UPRA-3 Phase C precedent)
 * NO inline workflow (issueMaterialIssue / cancelMaterialIssue / issueMaterialIssueWithQC live in MaterialIssueEntry sibling-untouched).
 * STATUS_LABELS + STATUS_COLORS inlined per UPRA-3 Phase C precedent · type file 0-diff.
 * QC hookpoints (D-615 qc_required + linked_test_report_ids + routed_to_quarantine) rendered in DetailPanel conditionally.
 * [JWT] GET /api/production/material-issues
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listMaterialIssues } from '@/lib/material-issue-engine';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import type { MaterialIssueNote, MaterialIssueStatus } from '@/types/material-issue-note';
import { MaterialIssueNoteDetailPanel } from './detail/MaterialIssueNoteDetailPanel';
import { MaterialIssueNotePrint } from './print/MaterialIssueNotePrint';

const STATUS_LABELS: Record<MaterialIssueStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<MaterialIssueStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  issued: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

const inr = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function MaterialIssueNoteRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const safeEntity = entityCode || 'SMRT';
  const [rows, setRows] = useState<MaterialIssueNote[]>([]);
  const [selected, setSelected] = useState<MaterialIssueNote | null>(null);
  const [printing, setPrinting] = useState<MaterialIssueNote | null>(null);

  useEffect(() => {
    setRows(listMaterialIssues(safeEntity));
  }, [safeEntity]);

  const meta: RegisterMeta<MaterialIssueNote> = {
    registerCode: 'material_issue_note_register',
    title: 'Material Issue Note Register',
    description: 'All material issues from source godown to WIP · against released Production Orders · Tally-Prime register',
    dateAccessor: r => r.issue_date,
  };

  const columns: RegisterColumn<MaterialIssueNote>[] = [
    { key: 'doc_no', label: 'Doc No', clickable: true, render: r => r.doc_no, exportKey: 'doc_no' },
    { key: 'date', label: 'Issue Date', render: r => r.issue_date, exportKey: 'issue_date' },
    { key: 'po', label: 'Production Order', render: r => r.production_order_no, exportKey: 'production_order_no' },
    { key: 'dept', label: 'Department', render: r => r.department_name, exportKey: 'department_name' },
    { key: 'issued_by', label: 'Issued By', render: r => r.issued_by_name, exportKey: 'issued_by_name' },
    { key: 'lines', label: 'Lines', align: 'right', render: r => r.lines.length, exportKey: r => r.lines.length },
    { key: 'qty', label: 'Total Qty', align: 'right', render: r => r.total_qty, exportKey: r => r.total_qty },
    { key: 'value', label: 'Total Value', align: 'right', render: r => inr(r.total_value), exportKey: r => r.total_value },
    {
      key: 'qc', label: 'QC',
      render: r => r.qc_required
        ? <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">Required</Badge>
        : <span className="text-muted-foreground text-[10px]">—</span>,
      exportKey: r => r.qc_required ? 'required' : '',
    },
    {
      key: 'status', label: 'Status',
      render: r => <Badge variant="outline" className={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Badge>,
      exportKey: 'status',
    },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABELS) as MaterialIssueStatus[])
    .map(s => ({ value: s, label: STATUS_LABELS[s] }));

  const summaryBuilder = (f: MaterialIssueNote[]): SummaryCard[] => {
    const draft = f.filter(r => r.status === 'draft').length;
    const issued = f.filter(r => r.status === 'issued').length;
    const cancelled = f.filter(r => r.status === 'cancelled').length;
    const qcRequired = f.filter(r => r.qc_required).length;
    const totalValue = f.reduce((a, r) => a + r.total_value, 0);
    return [
      { label: 'Total Issues', value: String(f.length) },
      { label: 'Draft', value: String(draft), tone: 'warning' },
      { label: 'Issued', value: String(issued), tone: 'positive' },
      { label: 'Cancelled', value: String(cancelled) },
      { label: 'QC Required', value: String(qcRequired), tone: qcRequired > 0 ? 'warning' : 'neutral' },
      { label: 'Total Value', value: inr(totalValue) },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<MaterialIssueNote>
        entityCode={safeEntity}
        meta={meta}
        rows={rows}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="status"
        summaryBuilder={summaryBuilder}
        onNavigateToRecord={setSelected}
      />
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && <MaterialIssueNoteDetailPanel issue={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <MaterialIssueNotePrint issue={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
