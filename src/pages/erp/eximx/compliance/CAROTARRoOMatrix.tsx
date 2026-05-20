/**
 * @file        src/pages/erp/eximx/compliance/CAROTARRoOMatrix.tsx
 * @purpose     CAROTAR FULL · Rules of Origin verification matrix + Form II register
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, AlertTriangle } from 'lucide-react';
import { loadSupplierDeclarations, summarizeSupplierDeclarations } from '@/lib/carotar-roo-engine';
import type { SupplierDeclaration } from '@/types/supplier-declaration';

export function CAROTARRoOMatrix(): JSX.Element {
  const entityCode = 'sinha-steel';
  const [sds, setSds] = useState<SupplierDeclaration[]>([]);
  useEffect(() => { setSds(loadSupplierDeclarations(entityCode)); }, []);
  const summary = summarizeSupplierDeclarations(sds);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold"><FileText className="w-5 h-5 inline mr-2" />CAROTAR FULL · Rules of Origin (Moat #11 PRIMARY)</h2>
        <p className="text-sm text-muted-foreground">Supplier Declaration Form II register · 30-day Customs response tracker · CTH change / value-add / specific process</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{summary.total}</div><div className="text-xs text-muted-foreground">Total Declarations</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-success">{summary.by_status.accepted ?? 0}</div><div className="text-xs text-muted-foreground">Accepted</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-warning">{summary.by_status.queried ?? 0}</div><div className="text-xs text-muted-foreground"><AlertTriangle className="w-3 h-3 inline mr-1" />Under Query</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{summary.pending_customs_response}</div><div className="text-xs text-muted-foreground">Pending Customs Response</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Supplier Declaration Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Declaration No</TableHead><TableHead>Vendor</TableHead><TableHead>CTH</TableHead><TableHead>Origin</TableHead><TableHead>RoO Basis</TableHead><TableHead>FTA</TableHead><TableHead>Status</TableHead><TableHead>Deadline</TableHead></TableRow></TableHeader>
            <TableBody>
              {sds.map((sd) => (
                <TableRow key={sd.id}>
                  <TableCell className="font-mono text-xs">{sd.declaration_no}</TableCell>
                  <TableCell className="font-mono text-xs">{sd.related_foreign_vendor_id}</TableCell>
                  <TableCell className="font-mono">{sd.related_cth}</TableCell>
                  <TableCell>{sd.origin_country_code}</TableCell>
                  <TableCell><Badge variant="outline">{sd.roo_classification}{sd.value_add_percentage !== null && ` (${sd.value_add_percentage}%)`}</Badge></TableCell>
                  <TableCell className="text-xs">{sd.fta_treaty_code}</TableCell>
                  <TableCell><Badge variant={sd.status === 'accepted' ? 'default' : sd.status === 'queried' ? 'destructive' : 'outline'}>{sd.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs">{sd.customs_response_deadline ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
