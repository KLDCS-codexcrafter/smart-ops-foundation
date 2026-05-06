/**
 * @file     DailyWorkRegisterReport.tsx
 * @sprint   T-Phase-1.3-3-PlantOps-pre-2 · Block I · D-586 · Q24=a
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CalendarRange, ExternalLink } from 'lucide-react';
import { useDailyWorkRegister } from '@/hooks/useDailyWorkRegister';
import { useFactories } from '@/hooks/useFactories';

export function DailyWorkRegisterReportPanel(): JSX.Element {
  const navigate = useNavigate();
  const { factories } = useFactories();
  const [factoryId, setFactoryId] = useState('__all__');
  const [date, setDate] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const { entries } = useDailyWorkRegister({
    factoryId: factoryId === '__all__' ? undefined : factoryId,
    date: date || undefined,
    flaggedOnly,
  });

  const summary = useMemo(() => {
    const totProduced = entries.reduce((s, e) => s + e.total_produced_qty, 0);
    const totCost = entries.reduce((s, e) => s + e.total_cost, 0);
    const avgYield = entries.length > 0
      ? entries.reduce((s, e) => s + e.yield_pct, 0) / entries.length
      : 0;
    return { count: entries.length, totProduced, totCost, avgYield };
  }, [entries]);

  return (
    <div className="p-6 space-y-4">
      <button
        type="button"
        onClick={() => navigate('/erp/command-center?module=finecore-production-config')}
        className="w-full text-left rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground hover:bg-muted/60 flex items-center justify-between"
      >
        <span>ⓘ DWR settings live in Command Center → Production Configuration</span>
        <ExternalLink className="h-3 w-3" />
      </button>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Entries</div><div className="text-2xl font-mono">{summary.count}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Produced</div><div className="text-2xl font-mono">{summary.totProduced.toFixed(2)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Cost</div><div className="text-2xl font-mono">₹ {summary.totCost.toFixed(2)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Avg Yield %</div><div className="text-2xl font-mono">{summary.avgYield.toFixed(1)}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CalendarRange className="h-5 w-5" /> Daily Work Register</CardTitle>
            <Badge variant="outline">{entries.length} entries</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div>
              <Label className="text-xs">Factory</Label>
              <Select value={factoryId} onValueChange={setFactoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All factories</SelectItem>
                  {factories.map(f => <SelectItem key={f.id} value={f.id}>{f.code} · {f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={flaggedOnly} onCheckedChange={setFlaggedOnly} />
              <Label className="text-xs">Flagged only</Label>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>JCs</TableHead>
                <TableHead>Planned</TableHead>
                <TableHead>Produced</TableHead>
                <TableHead>Yield %</TableHead>
                <TableHead>Sched Hrs</TableHead>
                <TableHead>Actual Hrs</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-6">No DWR entries.</TableCell></TableRow>
              )}
              {entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.date}</TableCell>
                  <TableCell className="text-xs">{e.shift_name}</TableCell>
                  <TableCell className="text-xs">{e.employee_code} · {e.employee_name}</TableCell>
                  <TableCell className="text-xs">{e.machine_code}</TableCell>
                  <TableCell className="font-mono">{e.job_card_count}</TableCell>
                  <TableCell className="font-mono">{e.total_planned_qty.toFixed(2)}</TableCell>
                  <TableCell className="font-mono">{e.total_produced_qty.toFixed(2)}</TableCell>
                  <TableCell className="font-mono">{e.yield_pct.toFixed(1)}</TableCell>
                  <TableCell className="font-mono">{e.total_scheduled_hours.toFixed(1)}</TableCell>
                  <TableCell className="font-mono">{e.total_actual_hours.toFixed(1)}</TableCell>
                  <TableCell className="font-mono">₹ {e.total_cost.toFixed(2)}</TableCell>
                  <TableCell className="space-x-1">
                    {e.has_breakdown && <Badge variant="destructive" className="text-[9px]">BD</Badge>}
                    {e.has_quality_issue && <Badge className="text-[9px] bg-warning/15 text-warning border-warning/30">QC</Badge>}
                    {e.has_wastage && <Badge variant="outline" className="text-[9px]">W</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default DailyWorkRegisterReportPanel;
