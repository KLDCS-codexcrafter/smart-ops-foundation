/**
 * demo-salesx-data.ts — SalesX masters and pipeline data
 * [JWT] Read by orchestrator → POST /api/salesx/*
 */
import type { DemoArchetype } from '@/data/demo-customers-vendors';

interface Tagged { _archetype: DemoArchetype; }

// ─── SAM Hierarchy ──────────────────────────────────────────────────────
export const DEMO_SAM_HIERARCHY = [
  { id: 'sh-1', level: 1, code: 'SALESMAN',   label: 'Salesman',   commission_pct: 2.0 },
  { id: 'sh-2', level: 2, code: 'AGENT',      label: 'Agent',      commission_pct: 1.5 },
  { id: 'sh-3', level: 3, code: 'BROKER',     label: 'Broker',     commission_pct: 1.0 },
  { id: 'sh-4', level: 4, code: 'TELECALLER', label: 'Telecaller', commission_pct: 0.5 },
];

// ─── SAM Persons ────────────────────────────────────────────────────────
export interface DemoSamPerson extends Tagged {
  id: string; person_code: string; person_name: string;
  role: 'salesman' | 'agent' | 'broker' | 'telecaller';
  phone: string; email: string; commission_pct: number; is_active: boolean;
}
export const DEMO_SAM_PERSONS: DemoSamPerson[] = [
  // Trading: 6 salesmen, 4 agents
  { _archetype: 'trading', id: 'sm-t1', person_code: 'SM-T01', person_name: 'Amit Kumar',     role: 'salesman',   phone: '+919811000001', email: 'amit@op.in',   commission_pct: 2.0, is_active: true },
  { _archetype: 'trading', id: 'sm-t2', person_code: 'SM-T02', person_name: 'Priya Sharma',   role: 'salesman',   phone: '+919811000002', email: 'priya@op.in',  commission_pct: 2.0, is_active: true },
  { _archetype: 'trading', id: 'sm-t3', person_code: 'SM-T03', person_name: 'Rahul Verma',    role: 'salesman',   phone: '+919811000003', email: 'rahul@op.in',  commission_pct: 2.0, is_active: true },
  { _archetype: 'trading', id: 'sm-t4', person_code: 'SM-T04', person_name: 'Anjali Singh',   role: 'salesman',   phone: '+919811000004', email: 'anjali@op.in', commission_pct: 2.0, is_active: true },
  { _archetype: 'trading', id: 'sm-t5', person_code: 'SM-T05', person_name: 'Vikram Mehta',   role: 'salesman',   phone: '+919811000005', email: 'vikram@op.in', commission_pct: 2.0, is_active: true },
  { _archetype: 'trading', id: 'sm-t6', person_code: 'SM-T06', person_name: 'Neha Kapoor',    role: 'salesman',   phone: '+919811000006', email: 'neha@op.in',   commission_pct: 2.0, is_active: true },
  { _archetype: 'trading', id: 'ag-t1', person_code: 'AG-T01', person_name: 'Nirmal Agencies',role: 'agent',      phone: '+919811000011', email: 'nirmal@ag.in', commission_pct: 1.5, is_active: true },
  { _archetype: 'trading', id: 'ag-t2', person_code: 'AG-T02', person_name: 'Sunrise Marketing', role: 'agent',  phone: '+919811000012', email: 'sun@ag.in',    commission_pct: 1.5, is_active: true },
  { _archetype: 'trading', id: 'ag-t3', person_code: 'AG-T03', person_name: 'Capital Agency', role: 'agent',     phone: '+919811000013', email: 'cap@ag.in',    commission_pct: 1.5, is_active: true },
  { _archetype: 'trading', id: 'ag-t4', person_code: 'AG-T04', person_name: 'Eastern Trading',role: 'agent',     phone: '+919811000014', email: 'east@ag.in',   commission_pct: 1.5, is_active: true },
  // Services: 4 salesmen, 2 brokers
  { _archetype: 'services', id: 'sm-s1', person_code: 'SM-S01', person_name: 'Rohit Mishra',   role: 'salesman', phone: '+919811000021', email: 'rohit@op.in',  commission_pct: 2.0, is_active: true },
  { _archetype: 'services', id: 'sm-s2', person_code: 'SM-S02', person_name: 'Kavita Iyer',    role: 'salesman', phone: '+919811000022', email: 'kavita@op.in', commission_pct: 2.0, is_active: true },
  { _archetype: 'services', id: 'sm-s3', person_code: 'SM-S03', person_name: 'Suresh Reddy',   role: 'salesman', phone: '+919811000023', email: 'suresh@op.in', commission_pct: 2.0, is_active: true },
  { _archetype: 'services', id: 'sm-s4', person_code: 'SM-S04', person_name: 'Pooja Patel',    role: 'salesman', phone: '+919811000024', email: 'pooja@op.in',  commission_pct: 2.0, is_active: true },
  { _archetype: 'services', id: 'br-s1', person_code: 'BR-S01', person_name: 'Deepak Brokerage', role: 'broker', phone: '+919811000031', email: 'deep@br.in',   commission_pct: 1.0, is_active: true },
  { _archetype: 'services', id: 'br-s2', person_code: 'BR-S02', person_name: 'VK Brokers',    role: 'broker',   phone: '+919811000032', email: 'vk@br.in',     commission_pct: 1.0, is_active: true },
  // Manufacturing: 5 salesmen, 3 agents, 2 telecallers
  { _archetype: 'manufacturing', id: 'sm-m1', person_code: 'SM-M01', person_name: 'Manish Gupta',  role: 'salesman',   phone: '+919811000041', email: 'manish@op.in',  commission_pct: 2.0, is_active: true },
  { _archetype: 'manufacturing', id: 'sm-m2', person_code: 'SM-M02', person_name: 'Sneha Joshi',   role: 'salesman',   phone: '+919811000042', email: 'sneha@op.in',   commission_pct: 2.0, is_active: true },
  { _archetype: 'manufacturing', id: 'sm-m3', person_code: 'SM-M03', person_name: 'Arun Pillai',   role: 'salesman',   phone: '+919811000043', email: 'arun@op.in',    commission_pct: 2.0, is_active: true },
  { _archetype: 'manufacturing', id: 'sm-m4', person_code: 'SM-M04', person_name: 'Divya Nair',    role: 'salesman',   phone: '+919811000044', email: 'divya@op.in',   commission_pct: 2.0, is_active: true },
  { _archetype: 'manufacturing', id: 'sm-m5', person_code: 'SM-M05', person_name: 'Karan Bhatia',  role: 'salesman',   phone: '+919811000045', email: 'karan@op.in',   commission_pct: 2.0, is_active: true },
  { _archetype: 'manufacturing', id: 'ag-m1', person_code: 'AG-M01', person_name: 'Industrial Agencies', role: 'agent', phone: '+919811000051', email: 'ind@ag.in',  commission_pct: 1.5, is_active: true },
  { _archetype: 'manufacturing', id: 'ag-m2', person_code: 'AG-M02', person_name: 'Metro Sales',    role: 'agent',     phone: '+919811000052', email: 'metro@ag.in',  commission_pct: 1.5, is_active: true },
  { _archetype: 'manufacturing', id: 'ag-m3', person_code: 'AG-M03', person_name: 'Prime Distribution', role: 'agent', phone: '+919811000053', email: 'prime@ag.in',  commission_pct: 1.5, is_active: true },
  { _archetype: 'manufacturing', id: 'tc-m1', person_code: 'TC-M01', person_name: 'Anjali Desai',  role: 'telecaller', phone: '+919811000061', email: 'aDesai@op.in',  commission_pct: 0.5, is_active: true },
  { _archetype: 'manufacturing', id: 'tc-m2', person_code: 'TC-M02', person_name: 'Meera Iyer',    role: 'telecaller', phone: '+919811000062', email: 'mIyer@op.in',   commission_pct: 0.5, is_active: true },
];

