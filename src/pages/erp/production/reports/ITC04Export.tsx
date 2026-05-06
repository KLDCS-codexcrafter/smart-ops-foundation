/**
 * @file     ITC04Export.tsx
 * @sprint   T-Phase-1.3-3a-pre-3 · Block J · D-565 · Q20=c
 * @purpose  ITC-04 quarter picker · preview · CSV download.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listJobWorkOutOrders } from '@/lib/job-work-out-engine';
import { listJobWorkReceipts } from '@/lib/job-work-receipt-engine';
import {
  buildITC04Rows, exportITC04CSV, listAvailableQuarters,
} from '@/lib/itc04-export-engine';

export function ITC04ExportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const jwos = useMemo(() => listJobWorkOutOrders(entityCode), [entityCode]);
  const jwrs = useMemo(() => listJobWorkReceipts(entityCode), [entityCode]);

  const availableQuarters = useMemo(() => listAvailableQuarters(jwos), [jwos]);
  const [selectedQuarter, setSelectedQuarter] = useState<string>(availableQuarters[0] ?? '');

  const rows = useMemo(
    () => buildITC04Rows(jwos, jwrs, selectedQuarter || undefined),
    [jwos, jwrs, selectedQuarter],
  );

  const handleDownload = (): void => {
    if (rows.length === 0) {
      toast.error('No rows to export');
      return;
    }
    exportITC04CSV(rows, `ITC04_${selectedQuarter || 'ALL'}_${entityCode}.csv`);
    toast.success(`ITC-04 ${selectedQuarter} downloaded · ${rows.length} rows`);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          ITC-04 · GST Quarterly Export · Job Work Out
        </h1>
        <p className="text-sm text-muted-foreground">
          Auto-quarter from JWO date · Q1 (Apr-Jun) · Q2 (Jul-Sep) · Q3 (Oct-Dec) · Q4 (Jan-Mar)
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Quarter Selection</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-center">
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select quarter..." /></SelectTrigger>
              <SelectContent>
                {availableQuarters.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" /> Download CSV
            </Button>
            <span className="text-xs text-muted-foreground ml-auto font-mono">{rows.length} rows</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>JWO No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>JW Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No rows</TableCell></TableRow>
              ) : rows.map((r, i) => (
                <TableRow key={`${r.jwo_no}-${i}`}>
                  <TableCell className="font-mono text-xs">{r.jwo_no}</TableCell>
                  <TableCell>{r.vendor_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.vendor_gstin}</TableCell>
                  <TableCell className="font-mono text-xs">{r.item_code}</TableCell>
                  <TableCell className="font-mono">{r.qty_sent}</TableCell>
                  <TableCell className="font-mono">{r.qty_received}</TableCell>
                  <TableCell className="font-mono">{r.qty_pending}</TableCell>
                  <TableCell className="font-mono">₹{r.jw_value.toLocaleString('en-IN')}</TableCell>
                  <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default ITC04ExportPanel;
