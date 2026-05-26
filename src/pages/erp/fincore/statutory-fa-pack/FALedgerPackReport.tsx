/**
 * FALedgerPackReport.tsx — FAR-1 (Sprint 65) · Schedule III FA ledger pack
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layers } from 'lucide-react';
import { L3_FINANCIAL_GROUPS } from '@/data/finframe-seed-data';
import { useEntityCode } from '@/hooks/useEntityCode';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const FA_PACK_CODES = ['PPE', 'INVST', 'LTLA', 'TREC', 'CINV', 'STLA', 'TPAY', 'PCAP', 'DEXP', 'IEXP'];

export function FALedgerPackReportPanel({ entityCode }: { entityCode: string }) {
  const groups = useMemo(
    () => L3_FINANCIAL_GROUPS.filter(g => FA_PACK_CODES.includes(g.code)),
    [],
  );

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Layers className="h-5 w-5 text-teal-500" /> FA Ledger Pack · Schedule III Aligned
        </h2>
        <p className="text-xs text-muted-foreground">
          Tally-FA-equivalent L3 groups · Entity {entityCode}
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{groups.length} FA-Related L3 Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Tally Name</TableHead>
                <TableHead>L2</TableHead>
                <TableHead>Nature</TableHead>
                <TableHead>GST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map(g => (
                <TableRow key={g.code}>
                  <TableCell className="font-mono font-bold">{g.code}</TableCell>
                  <TableCell>{g.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{g.tallyName}</TableCell>
                  <TableCell className="font-mono">{g.l2Code}</TableCell>
                  <TableCell>{g.nature}</TableCell>
                  <TableCell>{g.gstApplicable ? 'Yes' : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FALedgerPackReport() {
  const { entityCode } = useEntityCode();
  return <FALedgerPackReportPanel entityCode={entityCode || DEFAULT_ENTITY_SHORTCODE} />;
}
