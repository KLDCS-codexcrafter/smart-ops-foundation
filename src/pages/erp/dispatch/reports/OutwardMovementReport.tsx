/**
 * OutwardMovementReport.tsx — Dispatch Hub · Sample & Demo Outward Movement
 * Sprint T-Phase-1.1.1p-v2.
 * Combined SOM + DOM read-only report. Filterable by every party dimension.
 * See: Future_Task_Register_Support_BackOffice.md · Sample & Demo Outward Phase 2 capabilities
 * [JWT] GET /api/dispatch/outward-movement-report
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowUpRight, Filter } from 'lucide-react';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { samPersonsKey, type SAMPerson } from '@/types/sam-person';
import type { Employee } from '@/types/employee';
import {
  sampleOutwardMemosKey, SOM_STATUS_LABELS,
  type SampleOutwardMemo,
} from '@/types/sample-outward-memo';
import {
  demoOutwardMemosKey, DOM_STATUS_LABELS,
  type DemoOutwardMemo,
} from '@/types/demo-outward-memo';

interface Props { entityCode: string }

type RefundableFilter = 'all' | 'refundable' | 'non_refundable';
type TypeFilter = 'all' | 'sample' | 'demo';
type StatusFilter = 'all' | 'pending' | 'dispatched' | 'returned' | 'overdue' | 'consumed';

interface MovementRow {
  id: string;
  memo_no: string;
  type: 'Sample' | 'Demo';
  date: string;
  customer_name: string | null;
  salesman_name: string | null;
  agent_name: string | null;
  broker_name: string | null;
  engineer_name: string | null;
  items_summary: string;
  is_refundable: boolean;
  status: string;
  status_key: string;
  return_due: string | null;
  total_value: number;
  consumed: boolean;
}

function ls<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}

function fmtAmount(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildRows(soms: SampleOutwardMemo[], doms: DemoOutwardMemo[]): MovementRow[] {
  const somRows: MovementRow[] = soms.map(m => {
    const totalValue = m.items.reduce((s, it) => s + (it.amount ?? 0), 0);
    return {
      id: `som-${m.id}`,
      memo_no: m.memo_no,
      type: 'Sample',
      date: m.memo_date,
      customer_name: m.customer_name ?? m.recipient_company ?? m.recipient_name,
      salesman_name: m.salesman_name,
      agent_name: m.agent_name,
      broker_name: m.broker_name,
      engineer_name: m.engineer_name,
      items_summary: m.items.map(it => `${it.item_name} (${it.qty}${it.uom ? ' ' + it.uom : ''})`).join(', '),
      is_refundable: m.is_refundable,
      status: SOM_STATUS_LABELS[m.status],
      status_key: m.status,
      return_due: m.return_due_date,
      total_value: totalValue,
      consumed: !m.is_refundable && m.status === 'completed',
    };
  });
  const domRows: MovementRow[] = doms.map(m => {
    const totalValue = m.items.reduce((s, it) => s + (it.amount ?? 0), 0);
    return {
      id: `dom-${m.id}`,
      memo_no: m.memo_no,
      type: 'Demo',
      date: m.memo_date,
      customer_name: m.customer_name ?? m.recipient_company ?? m.recipient_name,
      salesman_name: m.salesman_name,
      agent_name: m.agent_name,
      broker_name: m.broker_name,
      engineer_name: m.engineer_name,
      items_summary: m.items.map(it => `${it.item_name} (${it.qty}${it.uom ? ' ' + it.uom : ''})`).join(', '),
      is_refundable: true, // demos are always refundable
      status: DOM_STATUS_LABELS[m.status],
      status_key: m.status,
      return_due: m.demo_end_date,
      total_value: totalValue,
      consumed: false,
    };
  });
  return [...somRows, ...domRows].sort((a, b) => b.date.localeCompare(a.date));
}

export function OutwardMovementReportPanel({ entityCode }: Props) {
  // [JWT] GET /api/salesx/sample-outward-memos
  // [JWT] GET /api/salesx/demo-outward-memos
  const soms = useMemo(() => ls<SampleOutwardMemo>(sampleOutwardMemosKey(entityCode)), [entityCode]);
  const doms = useMemo(() => ls<DemoOutwardMemo>(demoOutwardMemosKey(entityCode)), [entityCode]);
  const allRows = useMemo(() => buildRows(soms, doms), [soms, doms]);

  // Master lookups for filter dropdowns
  const samPersons = useMemo(() => ls<SAMPerson>(samPersonsKey(entityCode)), [entityCode]);
  const salesmen = useMemo(() => samPersons.filter(p => p.person_type === 'salesman'), [samPersons]);
  const agentsBrokers = useMemo(
    () => samPersons.filter(p => p.person_type === 'agent' || p.person_type === 'broker'),
    [samPersons],
  );
  const employees = useMemo(() => ls<Employee>('erp_employees'), []);

  // Filter state
  const [customerSearch, setCustomerSearch] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState<string>('all');
  const [agentBrokerFilter, setAgentBrokerFilter] = useState<string>('all');
  const [engineerFilter, setEngineerFilter] = useState<string>('all');
  const [refundableFilter, setRefundableFilter] = useState<RefundableFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    return allRows.filter(r => {
      if (typeFilter !== 'all' && r.type.toLowerCase() !== typeFilter) return false;
      if (refundableFilter === 'refundable' && !r.is_refundable) return false;
      if (refundableFilter === 'non_refundable' && r.is_refundable) return false;
      if (customerSearch.trim()) {
        const q = customerSearch.trim().toLowerCase();
        if (!(r.customer_name ?? '').toLowerCase().includes(q)) return false;
      }
      if (salesmanFilter !== 'all') {
        const sm = salesmen.find(p => p.id === salesmanFilter);
        if (!sm || r.salesman_name !== sm.display_name) return false;
      }
      if (agentBrokerFilter !== 'all') {
        const ab = agentsBrokers.find(p => p.id === agentBrokerFilter);
        if (!ab) return false;
        if (r.agent_name !== ab.display_name && r.broker_name !== ab.display_name) return false;
      }
      if (engineerFilter !== 'all') {
        const eng = employees.find(e => e.id === engineerFilter);
        if (!eng || r.engineer_name !== eng.displayName) return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'consumed') {
          if (!r.consumed) return false;
        } else if (statusFilter === 'pending') {
          if (r.status_key !== 'draft') return false;
        } else if (r.status_key !== statusFilter) {
          return false;
        }
      }
      return true;
    });
  }, [allRows, typeFilter, refundableFilter, customerSearch, salesmanFilter,
      agentBrokerFilter, engineerFilter, statusFilter,
      salesmen, agentsBrokers, employees]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const refundable = filtered.filter(r => r.is_refundable).length;
    const consumed = filtered.filter(r => r.consumed).length;
    const overdue = filtered.filter(r => r.status_key === 'overdue').length;
    return { total, refundable, consumed, overdue };
  }, [filtered]);

  const resetFilters = () => {
    setCustomerSearch(''); setSalesmanFilter('all'); setAgentBrokerFilter('all');
    setEngineerFilter('all'); setRefundableFilter('all');
    setTypeFilter('all'); setStatusFilter('all');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowUpRight className="h-6 w-6 text-blue-600" /> Outward Movement Report
        </h1>
        <p className="text-sm text-muted-foreground">
          Combined Sample &amp; Demo outward movements · filter by any party dimension.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Total Out</p>
            <p className="text-2xl font-bold font-mono">{summary.total}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Refundable</p>
            <p className="text-2xl font-bold font-mono text-blue-600">{summary.refundable}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Consumed</p>
            <p className="text-2xl font-bold font-mono text-amber-600">{summary.consumed}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold font-mono text-destructive">{summary.overdue}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetFilters}>Reset</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Customer search</Label>
            <Input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
              className="h-9 text-sm" placeholder="Customer name…" />
          </div>
          <div>
            <Label className="text-xs">Salesman</Label>
            <Select value={salesmanFilter} onValueChange={setSalesmanFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {salesmen.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Agent / Broker</Label>
            <Select value={agentBrokerFilter} onValueChange={setAgentBrokerFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {agentsBrokers.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name} <span className="text-muted-foreground text-[10px] ml-1">· {p.person_type}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Engineer</Label>
            <Select value={engineerFilter} onValueChange={setEngineerFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Type:</span>
            {(['all', 'sample', 'demo'] as TypeFilter[]).map(t => (
              <Button key={t} size="sm" variant={typeFilter === t ? 'default' : 'outline'}
                className="h-7 text-xs capitalize" onClick={() => setTypeFilter(t)}>
                {t === 'all' ? 'All' : t}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground ml-3 mr-1">Refundable:</span>
            {(['all', 'refundable', 'non_refundable'] as RefundableFilter[]).map(r => (
              <Button key={r} size="sm" variant={refundableFilter === r ? 'default' : 'outline'}
                className="h-7 text-xs" onClick={() => setRefundableFilter(r)}>
                {r === 'all' ? 'All' : r === 'refundable' ? 'Refundable' : 'Non-Refundable'}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground ml-3 mr-1">Status:</span>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="consumed">Consumed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Movement Rows · {filtered.length} of {allRows.length}</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              No movements match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Memo No</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Salesman</TableHead>
                    <TableHead className="text-xs">Agent / Broker</TableHead>
                    <TableHead className="text-xs">Engineer</TableHead>
                    <TableHead className="text-xs">Items</TableHead>
                    <TableHead className="text-xs">Refundable</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Return Due</TableHead>
                    <TableHead className="text-xs text-right">Value ₹</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.memo_no}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.date}</TableCell>
                      <TableCell className="text-xs">{r.customer_name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.salesman_name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.agent_name ?? r.broker_name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.engineer_name ?? '—'}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={r.items_summary}>
                        {r.items_summary}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.is_refundable ? 'default' : 'outline'} className="text-[10px]">
                          {r.is_refundable ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                          {r.consumed && (
                            <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700">
                              Consumed
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{r.return_due ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {r.total_value > 0 ? fmtAmount(r.total_value) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OutwardMovementReportPage() {
  return <OutwardMovementReportPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
