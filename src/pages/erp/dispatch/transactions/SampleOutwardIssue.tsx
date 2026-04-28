/**
 * SampleOutwardIssue.tsx — Dispatch Hub · Sample Outward Issue
 * Sprint T-Phase-1.1.1p-v2.
 * Dispatch receives the SOM raised by SalesX and issues it with full party details.
 * [JWT] GET/PATCH /api/dispatch/sample-outward-issue
 *
 * D-127/D-128 ZERO-TOUCH: never touches voucher forms or schemas.
 * Flow: SalesX raises SOM (status=draft) → Dispatch issues it (status=dispatched)
 *       filling in customer · salesman · agent · broker · engineer · godown.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import {
  PackageCheck, Send, ArrowLeft, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { samPersonsKey, type SAMPerson } from '@/types/sam-person';
import type { Employee } from '@/types/employee';
import type { Godown } from '@/types/godown';
import {
  sampleOutwardMemosKey,
  SOM_PURPOSE_LABELS,
  SOM_STATUS_LABELS,
  type SampleOutwardMemo,
} from '@/types/sample-outward-memo';

interface Props { entityCode: string }

const SAMPLES_GODOWN_NAME = 'Samples & Demos - Out with 3rd Party';

function ls<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}

export function SampleOutwardIssuePanel({ entityCode }: Props) {
  // Load all SOMs and isolate ones still pending Dispatch issue.
  // [JWT] GET /api/salesx/sample-outward-memos?entityCode=:entityCode
  const [allSOMs, setAllSOMs] = useState<SampleOutwardMemo[]>(
    () => ls<SampleOutwardMemo>(sampleOutwardMemosKey(entityCode)),
  );
  const pending = useMemo(
    () => allSOMs.filter(m => !m.issued_by_dispatch),
    [allSOMs],
  );

  const [selectedId, setSelectedId] = useState<string>('');
  const selected = useMemo(
    () => allSOMs.find(m => m.id === selectedId) ?? null,
    [allSOMs, selectedId],
  );

  // Master lookups
  // [JWT] GET /api/salesx/sam-persons
  const samPersons = useMemo(
    () => ls<SAMPerson>(samPersonsKey(entityCode)),
    [entityCode],
  );
  const salesmen = useMemo(() => samPersons.filter(p => p.person_type === 'salesman' && p.is_active), [samPersons]);
  const agents   = useMemo(() => samPersons.filter(p => p.person_type === 'agent'    && p.is_active), [samPersons]);
  const brokers  = useMemo(() => samPersons.filter(p => p.person_type === 'broker'   && p.is_active), [samPersons]);

  // [JWT] GET /api/hr/employees
  const employees = useMemo(() => ls<Employee>('erp_employees'), []);

  // [JWT] GET /api/inventory/godowns
  const godowns = useMemo(() => ls<Godown>('erp_godowns'), []);
  const samplesGodown = useMemo(
    () => godowns.find(g => g.name === SAMPLES_GODOWN_NAME) ?? null,
    [godowns],
  );

  // Form state — Dispatch fills these
  const [customerName, setCustomerName] = useState('');
  const [salesmanId, setSalesmanId] = useState<string>('');
  const [agentId, setAgentId] = useState<string>('');
  const [brokerId, setBrokerId] = useState<string>('');
  const [engineerId, setEngineerId] = useState<string>('');
  const [engineerFreeText, setEngineerFreeText] = useState('');
  const [isRefundable, setIsRefundable] = useState(false);
  const [returnDueDate, setReturnDueDate] = useState('');

  // Reset form whenever the selected SOM changes.
  useEffect(() => {
    if (!selected) return;
    setCustomerName(selected.recipient_company ?? selected.recipient_name);
    setSalesmanId(selected.raised_by_person_type === 'salesman' ? selected.raised_by_person_id : '');
    setAgentId('');
    setBrokerId('');
    setEngineerId('');
    setEngineerFreeText('');
    setIsRefundable(selected.expect_return);
    setReturnDueDate(selected.return_due_date ?? '');
  }, [selected]);

  const handleIssue = useCallback(() => {
    if (!selected) { toast.error('Select an SOM to issue'); return; }
    if (!customerName.trim()) { toast.error('Customer name required'); return; }
    if (!salesmanId && !agentId && !brokerId) {
      toast.error('Select at least one of: Salesman / Agent / Broker'); return;
    }
    if (isRefundable && !samplesGodown) {
      toast.error(`Samples godown not found. Please run entity setup to create "${SAMPLES_GODOWN_NAME}".`);
      return;
    }

    const sm = salesmen.find(p => p.id === salesmanId) ?? null;
    const ag = agents.find(p => p.id === agentId) ?? null;
    const br = brokers.find(p => p.id === brokerId) ?? null;
    const eng = employees.find(e => e.id === engineerId) ?? null;
    const engineerName = eng?.displayName ?? engineerFreeText.trim() ?? '';

    const now = new Date().toISOString();
    const updated: SampleOutwardMemo = {
      ...selected,
      customer_id: null,
      customer_name: customerName.trim(),
      salesman_id: sm?.id ?? null,
      salesman_name: sm?.display_name ?? null,
      agent_id: ag?.id ?? null,
      agent_name: ag?.display_name ?? null,
      broker_id: br?.id ?? null,
      broker_name: br?.display_name ?? null,
      engineer_emp_id: eng?.id ?? null,
      engineer_name: engineerName || null,
      is_refundable: isRefundable,
      outward_godown_id: isRefundable ? samplesGodown?.id ?? null : null,
      outward_godown_name: isRefundable ? samplesGodown?.name ?? null : null,
      issued_by_dispatch: true,
      dispatch_issued_at: now,
      dispatch_issued_by: 'dispatch_user',
      expect_return: isRefundable,
      return_due_date: isRefundable ? (returnDueDate || null) : null,
      status: 'dispatched',
      dispatched_at: now,
      updated_at: now,
    };

    const all = ls<SampleOutwardMemo>(sampleOutwardMemosKey(entityCode));
    const next = all.map(m => m.id === updated.id ? updated : m);
    // [JWT] PATCH /api/salesx/sample-outward-memos/:id
    localStorage.setItem(sampleOutwardMemosKey(entityCode), JSON.stringify(next));
    setAllSOMs(next);
    setSelectedId('');
    toast.success(`SOM ${updated.memo_no} issued · ${isRefundable ? 'Refundable' : 'Consumed'}`);
  }, [
    selected, customerName, salesmanId, agentId, brokerId,
    engineerId, engineerFreeText, isRefundable, returnDueDate,
    salesmen, agents, brokers, employees, samplesGodown, entityCode,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (selected) {
    const itemQty = selected.items.reduce((s, it) => s + it.qty, 0);
    return (
      <div className="space-y-4" data-keyboard-form>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PackageCheck className="h-6 w-6 text-blue-600" />
              Issue Sample Outward
            </h1>
            <p className="text-sm text-muted-foreground">
              Fill party details, refundable status, and issue this Sample Outward Memo.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelectedId('')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Queue
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">SOM Details (read-only · from SalesX)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div><span className="text-muted-foreground">Memo No: </span><span className="font-mono">{selected.memo_no}</span></div>
            <div><span className="text-muted-foreground">Date: </span>{selected.memo_date}</div>
            <div><span className="text-muted-foreground">Purpose: </span>{SOM_PURPOSE_LABELS[selected.purpose]}</div>
            <div><span className="text-muted-foreground">Raised By: </span>{selected.raised_by_person_name}</div>
            <div><span className="text-muted-foreground">Recipient: </span>{selected.recipient_name}</div>
            <div><span className="text-muted-foreground">Items: </span>{selected.items.length} lines · Qty {itemQty}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Party Details (Dispatch fills)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs">Customer *</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)}
                onKeyDown={onEnterNext} className="h-9 text-sm"
                placeholder="Architect / prospect / customer name (free text)" />
            </div>
            <div>
              <Label className="text-xs">Salesman</Label>
              <Select value={salesmanId} onValueChange={setSalesmanId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select salesman" /></SelectTrigger>
                <SelectContent>
                  {salesmen.length === 0 && <SelectItem value="none" disabled>No salesmen</SelectItem>}
                  {salesmen.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Agent (optional)</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent>
                  {agents.length === 0 && <SelectItem value="none" disabled>No agents</SelectItem>}
                  {agents.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Broker (optional)</Label>
              <Select value={brokerId} onValueChange={setBrokerId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select broker" /></SelectTrigger>
                <SelectContent>
                  {brokers.length === 0 && <SelectItem value="none" disabled>No brokers</SelectItem>}
                  {brokers.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Engineer (optional)</Label>
              {employees.length > 0 ? (
                <Select value={engineerId} onValueChange={setEngineerId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select engineer" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.displayName} <span className="text-muted-foreground text-[10px] ml-1">· {e.designation || 'Engineer'}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={engineerFreeText} onChange={e => setEngineerFreeText(e.target.value)}
                  onKeyDown={onEnterNext} className="h-9 text-sm" placeholder="Engineer name (free text)" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Refundable Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <input id="som-issue-refundable" type="checkbox" checked={isRefundable}
                onChange={e => setIsRefundable(e.target.checked)} />
              <Label htmlFor="som-issue-refundable" className="text-sm cursor-pointer">
                Refundable — sample must be returned
              </Label>
            </div>
            {isRefundable ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Outward Godown</Label>
                  <Input value={samplesGodown?.name ?? 'Not configured · run entity setup'}
                    disabled className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Expected Return Date</Label>
                  <SmartDateInput value={returnDueDate} onChange={setReturnDueDate} />
                </div>
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Non-refundable sample</AlertTitle>
                <AlertDescription>
                  This sample will be treated as <strong>consumed</strong> (marketing expense).
                  Phase 2 will book an automatic expense voucher when the SOM is completed.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setSelectedId('')}>Cancel</Button>
          <Button onClick={handleIssue} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4" /> Issue Sample
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PackageCheck className="h-6 w-6 text-blue-600" /> Sample Outward Issue
        </h1>
        <p className="text-sm text-muted-foreground">
          Pending Sample Outward Memos raised by SalesX · Dispatch issues with full party details.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Pending Issue Queue</span>
            <Badge variant="outline" className="text-[10px]">{pending.length} pending</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              No pending Sample Outward Memos. SalesX → Sample Outward to raise one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Memo No</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Recipient</TableHead>
                  <TableHead className="text-xs">Purpose</TableHead>
                  <TableHead className="text-xs">Raised By</TableHead>
                  <TableHead className="text-xs text-right">Items</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map(m => (
                  <TableRow key={m.id} className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setSelectedId(m.id)}>
                    <TableCell className="font-mono text-xs">{m.memo_no}</TableCell>
                    <TableCell className="text-xs">{m.memo_date}</TableCell>
                    <TableCell className="text-xs">
                      {m.recipient_name}
                      {m.recipient_company && (
                        <span className="text-muted-foreground"> · {m.recipient_company}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{SOM_PURPOSE_LABELS[m.purpose]}</TableCell>
                    <TableCell className="text-xs">{m.raised_by_person_name}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{m.items.length}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{SOM_STATUS_LABELS[m.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(m.id); }}>
                        Issue →
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!samplesGodown && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Samples godown not configured</AlertTitle>
          <AlertDescription>
            "{SAMPLES_GODOWN_NAME}" godown was not found. Run a fresh entity setup to auto-create it.
            Refundable issuing will be disabled until then.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function SampleOutwardIssuePage() {
  return <SampleOutwardIssuePanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
