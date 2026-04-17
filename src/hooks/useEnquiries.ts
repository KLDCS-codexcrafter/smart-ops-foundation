/**
 * useEnquiries.ts — Enquiry CRUD + follow-up trail
 * [JWT] GET/POST/PUT/PATCH /api/salesx/enquiries
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { Enquiry, EnquiryFollowUp } from '@/types/enquiry';
import { enquiriesKey } from '@/types/enquiry';
import type { Prospectus } from '@/types/prospectus';
import { prospectsKey } from '@/types/prospectus';
import { generateDocNo } from '@/lib/finecore-engine';

function load(entityCode: string): Enquiry[] {
  try {
    // [JWT] GET /api/salesx/enquiries?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(enquiriesKey(entityCode)) || '[]');
  } catch { return []; }
}
function save(entityCode: string, data: Enquiry[]) {
  // [JWT] PUT /api/salesx/enquiries?entityCode={entityCode}
  localStorage.setItem(enquiriesKey(entityCode), JSON.stringify(data));
}
function loadProspects(entityCode: string): Prospectus[] {
  try {
    // [JWT] GET /api/salesx/prospects?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(prospectsKey(entityCode)) || '[]');
  } catch { return []; }
}

export function useEnquiries(entityCode: string) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => load(entityCode));

  const createEnquiry = (
    form: Omit<Enquiry, 'id' | 'enquiry_no' | 'entity_id' | 'created_at' | 'updated_at'>,
  ): Enquiry => {
    const all = load(entityCode);
    const now = new Date().toISOString();
    // [JWT] GET/PATCH /api/procurement/sequences/ENQ/:entityCode
    const enquiry_no = generateDocNo('ENQ', entityCode);
    let prospectus_id = form.prospectus_id;
    if (form.enquiry_type === 'prospect' && !prospectus_id) {
      const prospects = loadProspects(entityCode);
      const pros: Prospectus = {
        id: `pros-${Date.now()}`,
        entity_id: entityCode,
        enquiry_id: 'pending',
        company_name: form.contact_person ?? 'Unknown',
        address: null, country: null, state: null, city: null,
        area: null, pincode: null,
        contact_person: form.contact_person ?? null,
        email: form.email ?? null, mobile: form.mobile ?? null,
        phone: form.phone ?? null, fax: null, website: null,
        prospect_status: 'active',
        last_contacted: form.enquiry_date,
        notes: null,
        created_at: now, updated_at: now,
      };
      prospectus_id = pros.id;
      // [JWT] POST /api/salesx/prospects
      localStorage.setItem(prospectsKey(entityCode), JSON.stringify([...prospects, pros]));
    }
    const enq: Enquiry = {
      ...form,
      id: `enq-${Date.now()}`,
      entity_id: entityCode,
      enquiry_no,
      prospectus_id: prospectus_id ?? null,
      created_at: now, updated_at: now,
    };
    const updated = [...all, enq];
    setEnquiries(updated); save(entityCode, updated);
    // [JWT] POST /api/salesx/enquiries
    toast.success(`Enquiry ${enq.enquiry_no} created`);
    return enq;
  };

  const updateEnquiry = (id: string, patch: Partial<Enquiry>): void => {
    const all = load(entityCode);
    const updated = all.map(e =>
      e.id === id
        ? { ...e, ...patch, updated_at: new Date().toISOString() }
        : e
    );
    setEnquiries(updated); save(entityCode, updated);
    // [JWT] PATCH /api/salesx/enquiries/:id
    toast.success('Saved');
  };

  const addFollowUp = (enquiryId: string, followUp: EnquiryFollowUp): void => {
    const all = load(entityCode);
    const updated = all.map(e => {
      if (e.id !== enquiryId) return e;
      return {
        ...e,
        status: followUp.status,
        follow_ups: [...e.follow_ups, followUp],
        updated_at: new Date().toISOString(),
      };
    });
    setEnquiries(updated); save(entityCode, updated);
    // [JWT] PATCH /api/salesx/enquiries/:id/follow-up
    toast.success('Follow-up added');
  };

  return { enquiries, createEnquiry, updateEnquiry, addFollowUp };
}
