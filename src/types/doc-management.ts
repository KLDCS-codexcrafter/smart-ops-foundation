/** doc-management.ts - Sprint 20 Document Management & Template Library */

export type DocMgmtTab = 'vault' | 'templates';

// ── Employee Document ─────────────────────────────────────────────
export type DocAttachType = 'upload' | 'camera' | 'webcam' | 'scan';

export type EmpDocCategory =
  | 'identity'        // Aadhaar, PAN, Passport
  | 'address_proof'   // Utility bill, bank statement
  | 'education'       // Degree, marksheet, certificate
  | 'employment'      // Offer letter, appointment, experience letter
  | 'statutory'       // PF, ESI, PT, Form 12BB
  | 'bank'            // Cancelled cheque, bank statement
  | 'medical'         // Medical fitness, insurance
  | 'asset'           // IT asset acknowledgement, handover
  | 'other';

export const EMP_DOC_CATEGORY_LABELS: Record<EmpDocCategory, string> = {
  identity: 'Identity Proof', address_proof: 'Address Proof',
  education: 'Educational Certificate', employment: 'Employment Document',
  statutory: 'Statutory / Tax', bank: 'Bank Document',
  medical: 'Medical', asset: 'Asset / IT', other: 'Other',
};

export interface EmployeeDocument {
  id: string;
  docCode: string;              // EDOC-000001
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  category: EmpDocCategory;
  title: string;
  issueDate: string;
  expiryDate: string;           // empty if no expiry
  isExpired: boolean;
  // File data
  fileName: string;             // original file name e.g. "aadhaar_front.jpg"
  fileType: string;             // MIME type e.g. "image/jpeg" "application/pdf"
  fileSizeBytes: number;
  fileData: string;             // Base64 data URL - "data:image/jpeg;base64,..."
  attachType: DocAttachType;    // how it was captured
  // Meta
  tags: string[];               // searchable tags
  notes: string;
  uploadedBy: string;
  created_at: string;
  updated_at: string;
}

// ── HR Document Template ─────────────────────────────────────────
export type TemplateCategory =
  | 'offer'          // Offer Letter, Appointment Letter
  | 'confirmation'   // Confirmation Letter, Probation Extension
  | 'compensation'   // Increment Letter, Promotion Letter
  | 'disciplinary'   // Warning Letter, Show-Cause Notice
  | 'separation'     // Relieving Letter, Experience Letter, F&F Acknowledgement
  | 'joining'        // Joining Form, New Joiner Checklist
  | 'compliance'     // No Dues Certificate, IT Declaration Ack
  | 'appraisal';     // Appraisal Form, KRA Setting Form

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  offer: 'Offer & Appointment', confirmation: 'Confirmation',
  compensation: 'Compensation', disciplinary: 'Disciplinary',
  separation: 'Separation', joining: 'Joining',
  compliance: 'Compliance', appraisal: 'Appraisal',
};

export interface DocTemplate {
  id: string;
  templateCode: string;           // TMPL-DOC-001
  title: string;
  category: TemplateCategory;
  description: string;
  contentHtml: string;            // Full HTML body with {{placeholders}}
  placeholders: string[];         // auto-extracted e.g. ["{{employeeName}}", "{{doj}}"]
  isSeeded: boolean;              // true = shipped with product, false = HR custom
  isActive: boolean;
  hrOverrideData: string;         // Base64 of HR-uploaded file (if they uploaded custom)
  hrOverrideFileName: string;
  lastUsed: string;
  created_at: string;
  updated_at: string;
}

export const EMPLOYEE_DOCS_KEY = 'erp_employee_documents';
export const DOC_TEMPLATES_KEY = 'erp_doc_templates';

// ── 12 Seeded HR Templates (defined here, not inside component) ──
type SeedTemplate = Omit<DocTemplate,
  'id' | 'hrOverrideData' | 'hrOverrideFileName' | 'lastUsed' | 'created_at' |
  'updated_at'>;

