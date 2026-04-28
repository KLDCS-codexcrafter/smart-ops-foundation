/**
 * MobileLeadInboxPage.tsx — Read-only own lead list with status filter chips
 * Sprint T-Phase-1.1.1l-b
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Inbox, ChevronRight } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import {
  type Lead, type LeadStatus, leadsKey, LEAD_PLATFORM_LABELS, LEAD_PLATFORM_COLORS,
} from '@/types/lead';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

type Filter = 'all' | 'new' | 'contacted' | 'qualified' | 'lost';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',        label: 'All' },
  { value: 'new',        label: 'New' },
  { value: 'contacted',  label: 'Contacted' },
  { value: 'qualified',  label: 'Qualified' },
  { value: 'lost',       label: 'Lost' },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new:        'bg-blue-500/10 text-blue-700 border-blue-500/30',
  contacted:  'bg-amber-500/10 text-amber-700 border-amber-500/30',
  qualified:  'bg-green-500/10 text-green-700 border-green-500/30',
  converted:  'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  lost:       'bg-red-500/10 text-red-700 border-red-500/30',
  duplicate:  'bg-slate-500/10 text-slate-700 border-slate-500/30',
};

export default function MobileLeadInboxPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const leads = useMemo(() => session ? loadList<Lead>(leadsKey(session.entity_code)) : [], [session]);
  const [filter, setFilter] = useState<Filter>('all');

  const myLeads = useMemo(() => {
    if (!session) return [];
    const own = leads.filter(l => l.assigned_telecaller_id === session.user_id && l.is_active);
    const filtered = filter === 'all' ? own : own.filter(l => l.status === filter);
    return filtered.sort((a, b) => b.lead_date.localeCompare(a.lead_date));
  }, [leads, session, filter]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/telecaller')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Lead Inbox</h1>
        <Badge variant="outline" className="text-[10px] ml-auto">{myLeads.length}</Badge>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? 'default' : 'outline'}
            className="text-[11px] h-7 shrink-0"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {myLeads.length === 0 ? (
        <Card className="p-6 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No leads</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {myLeads.map(l => (
            <Card
              key={l.id}
              className="p-3 cursor-pointer active:scale-[0.99]"
              onClick={() => navigate(`/mobile/telecaller/active-call?leadId=${l.id}`)}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-medium text-sm truncate">{l.contact_name}</p>
                    <Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[l.status]}`}>{l.status}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{l.phone ?? '—'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className={`text-[9px] ${LEAD_PLATFORM_COLORS[l.platform]}`}>
                      {LEAD_PLATFORM_LABELS[l.platform]}
                    </Badge>
                    {l.product_interest && (
                      <span className="text-[10px] text-muted-foreground truncate">{l.product_interest}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
