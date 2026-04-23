/**
 * CommunicationLogReport.tsx — Outbound message audit trail
 * [JWT] GET /api/receivx/comm-log
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Download, MessageCircle, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  type CommunicationLog, type CommStatus,
  receivxCommLogKey,
} from '@/types/receivx';

interface Props { entityCode: string; onNavigate?: (m: string) => void }

const STATUS_TONE: Record<CommStatus, string> = {
  queued: 'bg-gray-100 text-gray-800',
  sent: 'bg-gray-200 text-gray-900',
  delivered: 'bg-blue-100 text-blue-800',
  read: 'bg-green-100 text-green-800',
  replied: 'bg-teal-100 text-teal-800',
  failed: 'bg-red-100 text-red-800',
};

const today = () => new Date().toISOString().slice(0, 10);

export function CommunicationLogReportPanel({ entityCode, onNavigate: _onNavigate }: Props) {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [detailFor, setDetailFor] = useState<CommunicationLog | null>(null);

  useEffect(() => {
    try {
      // [JWT] GET /api/receivx/comm-log
      setLogs(JSON.parse(localStorage.getItem(receivxCommLogKey(entityCode)) || '[]'));
    } catch { /* noop */ }
  }, [entityCode]);

  const filtered = useMemo(() => logs.filter(l => {
    if (search && !l.party_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterChannel !== 'all' && l.channel !== filterChannel) return false;
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    const d = (l.sent_at ?? l.created_at).slice(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  }).sort((a, b) => (b.sent_at ?? b.created_at).localeCompare(a.sent_at ?? a.created_at)),
  [logs, search, filterChannel, filterStatus, fromDate, toDate]);

  const handleExport = useCallback(() => {
    const lines = [['Sent at', 'Customer', 'Invoice', 'Channel', 'Step', 'Status', 'By'].join(',')];
    for (const l of filtered) lines.push([l.sent_at ?? l.created_at, l.party_name, l.voucher_no, l.channel, l.cadence_step, l.status, l.sent_by_user].join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `comm-log-${today()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [filtered]);

  useCtrlS(() => { if (!detailFor) handleExport(); });

  const channelIcon = (c: string) => c === 'whatsapp' ? <MessageCircle className="h-3 w-3" /> : c === 'email' ? <Mail className="h-3 w-3" /> : <Phone className="h-3 w-3" />;

  return (
    <div data-keyboard-form className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Communication Log</h1>
          <p className="text-xs text-muted-foreground">Outbound message audit trail</p>
        </div>
        <Button data-primary onClick={handleExport} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} onKeyDown={onEnterNext} className="w-36 h-8 text-xs" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} onKeyDown={onEnterNext} className="w-36 h-8 text-xs" />
        <Input placeholder="Customer..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={onEnterNext} className="w-48 h-8 text-xs" />
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="call">Call</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Sent</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs">Invoice</TableHead>
              <TableHead className="text-xs">Channel</TableHead>
              <TableHead className="text-xs">Step</TableHead>
              <TableHead className="text-xs">Body</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">No messages.</TableCell></TableRow>
            ) : filtered.map(l => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => setDetailFor(l)}>
                <TableCell className="text-xs font-mono">{(l.sent_at ?? l.created_at).slice(0, 16)}</TableCell>
                <TableCell className="text-xs">{l.party_name}</TableCell>
                <TableCell className="text-xs font-mono">{l.voucher_no}</TableCell>
                <TableCell>{channelIcon(l.channel)}</TableCell>
                <TableCell className="text-xs">{l.cadence_step}</TableCell>
                <TableCell className="text-xs truncate max-w-xs">{l.body.slice(0, 80)}</TableCell>
                <TableCell><Badge className={`${STATUS_TONE[l.status]} text-[10px]`}>{l.status}</Badge></TableCell>
                <TableCell className="text-xs">{l.sent_by_user}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={detailFor !== null} onOpenChange={(o) => !o && setDetailFor(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>Message Detail</SheetTitle></SheetHeader>
          {detailFor && (
            <div className="space-y-3 mt-4 text-xs">
              <div><b>To:</b> {detailFor.to_recipient}</div>
              {detailFor.subject && <div><b>Subject:</b> {detailFor.subject}</div>}
              <div className="bg-muted/30 p-2 rounded whitespace-pre-wrap">{detailFor.body}</div>
              <div className="space-y-1 border-t border-border pt-2">
                <p><b>Sent:</b> {detailFor.sent_at ?? '—'}</p>
                <p><b>Delivered:</b> {detailFor.delivered_at ?? '—'}</p>
                <p><b>Read/Opened:</b> {detailFor.read_at ?? detailFor.opened_at ?? '—'}</p>
                <p><b>Replied:</b> {detailFor.replied_at ?? '—'}</p>
                {detailFor.failed_reason && <p className="text-red-600"><b>Failed:</b> {detailFor.failed_reason}</p>}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function CommunicationLogReport() {
  return (
    <SidebarProvider>
      <CommunicationLogReportPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />
    </SidebarProvider>
  );
}