// ─── Enquiry Sources ────────────────────────────────────────────────────
export const DEMO_ENQUIRY_SOURCES = [
  { id: 'es-1', code: 'WEBSITE',   name: 'Website',           is_active: true },
  { id: 'es-2', code: 'REFERRAL',  name: 'Referral',          is_active: true },
  { id: 'es-3', code: 'COLDCALL',  name: 'Cold Call',         is_active: true },
  { id: 'es-4', code: 'TRADEFAIR', name: 'Trade Fair',        is_active: true },
  { id: 'es-5', code: 'GOOGLEADS', name: 'Google Ads',        is_active: true },
  { id: 'es-6', code: 'WHATSAPP',  name: 'WhatsApp',          is_active: true },
  { id: 'es-7', code: 'WALKIN',    name: 'Walk-in',           is_active: true },
  { id: 'es-8', code: 'EXISTING',  name: 'Existing Customer', is_active: true },
];

// ─── Campaigns ──────────────────────────────────────────────────────────
export const DEMO_CAMPAIGNS = [
  { id: 'cm-1', code: 'DIWALI24',  name: 'Diwali Festive 2024',     status: 'active',  start_date: '2024-10-01', end_date: '2024-11-15', budget: 500000 },
  { id: 'cm-2', code: 'NEWYEAR25', name: 'New Year Promo',          status: 'active',  start_date: '2024-12-15', end_date: '2025-01-15', budget: 300000 },
  { id: 'cm-3', code: 'SUMMER25',  name: 'Summer Push 2025',        status: 'active',  start_date: '2025-04-01', end_date: '2025-06-30', budget: 800000 },
  { id: 'cm-4', code: 'MONSOON25', name: 'Monsoon Special',         status: 'active',  start_date: '2025-07-01', end_date: '2025-09-30', budget: 400000 },
  { id: 'cm-5', code: 'FESTIVE25', name: 'Festive 2025',            status: 'active',  start_date: '2025-09-15', end_date: '2025-11-30', budget: 600000 },
  { id: 'cm-6', code: 'OLD-CMP1',  name: 'Independence Day Sale',   status: 'closed',  start_date: '2024-08-01', end_date: '2024-08-20', budget: 200000 },
  { id: 'cm-7', code: 'OLD-CMP2',  name: 'Q4 FY24 Push',            status: 'closed',  start_date: '2024-01-01', end_date: '2024-03-31', budget: 350000 },
  { id: 'cm-8', code: 'OLD-CMP3',  name: 'Republic Day Discount',   status: 'closed',  start_date: '2024-01-15', end_date: '2024-01-30', budget: 150000 },
];

