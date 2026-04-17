/**
 * Telecaller.tsx — 3-section call screen
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
import { Phone, ChevronLeft, ChevronRight, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { useEnquiries } from '@/hooks/useEnquiries';
import { useCallSessions } from '@/hooks/useCallSessions';
import { comply360SAMKey } from '@/pages/erp/accounting/Comply360Config';
import type { SAMConfig } from '@/pages/erp/accounting/Comply360Config';
import type { CallDisposition, CallSession } from '@/types/call-session';
import type { Enquiry, EnquiryFollowUp, EnquiryStatus } from '@/types/enquiry';

interface Props {
  entityCode: string;
  onNavigate?: (m: string) => void;
}

function loadCfg(entityCode: string): SAMConfig | null {
  try { return JSON.parse(localStorage.getItem(comply360SAMKey(entityCode)) || 'null'); }
  catch { return null; }
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

  const [idx, setIdx] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [disposition, setDisposition] = useState<CallDisposition>('interested');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');

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

  if (queue.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Phone className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-semibold">No pending enquiries</p>
          <p className="text-sm text-muted-foreground">Go to Enquiry Register to add leads.</p>
          <Button
            onClick={() => onNavigate?.('sx-t-enquiry')}
            className="bg-orange-500 hover:bg-orange-600"
          >
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

            <Button
              data-primary onClick={handleSaveSession} className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <Save className="h-3.5 w-3.5 mr-1" />Save &amp; Next
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TelecallerPanel;
