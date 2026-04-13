/**
 * transaction-template.ts — Standard Narrations, Terms & Conditions,
 * Payment Enforcement templates. Department-aware with Universal fallback.
 * ORG-TxT-1 · Storage: erp_transaction_templates
 */

export type TransactionTemplateType =
  | 'narration'           // Accounting narration — internal bookkeeping text
  | 'terms_conditions'    // General commercial T&C — printed on document
  | 'payment_enforcement';// Payment obligation clauses — interest, penalty, bounce

export interface TransactionTemplate {
  id: string;
  code: string;                        // auto-gen: TNT-0001
  name: string;
  type: TransactionTemplateType;
  department_label: string;            // display: "Sales" "Purchase" "Accounts" "Stores" "Universal"
  applicable_department_ids: string[]; // [] = Universal (all departments)
  applicable_voucher_types: string[];  // [] = all voucher types
  content: string;                     // text body — supports {variables}
  is_default: boolean;                 // auto-load when dept+voucher matches
  language: 'en' | 'hi';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export const TEMPLATES_KEY = 'erp_transaction_templates';

// Variables supported in content — resolved at transaction time
export const TEMPLATE_VARIABLES = [
  '{party}','{voucher_no}','{amount}','{date}','{due_date}',
  '{ref_no}','{our_company}','{our_city}','{mode}','{credit_days}',
  '{from_ledger}','{to_ledger}','{from_godown}','{to_godown}','{salesperson}',
];

// Dummy values for live preview in the template editor
export const PREVIEW_VARS: Record<string, string> = {
  party: 'M/s Sample Party Pvt Ltd',
  voucher_no: 'INV/2024-25/0001',
  amount: '₹1,25,000',
  date: new Date().toLocaleDateString('en-IN'),
  due_date: new Date(Date.now()+30*86400000).toLocaleDateString('en-IN'),
  ref_no: 'BILL/2024/001',
  our_company: 'Your Company Name',
  our_city: 'Mumbai',
  mode: 'NEFT',
  credit_days: '30',
  from_ledger: 'Cash',
  to_ledger: 'Bank',
  from_godown: 'Main Store',
  to_godown: 'Branch Store',
  salesperson: 'Rahul Sharma',
};

// 24 standard voucher type names for the multi-select dropdown
export const VOUCHER_TYPE_NAMES = [
  'Sales Invoice','Sales Return','Credit Note (Sales)',
  'Purchase Invoice','Purchase Return','Debit Note (Purchase)',
  'Receipt','Payment','Journal','Contra',
  'Debit Note','Credit Note','Delivery Note','Receipt Note',
  'Stock Journal','Physical Stock','Manufacturing Journal',
  'Payroll Journal','Salary Payment',
  'FXADJ','FXREVALUATION',
];

/** Apply variable substitution to template content */
export function applyVariables(
  content: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(value),
    content
  );
}

/**
 * Resolve the best matching template for a given context.
 * Resolution waterfall:
 *  1. dept + voucher type specific
 *  2. dept only (any voucher)
 *  3. universal + voucher type
 *  4. universal (any voucher)
 *  5. empty string (no match)
 */
export function resolveTemplate(
  type: TransactionTemplateType,
  voucherType: string,
  departmentIds: string[],
  templates: TransactionTemplate[],
  vars: Record<string, string> = {}
): string {
  const active = templates.filter(t => t.status === 'active' && t.is_default);
  const matchesVoucher = (t: TransactionTemplate) =>
    t.applicable_voucher_types.length === 0 ||
    t.applicable_voucher_types.includes(voucherType);
  const matchesDept = (t: TransactionTemplate) =>
    t.applicable_department_ids.length > 0 &&
    t.applicable_department_ids.some(id => departmentIds.includes(id));
  const isUniversal = (t: TransactionTemplate) =>
    t.applicable_department_ids.length === 0;

  const l1 = active.find(t => t.type === type && matchesVoucher(t) && matchesDept(t));
  if (l1) return applyVariables(l1.content, vars);
  const l2 = active.find(t => t.type === type && matchesDept(t));
  if (l2) return applyVariables(l2.content, vars);
  const l3 = active.find(t => t.type === type && matchesVoucher(t) && isUniversal(t));
  if (l3) return applyVariables(l3.content, vars);
  const l4 = active.find(t => t.type === type && isUniversal(t));
  return l4 ? applyVariables(l4.content, vars) : '';
}

