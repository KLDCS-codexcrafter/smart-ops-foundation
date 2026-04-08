/**
 * masters-seed-data.ts — Seed arrays for Supporting Masters
 * Mode of Payment, Terms of Payment, Terms of Delivery.
 * Pure data — no imports from other files.
 */

// ── Mode of Payment ─────────────────────────────────────────────────────────

export interface ModeOfPayment {
  id: string;
  code: string;
  name: string;
  remarks: string;
  isSeeded: boolean;
  isActive: boolean;
}

export const MODE_OF_PAYMENT_SEED: Omit<ModeOfPayment, 'id' | 'isSeeded' | 'isActive'>[] = [
  { code: 'MOP-001', name: 'Cash', remarks: 'Physical cash payment' },
  { code: 'MOP-002', name: 'Cheque', remarks: 'Cheque payment instrument' },
  { code: 'MOP-003', name: 'NEFT', remarks: 'National Electronic Funds Transfer' },
  { code: 'MOP-004', name: 'RTGS', remarks: 'Real Time Gross Settlement — for amounts above 2 lakhs' },
  { code: 'MOP-005', name: 'UPI / QR Code', remarks: 'UPI — PhonePe, Google Pay, Paytm, QR scan' },
  { code: 'MOP-006', name: 'IMPS', remarks: 'Immediate Payment Service — available 24×7' },
  { code: 'MOP-007', name: 'Demand Draft (DD)', remarks: 'Bank-issued payment instrument' },
  { code: 'MOP-008', name: 'Letter of Credit (LC)', remarks: 'Documentary credit — used in export/import' },
  { code: 'MOP-009', name: 'Bank Transfer', remarks: 'Generic wire or online transfer' },
  { code: 'MOP-010', name: 'Advance Online', remarks: 'Portal or digital advance payment' },
];

// ── Terms of Payment ────────────────────────────────────────────────────────

export interface TermsOfPayment {
  id: string;
  code: string;
  name: string;
  creditDays: number;
  advancePercent: number;
  notes: string;
  isSeeded: boolean;
  isActive: boolean;
}

export const TERMS_OF_PAYMENT_SEED: Omit<TermsOfPayment, 'id' | 'isSeeded' | 'isActive'>[] = [
  { code: 'TOP-001', name: 'Immediate', creditDays: 0, advancePercent: 0, notes: 'Pay on delivery or in advance' },
  { code: 'TOP-002', name: 'Net 7 Days', creditDays: 7, advancePercent: 0, notes: '' },
  { code: 'TOP-003', name: 'Net 15 Days', creditDays: 15, advancePercent: 0, notes: '' },
  { code: 'TOP-004', name: 'Net 30 Days', creditDays: 30, advancePercent: 0, notes: 'Standard credit period' },
  { code: 'TOP-005', name: 'Net 45 Days', creditDays: 45, advancePercent: 0, notes: 'MSME compliance boundary' },
  { code: 'TOP-006', name: 'Net 60 Days', creditDays: 60, advancePercent: 0, notes: '' },
  { code: 'TOP-007', name: 'Net 90 Days', creditDays: 90, advancePercent: 0, notes: 'Long credit' },
  { code: 'TOP-008', name: '50% Advance', creditDays: 0, advancePercent: 50, notes: '50% advance, balance on delivery' },
  { code: 'TOP-009', name: '100% Advance', creditDays: 0, advancePercent: 100, notes: 'Full payment before delivery' },
  { code: 'TOP-010', name: 'Against LC', creditDays: 0, advancePercent: 0, notes: 'Letter of Credit payment' },
];

// ── Terms of Delivery ───────────────────────────────────────────────────────

export interface TermsOfDelivery {
  id: string;
  code: string;
  name: string;
  freightResponsibility: string;
  description: string;
  isSeeded: boolean;
  isActive: boolean;
}

export const TERMS_OF_DELIVERY_SEED: Omit<TermsOfDelivery, 'id' | 'isSeeded' | 'isActive'>[] = [
  { code: 'TOD-001', name: 'Ex-Works (EXW)', freightResponsibility: 'Buyer', description: 'Buyer collects from our factory — minimum seller obligation' },
  { code: 'TOD-002', name: 'FOR Destination', freightResponsibility: 'Seller', description: 'Seller delivers to buyer door — freight included in price' },
  { code: 'TOD-003', name: 'FOR Despatching Station', freightResponsibility: 'Split', description: 'Seller loads at origin, buyer pays freight forward' },
  { code: 'TOD-004', name: 'Free On Board (FOB)', freightResponsibility: 'Split', description: 'Seller responsible to port of shipment — used in export' },
  { code: 'TOD-005', name: 'Cost Insurance Freight (CIF)', freightResponsibility: 'Seller', description: 'Seller pays to destination port including insurance — import' },
  { code: 'TOD-006', name: 'Cost and Freight (C&F)', freightResponsibility: 'Seller', description: 'Seller pays freight to destination port, no insurance' },
  { code: 'TOD-007', name: 'Delivered Duty Unpaid (DDU)', freightResponsibility: 'Seller', description: 'Seller to destination, buyer pays customs duties' },
  { code: 'TOD-008', name: 'Delivered Duty Paid (DDP)', freightResponsibility: 'Seller', description: 'Seller pays everything including customs — maximum obligation' },
  { code: 'TOD-009', name: 'Door Delivery', freightResponsibility: 'Seller', description: "Seller's vehicle delivers to buyer's premises" },
  { code: 'TOD-010', name: 'To Pay (TP)', freightResponsibility: 'Buyer', description: 'Buyer pays freight charges on delivery to transporter' },
];
