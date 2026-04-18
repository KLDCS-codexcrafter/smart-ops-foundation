/**
 * SecondarySalesReport.tsx — Distributor sell-through analytics
 * Sprint 7. Three views: by item, by distributor, by month.
 * [JWT] GET /api/salesx/secondary-sales
 */
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { ListTree, Boxes, Users, CalendarDays } from 'lucide-react';
import { type SecondarySales, secondarySalesKey } from '@/types/secondary-sales';
import {
  aggregateSecondarySalesByItem,
  aggregateSecondarySalesByDistributor,
  aggregateSecondarySalesByMonth,
} from '@/lib/field-force-engine';

interface Props { entityCode: string }

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }

export function SecondarySalesReportPanel({ entityCode }: Props) {
  const [sales, setSales] = useState<SecondarySales[]>([]);
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());

  useEffect(() => {
    try {
      // [JWT] GET /api/salesx/secondary-sales
      setSales(JSON.parse(localStorage.getItem(secondarySalesKey(entityCode)) || '[]'));
    } catch { /* noop */ }
  }, [entityCode]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => s.sale_date >= from && s.sale_date <= to);
  }, [sales, from, to]);

  const byItem = useMemo(() => {
    const agg = aggregateSecondarySalesByItem(filteredSales);
    return Object.entries(agg)
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredSales]);

  const byDistributor = useMemo(() => {
    const agg = aggregateSecondarySalesByDistributor(filteredSales);
    return Object.entries(agg)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total_amount - a.total_amount);
  }, [filteredSales]);

  const byMonth = useMemo(() => {
    const agg = aggregateSecondarySalesByMonth(filteredSales);
    return Object.values(agg).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredSales]);

  const totalAmount = useMemo(
    () => filteredSales.reduce((s, x) => s + x.total_amount, 0),
    [filteredSales],
  );

  return (
    <div className="space-y-4">
      <Card className="border-orange-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTree className="h-4 w-4 text-orange-500" />
            Secondary Sales Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <SmartDateInput value={from} onChange={setFrom} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <SmartDateInput value={to} onChange={setTo} />
            </div>
            <div className="flex items-end">
              <div className="w-full p-3 rounded-md border bg-orange-500/5">
                <p className="text-[10px] uppercase text-muted-foreground">Total Sell-through</p>
                <p className="text-lg font-mono font-bold text-orange-500">{formatINR(totalAmount)}</p>
                <p className="text-[10px] text-muted-foreground">{filteredSales.length} records</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="item">
        <TabsList>
          <TabsTrigger value="item" className="text-xs">
            <Boxes className="h-3.5 w-3.5 mr-1" /> By Item
          </TabsTrigger>
          <TabsTrigger value="distributor" className="text-xs">
            <Users className="h-3.5 w-3.5 mr-1" /> By Distributor
          </TabsTrigger>
          <TabsTrigger value="month" className="text-xs">
            <CalendarDays className="h-3.5 w-3.5 mr-1" /> By Month
          </TabsTrigger>
        </TabsList>

        <TabsContent value="item">
          <Card>
            <CardContent className="p-3">
              {byItem.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">No data.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Item Code</TableHead>
                      <TableHead className="text-xs">Item Name</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byItem.map(r => (
                      <TableRow key={r.code}>
                        <TableCell className="text-xs font-mono">{r.code}</TableCell>
                        <TableCell className="text-xs">{r.item_name}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{r.qty}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{formatINR(r.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributor">
          <Card>
            <CardContent className="p-3">
              {byDistributor.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">No data.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Distributor</TableHead>
                      <TableHead className="text-xs text-right">Records</TableHead>
                      <TableHead className="text-xs text-right">Total (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byDistributor.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{r.distributor_name}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{r.count}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{formatINR(r.total_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month">
          <Card>
            <CardContent className="p-3">
              {byMonth.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">No data.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Month</TableHead>
                      <TableHead className="text-xs text-right">Records</TableHead>
                      <TableHead className="text-xs text-right">Total (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byMonth.map(r => (
                      <TableRow key={r.month}>
                        <TableCell className="text-xs font-mono">{r.month}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{r.count}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{formatINR(r.total_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SecondarySalesReportPanel;
