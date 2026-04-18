/**
 * BeatProductivityReport.tsx — Beat planned vs actual + orders captured
 * Sprint 7. Pure render — uses computeBeatProductivity from engine.
 * [JWT] GET /api/salesx/visit-logs?entityCode={entityCode}
 * [JWT] GET /api/salesx/beat-routes?entityCode={entityCode}
 */
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Route, TrendingUp } from 'lucide-react';
import { type BeatRoute, beatRoutesKey, FREQUENCY_LABELS } from '@/types/beat-route';
import { type VisitLog, visitLogsKey } from '@/types/visit-log';
import { type SAMPerson, samPersonsKey } from '@/types/sam-person';
import { computeBeatProductivity } from '@/lib/field-force-engine';

interface Props { entityCode: string }

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }

export function BeatProductivityReportPanel({ entityCode }: Props) {
  const [beats, setBeats] = useState<BeatRoute[]>([]);
  const [logs, setLogs] = useState<VisitLog[]>([]);
  const [salesmen, setSalesmen] = useState<SAMPerson[]>([]);
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [salesmanFilter, setSalesmanFilter] = useState<string>('all');

  useEffect(() => {
    try {
      // [JWT] GET /api/salesx/beat-routes
      setBeats(JSON.parse(localStorage.getItem(beatRoutesKey(entityCode)) || '[]'));
      // [JWT] GET /api/salesx/visit-logs
      setLogs(JSON.parse(localStorage.getItem(visitLogsKey(entityCode)) || '[]'));
      // [JWT] GET /api/salesx/sam-persons
      const all = JSON.parse(localStorage.getItem(samPersonsKey(entityCode)) || '[]') as SAMPerson[];
      setSalesmen(all.filter(p => p.person_type === 'salesman'));
    } catch { /* noop */ }
  }, [entityCode]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const day = l.check_in_time.slice(0, 10);
      if (day < from || day > to) return false;
      if (salesmanFilter !== 'all' && l.salesman_id !== salesmanFilter) return false;
      return true;
    });
  }, [logs, from, to, salesmanFilter]);

  const filteredBeats = useMemo(() => {
    return beats.filter(b => salesmanFilter === 'all' || b.salesman_id === salesmanFilter);
  }, [beats, salesmanFilter]);

  const rows = useMemo(() => {
    return filteredBeats.map(b => {
      const prod = computeBeatProductivity(b, filteredLogs);
      const sm = salesmen.find(s => s.id === b.salesman_id);
      return { beat: b, prod, salesmanName: sm?.display_name ?? '—' };
    });
  }, [filteredBeats, filteredLogs, salesmen]);

  const totals = useMemo(() => ({
    planned: rows.reduce((s, r) => s + r.prod.planned_visits, 0),
    actual: rows.reduce((s, r) => s + r.prod.actual_visits, 0),
    orders: rows.reduce((s, r) => s + r.prod.orders_captured, 0),
    value: rows.reduce((s, r) => s + r.prod.order_value_total, 0),
  }), [rows]);

  return (
    <div className="space-y-4">
      <Card className="border-orange-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="h-4 w-4 text-orange-500" />
            Beat Productivity Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <SmartDateInput value={from} onChange={setFrom} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <SmartDateInput value={to} onChange={setTo} />
            </div>
            <div>
              <Label className="text-xs">Salesman</Label>
              <Select value={salesmanFilter} onValueChange={setSalesmanFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Salesmen</SelectItem>
                  {salesmen.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Planned Visits</p>
            <p className="text-xl font-mono font-bold mt-1">{totals.planned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Actual Visits</p>
            <p className="text-xl font-mono font-bold mt-1">{totals.actual}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Orders Captured</p>
            <p className="text-xl font-mono font-bold mt-1 text-success">{totals.orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Order Value</p>
            <p className="text-lg font-mono font-bold mt-1 text-success">{formatINR(totals.value)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Per-Beat Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">No beats configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Beat</TableHead>
                  <TableHead className="text-xs">Salesman</TableHead>
                  <TableHead className="text-xs">Frequency</TableHead>
                  <TableHead className="text-xs text-right">Planned</TableHead>
                  <TableHead className="text-xs text-right">Actual</TableHead>
                  <TableHead className="text-xs text-right">Completion %</TableHead>
                  <TableHead className="text-xs text-right">Orders</TableHead>
                  <TableHead className="text-xs text-right">Value (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.beat.id}>
                    <TableCell className="text-xs">
                      <div className="font-mono">{r.beat.beat_code}</div>
                      <div className="text-[10px] text-muted-foreground">{r.beat.beat_name}</div>
                    </TableCell>
                    <TableCell className="text-xs">{r.salesmanName}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {FREQUENCY_LABELS[r.beat.frequency]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{r.prod.planned_visits}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{r.prod.actual_visits}</TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      <Badge
                        variant="outline"
                        className={
                          r.prod.completion_pct >= 80 ? 'border-success/30 text-success'
                          : r.prod.completion_pct >= 50 ? 'border-warning/30 text-warning'
                          : 'border-destructive/30 text-destructive'
                        }
                      >
                        {r.prod.completion_pct}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono text-success">
                      {r.prod.orders_captured}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {formatINR(r.prod.order_value_total)}
                    </TableCell>
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

export default BeatProductivityReportPanel;
