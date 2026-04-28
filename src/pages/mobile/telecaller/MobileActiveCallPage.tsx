/**
 * MobileActiveCallPage.tsx — Active call screen with disposition + Convert-to-Enquiry
 * Sprint T-Phase-1.1.1l-b
 *
 * Reads ?leadId=... or ?phone=... from query params.
 * Saves a CallSession on disposition. If "converted" disposition, creates an Enquiry
 * and links the source Lead via converted_enquiry_id.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Phone, MessageSquare, ArrowRightCircle, Save, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  type CallSession, type CallDisposition, callSessionsKey,
} from '@/types/call-session';
import { type Lead, leadsKey } from '@/types/lead';
import {
  type Enquiry, type EnquiryFollowUp, enquiriesKey,
} from '@/types/enquiry';
import { type WaTemplate, waTemplatesKey } from '@/types/wa-template';
import { generateDocNo } from '@/lib/finecore-engine';

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

function saveList<T>(key: string, list: T[]): void {
  // [JWT] POST /api/{key}
  localStorage.setItem(key, JSON.stringify(list));
}

const DISPOSITION_LABELS: Record<CallDisposition, string> = {
  interested: 'Interested',
  not_interested: 'Not Interested',
  callback: 'Callback Scheduled',
  no_answer: 'No Answer',
  wrong_number: 'Wrong Number',
  dnd: 'Do Not Disturb',
  converted: 'Converted to Enquiry',
};

export default function MobileActiveCallPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const session = useMemo(() => readSession(), []);

  const leadId = searchParams.get('leadId');
  const phoneFromUrl = searchParams.get('phone') ?? '';
  const contactNameFromUrl = searchParams.get('contactName') ?? '';

  const leads = useMemo(() => session ? loadList<Lead>(leadsKey(session.entity_code)) : [], [session]);
  const lead = useMemo(() => leadId ? leads.find(l => l.id === leadId) ?? null : null, [leads, leadId]);
  const waTemplates = useMemo(() =>
    session ? loadList<WaTemplate>(waTemplatesKey(session.entity_code)).filter(t => t.is_active) : [],
    [session],
  );

  const [disposition, setDisposition] = useState<CallDisposition>('interested');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [callStartTime] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  const contactName = lead?.contact_name ?? contactNameFromUrl;
  const phone = lead?.phone ?? phoneFromUrl;

  useEffect(() => {
    if (disposition === 'callback' && !followUpDate) {
      setFollowUpDate(new Date().toISOString().slice(0, 10));
    }
  }, [disposition, followUpDate]);

  const sendWhatsApp = useCallback((tpl: WaTemplate) => {
    if (!phone) { toast.error('No phone number'); return; }
    const body = tpl.body
      .replace(/\{contact\}/g, contactName || 'there')
      .replace(/\{salesman\}/g, session?.display_name ?? '')
      .replace(/\{entity\}/g, session?.entity_code ?? '');
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
    toast.success('Opening WhatsApp');
  }, [phone, contactName, session]);

  const handleSaveDisposition = useCallback(() => {
    if (!session) return;
    if (!phone) { toast.error('No phone number'); return; }

    setBusy(true);
    const now = new Date();
    const duration = Math.floor((Date.now() - callStartTime) / 1000);

    const allCalls = loadList<CallSession>(callSessionsKey(session.entity_code));
    const seq = allCalls.length + 1;
    const fy = now.getFullYear().toString().slice(-2);

    let convertedEnquiryId: string | null = null;
    let convertedEnquiryNo: string | null = null;

    if (disposition === 'converted') {
      const isoDate = now.toISOString().slice(0, 10);
      const isoTime = now.toISOString().slice(11, 16);

      const followUp: EnquiryFollowUp = {
        id: `fu-${Date.now()}`,
        date: isoDate,
        time: isoTime,
        follow_up_type: 'call',
        status: 'new',
        executive_id: session.user_id,
        executive_name: session.display_name,
        follow_up_date: followUpDate || null,
        follow_up_time: followUpTime || null,
        reason: null,
        remarks: notes,
        user_name: session.display_name,
      };

      const enquiry: Enquiry = {
        id: `enq-${Date.now()}`,
        entity_id: session.entity_code,
        enquiry_no: generateDocNo('ENQ', session.entity_code),
        enquiry_date: isoDate,
        enquiry_time: isoTime,
        enquiry_type: 'prospect',
        enquiry_source_id: null,
        enquiry_source_name: lead ? `Telecaller-${lead.platform}` : 'Telecaller-Phone',
        priority: lead?.priority ?? 'medium',
        campaign: lead?.campaign_code ?? null,
        customer_id: null,
        customer_name: lead?.company_name ?? null,
        prospectus_id: null,
        partner_id: null,
        partner_name: null,
        contact_person: contactName || null,
        department: null,
        designation: null,
        email: lead?.email ?? null,
        mobile: phone,
        phone: null,
        dealer_id: null,
        dealer_name: null,
        reference_id: null,
        reference_name: null,
        assigned_executive_id: session.user_id,
        assigned_executive_name: session.display_name,
        items: [],
        status: 'new',
        follow_ups: [followUp],
        quotation_ids: [],
        opportunity_id: null,
        converted_at: now.toISOString(),
        is_active: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      const allEnquiries = loadList<Enquiry>(enquiriesKey(session.entity_code));
      allEnquiries.push(enquiry);
      saveList(enquiriesKey(session.entity_code), allEnquiries);

      convertedEnquiryId = enquiry.id;
      convertedEnquiryNo = enquiry.enquiry_no;

      if (lead) {
        const allLeads = loadList<Lead>(leadsKey(session.entity_code));
        const idx = allLeads.findIndex(l => l.id === lead.id);
        if (idx >= 0) {
          allLeads[idx] = {
            ...allLeads[idx],
            status: 'converted',
            converted_enquiry_id: enquiry.id,
            converted_at: now.toISOString(),
            updated_at: now.toISOString(),
          };
          saveList(leadsKey(session.entity_code), allLeads);
        }
      }

      toast.success(`Enquiry ${convertedEnquiryNo} created`);
    }

    const callSession: CallSession = {
      id: `cs-${Date.now()}`,
      entity_id: session.entity_code,
      session_no: `CALL/${fy}-${(Number(fy) + 1).toString().padStart(2, '0')}/${String(seq).padStart(4, '0')}`,
      call_date: now.toISOString().slice(0, 10),
      telecaller_id: session.user_id ?? '',
      telecaller_name: session.display_name,
      enquiry_id: convertedEnquiryId,
      enquiry_no: convertedEnquiryNo,
      contact_name: contactName || null,
      phone_number: phone,
      call_type: lead ? 'outbound' : 'inbound',
      disposition,
      duration_seconds: duration,
      notes,
      follow_up_date: followUpDate || null,
      follow_up_time: followUpTime || null,
      recording_url: null,
      recording_duration_secs: null,
      recording_consent: false,
      dialer_session_id: null,
      dialer_position: null,
      wa_template_sent: null,
      is_active: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    allCalls.push(callSession);
    saveList(callSessionsKey(session.entity_code), allCalls);

    if (lead && disposition !== 'converted') {
      const newStatus =
        disposition === 'not_interested' ? 'lost' :
        disposition === 'wrong_number'  ? 'duplicate' :
        disposition === 'dnd'           ? 'lost' :
                                          'contacted';
      const allLeads = loadList<Lead>(leadsKey(session.entity_code));
      const idx = allLeads.findIndex(l => l.id === lead.id);
      if (idx >= 0) {
        allLeads[idx] = {
          ...allLeads[idx],
          status: newStatus,
          updated_at: now.toISOString(),
        };
        saveList(leadsKey(session.entity_code), allLeads);
      }
    }

    setBusy(false);
    toast.success('Call logged');
    navigate('/mobile/telecaller/queue');
  }, [
    session, phone, contactName, lead, disposition, notes,
    followUpDate, followUpTime, callStartTime, navigate,
  ]);

  if (!session) return null;
  if (!phone && !lead) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/telecaller')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Card className="p-6 text-center mt-4">
          <p className="text-sm">No call target. Open from Call Queue or Lead Inbox.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-20">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/telecaller/queue')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Active Call</h1>
      </div>

      <Card className="p-4 space-y-2 bg-blue-500/5 border-blue-500/20">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Calling</p>
        <p className="text-lg font-semibold">{contactName || 'Contact'}</p>
        <p className="text-sm font-mono text-muted-foreground">{phone}</p>
        <Button asChild className="w-full" size="sm">
          <a href={`tel:${phone}`}>
            <Phone className="h-4 w-4 mr-2" /> Tap to Dial
          </a>
        </Button>
      </Card>

      {waTemplates.length > 0 && (
        <Card className="p-3 space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Quick WhatsApp Send
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {waTemplates.slice(0, 5).map(t => (
              <Button
                key={t.id}
                size="sm"
                variant="outline"
                className="text-[11px] h-7"
                onClick={() => sendWhatsApp(t)}
              >
                {t.template_name}
              </Button>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Disposition</Label>
          <Select value={disposition} onValueChange={v => setDisposition(v as CallDisposition)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(DISPOSITION_LABELS) as CallDisposition[]).map(d => (
                <SelectItem key={d} value={d}>{DISPOSITION_LABELS[d]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did the customer say?" />
        </div>

        {disposition === 'callback' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Callback Date</Label>
              <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Time</Label>
              <Input type="time" value={followUpTime} onChange={e => setFollowUpTime(e.target.value)} />
            </div>
          </div>
        )}
      </Card>

      {(disposition === 'interested' || disposition === 'converted') && (
        <Card className="p-3 bg-green-500/5 border-green-500/20">
          <div className="flex items-start gap-2">
            <ArrowRightCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold">Convert to Enquiry</p>
              <p className="text-[11px] text-muted-foreground">
                Set disposition to <strong>Converted to Enquiry</strong> and save — this creates a new
                Enquiry assigned to you{lead ? ' and links the Lead.' : '.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Button
        className="w-full"
        disabled={busy}
        onClick={handleSaveDisposition}
      >
        {busy
          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          : <Save className="h-4 w-4 mr-2" />
        }
        {disposition === 'converted' ? 'Save & Create Enquiry' : 'Save Disposition'}
      </Button>
    </div>
  );
}