export const SEEDED_TEMPLATES: SeedTemplate[] = [
  {
    templateCode: 'TMPL-DOC-001', title: 'Offer Letter',
    category: 'offer', isSeeded: true, isActive: true,
    description: 'Standard offer letter for new hires',
    placeholders: ['{{employeeName}}','{{designation}}','{{departmentName}}','{{annualCTC}}','{{joiningDate}}','{{companyName}}','{{reportingManagerName}}','{{location}}','{{offerExpiryDate}}'],
    contentHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right">Date: {{today}}</p>
<p><strong>{{companyName}}</strong></p>
<p>Dear {{employeeName}},</p>
<h2 style="color:#1E3A5F">OFFER OF EMPLOYMENT</h2>
<p>We are pleased to offer you the position of <strong>{{designation}}</strong> in our <strong>{{departmentName}}</strong> department.</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
<tr><td style="padding:8px;border:1px solid #ccc;background:#f8f8f8"><strong>Designation</strong></td><td style="padding:8px;border:1px solid #ccc">{{designation}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ccc;background:#f8f8f8"><strong>Department</strong></td><td style="padding:8px;border:1px solid #ccc">{{departmentName}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ccc;background:#f8f8f8"><strong>Annual CTC</strong></td><td style="padding:8px;border:1px solid #ccc">{{annualCTC}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ccc;background:#f8f8f8"><strong>Date of Joining</strong></td><td style="padding:8px;border:1px solid #ccc">{{joiningDate}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ccc;background:#f8f8f8"><strong>Reporting Manager</strong></td><td style="padding:8px;border:1px solid #ccc">{{reportingManagerName}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ccc;background:#f8f8f8"><strong>Location</strong></td><td style="padding:8px;border:1px solid #ccc">{{location}}</td></tr>
</table>
<p>Please confirm your acceptance by <strong>{{offerExpiryDate}}</strong>.</p>
<p>We look forward to welcoming you to our team.</p>
<br/><p>Authorised Signatory<br/>{{companyName}}</p>
</div>`,
  },
  {
    templateCode: 'TMPL-DOC-002', title: 'Appointment Letter',
    category: 'offer', isSeeded: true, isActive: true,
    description: 'Formal appointment on joining',
    placeholders: ['{{employeeName}}','{{empCode}}','{{designation}}','{{departmentName}}','{{doj}}','{{annualCTC}}','{{noticePeriodDays}}','{{companyName}}','{{probationMonths}}'],
    contentHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right">Date: {{today}}</p>
<p>Employee Code: <strong>{{empCode}}</strong></p>
<p>Dear {{employeeName}},</p>
<h2 style="color:#1E3A5F">APPOINTMENT LETTER</h2>
<p>This is to confirm your appointment as <strong>{{designation}}</strong> in the <strong>{{departmentName}}</strong> department with effect from <strong>{{doj}}</strong>.</p>
<p><strong>Annual CTC:</strong> {{annualCTC}}</p>
<p><strong>Notice Period:</strong> {{noticePeriodDays}} days</p>
<p><strong>Probation Period:</strong> {{probationMonths}} months from date of joining</p>
<p>Your employment is subject to the terms and conditions stated in the Employee Handbook.</p>
<br/><p>HR Department<br/>{{companyName}}</p>
</div>`,
  },
  {
    templateCode: 'TMPL-DOC-003', title: 'Confirmation Letter',
    category: 'confirmation', isSeeded: true, isActive: true,
    description: 'Probation completion – employee confirmed',
    placeholders: ['{{employeeName}}','{{empCode}}','{{designation}}','{{doj}}','{{confirmationDate}}','{{companyName}}'],
    contentHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right">Date: {{today}}</p>
<p>Dear {{employeeName}} ({{empCode}}),</p>
<h2 style="color:#1E3A5F">CONFIRMATION OF EMPLOYMENT</h2>
<p>We are pleased to inform you that your probation period has been successfully completed and your employment as <strong>{{designation}}</strong> is hereby confirmed with effect from <strong>{{confirmationDate}}</strong>.</p>
<p>Your Date of Joining: <strong>{{doj}}</strong></p>
<p>We appreciate your contribution and look forward to your continued association with us.</p>
<br/><p>HR Department<br/>{{companyName}}</p>
</div>`,
  },
  {
    templateCode: 'TMPL-DOC-004', title: 'Increment Letter',
    category: 'compensation', isSeeded: true, isActive: true,
    description: 'Annual increment / salary revision letter',
    placeholders: ['{{employeeName}}','{{empCode}}','{{designation}}','{{oldCTC}}','{{newCTC}}','{{pctChange}}','{{effectiveDate}}','{{companyName}}'],
    contentHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right">Date: {{today}}</p>
<p>Dear {{employeeName}} ({{empCode}}),</p>
<h2 style="color:#1E3A5F">SALARY REVISION LETTER</h2>
<p>We are pleased to inform you that your annual CTC has been revised as follows:</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
<tr><td style="padding:8px;border:1px solid #ccc;background:#f8f8f8"><strong>Previous CTC</strong></td><td style="padding:8px;border:1px solid #ccc">{{oldCTC}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ccc;background:#f8f8f8"><strong>Revised CTC</strong></td><td style="padding:8px;border:1px solid #ccc">{{newCTC}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ccc;background:#f8f8f8"><strong>Increment</strong></td><td style="padding:8px;border:1px solid #ccc">{{pctChange}}%</td></tr>
<tr><td style="padding:8px;border:1px solid #ccc;background:#f8f8f8"><strong>Effective Date</strong></td><td style="padding:8px;border:1px solid #ccc">{{effectiveDate}}</td></tr>
</table>
<p>We appreciate your continued efforts and dedication.</p>
<br/><p>HR Department<br/>{{companyName}}</p>
</div>`,
  },
  {
    templateCode: 'TMPL-DOC-005', title: 'Promotion Letter',
    category: 'compensation', isSeeded: true, isActive: true,
    description: 'Promotion to a new designation',
    placeholders: ['{{employeeName}}','{{empCode}}','{{oldDesignation}}','{{newDesignation}}','{{newCTC}}','{{effectiveDate}}','{{companyName}}'],
    contentHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right">Date: {{today}}</p>
<p>Dear {{employeeName}} ({{empCode}}),</p>
<h2 style="color:#1E3A5F">LETTER OF PROMOTION</h2>
<p>We are pleased to promote you from <strong>{{oldDesignation}}</strong> to <strong>{{newDesignation}}</strong> with effect from <strong>{{effectiveDate}}</strong>.</p>
<p>Your revised Annual CTC: <strong>{{newCTC}}</strong></p>
<p>This promotion is in recognition of your outstanding performance and dedication.</p>
<br/><p>HR Department<br/>{{companyName}}</p>
</div>`,
  },
  {
    templateCode: 'TMPL-DOC-006', title: 'Warning Letter',
    category: 'disciplinary', isSeeded: true, isActive: true,
    description: 'First / second written warning',
    placeholders: ['{{employeeName}}','{{empCode}}','{{designation}}','{{warningDate}}','{{incidentDescription}}','{{warningLevel}}','{{companyName}}'],
    contentHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right">Date: {{warningDate}}</p>
<p>Dear {{employeeName}} ({{empCode}}),</p>
<h2 style="color:#991B1B">{{warningLevel}} WARNING LETTER</h2>
<p>This letter serves as a formal {{warningLevel}} warning regarding:</p>
<p style="padding:15px;background:#fff3f3;border-left:4px solid #dc2626">{{incidentDescription}}</p>
<p>We expect an immediate improvement. Failure to do so may result in further disciplinary action including termination of employment.</p>
<p>Please sign and return a copy of this letter as acknowledgement.</p>
<br/><p>HR Department<br/>{{companyName}}</p>
</div>`,
  },
  {
    templateCode: 'TMPL-DOC-007', title: 'Show-Cause Notice',
    category: 'disciplinary', isSeeded: true, isActive: true,
    description: 'Formal explanation required from employee',
    placeholders: ['{{employeeName}}','{{empCode}}','{{designation}}','{{incidentDate}}','{{incidentDescription}}','{{replyDueDays}}','{{companyName}}'],
    contentHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right">Date: {{today}}</p>
<p>Dear {{employeeName}} ({{empCode}}),</p>
<h2 style="color:#991B1B">SHOW CAUSE NOTICE</h2>
<p>It has come to our notice that on <strong>{{incidentDate}}</strong>, the following occurred:</p>
<p style="padding:15px;background:#fff3f3;border-left:4px solid #dc2626">{{incidentDescription}}</p>
<p>You are hereby required to submit your written explanation within <strong>{{replyDueDays}} working days</strong> of receiving this notice. Failure to respond will be treated as acceptance of the charges.</p>
<br/><p>HR Department<br/>{{companyName}}</p>
</div>`,
  },
  {
    templateCode: 'TMPL-DOC-008', title: 'Relieving Letter',
    category: 'separation', isSeeded: true, isActive: true,
    description: 'Issued on last working day',
    placeholders: ['{{employeeName}}','{{empCode}}','{{designation}}','{{departmentName}}','{{doj}}','{{lastWorkingDate}}','{{companyName}}'],
    contentHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right">Date: {{today}}</p>
<p><strong>TO WHOM IT MAY CONCERN</strong></p>
<h2 style="color:#1E3A5F">RELIEVING LETTER</h2>
<p>This is to certify that <strong>{{employeeName}}</strong> (Employee Code: {{empCode}}) was employed with <strong>{{companyName}}</strong> as <strong>{{designation}}</strong> in the <strong>{{departmentName}}</strong> department from <strong>{{doj}}</strong> to <strong>{{lastWorkingDate}}</strong>.</p>
<p>{{employeeName}} is hereby relieved of all duties and responsibilities with effect from {{lastWorkingDate}}.</p>
<p>We wish them success in their future endeavours.</p>
<br/><p>HR Department<br/>{{companyName}}</p>
</div>`,
  },
  {
    templateCode: 'TMPL-DOC-009', title: 'Experience Letter',
    category: 'separation', isSeeded: true, isActive: true,
    description: 'Work experience certificate',
    placeholders: ['{{employeeName}}','{{empCode}}','{{designation}}','{{departmentName}}','{{doj}}','{{lastWorkingDate}}','{{companyName}}','{{performanceSummary}}'],
    contentHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right">Date: {{today}}</p>
<p><strong>TO WHOM IT MAY CONCERN</strong></p>
<h2 style="color:#1E3A5F">EXPERIENCE CERTIFICATE</h2>
<p>This is to certify that <strong>{{employeeName}}</strong> (Employee Code: {{empCode}}) was employed with <strong>{{companyName}}</strong> as <strong>{{designation}}</strong> from <strong>{{doj}}</strong> to <strong>{{lastWorkingDate}}</strong>.</p>
<p>{{performanceSummary}}</p>
<p>We wish {{employeeName}} all the best in their future career.</p>
<br/><p>HR Department<br/>{{companyName}}</p>
</div>`,
  },
  {
    templateCode: 'TMPL-DOC-010', title: 'No Dues Certificate',
    category: 'compliance', isSeeded: true, isActive: true,
    description: 'Confirms all dues cleared on exit',
    placeholders: ['{{employeeName}}','{{empCode}}','{{designation}}','{{lastWorkingDate}}','{{companyName}}'],
    contentHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right">Date: {{today}}</p>
<p><strong>NO DUES CERTIFICATE</strong></p>
<p>This is to certify that <strong>{{employeeName}}</strong> ({{empCode}}), <strong>{{designation}}</strong>, has cleared all dues and liabilities towards <strong>{{companyName}}</strong> as of <strong>{{lastWorkingDate}}</strong>.</p>
<p>All company assets have been returned and all financial obligations settled.</p>
<br/><p>HR Department<br/>{{companyName}}</p>
</div>`,
  },
  {
    templateCode: 'TMPL-DOC-011', title: 'Joining Form',
    category: 'joining', isSeeded: true, isActive: true,
    description: 'New joiner information form',
    placeholders: ['{{employeeName}}','{{designation}}','{{doj}}','{{companyName}}'],
    contentHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;max-width:700px;margin:auto;padding:40px">
<h2 style="color:#1E3A5F">JOINING FORM</h2>
<p><strong>Company:</strong> {{companyName}} &nbsp;&nbsp; <strong>Date of Joining:</strong> {{doj}}</p>
<p><strong>Name:</strong> {{employeeName}} &nbsp;&nbsp; <strong>Designation:</strong> {{designation}}</p>
<hr/>
<h3>Personal Information</h3>
<table style="width:100%;border-collapse:collapse">
<tr><td style="padding:8px;border:1px solid #ccc;width:40%">Father's / Spouse Name</td><td style="padding:8px;border:1px solid #ccc"></td></tr>
<tr><td style="padding:8px;border:1px solid #ccc">Date of Birth</td><td style="padding:8px;border:1px solid #ccc"></td></tr>
<tr><td style="padding:8px;border:1px solid #ccc">Blood Group</td><td style="padding:8px;border:1px solid #ccc"></td></tr>
<tr><td style="padding:8px;border:1px solid #ccc">Emergency Contact</td><td style="padding:8px;border:1px solid #ccc"></td></tr>
<tr><td style="padding:8px;border:1px solid #ccc">Permanent Address</td><td style="padding:8px;border:1px solid #ccc"></td></tr>
<tr><td style="padding:8px;border:1px solid #ccc">Bank Account No.</td><td style="padding:8px;border:1px solid #ccc"></td></tr>
<tr><td style="padding:8px;border:1px solid #ccc">IFSC Code</td><td style="padding:8px;border:1px solid #ccc"></td></tr>
<tr><td style="padding:8px;border:1px solid #ccc">PAN Number</td><td style="padding:8px;border:1px solid #ccc"></td></tr>
<tr><td style="padding:8px;border:1px solid #ccc">Aadhaar Number</td><td style="padding:8px;border:1px solid #ccc"></td></tr>
<tr><td style="padding:8px;border:1px solid #ccc">UAN (if available)</td><td style="padding:8px;border:1px solid #ccc"></td></tr>
</table>
<p style="margin-top:30px">Employee Signature: _________________ &nbsp;&nbsp;&nbsp; Date: _______________</p>
</div>`,
  },
  {
    templateCode: 'TMPL-DOC-012', title: 'F&F Acknowledgement',
    category: 'separation', isSeeded: true, isActive: true,
    description: 'Full & Final settlement acknowledgement',
    placeholders: ['{{employeeName}}','{{empCode}}','{{lastWorkingDate}}','{{netPayable}}','{{paymentDate}}','{{companyName}}'],
    contentHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right">Date: {{today}}</p>
<h2 style="color:#1E3A5F">FULL & FINAL SETTLEMENT ACKNOWLEDGEMENT</h2>
<p>I, <strong>{{employeeName}}</strong> ({{empCode}}), hereby acknowledge receipt of the Full & Final settlement amount of <strong>{{netPayable}}</strong> from <strong>{{companyName}}</strong>.</p>
<p>Last Working Date: <strong>{{lastWorkingDate}}</strong> | Payment Date: <strong>{{paymentDate}}</strong></p>
<p>I confirm that I have no further claims against the company.</p>
<br/><p>Employee Signature: _________________<br/>{{employeeName}} ({{empCode}})</p>
</div>`,
  },
];

// ── Sprint T-Phase-1.2.5h-a · Multi-tenant key migration (Bucket C) ──────
// [JWT] GET /api/peoplepay/employee-docs?entityCode={e}
export const employeeDocsKey = (e: string): string =>
  e ? `erp_employee_documents_${e}` : 'erp_employee_documents';
// [JWT] GET /api/peoplepay/doc-templates?entityCode={e}
export const docTemplatesKey = (e: string): string =>
  e ? `erp_doc_templates_${e}` : 'erp_doc_templates';