export function getTemplateSeedData(): TransactionTemplate[] {
  const now = new Date().toISOString();
  const mk = (
    id: string, code: string, name: string,
    type: TransactionTemplateType,
    dept_label: string,
    voucher_types: string[],
    content: string,
    is_default = true
  ): TransactionTemplate => ({
    id, code, name, type,
    department_label: dept_label,
    applicable_department_ids: [],  // Universal on seed — user assigns dept IDs after setup
    applicable_voucher_types: voucher_types,
    content, is_default, language: 'en',
    status: 'active', created_at: now, updated_at: now,
  });

  return [
    // ── NARRATIONS (12) ─────────────────────────────────────────────
    mk('tnt-seed-001','TNT-0001','Sales Invoice — Standard Narration',
      'narration','Sales',['Sales Invoice'],
      'Being goods/services supplied to {party} vide Invoice {voucher_no} dt. {date}'),

    mk('tnt-seed-002','TNT-0002','Sales Return Narration',
      'narration','Sales',['Sales Return'],
      'Being goods returned by {party} against Invoice {ref_no}',false),

    mk('tnt-seed-003','TNT-0003','Credit Note Narration',
      'narration','Sales',['Credit Note (Sales)','Credit Note'],
      'Being credit note issued to {party} for excess charged in {ref_no}',false),

    mk('tnt-seed-004','TNT-0004','Debit Note — Sales Narration',
      'narration','Sales',['Debit Note'],
      'Being debit note raised on {party} for short charged in {ref_no}',false),

    mk('tnt-seed-005','TNT-0005','Purchase Invoice — Standard Narration',
      'narration','Purchase',['Purchase Invoice'],
      'Being goods/services purchased from {party} vide Bill {ref_no} dt. {date}'),

    mk('tnt-seed-006','TNT-0006','Purchase Return Narration',
      'narration','Purchase',['Purchase Return'],
      'Being goods returned to {party} against Bill {ref_no}',false),

    mk('tnt-seed-007','TNT-0007','Receipt Narration',
      'narration','Accounts',['Receipt'],
      'Being payment received from {party} against {ref_no} via {mode}'),

    mk('tnt-seed-008','TNT-0008','Payment Narration',
      'narration','Accounts',['Payment'],
      'Being payment made to {party} against Bill {ref_no} via {mode}'),

    mk('tnt-seed-009','TNT-0009','Journal Narration',
      'narration','Accounts',['Journal'],
      'Being journal entry passed as per advice dt. {date}'),

    mk('tnt-seed-010','TNT-0010','Contra Narration',
      'narration','Accounts',['Contra'],
      'Being fund transfer from {from_ledger} to {to_ledger} dt. {date}'),

    mk('tnt-seed-011','TNT-0011','Stock Transfer Narration',
      'narration','Stores',['Stock Journal'],
      'Being stock transferred from {from_godown} to {to_godown}'),

    mk('tnt-seed-012','TNT-0012','Universal Fallback Narration',
      'narration','Universal',[],
      'Being transaction with {party} on {date}',false),

    // ── TERMS & CONDITIONS (6) ───────────────────────────────────────
    mk('tnt-seed-013','TNT-0013','Standard Domestic Sale — T&C',
      'terms_conditions','Sales',['Sales Invoice'],
      '1. Goods once sold will not be taken back without prior written consent.\n'+
      '2. Delivery period subject to force majeure and unforeseen circumstances.\n'+
      '3. Risk of loss passes to buyer on dispatch from our premises.\n'+
      '4. Any shortage or damage must be reported within 48 hours of receipt.\n'+
      '5. All disputes are subject to {our_city} jurisdiction only. E&OE.'),

    mk('tnt-seed-014','TNT-0014','Manufacturing / OEM Supply — T&C',
      'terms_conditions','Sales',['Sales Invoice','Delivery Note'],
      '1. Quality subject to inspection at our works before dispatch. No claim after goods leave factory.\n'+
      '2. Buyer to arrange inspection within 3 working days of readiness notice.\n'+
      '3. Variation of ±3% in quantity/weight is accepted in industry practice.\n'+
      '4. Tooling and dies developed for buyer remain property of {our_company} until full payment.\n'+
      '5. Subject to {our_city} jurisdiction. Arbitration per Arbitration Act 1996.',false),

    mk('tnt-seed-015','TNT-0015','Service / Consulting — T&C',
      'terms_conditions','Sales',['Sales Invoice'],
      '1. Scope of work as per work order / purchase order only.\n'+
      '2. Any additional scope requires written change order before execution.\n'+
      '3. Intellectual property created remains with {our_company} until full payment.\n'+
      '4. Client delays in providing access or data extend delivery dates proportionally.\n'+
      '5. Disputes subject to arbitration. Governing law: Indian law.',false),

    mk('tnt-seed-016','TNT-0016','Export Supply — T&C',
      'terms_conditions','Sales',['Sales Invoice'],
      '1. Packing, marking and labelling as per buyer specifications.\n'+
      '2. Force majeure applicable — strikes, port delays, natural calamities.\n'+
      '3. Insurance on buyer account unless agreed otherwise in contract.\n'+
      '4. All disputes under ICC International Arbitration Rules.\n'+
      '5. Governing law: Indian law. Place of arbitration: {our_city}.',false),

    mk('tnt-seed-017','TNT-0017','Government / PSU Supply — T&C',
      'terms_conditions','Sales',['Sales Invoice'],
      '1. Supply strictly as per tender conditions, work order and drawing specifications.\n'+
      '2. {our_company} complies with Make in India and DPIIT requirements where applicable.\n'+
      '3. Statutory deductions (GST TDS u/s 51, Income Tax TDS) accepted as per law.\n'+
      '4. Payment subject to inspection and acceptance certificate from authorized officer.\n'+
      '5. Security deposit forfeiture applies in case of non-performance per tender terms.',false),

    mk('tnt-seed-018','TNT-0018','Retail / B2C — T&C',
      'terms_conditions','Sales',['Sales Invoice'],
      '1. Goods sold are non-returnable unless found defective at delivery.\n'+
      '2. Warranty as per manufacturer terms. {our_company} acts as authorised dealer only.\n'+
      '3. Cash refund not available — store credit or replacement only.\n'+
      '4. Prices are MRP inclusive of all taxes. No further discount applicable.\n'+
      '5. Subject to {our_city} jurisdiction.',false),

    // ── PAYMENT ENFORCEMENT (8) ──────────────────────────────────────
    mk('tnt-seed-019','TNT-0019','Interest on Overdue',
      'payment_enforcement','Universal',[],
      'Interest at 24% per annum (2% per month) will be charged on amounts\n'+
      'remaining unpaid beyond the credit period from invoice date.\n'+
      'Interest accrues from the day after due date without further notice.'),

    mk('tnt-seed-020','TNT-0020','Cheque Bounce / Dishonour Clause',
      'payment_enforcement','Accounts',['Receipt','Payment'],
      'In case of dishonour of cheque/ECS/NACH:\n'+
      '• Bank charges as applicable — passed on to party\n'+
      '• Penalty of ₹500 per dishonour instance\n'+
      '• All outstandings become immediately due and payable on dishonour\n'+
      '• Criminal proceedings under Section 138 Negotiable Instruments Act 1881 may be initiated'),

    mk('tnt-seed-021','TNT-0021','50% Advance Required',
      'payment_enforcement','Sales',['Sales Invoice'],
      '50% of invoice value is payable as advance at order confirmation.\n'+
      'Balance 50% is due before/on dispatch of goods.\n'+
      'Order processing will not commence without realisation of advance.\n'+
      'Advance is non-refundable in case of order cancellation by buyer.',false),

    mk('tnt-seed-022','TNT-0022','100% Advance — Prepayment Policy',
      'payment_enforcement','Sales',['Sales Invoice'],
      '100% advance payment by NEFT/RTGS is required before order processing.\n'+
      'Goods dispatched only after full fund realisation in our account.\n'+
      'Pro-forma invoice valid for 7 days from date of issue.\n'+
      'Order stands cancelled if payment is not received within 7 days.',false),

    mk('tnt-seed-023','TNT-0023','Credit Block on Overdue',
      'payment_enforcement','Accounts',[],
      'No fresh supply or service will be provided if any previous invoice is overdue.\n'+
      'All outstanding dues must be cleared before next order is processed.\n'+
      'Credit limit suspension is automatic and does not require prior notice.\n'+
      '{our_company} reserves the right to put any account on cash terms at any time.',false),

    mk('tnt-seed-024','TNT-0024','Legal Recovery Clause',
      'payment_enforcement','Accounts',[],
      'In the event of non-payment:\n'+
      '• A demand notice will be issued prior to legal proceedings\n'+
      '• Recovery proceedings may be initiated under applicable civil law\n'+
      '• The defaulting party is liable for court costs and advocate fees\n'+
      'All disputes are subject to {our_city} jurisdiction only.',false),

    mk('tnt-seed-025','TNT-0025','Post-Dated Cheque (PDC) Policy',
      'payment_enforcement','Accounts',['Receipt'],
      'Post-dated cheques accepted as security only — not as payment.\n'+
      'Payment is considered complete only on PDC realisation on due date.\n'+
      'If PDC is dishonoured, full interest, penalty and legal clauses apply.\n'+
      'PDC collection does not constitute waiver of any rights.',false),

    mk('tnt-seed-026','TNT-0026','Combined Enforcement — Full Standard Clause',
      'payment_enforcement','Universal',[],
      'Payment Terms Enforcement:\n'+
      '1. Due date: {credit_days} days from invoice date. Due by: {due_date}\n'+
      '2. Overdue interest: 24% p.a. from the day after due date\n'+
      '3. Cheque dishonour: ₹500 penalty + bank charges + Section 138 NI Act proceedings\n'+
      '4. Credit block: Automatic on any overdue — no further supply until clearance\n'+
      '5. Legal recovery: All costs, court fees and legal expenses on defaulting party\n'+
      '6. Jurisdiction: {our_city} courts only'),
  ];
}
