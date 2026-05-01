/**
 * GRNRegister.tsx — Register of all GRNs with filter/search
 * Sprint T-Phase-1.2.1 · Inventory Hub · Tier 1 Card #2 sub-sprint 1/3
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FileText, Search, AlertTriangle } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  grnsKey, GRN_STATUS_LABELS, GRN_STATUS_COLORS,
  type GRN, type GRNStatus,
} from '@/types/grn';
import { dSum } from '@/lib/decimal-helpers';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

export function GRNRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';

  const grns = useMemo<GRN[]>(() => {
    try {
      // [JWT] GET /api/inventory/grns/:entityCode
      return JSON.parse(localStorage.getItem(grnsKey(safeEntity)) || '[]');
    } catch { return []; }
  }, [safeEntity]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | GRNStatus>('all');

  const filtered = useMemo(() =>
    grns
      .filter(g => status === 'all' || g.status === status)
      .filter(g => !search ||
        g.grn_no.toLowerCase().includes(search.toLowerCase()) ||
        g.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
        (g.po_no ?? '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.receipt_date.localeCompare(a.receipt_date)),
  [grns, search, status]);

  const totalValue = useMemo(() =>
    dSum(filtered.filter(g => g.status === 'posted'), g => g.total_value),
  [filtered]);

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-cyan-500" />
          GRN Register
        </h1>
        <p className="text-sm text-muted-foreground">All Goods Receipt Notes</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total GRNs</CardDescription>
          <CardTitle className="text-2xl font-mono">{filtered.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Posted Value</CardDescription>
          <CardTitle className="text-2xl font-mono">{fmtINR(totalValue)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>With Discrepancy</CardDescription>
          <CardTitle className="text-2xl font-mono text-amber-600">
            {filtered.filter(g => g.has_discrepancy).length}
          </CardTitle></CardHeader></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search GRN / vendor / PO..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={v => setStatus(v as 'all' | GRNStatus)}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(GRN_STATUS_LABELS) as GRNStatus[]).map(s =>
              <SelectItem key={s} value={s}>{GRN_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow className="bg-muted/40">
          {['GRN No', 'Date', 'Vendor', 'PO Ref', 'Godown', 'Lines', 'Total ₹', 'Status', ''].map(h =>
            <TableHead key={h} className="text-xs uppercase">{h}</TableHead>)}
        </TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
              No GRNs match the current filter
            </TableCell></TableRow>
          ) : filtered.map(g => (
            <TableRow key={g.id}>
              <TableCell><code className="text-xs font-mono">{g.grn_no}</code></TableCell>
              <TableCell className="text-xs">{g.receipt_date}</TableCell>
              <TableCell className="text-sm">{g.vendor_name}</TableCell>
              <TableCell className="text-xs">{g.po_no ?? '—'}</TableCell>
              <TableCell className="text-xs">{g.godown_name}</TableCell>
              <TableCell className="text-xs font-mono">{g.lines.length}</TableCell>
              <TableCell className="text-xs font-mono">{fmtINR(g.total_value)}</TableCell>
              <TableCell>
                <Badge className={`text-[10px] ${GRN_STATUS_COLORS[g.status]}`}>
                  {GRN_STATUS_LABELS[g.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {g.has_discrepancy && (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>
    </div>
  );
}
