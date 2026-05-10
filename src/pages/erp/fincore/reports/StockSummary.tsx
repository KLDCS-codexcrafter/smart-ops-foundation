/**
 * StockSummary.tsx — Stock Summary report (fc-rpt-stock-summary)
 * Current stock position of all items with godown breakup
 * [JWT] All data via hooks
 */
import { useState, useMemo } from 'react';
import { Package, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useStockLedger } from '@/hooks/useStockLedger';
import { onEnterNext } from '@/lib/keyboard';
import { inr, today, exportCSV } from './reportUtils';

interface StockSummaryPanelProps { entityCode: string; }

export function StockSummaryPanel({ entityCode }: StockSummaryPanelProps) {
  const { entries } = useStockLedger(entityCode);
  const [asOfDate, setAsOfDate] = useState(today());
  const [showZero, setShowZero] = useState(false);
  const [godownFilter, setGodownFilter] = useState('all');

  const godowns = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => { if (e.godown_name) set.add(e.godown_name); });
    return Array.from(set).sort();
  }, [entries]);

  const stockData = useMemo(() => {
    const filtered = entries.filter(e => !e.is_cancelled && e.date <= asOfDate && (godownFilter === 'all' || e.godown_name === godownFilter));
    const map = new Map<string, { itemId: string; itemCode: string; itemName: string; godown: string; inward: number; outward: number; balance: number; uom: string; rate: number }>();
    for (const e of filtered) {
      const key = `${e.item_id}-${e.godown_name}`;
      const ex = map.get(key) || { itemId: e.item_id, itemCode: e.item_code, itemName: e.item_name, godown: e.godown_name, inward: 0, outward: 0, balance: 0, uom: e.uom, rate: e.rate };
      ex.inward += e.inward_qty;
      ex.outward += e.outward_qty;
      ex.balance = ex.inward - ex.outward;
      ex.rate = e.rate; // use last rate
      map.set(key, ex);
    }
    return Array.from(map.values())
      .filter(r => showZero || r.balance > 0)
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [entries, asOfDate, godownFilter, showZero]);

  const totalValue = stockData.reduce((s, r) => s + r.balance * r.rate, 0);

  const handleExport = () => {
    exportCSV('stock-summary.csv',
      ['Item Code', 'Item Name', 'Godown', 'Inward', 'Outward', 'Balance', 'UOM', 'Rate', 'Value'],
      stockData.map(r => [r.itemCode, r.itemName, r.godown, String(r.inward), String(r.outward), String(r.balance), r.uom, String(r.rate), String(r.balance * r.rate)])
    );
  };

  return (
    <div data-keyboard-form className="p-5 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-teal-500" />
          <h2 className="text-lg font-bold">Stock Summary</h2>
        </div>
        <Button data-primary variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      <Card><CardContent className="p-3 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">As On</label>
          <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="h-8 text-xs w-40" onKeyDown={onEnterNext} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Godown</label>
          <Select value={godownFilter} onValueChange={setGodownFilter}>
            <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all"><span className="text-xs">All Godowns</span></SelectItem>
              {godowns.map(g => <SelectItem key={g} value={g}><span className="text-xs">{g}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={showZero} onCheckedChange={setShowZero} id="showZero" />
          <label htmlFor="showZero" className="text-xs">Show zero stock</label>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-3 text-center">
        <p className="text-[10px] text-muted-foreground">Total Stock Value</p>
        <p className="text-lg font-bold">{inr(totalValue)}</p>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Item Code</TableHead>
              <TableHead className="text-xs">Item Name</TableHead>
              <TableHead className="text-xs">Godown</TableHead>
              <TableHead className="text-xs text-right">Inward</TableHead>
              <TableHead className="text-xs text-right">Outward</TableHead>
              <TableHead className="text-xs text-right">Balance</TableHead>
              <TableHead className="text-xs">UOM</TableHead>
              <TableHead className="text-xs text-right">Rate</TableHead>
              <TableHead className="text-xs text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockData.map(r => (
              <TableRow key={`${r.itemId}-${r.godown}`}>
                <TableCell className="text-xs font-mono">{r.itemCode}</TableCell>
                <TableCell className="text-xs">{r.itemName}</TableCell>
                <TableCell className="text-xs">{r.godown || '—'}</TableCell>
                <TableCell className="text-xs text-right">{r.inward}</TableCell>
                <TableCell className="text-xs text-right">{r.outward}</TableCell>
                <TableCell className="text-xs text-right font-medium">{r.balance}</TableCell>
                <TableCell className="text-xs">{r.uom}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(r.rate)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(r.balance * r.rate)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-bold">
              <TableCell colSpan={8} className="text-xs font-bold">Grand Total</TableCell>
              <TableCell className="text-xs text-right font-mono font-bold">{inr(totalValue)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

export default function StockSummary() {
  const { entityCode } = useEntityCode();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Stock Summary' }]} showDatePicker={false} />
        <main>
          {entityCode
            ? <StockSummaryPanel entityCode={entityCode} />
            : <SelectCompanyGate title="Select a company to view Stock Summary" />
          }
        </main>
      </div>
    </SidebarProvider>
  );
}
