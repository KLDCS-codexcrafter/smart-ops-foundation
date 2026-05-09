/**
 * @file        src/pages/erp/qulicheak/reports/Iso9001Register.tsx
 * @purpose     ISO 9001 Audit register · search · clause/date/linked-type filters · per-row "+ Link" UI
 * @who         QA Manager · Internal Auditor
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.5.c-T3-AuditFix · Block B
 * @iso         ISO 9001:2015 Clause 7.5.3 (control of documented information) · ISO 25010 Usability + Security
 * @whom        Audit Owner
 * @decisions   D-NEW-BP · D-NEW-CB (parser canonical home) · D-NEW-CD (rel="noopener noreferrer") · register-side Link UI (T3)
 * @disciplines FR-21 (input validation via parser) · FR-30 (canonical header) · FR-50 (entity-scoped reads)
 * @reuses      iso9001-engine.filterIso9001Docs · linkRecordToIso9001Doc · iso9001-link-parser.parseLinkedRecordsTextarea
 * @[JWT]       reads via filterIso9001Docs · writes via linkRecordToIso9001Doc · localStorage erp_iso9001_${entityCode}
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { filterIso9001Docs, linkRecordToIso9001Doc } from '@/lib/iso9001-engine';
import { parseLinkedRecordsTextarea } from '@/lib/iso9001-link-parser';
import { ISO9001_CLAUSE_LABELS, ISO9001_LINKED_TYPE_LABELS } from '@/types/iso9001';

export function Iso9001Register(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [search, setSearch] = useState('');
  const [version, setVersion] = useState(0);
  const [openLinkRow, setOpenLinkRow] = useState<string | null>(null);
  const [linkText, setLinkText] = useState('');
  // version is part of read trigger; eslint may flag if unused — referenced via key below
  void version;
  const docs = filterIso9001Docs(entityCode, { search });

  const handleAddLink = (docId: string): void => {
    const links = parseLinkedRecordsTextarea(linkText);
    if (links.length === 0) { toast.error('No valid links · use ncr:NCR-001, capa:CAPA-002'); return; }
    let appended = 0;
    for (const link of links) {
      if (linkRecordToIso9001Doc(entityCode, docId, link)) appended++;
    }
    toast.success(`Linked ${appended} record${appended === 1 ? '' : 's'}`);
    setLinkText('');
    setOpenLinkRow(null);
    setVersion((v) => v + 1);
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ISO 9001 Audit Register</h1>
        <p className="text-sm text-muted-foreground mt-1">Entity {entityCode} · {docs.length} documents</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <Input placeholder="Search title / auditor / description"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardContent>
      </Card>
      <div className="border rounded-lg divide-y">
        <div className="p-3 grid grid-cols-7 text-xs text-muted-foreground bg-muted/40">
          <span>ID</span><span>Clause</span><span>Title</span><span>Auditor</span>
          <span>Date</span><span>Links</span><span>Action</span>
        </div>
        {docs.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No audit documents.</div>
        ) : docs.map((d) => (
          <div key={d.id} className="text-sm">
            <div className="p-3 grid grid-cols-7 items-center">
              <span className="font-mono">{d.id}</span>
              <Badge variant="outline">{ISO9001_CLAUSE_LABELS[d.clause].split(' · ')[0]}</Badge>
              <a
                href={d.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
              >
                {d.title}
              </a>
              <span>{d.auditor}</span>
              <span className="font-mono">{d.audit_date}</span>
              <span className="text-xs">
                {d.linked_records.length === 0
                  ? '—'
                  : d.linked_records.map((r) => `${ISO9001_LINKED_TYPE_LABELS[r.type]}:${r.id}`).join(', ')}
              </span>
              <Button
                size="sm" variant="outline"
                onClick={() => setOpenLinkRow(openLinkRow === d.id ? null : d.id)}
              >
                {openLinkRow === d.id ? 'Close' : '+ Link'}
              </Button>
            </div>
            {openLinkRow === d.id && (
              <div className="p-3 bg-muted/20 border-t space-y-2">
                <Textarea
                  rows={2}
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="ncr:NCR-001, capa:CAPA-002, mtc:MTC-003"
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => { setOpenLinkRow(null); setLinkText(''); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleAddLink(d.id)}>Add Links</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
