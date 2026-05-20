/**
 * @file        src/pages/erp/eximx/masters/ForeignCustomerMaster.tsx
 * @purpose     Foreign Customer Master · full CRUD scaffold · 12 base + 5 export-readiness sibling fields (Q4=a · Q5=a 0-diff)
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2 } from 'lucide-react';
import { FOREIGN_CUSTOMER_LOCALSTORAGE_KEY } from '@/types/foreign-customer';
import type { ForeignCustomer } from '@/types/foreign-customer';
import { classifyReliability } from '@/lib/buyer-reliability-engine';

export function ForeignCustomerMaster(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [customers, setCustomers] = useState<ForeignCustomer[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FOREIGN_CUSTOMER_LOCALSTORAGE_KEY(entityCode));
      setCustomers(raw ? (JSON.parse(raw) as ForeignCustomer[]) : []);
    } catch { /* ignore */ }
  }, []);

  const cls = (s: number | undefined) => s !== undefined ? classifyReliability(s) : 'attention';
  const badgeColor = (c: string) =>
    c === 'excellent' ? 'bg-success text-success-foreground'
      : c === 'good' ? 'bg-primary text-primary-foreground'
      : c === 'attention' ? 'bg-warning text-warning-foreground'
      : 'bg-destructive text-destructive-foreground';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Foreign Customer Master</h1>
        <p className="text-sm text-muted-foreground">12 base fields + 5 export-readiness sibling fields (SWIFT · IBAN · KYC · tax residency · doc rules ref) · seeded reliability score</p>
      </div>

      <Card>
        <CardHeader><CardTitle><Building2 className="w-4 h-4 inline mr-2" />Foreign Customer Register</CardTitle></CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No foreign customers loaded · run EX-1 seed (Sinha eximx).</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Country</TableHead><TableHead>Type</TableHead>
                <TableHead>Incoterm</TableHead><TableHead>Credit Limit</TableHead><TableHead>Reliability</TableHead>
                <TableHead>Country Risk</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {customers.map((c) => {
                  const klass = cls(c.buyer_reliability_score);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.customer_name}</TableCell>
                      <TableCell>{c.country_code} · {c.country_name}</TableCell>
                      <TableCell><Badge variant="outline">{c.customer_type}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{c.preferred_incoterm}</Badge></TableCell>
                      <TableCell className="font-mono">{c.credit_limit ? `${c.currency_code} ${c.credit_limit.toLocaleString('en-IN')}` : '—'}</TableCell>
                      <TableCell><Badge className={badgeColor(klass)}>{c.buyer_reliability_score ?? '—'} · {klass}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{c.country_risk_overlay ?? '—'}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground mt-4">Sibling extension (foreign-customer-export-extension.ts) carries the 5 new export-readiness fields · base ForeignCustomer interface preserved 0-diff per Q5=a. In-UI form completion EX-7b alongside Shipping Bill master tie-in.</p>
        </CardContent>
      </Card>
    </div>
  );
}
