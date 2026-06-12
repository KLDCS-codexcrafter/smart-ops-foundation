/**
 * @sprint M1 · Mobile-ARC Close · Vendor app tests
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { billPassingKey } from '@/types/bill-passing';
import { purchaseOrdersKey } from '@/types/po';
import { vendorPaymentBatchKey } from '@/types/vendor-payment-batch';
import { vendorDocumentRequestKey } from '@/types/vendor-document-request';

const SRC = join(process.cwd(), 'src/pages/mobile/vendor');

describe('M1 · Vendor app · structural mounts', () => {
  it('all 6 vendor pages exist', () => {
    for (const f of [
      'MobileVendorHome.tsx', 'MobilePOAckPage.tsx', 'MobileASNCreatePage.tsx',
      'MobileVendorInvoiceSubmitPage.tsx', 'MobileVendorPaymentsPage.tsx', 'MobileVendorDocsPage.tsx',
    ]) {
      expect(existsSync(join(SRC, f))).toBe(true);
    }
  });
});

describe('M1 · Vendor app · same-field writes (zero new engines)', () => {
  it('PO ack appends a PoFollowup with outcome=committed on purchaseOrdersKey', () => {
    const src = readFileSync(join(SRC, 'MobilePOAckPage.tsx'), 'utf8');
    expect(src).toMatch(/purchaseOrdersKey/);
    expect(src).toMatch(/outcome:\s*'committed'/);
    expect(src).toMatch(/PO acknowledged/);
    expect(purchaseOrdersKey('X')).toBe('erp_purchase_orders_X');
  });

  it('Invoice submit reaches the existing billPassing 3-way-match intake', () => {
    const src = readFileSync(join(SRC, 'MobileVendorInvoiceSubmitPage.tsx'), 'utf8');
    expect(src).toMatch(/billPassingKey/);
    expect(src).toMatch(/status:\s*'pending_match'/);
    expect(billPassingKey('X')).toBe('erp_bill_passing_X');
  });

  it('ASN page writes follow-up on PO (no parallel ASN store invented)', () => {
    const src = readFileSync(join(SRC, 'MobileASNCreatePage.tsx'), 'utf8');
    expect(src).toMatch(/purchaseOrdersKey/);
    expect(src).toMatch(/ASN:/);
    expect(src).not.toMatch(/asnsKey|new ASN store/i);
  });

  it('Payments page is read-only against vendorPaymentBatchKey', () => {
    const src = readFileSync(join(SRC, 'MobileVendorPaymentsPage.tsx'), 'utf8');
    expect(src).toMatch(/vendorPaymentBatchKey/);
    expect(src).not.toMatch(/localStorage\.setItem\(vendorPaymentBatchKey/);
    expect(vendorPaymentBatchKey('X')).toBe('erp_vendor_payment_batches_X');
  });

  it('Docs page toggles VendorDocumentRequest.status=submitted (existing field)', () => {
    const src = readFileSync(join(SRC, 'MobileVendorDocsPage.tsx'), 'utf8');
    expect(src).toMatch(/vendorDocumentRequestKey/);
    expect(src).toMatch(/status:\s*'submitted'/);
    expect(src).toMatch(/submitted_at/);
    expect(vendorDocumentRequestKey('X')).toBe('erp_vendor_document_requests_X');
  });
});

describe('M1 · Vendor app · external-persona honesty', () => {
  it('Home shows the Wave-2 chip (built-now, opened-Wave-2)', () => {
    const src = readFileSync(join(SRC, 'MobileVendorHome.tsx'), 'utf8');
    expect(src).toMatch(/Wave-2/);
    expect(src).toMatch(/built now/i);
  });
});
