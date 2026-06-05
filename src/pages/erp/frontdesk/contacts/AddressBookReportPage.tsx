/**
 * @file        src/pages/erp/frontdesk/contacts/AddressBookReportPage.tsx
 * @sprint      Sprint 148 · T-ReceivX-CF.1 · Block 4 · Rider 1c
 * @purpose     Address Book report — explodes party → contact rows, CSV/Print.
 */
import { useEntityCode } from '@/hooks/useEntityCode';
import { useMemo, useState } from 'react';
import { loadPartyMaster } from '@/lib/party-master-engine';
import { loadPartyContacts } from '@/lib/frontdesk-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, Download } from 'lucide-react';

interface ExpandedRow {
  partyId: string; partyName: string; partyCode: string;
  contactId: string | null; contactName: string;
  designation: string; phone: string; mobile: string; email: string;
  isPrimary: boolean;
}

function csvCell(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function AddressBookReportPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [q, setQ] = useState('');

  const rows: ExpandedRow[] = useMemo(() => {
    const parties = loadPartyMaster(entityCode);
    const contacts = loadPartyContacts(entityCode);
    const out: ExpandedRow[] = [];
    for (const p of parties) {
      const cs = contacts.filter((c) => c.partyId === p.id);
      if (cs.length === 0) {
        out.push({
          partyId: p.id, partyName: p.party_name, partyCode: p.party_code,
          contactId: null, contactName: '—', designation: '',
          phone: '', mobile: '', email: '', isPrimary: false,
        });
      } else {
        for (const c of cs) {
          out.push({
            partyId: p.id, partyName: p.party_name, partyCode: p.party_code,
            contactId: c.id, contactName: c.name,
            designation: c.designation ?? '',
            phone: c.phone ?? '',
            mobile: c.mobile ?? '',
            email: c.email ?? '',
            isPrimary: !!c.isPrimary,
          });
        }
      }
    }
    const needle = q.trim().toLowerCase();
    if (!needle) return out;
    return out.filter((r) =>
      r.partyName.toLowerCase().includes(needle)
      || r.contactName.toLowerCase().includes(needle)
      || r.email.toLowerCase().includes(needle),
    );
  }, [entityCode, q]);

  function exportCsv(): void {
    const header = ['Party Code', 'Party', 'Contact', 'Designation', 'Phone', 'Mobile', 'Email', 'Primary'];
    const body = rows.map((r) => [
      r.partyCode, r.partyName, r.contactName, r.designation,
      r.phone, r.mobile, r.email, r.isPrimary ? 'Y' : '',
    ].map(csvCell).join(','));
    const csv = [header.join(','), ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `address-book-${entityCode}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Address Book</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Exploded party → contact rows ({rows.length})</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search party / contact / email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">No rows.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Party Code</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.partyId}-${r.contactId ?? 'none'}-${i}`}>
                    <TableCell className="font-mono text-xs">{r.partyCode}</TableCell>
                    <TableCell>{r.partyName}</TableCell>
                    <TableCell>
                      {r.contactName}
                      {r.isPrimary && <Badge variant="outline" className="ml-2 text-[9px]">primary</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{r.designation}</TableCell>
                    <TableCell className="text-xs font-mono">{r.phone}</TableCell>
                    <TableCell className="text-xs font-mono">{r.mobile}</TableCell>
                    <TableCell className="text-xs">{r.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
