/**
 * CoverageReport.tsx — Customer coverage % per salesman/territory
 * Sprint 7. Coverage = visited / customers-in-territory.
 * [JWT] GET /api/salesx/territories
 * [JWT] GET /api/salesx/visit-logs
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
import { Target, MapPinned } from 'lucide-react';
import { type Territory, territoriesKey } from '@/types/territory';
import { type VisitLog, visitLogsKey } from '@/types/visit-log';
import { type SAMPerson, samPersonsKey } from '@/types/sam-person';
import { computeCoveragePct, daysSinceLastVisit } from '@/lib/field-force-engine';

interface Props { entityCode: string }
interface CustomerLite { id: string; partyName: string; territory_id?: string | null }

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }

function loadCustomers(): CustomerLite[] {
  try {
    const raw = localStorage.getItem('erp_group_customer_master');
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(c => ({
      id: c.id ?? c.partyCode,
      partyName: c.partyName,
      territory_id: c.territory_id ?? null,
    })) : [];
  } catch { return []; }
}

export function CoverageReportPanel({ entityCode }: Props) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [salesmen, setSalesmen] = useState<SAMPerson[]>([]);
  const [logs, setLogs] = useState<VisitLog[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');

  useEffect(() => {
    try {
      setTerritories(JSON.parse(localStorage.getItem(territoriesKey(entityCode)) || '[]'));
      setLogs(JSON.parse(localStorage.getItem(visitLogsKey(entityCode)) || '[]'));
      const all = JSON.parse(localStorage.getItem(samPersonsKey(entityCode)) || '[]') as SAMPerson[];
      setSalesmen(all.filter(p => p.person_type === 'salesman'));
      setCustomers(loadCustomers());
    } catch { /* noop */ }
  }, [entityCode]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const day = l.check_in_time.slice(0, 10);
      return day >= from && day <= to;
    });
  }, [logs, from, to]);

  const visibleTerritories = useMemo(() => {
    return territories.filter(t => territoryFilter === 'all' || t.id === territoryFilter);
  }, [territories, territoryFilter]);

  // Coverage per (territory × salesman)
  const rows = useMemo(() => {
    const out: Array<{
      territoryId: string; territoryName: string;
      salesmanId: string; salesmanName: string;
      customersCount: number; coverage: number;
    }> = [];
    for (const t of visibleTerritories) {
      const customersInTerritory = customers.filter(c => c.territory_id === t.id);
      const customerIds = customersInTerritory.map(c => c.id);
      for (const sId of t.assigned_salesman_ids) {
        const sm = salesmen.find(s => s.id === sId);
        if (!sm) continue;
        const coverage = computeCoveragePct(sId, customerIds, filteredLogs);
        out.push({
          territoryId: t.id, territoryName: t.territory_name,
          salesmanId: sId, salesmanName: sm.display_name,
          customersCount: customerIds.length,
          coverage,
        });
      }
    }
    return out;
  }, [visibleTerritories, customers, salesmen, filteredLogs]);

  // Stale customers (>30 days no visit)
  const staleRows = useMemo(() => {
    return customers
      .filter(c => territoryFilter === 'all' || c.territory_id === territoryFilter)
      .map(c => ({
        ...c,
        days: daysSinceLastVisit(c.id, filteredLogs, new Date(to)),
      }))
      .filter(c => c.days > 30)
      .sort((a, b) => (a.days === Infinity ? 1 : b.days === Infinity ? -1 : b.days - a.days))
      .slice(0, 50);
  }, [customers, filteredLogs, territoryFilter, to]);

  return (
    <div className="space-y-4">
      <Card className="border-orange-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-orange-500" />
            Coverage Report
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
            <div>
              <Label className="text-xs">Territory</Label>
              <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Territories</SelectItem>
                  {territories.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.territory_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Coverage by Salesman × Territory</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              No territories or assignments configured.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Territory</TableHead>
                  <TableHead className="text-xs">Salesman</TableHead>
                  <TableHead className="text-xs text-right">Customers</TableHead>
                  <TableHead className="text-xs text-right">Coverage %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={`${r.territoryId}-${r.salesmanId}`}>
                    <TableCell className="text-xs">{r.territoryName}</TableCell>
                    <TableCell className="text-xs">{r.salesmanName}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{r.customersCount}</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge
                        variant="outline"
                        className={
                          r.coverage >= 80 ? 'border-success/30 text-success'
                          : r.coverage >= 50 ? 'border-warning/30 text-warning'
                          : 'border-destructive/30 text-destructive'
                        }
                      >
                        {r.coverage}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-warning" />
            Stale Customers (no visit &gt; 30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staleRows.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">All caught up.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Days Since Last Visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staleRows.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{c.partyName}</TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      <Badge variant="outline" className="border-destructive/30 text-destructive">
                        {c.days === Infinity ? 'Never' : `${c.days} days`}
                      </Badge>
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

export default CoverageReportPanel;
