/**
 * MobileTelecallerQuickEnquiryPage.tsx — Manual quick enquiry capture by telecaller
 * Sprint T-Phase-1.1.1l-b · Reuses Enquiry + enquiriesKey
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  type Enquiry, type EnquiryType, type EnquiryPriority, type EnquiryFollowUp,
  enquiriesKey,
} from '@/types/enquiry';
import { generateDocNo } from '@/lib/finecore-engine';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

function loadEnquiries(entityCode: string): Enquiry[] {
  try {
    const raw = localStorage.getItem(enquiriesKey(entityCode));
    return raw ? (JSON.parse(raw) as Enquiry[]) : [];
  } catch { return []; }
}

function saveEnquiries(entityCode: string, list: Enquiry[]): void {
  // [JWT] POST /api/salesx/enquiries
  localStorage.setItem(enquiriesKey(entityCode), JSON.stringify(list));
}

export default function MobileTelecallerQuickEnquiryPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [requirement, setRequirement] = useState('');
  const [enquiryType, setEnquiryType] = useState<EnquiryType>('prospect');
  const [priority, setPriority] = useState<EnquiryPriority>('medium');
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!session) return;
    if (!contactPerson.trim()) { toast.error('Contact person required'); return; }
    if (!mobile.trim() || mobile.length < 10) { toast.error('Valid 10-digit mobile required'); return; }
    if (!requirement.trim()) { toast.error('Requirement required'); return; }

    setBusy(true);
    const now = new Date();
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
      follow_up_date: null,
      follow_up_time: null,
      reason: null,
      remarks: requirement,
      user_name: session.display_name,
    };

    const enquiry: Enquiry = {
      id: `enq-${Date.now()}`,
      entity_id: session.entity_code,
      enquiry_no: generateDocNo('ENQ', session.entity_code),
      enquiry_date: isoDate,
      enquiry_time: isoTime,
      enquiry_type: enquiryType,
      enquiry_source_id: null,
      enquiry_source_name: 'Telecaller-Manual',
      priority,
      campaign: null,
      customer_id: null,
      customer_name: null,
      prospectus_id: null,
      partner_id: null,
      partner_name: null,
      contact_person: contactPerson,
      department: null,
      designation: null,
      email: null,
      mobile,
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
      converted_at: null,
      is_active: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const all = loadEnquiries(session.entity_code);
    all.push(enquiry);
    saveEnquiries(session.entity_code, all);
    setBusy(false);
    toast.success(`Enquiry ${enquiry.enquiry_no} captured`);
    navigate('/mobile/telecaller');
  }, [session, contactPerson, mobile, requirement, enquiryType, priority, navigate]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/telecaller')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Quick Enquiry (Telecaller)</h1>
      </div>

      <Card className="p-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Contact Person <span className="text-red-500">*</span></Label>
          <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Customer name" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Mobile <span className="text-red-500">*</span></Label>
          <Input
            type="tel"
            inputMode="numeric"
            value={mobile}
            onChange={e => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="10-digit mobile"
            maxLength={10}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Requirement <span className="text-red-500">*</span></Label>
          <Textarea rows={3} value={requirement} onChange={e => setRequirement(e.target.value)} placeholder="What does the customer need?" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={enquiryType} onValueChange={v => setEnquiryType(v as EnquiryType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">Existing</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Priority</Label>
            <Select value={priority} onValueChange={v => setPriority(v as EnquiryPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Button className="w-full" disabled={busy} onClick={handleSubmit}>
        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Enquiry
      </Button>
    </div>
  );
}
