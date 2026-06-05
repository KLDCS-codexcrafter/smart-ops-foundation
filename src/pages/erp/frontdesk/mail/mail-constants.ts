/**
 * @file        src/pages/erp/frontdesk/mail/mail-constants.ts
 * @sprint      S148.T1 hotfix · shared mail UI constants (pure exports, no components)
 */

// S148.T1 · CSV column shape (asserted in tests)
export const MAIL_INWARD_CSV_COLUMNS = [
  'Mail No', 'Received', 'Kind', 'Description', 'Addressee', 'From', 'Status',
] as const;
export const MAIL_OUTWARD_CSV_COLUMNS = [
  'Mail No', 'Created', 'Kind', 'Description', 'Recipient', 'Mode', 'Status', 'Proof',
] as const;

// S148.T1 · UI-level editable field allowlist (immutable facts disabled in the form)
export const MAIL_EDITABLE_KEYS = [
  'description', 'courierName', 'awbDocketNo', 'notes', 'fromText', 'toText',
] as const;
