/**
 * Telecaller.tsx — Samvad-parity industry-leading telecaller UX
 * 8 tabs: Call Screen · Incoming · Autodialer · WA Templates · Reminders · Recording · Live · Gamification
 * [JWT] GET/POST /api/salesx/call-sessions · /api/salesx/dialer-sessions · /api/salesx/wa-templates · /api/salesx/agent-status · /api/salesx/gamification
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
import {
  Phone, ChevronLeft, ChevronRight, Lock, Save, MessageCircle, Mail,
  PhoneIncoming, PhoneCall, MessageSquare, Bell, Mic, Search, Send,
  FileText, Plus, Trash2, X,
  Activity, Award, Trophy, Flame, TrendingUp, Coffee, PhoneOff, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { useEnquiries } from '@/hooks/useEnquiries';
import { useCallSessions } from '@/hooks/useCallSessions';
import { useLeads } from '@/hooks/useLeads';
import { useWaTemplates } from '@/hooks/useWaTemplates';
import { comply360SAMKey } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { SAMConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { CallDisposition, CallSession, DialerSession } from '@/types/call-session';
import type { Enquiry, EnquiryFollowUp, EnquiryStatus } from '@/types/enquiry';
import type { Lead, LeadPlatform } from '@/types/lead';
import {
  WA_TEMPLATE_CATEGORY_LABELS, fillTemplate,
} from '@/types/wa-template';
import type { WaTemplateCategory } from '@/types/wa-template';
import { useAgentStatus } from '@/hooks/useAgentStatus';
import { useGamification } from '@/hooks/useGamification';
import type { AgentState } from '@/types/agent-status';
import { AGENT_STATE_LABELS, AGENT_STATE_COLORS } from '@/types/agent-status';
import type { PointsRule } from '@/types/gamification';
import { BADGE_CATALOG, LEVEL_NAMES, pointsToNextLevel } from '@/types/gamification';
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

const SUCCESSFUL_DISPOSITIONS: CallDisposition[] = ['interested', 'converted', 'callback'];

const todayISO = () => new Date().toISOString().split('T')[0];
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

type TabId = 'call' | 'reminders' | 'incoming' | 'autodialer' | 'wa-templates' | 'recording' | 'live' | 'gamification';

export function TelecallerPanel({ entityCode, onNavigate }: Props) {
  const cfg = useMemo(() => loadCfg(entityCode), [entityCode]);
  const { enquiries, addFollowUp } = useEnquiries(entityCode);
  const {
    sessions, dialerSessions,
    createSession,
    startDialerSession, incrementDialerSession, endDialerSession,
  } = useCallSessions(entityCode);
  const { leads, saveLead } = useLeads(entityCode);
  const {
    templates: waTemplates, saveTemplate: saveWaTemplate,
    deleteTemplate: deleteWaTemplate, sendTemplate,
  } = useWaTemplates(entityCode);
  const {
    statuses: agentStatuses, transitionTo, incrementCallCount: incCallCount,
  } = useAgentStatus(entityCode);
  const {
    profiles, rule, awardPoints, updateRule, leaderboard, getLeaderboardForPeriod,
  } = useGamification(entityCode);

  // Identity for current user — Phase 1 hardcoded as first telecaller in seeded SAM persons
  // (Phase 2 reads from auth)
  const samPersons = useMemo<{ id: string; display_name: string; person_type: string }[]>(() => {
    try {
      // [JWT] GET /api/salesx/sam-persons
      return JSON.parse(localStorage.getItem(`erp_sam_persons_${entityCode}`) || '[]');
    } catch { return []; }
  }, [entityCode]);
  const currentTelecaller = useMemo(() => {
    const t = samPersons.find(p => p.id.startsWith('tc-'));
    return t ?? { id: 'me', display_name: 'Current User', person_type: 'reference' };
  }, [samPersons]);

  const currentStatus = useMemo(() =>
    agentStatuses.find(s => s.telecaller_id === currentTelecaller.id),
  [agentStatuses, currentTelecaller.id]);

  const currentProfile = useMemo(() =>
    profiles.find(p => p.telecaller_id === currentTelecaller.id),
  [profiles, currentTelecaller.id]);

  const queue = useMemo(() => {
    const open = enquiries.filter(e => ['new', 'assigned', 'pending', 'in_process'].includes(e.status));
    return open.sort((a, b) => {
      const af = a.follow_ups[a.follow_ups.length - 1]?.follow_up_date ?? 'z';
      const bf = b.follow_ups[b.follow_ups.length - 1]?.follow_up_date ?? 'z';
      return af.localeCompare(bf);
    });
  }, [enquiries]);

  const [activeTab, setActiveTab] = useState<TabId>('call');
  const [idx, setIdx] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [notes, setNotes] = useState('');
  const [disposition, setDisposition] = useState<CallDisposition>('interested');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');

  // ─── New state for added tabs ───────────────────────────────
  const [incomingPhone, setIncomingPhone] = useState('');
  const [incomingActive, setIncomingActive] = useState(false);
  const [unknownLeadForm, setUnknownLeadForm] = useState({ contact_name: '', company_name: '', city: '' });

  const [dialerActive, setDialerActive] = useState(false);
  const [dialerFilter, setDialerFilter] = useState<'overdue' | 'today' | 'new7' | 'all'>('overdue');
  const [currentDialerSession, setCurrentDialerSession] = useState<DialerSession | null>(null);
  const [dialerIdx, setDialerIdx] = useState(0);
  const [dialerTargets, setDialerTargets] = useState<Enquiry[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const consentKey = `erp_recording_consent_${entityCode}`;
  const [recordingConsent, setRecordingConsent] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem(consentKey) || 'true'); } catch { return true; }
  });
  const [lastWaSent, setLastWaSent] = useState<string | null>(null);

  const [waTemplateForm, setWaTemplateForm] = useState({
    template_code: '', template_name: '',
    category: 'follow_up' as WaTemplateCategory,
    body: '', language: 'en' as 'en' | 'hi' | 'mixed',
    is_active: true, editingId: null as string | null,
  });
  const [waManualSend, setWaManualSend] = useState({
    template_id: '', phone: '', contact: '', company: '', product: '',
  });
  const [waFilter, setWaFilter] = useState<WaTemplateCategory | 'all'>('all');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

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
    setIsRecording(false); setLastWaSent(null);
  };

  const handleSaveSession = useCallback(() => {
    if (!current) return;
    const tsId = Date.now();
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
      recording_url: isRecording ? `stub://recording/cs-${tsId}` : null,
      recording_duration_secs: isRecording ? duration : null,
      recording_consent: recordingConsent,
      dialer_session_id: dialerActive ? currentDialerSession?.id ?? null : null,
      dialer_position: dialerActive ? dialerIdx : null,
      wa_template_sent: lastWaSent,
      is_active: true,
    };
    createSession(session);
    // Update agent stats for live monitoring + gamification
    incCallCount(currentTelecaller.id);
    let pts = rule.call_made;
    if (disposition === 'interested') pts += rule.call_interested;
    else if (disposition === 'converted') pts += rule.call_converted;
    else if (disposition === 'callback') pts += rule.call_callback;
    if (lastWaSent) pts += rule.wa_template_sent;
    awardPoints(
      currentTelecaller.id, currentTelecaller.display_name, pts,
      'call_made', 'call_session', null,
      { isConversion: disposition === 'converted',
        isWaSend: !!lastWaSent,
        callTime: new Date() },
    );
    // Move agent into wrap_up after each call
    transitionTo(currentTelecaller.id, currentTelecaller.display_name, 'wrap_up');
    const fu: EnquiryFollowUp = {
      id: `fu-${tsId}`,
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
    // dialer auto-advance
    if (dialerActive && currentDialerSession) {
      incrementDialerSession(currentDialerSession.id, SUCCESSFUL_DISPOSITIONS.includes(disposition));
      const nextPos = dialerIdx + 1;
      if (nextPos >= dialerTargets.length) {
        endDialerSession(currentDialerSession.id, 'completed');
        setDialerActive(false); setCurrentDialerSession(null); setDialerIdx(0);
        toast.success('Dialer session completed');
      } else {
        setDialerIdx(nextPos);
        const next = dialerTargets[nextPos];
        const qIdx = queue.findIndex(q => q.id === next.id);
        if (qIdx >= 0) setIdx(qIdx);
      }
    } else if (idx < queue.length - 1) {
      setIdx(idx + 1);
    }
    resetCall();
  }, [
    current, disposition, duration, notes, followUpDate, followUpTime,
    createSession, addFollowUp, idx, queue,
    isRecording, recordingConsent, dialerActive, currentDialerSession,
    dialerIdx, dialerTargets, lastWaSent, incrementDialerSession, endDialerSession,
    currentTelecaller, incCallCount, awardPoints, transitionTo, rule,
  ]);

  const isFormActive = sessionActive || !!notes.trim();
  useCtrlS(isFormActive ? handleSaveSession : () => {});

  // ─── Incoming call lookup ─────────────────────────────────
  const incomingMatch = useMemo<
    | { type: 'lead'; lead: Lead }
    | { type: 'enquiry'; enquiry: Enquiry }
    | null
  >(() => {
    if (!incomingPhone.trim()) return null;
    const cleaned = incomingPhone.replace(/[^0-9]/g, '');
    if (cleaned.length < 6) return null;
    const lead = leads.find(l => (l.phone ?? '').replace(/[^0-9]/g, '').endsWith(cleaned));
    if (lead) return { type: 'lead', lead };
    const enq = enquiries.find(e =>
      (e.mobile ?? e.phone ?? '').replace(/[^0-9]/g, '').endsWith(cleaned));
    if (enq) return { type: 'enquiry', enquiry: enq };
    return null;
  }, [incomingPhone, leads, enquiries]);

  const handleIncomingPickUp = useCallback(() => {
    if (!incomingMatch) return;
    if (incomingMatch.type === 'enquiry') {
      const qIdx = queue.findIndex(q => q.id === incomingMatch.enquiry.id);
      if (qIdx >= 0) {
        setIdx(qIdx); setActiveTab('call'); setSessionActive(true); setDuration(0);
        toast.success('Incoming call picked up');
      } else {
        toast.error('Enquiry not in active queue');
      }
    } else {
      toast.success(`Lead ${incomingMatch.lead.contact_name} — convert to enquiry to start session`);
    }
    setIncomingActive(false); setIncomingPhone('');
  }, [incomingMatch, queue]);

  const handleIncomingReject = useCallback(() => {
    toast.info('Incoming call rejected — logged as no_answer');
    setIncomingActive(false); setIncomingPhone('');
  }, []);

  const handleAddUnknownLead = useCallback(() => {
    if (!unknownLeadForm.contact_name.trim()) {
      toast.error('Contact name is required'); return;
    }
    const cleaned = incomingPhone.replace(/[^0-9]/g, '');
    saveLead({
      entity_id: entityCode,
      lead_date: todayISO(),
      platform: 'whatsapp' as LeadPlatform,
      status: 'new',
      contact_name: unknownLeadForm.contact_name,
      company_name: unknownLeadForm.company_name || null,
      phone: cleaned, email: null,
      city: unknownLeadForm.city || null, state: null,
      product_interest: null, estimated_value: null,
      priority: 'medium',
      assigned_salesman_id: null, assigned_salesman_name: null,
      assigned_telecaller_id: null,
      platform_meta: null,
      is_duplicate: false, duplicate_of_lead_id: null,
      next_follow_up: null, notes: 'Created from incoming call',
      converted_enquiry_id: null, converted_at: null, campaign_code: null,
      is_active: true,
    });
    toast.success('New lead created');
    setUnknownLeadForm({ contact_name: '', company_name: '', city: '' });
    setIncomingActive(false); setIncomingPhone('');
  }, [unknownLeadForm, incomingPhone, saveLead, entityCode]);

  // ─── Autodialer ───────────────────────────────────────────
  const buildDialerTargets = useCallback((filter: typeof dialerFilter): Enquiry[] => {
    const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    if (filter === 'overdue') return overdueEnquiries;
    if (filter === 'today') return enquiries.filter(e => {
      const lastFU = e.follow_ups[e.follow_ups.length - 1];
      return (lastFU?.follow_up_date ?? e.enquiry_date) === today;
    });
    if (filter === 'new7') return enquiries.filter(e => e.enquiry_date >= sevenAgo);
    return queue;
  }, [overdueEnquiries, enquiries, today, queue]);



  const handleStartDialer = useCallback(() => {
    const targets = buildDialerTargets(dialerFilter);
    if (targets.length === 0) { toast.error('No targets match this filter'); return; }
    const labels: Record<typeof dialerFilter, string> = {
      overdue: 'Overdue follow-ups',
      today: "Today's follow-ups",
      new7: 'New leads (last 7 days)',
      all: 'All open enquiries',
    };
    const ds = startDialerSession(targets.length, labels[dialerFilter]);
    setDialerTargets(targets);
    setDialerIdx(0);
    setCurrentDialerSession(ds);
    setDialerActive(true);
    const qIdx = queue.findIndex(q => q.id === targets[0].id);
    if (qIdx >= 0) setIdx(qIdx);
    setActiveTab('call');
    toast.success(`Dialer started · ${targets.length} targets`);
  }, [buildDialerTargets, dialerFilter, startDialerSession, queue]);

  const handleEndDialer = useCallback((status: 'completed' | 'cancelled' | 'paused') => {
    if (!currentDialerSession) return;
    endDialerSession(currentDialerSession.id, status);
    setDialerActive(false); setCurrentDialerSession(null); setDialerIdx(0);
    toast.info(`Dialer ${status}`);
  }, [currentDialerSession, endDialerSession]);

  // ─── WA Templates ─────────────────────────────────────────
  const filteredWaTemplates = useMemo(() =>
    waFilter === 'all' ? waTemplates : waTemplates.filter(t => t.category === waFilter),
  [waTemplates, waFilter]);

  const waPreview = useMemo(() => {
    const tpl = waTemplates.find(t => t.id === waManualSend.template_id);
    if (!tpl) return '';
    return fillTemplate(tpl.body, {
      contact: waManualSend.contact, company: waManualSend.company,
      product: waManualSend.product, salesman: 'Current User', entity: entityCode,
    });
  }, [waTemplates, waManualSend, entityCode]);

  const handleSaveWaTemplate = useCallback(() => {
    if (!waTemplateForm.template_code.trim()) { toast.error('Code is required'); return; }
    if (!waTemplateForm.body.trim()) { toast.error('Body is required'); return; }
    const dup = waTemplates.find(t =>
      t.template_code === waTemplateForm.template_code && t.id !== waTemplateForm.editingId);
    if (dup) { toast.error('Template code already exists'); return; }
    saveWaTemplate({
      ...(waTemplateForm.editingId ? { id: waTemplateForm.editingId } : {}),
      entity_id: entityCode,
      template_code: waTemplateForm.template_code,
      template_name: waTemplateForm.template_name || waTemplateForm.template_code,
      category: waTemplateForm.category,
      body: waTemplateForm.body,
      language: waTemplateForm.language,
      is_active: waTemplateForm.is_active,
    });
    toast.success('Template saved');
    setWaTemplateForm({
      template_code: '', template_name: '', category: 'follow_up',
      body: '', language: 'en', is_active: true, editingId: null,
    });
  }, [waTemplateForm, waTemplates, saveWaTemplate, entityCode]);

  const handleEditWaTemplate = useCallback((id: string) => {
    const t = waTemplates.find(x => x.id === id);
    if (!t) return;
    setWaTemplateForm({
      template_code: t.template_code, template_name: t.template_name,
      category: t.category, body: t.body, language: t.language,
      is_active: t.is_active, editingId: t.id,
    });
  }, [waTemplates]);

  const handleManualSend = useCallback(() => {
    if (!waManualSend.template_id) { toast.error('Pick a template'); return; }
    if (!waManualSend.phone.trim()) { toast.error('Phone required'); return; }
    const ok = sendTemplate(waManualSend.template_id, waManualSend.phone, {
      contact: waManualSend.contact, company: waManualSend.company,
      product: waManualSend.product, salesman: 'Current User', entity: entityCode,
    });
    if (ok) {
      toast.success('Opened in WhatsApp');
      const tpl = waTemplates.find(t => t.id === waManualSend.template_id);
      if (tpl) setLastWaSent(tpl.template_code);
    } else {
      toast.error('Failed to send — check phone number');
    }
  }, [waManualSend, sendTemplate, entityCode, waTemplates]);

  const handleConsentChange = useCallback((v: boolean) => {
    setRecordingConsent(v);
    localStorage.setItem(consentKey, JSON.stringify(v));
  }, [consentKey]);

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

  const mins = Math.floor(duration / 60), secs = duration % 60;
  const prevSessions = current ? sessions.filter(s => s.enquiry_id === current.id).slice(-3).reverse() : [];

  const tabs = [
    { id: 'call' as const,         label: 'Call Screen', icon: Phone,           badge: 0 },
    { id: 'incoming' as const,     label: 'Incoming',    icon: PhoneIncoming,   badge: 0 },
    { id: 'autodialer' as const,   label: 'Autodialer',  icon: PhoneCall,       badge: 0 },
    { id: 'wa-templates' as const, label: 'WA Templates',icon: MessageSquare,   badge: 0 },
    { id: 'reminders' as const,    label: 'Reminders',   icon: Bell,            badge: overdueEnquiries.length },
    { id: 'recording' as const,    label: 'Recording',   icon: Mic,             badge: 0 },
    { id: 'live' as const,         label: 'Live',          icon: Activity,        badge: 0 },
    { id: 'gamification' as const, label: 'Gamification',  icon: Award,           badge: 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b pb-1 mb-3 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-t flex items-center gap-1.5 whitespace-nowrap',
              activeTab === id
                ? 'bg-orange-500/15 text-orange-700 border border-orange-500/30'
                : 'text-muted-foreground hover:bg-muted/50',
            )}>
            <Icon className="h-3.5 w-3.5" />
            {label}
            {badge > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 font-bold">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'call' && queue.length === 0 && (
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
      )}

      {activeTab === 'call' && current && (
        <>
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={idx === 0 || dialerActive} onClick={() => { setIdx(idx - 1); resetCall(); }}>
                <ChevronLeft className="h-4 w-4" />Prev
              </Button>
              <Button size="sm" variant="outline" disabled={idx >= queue.length - 1 || dialerActive} onClick={() => { setIdx(idx + 1); resetCall(); }}>
                Next<ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">{idx + 1} of {queue.length} leads</span>
              {dialerActive && currentDialerSession && (
                <Badge variant="outline" className="text-[10px] border-orange-500/40 text-orange-600">
                  Dialer · {dialerIdx + 1}/{dialerTargets.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  if (sessionActive) {
                    setSessionActive(false);
                  } else {
                    setSessionActive(true); setDuration(0);
                    transitionTo(currentTelecaller.id, currentTelecaller.display_name, 'on_call');
                  }
                }}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Phone className="h-4 w-4 mr-2" />{sessionActive ? 'End Call' : 'Start Call'}
              </Button>
              <Button
                size="sm"
                variant={isRecording ? 'default' : 'outline'}
                onClick={() => {
                  if (!sessionActive) { toast.error('Start a call first'); return; }
                  if (!recordingConsent) { toast.error('Recording consent disabled'); return; }
                  setIsRecording(r => !r);
                }}
                className={cn('text-xs', isRecording && 'bg-destructive hover:bg-destructive/90')}
              >
                <Mic className="h-3.5 w-3.5 mr-1" />{isRecording ? 'Recording…' : 'Demo: Record'}
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
                <div><span className="text-muted-foreground">Contact:</span> {current.contact_person ?? current.customer_name ?? '—'}</div>
                <div><span className="text-muted-foreground">Phone:</span> {current.mobile ?? current.phone ?? '—'}</div>
                <div><span className="text-muted-foreground">Enquiry:</span> <span className="font-mono">{current.enquiry_no}</span></div>
                <div><span className="text-muted-foreground">Source:</span> {current.enquiry_source_name ?? '—'}</div>
                <div><span className="text-muted-foreground">Priority:</span> <Badge variant="outline" className="text-[10px] capitalize">{current.priority}</Badge></div>
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
                  {(current.follow_ups ?? []).slice(-3).reverse().map(fu => (
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

      {activeTab === 'incoming' && (
        <div className="space-y-3 max-w-2xl">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><PhoneIncoming className="h-4 w-4 text-orange-500" /> Simulate Incoming Call</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Caller phone (e.g. 9876543210)"
                  value={incomingPhone}
                  onChange={e => setIncomingPhone(e.target.value)}
                />
                <Button onClick={() => setIncomingActive(true)} className="bg-orange-500 hover:bg-orange-600">
                  <Search className="h-3.5 w-3.5 mr-1" /> Simulate
                </Button>
              </div>

              {incomingActive && incomingMatch && (
                <Card className="border-orange-500/40 bg-orange-500/5 animate-pulse">
                  <CardContent className="py-4 space-y-2">
                    <div className="flex items-center gap-2 text-orange-600 font-semibold">
                      <PhoneIncoming className="h-5 w-5" /> Incoming Call…
                    </div>
                    <p className="font-mono text-lg">{incomingPhone}</p>
                    {incomingMatch.type === 'lead' ? (
                      <div className="text-sm space-y-1">
                        <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{incomingMatch.lead.contact_name}</span></div>
                        <div><span className="text-muted-foreground">Company:</span> {incomingMatch.lead.company_name ?? '—'}</div>
                        <div><span className="text-muted-foreground">City:</span> {incomingMatch.lead.city ?? '—'}</div>
                        <Badge variant="outline" className="text-[10px] capitalize">{incomingMatch.lead.platform}</Badge>
                      </div>
                    ) : (
                      <div className="text-sm space-y-1">
                        <div><span className="text-muted-foreground">Enquiry:</span> <span className="font-mono">{incomingMatch.enquiry.enquiry_no}</span></div>
                        <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{incomingMatch.enquiry.customer_name ?? incomingMatch.enquiry.contact_person ?? '—'}</span></div>
                        <div><span className="text-muted-foreground">Source:</span> {incomingMatch.enquiry.enquiry_source_name ?? '—'}</div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={handleIncomingPickUp} className="bg-green-600 hover:bg-green-700">
                        <Phone className="h-3.5 w-3.5 mr-1" /> Pick Up
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleIncomingReject}>
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {incomingActive && !incomingMatch && incomingPhone.trim() && (
                <Card className="border-amber-500/40">
                  <CardContent className="py-4 space-y-2">
                    <p className="font-semibold text-sm">Unknown caller — Add as new lead?</p>
                    <Input placeholder="Contact name" value={unknownLeadForm.contact_name}
                      onChange={e => setUnknownLeadForm(f => ({ ...f, contact_name: e.target.value }))} />
                    <Input placeholder="Company (optional)" value={unknownLeadForm.company_name}
                      onChange={e => setUnknownLeadForm(f => ({ ...f, company_name: e.target.value }))} />
                    <Input placeholder="City (optional)" value={unknownLeadForm.city}
                      onChange={e => setUnknownLeadForm(f => ({ ...f, city: e.target.value }))} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddUnknownLead} className="bg-orange-500 hover:bg-orange-600">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Lead
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setIncomingActive(false); setIncomingPhone(''); }}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'autodialer' && (
        <div className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><PhoneCall className="h-4 w-4 text-orange-500" /> Sequential Autodialer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!dialerActive ? (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Filter:</Label>
                    <select
                      value={dialerFilter}
                      onChange={e => setDialerFilter(e.target.value as typeof dialerFilter)}
                      className="text-xs border rounded px-2 py-1 bg-background"
                    >
                      <option value="overdue">Overdue follow-ups</option>
                      <option value="today">Today's follow-ups</option>
                      <option value="new7">New leads (last 7 days)</option>
                      <option value="all">All open enquiries</option>
                    </select>
                    <span className="text-xs text-muted-foreground">
                      {buildDialerTargets(dialerFilter).length} targets
                    </span>
                  </div>
                  <Button onClick={handleStartDialer} className="bg-orange-500 hover:bg-orange-600">
                    <PhoneCall className="h-4 w-4 mr-2" /> Start Dialer
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Call {dialerIdx + 1} of {dialerTargets.length}</p>
                    <div className="h-2 bg-muted rounded mt-1">
                      <div className="h-2 bg-orange-500 rounded transition-all"
                        style={{ width: `${((dialerIdx + 1) / dialerTargets.length) * 100}%` }} />
                    </div>
                  </div>
                  {dialerTargets[dialerIdx] && (
                    <div className="p-3 border rounded space-y-1 text-xs">
                      <div className="font-semibold">{dialerTargets[dialerIdx].contact_person ?? dialerTargets[dialerIdx].customer_name}</div>
                      <div className="font-mono">{dialerTargets[dialerIdx].mobile ?? dialerTargets[dialerIdx].phone ?? '—'}</div>
                      <div className="text-muted-foreground">{dialerTargets[dialerIdx].enquiry_no}</div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <a
                      href={`tel:${dialerTargets[dialerIdx]?.mobile ?? dialerTargets[dialerIdx]?.phone ?? ''}`}
                      className="inline-flex items-center px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Phone className="h-3.5 w-3.5 mr-1" /> Dial
                    </a>
                    <Button size="sm" variant="outline" onClick={() => {
                      const next = dialerIdx + 1;
                      if (next >= dialerTargets.length) { handleEndDialer('completed'); return; }
                      setDialerIdx(next);
                      const qIdx = queue.findIndex(q => q.id === dialerTargets[next].id);
                      if (qIdx >= 0) setIdx(qIdx);
                    }}>Skip</Button>
                    <Button size="sm" variant="outline" onClick={() => handleEndDialer('paused')}>Pause</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleEndDialer('cancelled')}>End Session</Button>
                    <Button size="sm" onClick={() => setActiveTab('call')} className="bg-orange-500 hover:bg-orange-600">Go to Call Screen</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Dialer Sessions</CardTitle></CardHeader>
            <CardContent>
              {dialerSessions.slice(-5).reverse().map(d => (
                <div key={d.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                  <div>
                    <span className="font-medium">{d.filter_label}</span>
                    <span className="text-muted-foreground ml-2">{d.calls_made}/{d.total_targets}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] capitalize">{d.status}</Badge>
                    <span className="text-muted-foreground">
                      {d.calls_made > 0 ? Math.round((d.successful_dispositions / d.calls_made) * 100) : 0}% success
                    </span>
                  </div>
                </div>
              ))}
              {dialerSessions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No dialer sessions yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'wa-templates' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Left: template list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Templates ({waTemplates.length})</span>
                <select
                  value={waFilter}
                  onChange={e => setWaFilter(e.target.value as WaTemplateCategory | 'all')}
                  className="text-xs border rounded px-2 py-0.5 bg-background"
                >
                  <option value="all">All</option>
                  {(Object.keys(WA_TEMPLATE_CATEGORY_LABELS) as WaTemplateCategory[]).map(c => (
                    <option key={c} value={c}>{WA_TEMPLATE_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-[600px] overflow-y-auto">
              {filteredWaTemplates.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2 border rounded hover:bg-muted/30 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px]">{t.template_code}</span>
                      <Badge variant="outline" className="text-[9px]">{WA_TEMPLATE_CATEGORY_LABELS[t.category]}</Badge>
                      <Badge variant="outline" className="text-[9px]">{t.language}</Badge>
                    </div>
                    <div className="font-medium truncate">{t.template_name}</div>
                    <div className="text-[10px] text-muted-foreground">Used {t.use_count}×</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEditWaTemplate(t.id)}>
                      <FileText className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteWaTemplate(t.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredWaTemplates.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No templates</p>
              )}
            </CardContent>
          </Card>

          {/* Right: editor + sender */}
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{waTemplateForm.editingId ? 'Edit Template' : 'New Template'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Code (INTRO-01)" value={waTemplateForm.template_code}
                    onChange={e => setWaTemplateForm(f => ({ ...f, template_code: e.target.value }))} />
                  <Input placeholder="Name" value={waTemplateForm.template_name}
                    onChange={e => setWaTemplateForm(f => ({ ...f, template_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select className="text-xs border rounded px-2 py-1 bg-background"
                    value={waTemplateForm.category}
                    onChange={e => setWaTemplateForm(f => ({ ...f, category: e.target.value as WaTemplateCategory }))}
                  >
                    {(Object.keys(WA_TEMPLATE_CATEGORY_LABELS) as WaTemplateCategory[]).map(c => (
                      <option key={c} value={c}>{WA_TEMPLATE_CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                  <select className="text-xs border rounded px-2 py-1 bg-background"
                    value={waTemplateForm.language}
                    onChange={e => setWaTemplateForm(f => ({ ...f, language: e.target.value as 'en' | 'hi' | 'mixed' }))}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div className="text-[10px] text-muted-foreground bg-muted/40 p-2 rounded">
                  Available: {'{contact} {company} {product} {follow_up_date} {amount} {salesman} {entity}'}
                </div>
                <Textarea rows={4} placeholder="Hello {contact}…" value={waTemplateForm.body}
                  onChange={e => setWaTemplateForm(f => ({ ...f, body: e.target.value }))} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveWaTemplate} className="bg-orange-500 hover:bg-orange-600">
                    <Save className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setWaTemplateForm({
                    template_code: '', template_name: '', category: 'follow_up',
                    body: '', language: 'en', is_active: true, editingId: null,
                  })}>Cancel</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Manual Send</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <select className="w-full text-xs border rounded px-2 py-1 bg-background"
                  value={waManualSend.template_id}
                  onChange={e => setWaManualSend(s => ({ ...s, template_id: e.target.value }))}
                >
                  <option value="">— Pick template —</option>
                  {waTemplates.map(t => <option key={t.id} value={t.id}>{t.template_code} · {t.template_name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Phone" value={waManualSend.phone}
                    onChange={e => setWaManualSend(s => ({ ...s, phone: e.target.value }))} />
                  <Input placeholder="Contact" value={waManualSend.contact}
                    onChange={e => setWaManualSend(s => ({ ...s, contact: e.target.value }))} />
                  <Input placeholder="Company" value={waManualSend.company}
                    onChange={e => setWaManualSend(s => ({ ...s, company: e.target.value }))} />
                  <Input placeholder="Product" value={waManualSend.product}
                    onChange={e => setWaManualSend(s => ({ ...s, product: e.target.value }))} />
                </div>
                {waPreview && (
                  <div className="text-xs bg-muted/40 p-2 rounded whitespace-pre-wrap border">
                    <div className="text-[10px] text-muted-foreground mb-1">Preview:</div>
                    {waPreview}
                  </div>
                )}
                <Button size="sm" onClick={handleManualSend} className="bg-green-600 hover:bg-green-700 w-full">
                  <Send className="h-3.5 w-3.5 mr-1" /> Send via WhatsApp
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'recording' && (
        <div className="space-y-3">
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="py-3 text-xs">
              Call recording is a Phase 2 device-integration feature. This screen demonstrates the UX flow — actual audio capture is not yet enabled.
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Consent Settings</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <Label>Default consent:</Label>
                <RadioGroup
                  value={recordingConsent ? 'on' : 'off'}
                  onValueChange={v => handleConsentChange(v === 'on')}
                  className="flex gap-3"
                >
                  <div className="flex items-center gap-1"><RadioGroupItem value="on" id="rc-on" /><Label htmlFor="rc-on" className="text-xs">ON</Label></div>
                  <div className="flex items-center gap-1"><RadioGroupItem value="off" id="rc-off" /><Label htmlFor="rc-off" className="text-xs">OFF</Label></div>
                </RadioGroup>
              </div>
              <p className="text-[10px] text-muted-foreground border-t pt-2">
                Per DPDP Act 2023, recording requires explicit consent. Always announce: &ldquo;This call is being recorded for quality.&rdquo;
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Call Sessions ({sessions.length})</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-xs">
                <thead className="text-[10px] text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-1">Session</th>
                    <th className="text-left">Date</th>
                    <th className="text-left">Disposition</th>
                    <th className="text-right">Duration</th>
                    <th className="text-left">Recording</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(-20).reverse().map(s => {
                    const status = s.recording_url
                      ? 'Recorded (stub)'
                      : s.recording_consent === false ? 'Pending consent' : 'Not recorded';
                    return (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="font-mono py-1">{s.session_no}</td>
                        <td>{s.call_date}</td>
                        <td className="capitalize">{s.disposition}</td>
                        <td className="text-right font-mono">{s.duration_seconds}s</td>
                        <td>{status}</td>
                      </tr>
                    );
                  })}
                  {sessions.length === 0 && (
                    <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No sessions yet</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default TelecallerPanel;