// ─── Targets ────────────────────────────────────────────────────────────
export const DEMO_TARGETS = DEMO_SAM_PERSONS.map((p, i) => ({
  id: `tg-${i+1}`, sam_person_id: p.id, sam_person_name: p.person_name,
  period: 'Q4-FY25', target_amount: 500000 + (i % 5) * 200000,
  achieved_amount: 200000 + (i % 7) * 80000, status: 'in_progress' as const,
}));

// ─── Enquiries ──────────────────────────────────────────────────────────
export interface DemoEnquiry extends Tagged {
  id: string; enquiry_no: string; party_name: string;
  source_code: string; stage: 'new' | 'qualified' | 'opportunity' | 'lost';
  estimated_value: number; salesman_id: string; created_at: string;
}
function makeEnquiries(arche: DemoArchetype, count: number, prefix: string): DemoEnquiry[] {
  const stages: DemoEnquiry['stage'][] = ['new', 'qualified', 'opportunity', 'lost'];
  const sources = DEMO_ENQUIRY_SOURCES.map(s => s.code);
  const salesmen = DEMO_SAM_PERSONS.filter(p => p._archetype === arche && p.role === 'salesman');
  return Array.from({ length: count }, (_, i): DemoEnquiry => ({
    _archetype: arche, id: `enq-${prefix}-${i+1}`,
    enquiry_no: `ENQ-${prefix}-${String(i+1).padStart(4,'0')}`,
    party_name: `Lead ${prefix}${i+1}`,
    source_code: sources[i % sources.length], stage: stages[i % stages.length],
    estimated_value: 50000 + (i % 8) * 35000,
    salesman_id: salesmen[i % Math.max(1, salesmen.length)]?.id ?? '',
    created_at: new Date(Date.now() - (i * 24 * 3600 * 1000)).toISOString(),
  }));
}
export const DEMO_ENQUIRIES: DemoEnquiry[] = [
  ...makeEnquiries('trading', 22, 'T'),
  ...makeEnquiries('services', 18, 'S'),
  ...makeEnquiries('manufacturing', 20, 'M'),
];

