/**
 * Clause44Report.tsx — Form 3CD Clause 44: Expenditure by GST vendor category
 * 9-column table with group → ledger → voucher drill-down.
 * [JWT] Replace with GET /api/compliance/clause44
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AlertTriangle, ChevronDown, ChevronRight, Download, FileText, Filter } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import { computeClause44, type Clause44Row } from '@/lib/auditEngine';

const fmt = (n: number) => n ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '—';

const CATEGORY_BADGES: Record<string, { label: string; color: string }> = {
  regular_taxable: { label: 'Regular Taxable', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  regular_exempted: { label: 'Regular Exempted', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  composition: { label: 'Composition', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  unregistered: { label: 'Unregistered', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  exclude: { label: 'Excluded', color: 'bg-muted text-muted-foreground border-muted' },
  uncategorised: { label: 'Uncategorised', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  auto: { label: 'Auto-detected', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
};

interface Clause44ReportPanelProps {
  entityCode: string;
}

export function Clause44ReportPanel({ entityCode }: Clause44ReportPanelProps) {
  const today = new Date();
  const fyStart = today.getMonth() >= 3
    ? `${today.getFullYear()}-04-01`
    : `${today.getFullYear() - 1}-04-01`;
  const fyEnd = today.getMonth() >= 3
    ? `${today.getFullYear() + 1}-03-31`
    : `${today.getFullYear()}-03-31`;

  const [periodFrom, setPeriodFrom] = useState(fyStart);
  const [periodTo, setPeriodTo] = useState(fyEnd);
  const [showAllExpenses, setShowAllExpenses] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedLedgers, setExpandedLedgers] = useState<Set<string>>(new Set());

  const rows = useMemo(() => computeClause44(entityCode, periodFrom, periodTo), [entityCode, periodFrom, periodTo]);

  const filtered = showAllExpenses ? rows : rows.filter(r => r.totalAmount > 0);

  // Group by parentGroup
  const grouped = useMemo(() => {
    const map = new Map<string, Clause44Row[]>();
    for (const r of filtered) {
      const arr = map.get(r.parentGroup) || [];
      arr.push(r);
      map.set(r.parentGroup, arr);
    }
    return map;
  }, [filtered]);

  const toggleGroup = (g: string) => {
    const s = new Set(expandedGroups);
    s.has(g) ? s.delete(g) : s.add(g);
    setExpandedGroups(s);
  };
  const toggleLedger = (id: string) => {
    const s = new Set(expandedLedgers);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedLedgers(s);
  };

  const grandTotal = filtered.reduce((s, r) => s + r.totalAmount, 0);
  const grandExempt = filtered.reduce((s, r) => s + r.regularExempt, 0);
  const grandCompo = filtered.reduce((s, r) => s + r.composition, 0);
  const grandTaxable = filtered.reduce((s, r) => s + r.regularTaxable, 0);
  const grandRegistered = grandExempt + grandCompo + grandTaxable;
  const grandUnreg = filtered.reduce((s, r) => s + r.unregistered, 0);
  const grandExcl = filtered.reduce((s, r) => s + r.excluded, 0);
  const grandUncat = filtered.reduce((s, r) => s + r.uncategorised, 0);
  const colBalance = grandExempt + grandCompo + grandTaxable + grandUnreg + grandExcl + grandUncat;
  const isBalanced = Math.abs(grandTotal - colBalance) < 1;

  const uncatLedgers = filtered.filter(r => r.uncategorised > 0);
  const uncatTotal = uncatLedgers.reduce((s, r) => s + r.uncategorised, 0);

  const handleExportCSV = () => {
    const headers = ['Ledger Name', 'Parent Group', 'Total Amount', 'Regular Exempted', 'Composition', 'Regular Taxable', 'Registered Total', 'Unregistered', 'Excluded', 'Uncategorised'];
    const csvRows = [headers.join(',')];
    for (const r of filtered) {
      csvRows.push([r.ledgerName, r.parentGroup, r.totalAmount, r.regularExempt, r.composition, r.regularTaxable, r.registeredTotal, r.unregistered, r.excluded, r.uncategorised].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clause44_${entityCode}_${periodFrom}_${periodTo}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Clause 44 — Expenditure by GST Vendor Category</h2>
          <p className="text-xs text-muted-foreground">Form 3CD Clause 44 — 9-column expense breakdown</p>
        </div>
        <Button variant="outline" size="sm" data-primary onClick={handleExportCSV}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs">From</Label>
            <Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)}
              className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">To</Label>
            <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)}
              className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Switch checked={showAllExpenses} onCheckedChange={setShowAllExpenses} />
            <Label className="text-xs">{showAllExpenses ? 'All Expenses' : 'Clause 44 Only'}</Label>
          </div>
        </CardContent>
      </Card>

      {/* Uncategorised alert */}
      {uncatLedgers.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-amber-600">{uncatLedgers.length} ledger(s)</span> totalling{' '}
            <span className="font-mono font-semibold">₹{uncatTotal.toLocaleString('en-IN')}</span> are uncategorised.
            These will not appear in Clause 44. Go to Ledger Master to set clause44Category.
          </div>
        </div>
      )}

      {/* Validation row */}
      {!isBalanced && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-xs text-red-600 font-semibold">
            Column totals do not balance. Col 3+4+5+7+Exclude = {fmt(colBalance)} vs Col 2 = {fmt(grandTotal)}. Check uncategorised ledgers.
          </span>
        </div>
      )}

      {/* 9-column table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-[10px]">
                <TableHead className="w-8" />
                <TableHead>Ledger / Group</TableHead>
                <TableHead className="text-right font-mono">Col 2: Total</TableHead>
                <TableHead className="text-right font-mono">Col 3: Exempt</TableHead>
                <TableHead className="text-right font-mono">Col 4: Compo</TableHead>
                <TableHead className="text-right font-mono">Col 5: Taxable</TableHead>
                <TableHead className="text-right font-mono">Col 6: Reg Total</TableHead>
                <TableHead className="text-right font-mono">Col 7: Unreg</TableHead>
                <TableHead className="text-right font-mono">Excluded</TableHead>
                <TableHead className="text-center">Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(grouped.entries()).map(([group, items]) => {
                const grpTotal = items.reduce((s, r) => s + r.totalAmount, 0);
                const grpExempt = items.reduce((s, r) => s + r.regularExempt, 0);
                const grpCompo = items.reduce((s, r) => s + r.composition, 0);
                const grpTaxable = items.reduce((s, r) => s + r.regularTaxable, 0);
                const grpReg = grpExempt + grpCompo + grpTaxable;
                const grpUnreg = items.reduce((s, r) => s + r.unregistered, 0);
                const grpExcl = items.reduce((s, r) => s + r.excluded, 0);
                const isExpanded = expandedGroups.has(group);
                return (
                  <TableRow key={`grp-${group}`} className="cursor-pointer hover:bg-muted/30" onClick={() => toggleGroup(group)}>
                    <TableCell className="p-1">
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-blue-600 dark:text-blue-400">{group}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(grpTotal)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(grpExempt)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(grpCompo)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(grpTaxable)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(grpReg)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(grpUnreg)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(grpExcl)}</TableCell>
                    <TableCell />
                  </TableRow>
                );
              })}
              {Array.from(grouped.entries()).flatMap(([group, items]) =>
                expandedGroups.has(group) ? items.map(row => {
                  const isLedExp = expandedLedgers.has(row.ledgerId);
                  const catBadge = CATEGORY_BADGES[row.category] || CATEGORY_BADGES['auto'];
                  return [
                    <TableRow key={`led-${row.ledgerId}`} className="cursor-pointer hover:bg-muted/20" onClick={() => toggleLedger(row.ledgerId)}>
                      <TableCell className="p-1 pl-6">
                        {isLedExp ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </TableCell>
                      <TableCell className="text-xs">{row.ledgerName}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(row.totalAmount)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(row.regularExempt)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(row.composition)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(row.regularTaxable)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(row.registeredTotal)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(row.unregistered)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(row.excluded)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-[8px] px-1 ${catBadge.color}`}>{catBadge.label}</Badge>
                      </TableCell>
                    </TableRow>,
                    ...(isLedExp ? row.vouchers.map(v => (
                      <TableRow key={`vch-${v.voucherId}`} className="bg-muted/10">
                        <TableCell />
                        <TableCell className="text-[10px] pl-10 text-muted-foreground">
                          {v.voucherNo} | {v.date} | {v.partyName} | {v.partyType}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[10px]">{fmt(v.amount)}</TableCell>
                        <TableCell colSpan={7} />
                      </TableRow>
                    )) : []),
                  ];
                }).flat() : []
              )}
              {/* Grand total row */}
              <TableRow className="font-bold border-t-2">
                <TableCell />
                <TableCell className="text-xs">Grand Total</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmt(grandTotal)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmt(grandExempt)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmt(grandCompo)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmt(grandTaxable)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmt(grandRegistered)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmt(grandUnreg)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmt(grandExcl)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No expense data found</p>
          <p className="text-xs">Post purchase invoices or expense vouchers to populate Clause 44.</p>
        </div>
      )}
    </div>
  );
}

export default function Clause44Report() { return <Clause44ReportPanel entityCode="SMRT" />; }
