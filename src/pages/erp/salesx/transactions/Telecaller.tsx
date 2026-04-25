/**
 * Telecaller.tsx — 3-section call screen + Reminders tab (Sprint 4)
 * [JWT] GET/POST /api/salesx/call-sessions
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Phone, ChevronLeft, ChevronRight, Lock, Save, MessageCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { useEnquiries } from '@/hooks/useEnquiries';
import { useCallSessions } from '@/hooks/useCallSessions';
import { comply360SAMKey } from '@/pages/erp/accounting/ComplianceSettingsAutomation';
import type { SAMConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation';
import type { CallDisposition, CallSession } from '@/types/call-session';
import type { Enquiry, EnquiryFollowUp, EnquiryStatus } from '@/types/enquiry';
import { cn } from '@/lib/utils';

interface Props {
  entityCode: string;
  onNavigate?: (m: string) => void;
}

interface EmployeeLite { status: string; personalMobile?: string; personalEmail?: string }

function loadCfg(entityCode: string): SAMConfig | null {
  try {
    // [JWT] GET /api/compliance/comply360/sam/:entityCode
    return JSON.parse(localStorage.getItem(comply360SAMKey(entityCode)) || 'null');
  } catch { return null; }
}

const dispToStatus: Record<CallDisposition, EnquiryStatus> = {
  interested: 'in_process',
  callback: 'pending',
  no_answer: 'pending',
  dnd: 'on_hold',
  converted: 'sold',
  not_interested: 'lost',
  wrong_number: 'lost',
};

const todayISO = () => new Date().toISOString().split('T')[0];
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function TelecallerPanel({ entityCode, onNavigate }: Props) {
  const cfg = useMemo(() => loadCfg(entityCode), [entityCode]);
  const { enquiries, addFollowUp } = useEnquiries(entityCode);
  const { sessions, createSession } = useCallSessions(entityCode);

  const queue = useMemo(() => {
    const open = enquiries.filter(e => ['new', 'assigned', 'pending', 'in_process'].includes(e.status));
    return open.sort((a, b) => {
      const af = a.follow_ups[a.follow_ups.length - 1]?.follow_up_date ?? 'z';
      const bf = b.follow_ups[b.follow_ups.length - 1]?.follow_up_date ?? 'z';
      return af.localeCompare(bf);
    });
  }, [enquiries]);

  const [activeTab, setActiveTab] = useState<'call' | 'reminders'>('call');
  const [idx, setIdx] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [disposition, setDisposition] = useState<CallDisposition>('interested');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');

  const today = todayISO();

  const overdueEnquiries = useMemo(() =>
    enquiries.filter(e => {
      if (!['new', 'assigned', 'pending', 'in_process'].includes(e.status)) return false;
      const lastFU = e.follow_ups[e.follow_ups.length - 1];
      const d = lastFU?.follow_up_date ?? e.enquiry_date;
      return d < today;
    }).sort((a, b) => {
      const ad = a.follow_ups[a.follow_ups.length - 1]?.follow_up_date ?? a.enquiry_date;
      const bd = b.follow_ups[b.follow_ups.length - 1]?.follow_up_date ?? b.enquiry_date;
      return ad.localeCompare(bd);
    }),
  [enquiries, today]);

  const telecallerEmployee = useMemo<EmployeeLite | null>(() => {
    try {
      // [JWT] GET /api/payhub/employees
      const emps: EmployeeLite[] = JSON.parse(localStorage.getItem('erp_employees') || '[]');
      return emps.find(e => e.status === 'active') ?? null;
    } catch { return null; }
  }, []);

  const handleNotifyWhatsApp = useCallback(() => {
    if (!telecallerEmployee?.personalMobile) {
      toast.error('Telecaller mobile not configured in Employee Master'); return;
    }
    const lines = overdueEnquiries.slice(0, 10).map((e, i) => {
      const lastFU = e.follow_ups[e.follow_ups.length - 1];
      const daysAgo = Math.floor(
        (new Date(today).getTime() - new Date(lastFU?.follow_up_date ?? e.enquiry_date).getTime()) / 86400000,
      );
      return `${i + 1}. ${e.customer_name ?? e.contact_person ?? '—'} (${daysAgo}d overdue)`;
    });
    const msg = `You have ${overdueEnquiries.length} overdue follow-ups today:\n` + lines.join('\n');
    const mobile = telecallerEmployee.personalMobile.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
  }, [overdueEnquiries, telecallerEmployee, today]);

  const handleNotifyEmail = useCallback(() => {
    if (!telecallerEmployee?.personalEmail) {
      toast.error('Telecaller email not configured in Employee Master'); return;
    }
    const subject = `[Operix] ${overdueEnquiries.length} Overdue Follow-ups - ${today}`;
    const body = overdueEnquiries.slice(0, 20).map((e, i) => {
      const lastFU = e.follow_ups[e.follow_ups.length - 1];
      const daysAgo = Math.floor(
        (new Date(today).getTime() - new Date(lastFU?.follow_up_date ?? e.enquiry_date).getTime()) / 86400000,
      );
      return `${i + 1}. ${e.enquiry_no} | ${e.customer_name ?? e.contact_person ?? '—'} | ${daysAgo}d overdue`;
    }).join('%0A');
    window.open(
      `mailto:${telecallerEmployee.personalEmail}?subject=${encodeURIComponent(subject)}&body=${body}`,
      '_blank',
    );
  }, [overdueEnquiries, telecallerEmployee, today]);

  const current: Enquiry | undefined = queue[idx];

  useEffect(() => {
    if (!sessionActive) return;
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, [sessionActive]);

  const resetCall = () => {
    setSessionActive(false); setDuration(0); setNotes('');
    setDisposition('interested'); setFollowUpDate(''); setFollowUpTime('');
  };

  const handleSaveSession = useCallback(() => {
    if (!current) return;
    const session: Omit<CallSession, 'id' | 'session_no' | 'entity_id' | 'created_at' | 'updated_at'> = {
      call_date: todayISO(),
      telecaller_id: 'me', telecaller_name: 'Current User',
      enquiry_id: current.id, enquiry_no: current.enquiry_no,
      contact_name: current.contact_person ?? current.customer_name,
      phone_number: current.mobile ?? current.phone ?? '',
      call_type: 'outbound',
      disposition,
      duration_seconds: duration,
      notes,
      follow_up_date: followUpDate || null,
      follow_up_time: followUpTime || null,
      is_active: true,
    };
    createSession(session);
    const fu: EnquiryFollowUp = {
      id: `fu-${Date.now()}`,
      date: todayISO(), time: nowHHMM(),
      follow_up_type: 'call',
      status: dispToStatus[disposition],
      executive_id: null, executive_name: 'Current User',
      follow_up_date: followUpDate || null,
      follow_up_time: followUpTime || null,
      reason: null,
      remarks: notes,
      user_name: 'Current User',
    };
    addFollowUp(current.id, fu);
    resetCall();
    if (idx < queue.length - 1) setIdx(idx + 1);
  }, [current, disposition, duration, notes, followUpDate, followUpTime, createSession, addFollowUp, idx, queue.length]);

  useCtrlS(sessionActive ? handleSaveSession : () => {});

  if (!cfg?.enableTelecalling) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-semibold">Telecalling is disabled</p>
          <p className="text-sm text-muted-foreground">Enable Telecalling in Comply360 SAM settings.</p>
        </CardContent>
      </Card>
    );
  }

  if (queue.length === 0 && activeTab === 'call') {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Phone className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-semibold">No pending enquiries</p>
          <p className="text-sm text-muted-foreground">Go to Enquiry Register to add leads.</p>
          <Button onClick={() => onNavigate?.('sx-t-enquiry')} className="bg-orange-500 hover:bg-orange-600">
            Open Enquiry Register
          </Button>
        </CardContent>
      </Card>
    );
  }

  const mins = Math.floor(duration / 60), secs = duration % 60;
  const prevSessions = sessions.filter(s => s.enquiry_id === current?.id).slice(-3).reverse();

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b pb-1 mb-3">
        <button onClick={() => setActiveTab('call')}
          className={cn(
            'px-4 py-1.5 text-xs font-medium rounded-t transition-colors',
            activeTab === 'call'
              ? 'bg-orange-500/15 text-orange-700 border border-orange-500/30'
              : 'text-muted-foreground hover:bg-muted/50',
          )}>
          Call Screen
        </button>
        <button onClick={() => setActiveTab('reminders')}
          className={cn(
            'px-4 py-1.5 text-xs font-medium rounded-t flex items-center gap-1.5',
            activeTab === 'reminders'
              ? 'bg-orange-500/15 text-orange-700 border border-orange-500/30'
              : 'text-muted-foreground hover:bg-muted/50',
          )}>
          Reminders
          {overdueEnquiries.length > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 font-bold">
              {overdueEnquiries.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'call' && current && (
        <>
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={idx === 0} onClick={() => { setIdx(idx - 1); resetCall(); }}>
                <ChevronLeft className="h-4 w-4" />Prev
              </Button>
              <Button size="sm" variant="outline" disabled={idx >= queue.length - 1} onClick={() => { setIdx(idx + 1); resetCall(); }}>
                Next<ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">{idx + 1} of {queue.length} leads</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => { if (sessionActive) setSessionActive(false); else { setSessionActive(true); setDuration(0); } }}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Phone className="h-4 w-4 mr-2" />{sessionActive ? 'End Call' : 'Start Call'}
              </Button>
              <span className="font-mono text-sm">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{todayISO()}</span>
          </div>

          <div className="grid grid-cols-3 gap-4" data-keyboard-form>
            <Card>
              <CardHeader><CardTitle className="text-sm">Lead Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div><span className="text-muted-foreground">Contact:</span> {current?.contact_person ?? current?.customer_name ?? '—'}</div>
                <div><span className="text-muted-foreground">Phone:</span> {current?.mobile ?? current?.phone ?? '—'}</div>
                <div><span className="text-muted-foreground">Enquiry:</span> <span className="font-mono">{current?.enquiry_no}</span></div>
                <div><span className="text-muted-foreground">Source:</span> {current?.enquiry_source_name ?? '—'}</div>
                <div><span className="text-muted-foreground">Priority:</span> <Badge variant="outline" className="text-[10px] capitalize">{current?.priority}</Badge></div>
                {prevSessions.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="font-semibold mb-1">Previous calls</p>
                    {prevSessions.map(s => (
                      <div key={s.id} className="text-[10px] text-muted-foreground py-0.5">
                        {s.call_date} · {s.disposition} · {s.notes.slice(0, 40)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Call Notes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  rows={6} placeholder="This call…"
                  onKeyDown={e => onEnterNext(e as unknown as React.KeyboardEvent<HTMLInputElement>)}
                />
                <div className="text-[10px] text-muted-foreground border-t pt-2 space-y-0.5">
                  <p className="font-semibold">Previous notes</p>
                  {(current?.follow_ups ?? []).slice(-3).reverse().map(fu => (
                    <div key={fu.id}>{fu.date} · {fu.follow_up_type} · {fu.remarks.slice(0, 80)}</div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Disposition</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <RadioGroup value={disposition} onValueChange={v => setDisposition(v as CallDisposition)}>
                  {(['interested', 'not_interested', 'callback', 'no_answer', 'wrong_number', 'dnd', 'converted'] as CallDisposition[]).map(d => (
                    <div key={d} className="flex items-center gap-2">
                      <RadioGroupItem value={d} id={`d-${d}`} />
                      <Label htmlFor={`d-${d}`} className="text-xs capitalize">{d.replace('_', ' ')}</Label>
                    </div>
                  ))}
                </RadioGroup>

                {(disposition === 'callback' || disposition === 'interested') && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div>
                      <label className="text-[10px]">Follow-Up Date</label>
                      <SmartDateInput value={followUpDate} onChange={setFollowUpDate} />
                    </div>
                    <div>
                      <label className="text-[10px]">Time</label>
                      <Input type="time" value={followUpTime} onChange={e => setFollowUpTime(e.target.value)} />
                    </div>
                  </div>
                )}

                <Button data-primary onClick={handleSaveSession} className="w-full bg-orange-500 hover:bg-orange-600">
                  <Save className="h-3.5 w-3.5 mr-1" />Save &amp; Next
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'reminders' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{overdueEnquiries.length} overdue follow-ups</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleNotifyWhatsApp} className="gap-1.5 text-xs">
                <MessageCircle className="h-3.5 w-3.5 text-green-600" /> WhatsApp
              </Button>
              <Button size="sm" variant="outline" onClick={handleNotifyEmail} className="gap-1.5 text-xs">
                <Mail className="h-3.5 w-3.5" /> Email
              </Button>
            </div>
          </div>
          {overdueEnquiries.map(e => {
            const lastFU = e.follow_ups[e.follow_ups.length - 1];
            const daysAgo = Math.floor(
              (new Date(today).getTime() - new Date(lastFU?.follow_up_date ?? e.enquiry_date).getTime()) / 86400000,
            );
            return (
              <div key={e.id} className="flex items-center justify-between p-2 rounded border hover:bg-muted/30 text-xs">
                <div>
                  <span className="font-mono font-medium">{e.enquiry_no}</span>
                  <span className="text-muted-foreground ml-2">
                    {e.customer_name ?? e.contact_person ?? '—'}
                  </span>
                  <Badge variant="outline" className="ml-2 text-[10px] border-destructive/40 text-destructive">
                    {daysAgo}d overdue
                  </Badge>
                </div>
                <Button
                  size="sm"
                  className="h-6 text-[10px] bg-orange-500 hover:bg-orange-600"
                  onClick={() => {
                    const i = queue.findIndex(q => q.id === e.id);
                    if (i >= 0) { setIdx(i); setActiveTab('call'); }
                  }}
                >
                  Call Now
                </Button>
              </div>
            );
          })}
          {overdueEnquiries.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-xs text-muted-foreground">
                No overdue follow-ups. All caught up!
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default TelecallerPanel;