// ─── Quotations ─────────────────────────────────────────────────────────
export interface DemoQuotation extends Tagged {
  id: string; quote_no: string; enquiry_id: string;
  party_name: string; total_amount: number;
  status: 'draft' | 'sent' | 'converted' | 'lost';
  salesman_id: string; quote_date: string;
}
function makeQuotations(arche: DemoArchetype, count: number, prefix: string): DemoQuotation[] {
  const statuses: DemoQuotation['status'][] = ['draft', 'sent', 'converted', 'lost'];
  const enquiries = DEMO_ENQUIRIES.filter(e => e._archetype === arche);
  return Array.from({ length: count }, (_, i): DemoQuotation => ({
    _archetype: arche, id: `qt-${prefix}-${i+1}`,
    quote_no: `QT-${prefix}-${String(i+1).padStart(4,'0')}`,
    enquiry_id: enquiries[i % Math.max(1, enquiries.length)]?.id ?? '',
    party_name: `Prospect ${prefix}${i+1}`,
    total_amount: 75000 + (i % 10) * 45000,
    status: statuses[i % statuses.length],
    salesman_id: '', quote_date: new Date(Date.now() - (i * 36 * 3600 * 1000)).toISOString().slice(0,10),
  }));
}
export const DEMO_QUOTATIONS: DemoQuotation[] = [
  ...makeQuotations('trading', 16, 'T'),
  ...makeQuotations('services', 12, 'S'),
  ...makeQuotations('manufacturing', 12, 'M'),
];

// ─── Opportunities ──────────────────────────────────────────────────────
export const DEMO_OPPORTUNITIES = DEMO_ENQUIRIES.filter(e => e.stage === 'opportunity').map(e => ({
  _archetype: e._archetype, id: `op-${e.id}`, enquiry_id: e.id,
  party_name: e.party_name, expected_value: e.estimated_value,
  expected_close_date: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0,10),
  probability: 60, stage: 'negotiation' as const, salesman_id: e.salesman_id,
}));

// ─── Commission Entries ─────────────────────────────────────────────────
export interface DemoCommissionEntry extends Tagged {
  id: string; entry_code: string; sam_person_id: string; sam_person_name: string;
  voucher_no: string; voucher_date: string;
  base_amount: number; commission_pct: number; commission_amount: number;
  status: 'pending' | 'booked' | 'paid';
  paid_date: string | null; created_at: string;
}
function makeCommissions(arche: DemoArchetype, pending: number, booked: number, paid: number, prefix: string): DemoCommissionEntry[] {
  const persons = DEMO_SAM_PERSONS.filter(p => p._archetype === arche);
  const make = (n: number, status: DemoCommissionEntry['status'], offset: number): DemoCommissionEntry[] =>
    Array.from({ length: n }, (_, i): DemoCommissionEntry => {
      const p = persons[(offset + i) % Math.max(1, persons.length)];
      const base = 80000 + ((offset + i) % 8) * 35000;
      return {
        _archetype: arche, id: `cm-${prefix}-${status}-${i+1}`,
        entry_code: `COMM-${prefix}-${status.toUpperCase()}-${String(i+1).padStart(3,'0')}`,
        sam_person_id: p?.id ?? '', sam_person_name: p?.person_name ?? '',
        voucher_no: `RV-${prefix}-${String(offset + i + 1).padStart(4,'0')}`,
        voucher_date: new Date(Date.now() - ((offset + i) * 5 * 24 * 3600 * 1000)).toISOString().slice(0,10),
        base_amount: base, commission_pct: p?.commission_pct ?? 1.5,
        commission_amount: Math.round(base * (p?.commission_pct ?? 1.5) / 100),
        status,
        paid_date: status === 'paid' ? new Date(Date.now() - (i * 2 * 24 * 3600 * 1000)).toISOString().slice(0,10) : null,
        created_at: new Date().toISOString(),
      };
    });
  return [...make(pending, 'pending', 0), ...make(booked, 'booked', pending), ...make(paid, 'paid', pending + booked)];
}
export const DEMO_COMMISSION_ENTRIES: DemoCommissionEntry[] = [
  ...makeCommissions('trading', 12, 8, 5, 'T'),
  ...makeCommissions('services', 6, 4, 3, 'S'),
  ...makeCommissions('manufacturing', 10, 6, 4, 'M'),
];
