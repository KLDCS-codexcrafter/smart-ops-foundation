/**
 * CallLogHistoryReport.tsx — Manager view of every telecaller call
 * Sprint T-Phase-1.1.1l-b · Reads CallSession[] across all telecallers
 * [JWT] GET /api/salesx/call-sessions?entityCode={entityCode}
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { History, Phone, ExternalLink, Search } from 'lucide-react';
import { type CallSession, type CallDisposition, callSessionsKey } from '@/types/call-session';
import { type SAMPerson, samPersonsKey } from '@/types/sam-person';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

const DISPOSITION_LABELS: Record<CallDisposition, string> = {
  interested: 'Interested',
  not_interested: 'Not Interested',
  callback: 'Callback',
  no_answer: 'No Answer',
  wrong_number: 'Wrong Number',
  dnd: 'DND',
  converted: 'Converted',
};

const DISPOSITION_COLORS: Record<CallDisposition, string> = {
  interested:     'bg-blue-500/10 text-blue-700 border-blue-500/30',
  not_interested: 'bg-red-500/10 text-red-700 border-red-500/30',
  callback:       'bg-amber-500/10 text-amber-700 border-amber-500/30',
  no_answer:      'bg-slate-500/10 text-slate-700 border-slate-500/30',
  wrong_number:   'bg-purple-500/10 text-purple-700 border-purple-500/30',
  dnd:            'bg-pink-500/10 text-pink-700 border-pink-500/30',
  converted:      'bg-green-500/10 text-green-700 border-green-500/30',
};

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

function fmtDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

export function CallLogHistoryReportPanel({ entityCode }: Props) {
  const calls = useMemo(() => loadList<CallSession>(callSessionsKey(entityCode)), [entityCode]);
  const persons = useMemo(() => loadList<SAMPerson>(samPersonsKey(entityCode)), [entityCode]);

  const telecallers = useMemo(() =>
    persons.filter(p => p.person_code.startsWith('TC-') ||
                        p.person_code.startsWith('SM-') ||
                        p.person_code.startsWith('AG-')),
    [persons],
  );

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const [telecallerFilter, setTelecallerFilter] = useState<string>('all');
  const [dispositionFilter, setDispositionFilter] = useState<'all' | CallDisposition>('all');
  const [convertedOnly, setConvertedOnly] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = calls;
    if (fromDate) list = list.filter(c => c.call_date >= fromDate);
    if (toDate) list = list.filter(c => c.call_date <= toDate);
    if (telecallerFilter !== 'all') list = list.filter(c => c.telecaller_id === telecallerFilter);
    if (dispositionFilter !== 'all') list = list.filter(c => c.disposition === dispositionFilter);
    if (convertedOnly) list = list.filter(c => c.disposition === 'converted' || c.enquiry_id !== null);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        (c.contact_name ?? '').toLowerCase().includes(s) ||
        c.phone_number.toLowerCase().includes(s) ||
        (c.notes ?? '').toLowerCase().includes(s) ||
        c.telecaller_name.toLowerCase().includes(s),
      );
    }
    return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [calls, fromDate, toDate, telecallerFilter, dispositionFilter, convertedOnly, search]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const converted = filtered.filter(c => c.disposition === 'converted').length;
    const totalDuration = filtered.reduce((s, c) => s + (c.duration_seconds || 0), 0);
    return {
      total,
      converted,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
      avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,
    };
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <History className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-semibold">Call Log History</h2>
        <Badge variant="outline" className="text-[10px] ml-2">Manager View</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Calls</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Converted</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold text-green-600">{stats.converted}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Conversion Rate</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold text-amber-600">{stats.conversionRate.toFixed(1)}%</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Avg Duration</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-mono font-bold text-purple-600">{fmtDuration(stats.avgDuration)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 grid grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">From</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">To</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Telecaller</Label>
            <Select value={telecallerFilter} onValueChange={setTelecallerFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {telecallers.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Disposition</Label>
            <Select value={dispositionFilter} onValueChange={v => setDispositionFilter(v as 'all' | CallDisposition)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {(Object.keys(DISPOSITION_LABELS) as CallDisposition[]).map(d => (
                  <SelectItem key={d} value={d}>{DISPOSITION_LABELS[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, phone, notes..."
                className="h-8 text-xs pl-7"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={convertedOnly ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={() => setConvertedOnly(!convertedOnly)}
        >
          Converted only
        </Button>
        <Badge variant="outline" className="text-[10px] ml-auto">{filtered.length} calls</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No calls match the current filters.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[10px] text-muted-foreground border-b bg-muted/30">
                <tr>
                  <th className="text-left p-2">When</th>
                  <th className="text-left p-2">Telecaller</th>
                  <th className="text-left p-2">Contact</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Disposition</th>
                  <th className="text-right p-2">Duration</th>
                  <th className="text-left p-2">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map(c => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-2 font-mono text-[10px]">{fmtDateTime(c.created_at)}</td>
                    <td className="p-2">{c.telecaller_name}</td>
                    <td className="p-2 truncate max-w-[120px]">{c.contact_name ?? '—'}</td>
                    <td className="p-2 font-mono text-[10px]">
                      <a href={`tel:${c.phone_number}`} className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {c.phone_number}
                      </a>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className={cn('text-[10px]', DISPOSITION_COLORS[c.disposition])}>
                        {DISPOSITION_LABELS[c.disposition]}
                      </Badge>
                    </td>
                    <td className="p-2 text-right font-mono">{fmtDuration(c.duration_seconds || 0)}</td>
                    <td className="p-2">
                      {c.enquiry_no ? (
                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30 inline-flex items-center gap-0.5">
                          <ExternalLink className="h-2.5 w-2.5" />
                          {c.enquiry_no}
                        </Badge>
                      ) : c.notes ? (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[150px] block">{c.notes}</span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filtered.length > 200 && (
            <p className="text-[10px] text-muted-foreground p-2 border-t text-center">
              Showing first 200 of {filtered.length} — refine filters to narrow down.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CallLogHistoryReportPanel;
