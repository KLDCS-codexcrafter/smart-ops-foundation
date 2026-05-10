/**
 * @file        src/test/procure360-vendor-agreements-engine.test.ts
 * @sprint      T-Phase-1.SM.Procure360-Vendor-Agreements · Block E
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import {
  listVendorAgreements,
  listAllVendorAgreements,
  createVendorAgreement,
} from '@/lib/procure360-vendor-agreements-engine';
import { findDocumentsByForeignKey } from '@/lib/docvault-engine';

describe('T-Phase-1.SM.Procure360-Vendor-Agreements · Engine · D-NEW-CJ Hub-and-Spoke 3rd consumer', () => {
  const entityCode = 'TEST_PROCURE360_VA';

  beforeEach(() => {
    localStorage.clear();
  });

  it('Q-LOCK-2a · createVendorAgreement writes Document with vendor_id FK', () => {
    const doc = createVendorAgreement(entityCode, {
      vendorId: 'vendor_001',
      title: 'Master Service Agreement',
      documentType: 'certification',
      originatingDepartmentId: 'procure360',
      initialVersion: {
        version_no: '1.0',
        file_url: '/test-msa.pdf',
        file_size_bytes: 100,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'user_test',
      },
    }, 'user_test');

    expect(doc.vendor_id).toBe('vendor_001');
    expect(doc.title).toBe('Master Service Agreement');
    expect(doc.versions[0].version_status).toBe('draft');
    expect(doc.project_id).toBeNull();
    expect(doc.customer_id).toBeNull();
    expect(doc.nc_id).toBeNull();
  });

  it('Q-LOCK-5a · listVendorAgreements uses findDocumentsByForeignKey (D-NEW-CJ canonical)', () => {
    createVendorAgreement(entityCode, {
      vendorId: 'vendor_A', title: 'NDA Vendor A', documentType: 'certification',
      originatingDepartmentId: 'procure360',
      initialVersion: { version_no: '1.0', file_url: '/a.pdf', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');
    createVendorAgreement(entityCode, {
      vendorId: 'vendor_B', title: 'MSA Vendor B', documentType: 'iso_iec_doc',
      originatingDepartmentId: 'procure360',
      initialVersion: { version_no: '1.0', file_url: '/b.pdf', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');

    const docsA = listVendorAgreements(entityCode, 'vendor_A');
    const docsB = listVendorAgreements(entityCode, 'vendor_B');
    expect(docsA).toHaveLength(1);
    expect(docsA[0].title).toBe('NDA Vendor A');
    expect(docsB).toHaveLength(1);

    const directA = findDocumentsByForeignKey(entityCode, 'vendor_id', 'vendor_A');
    expect(directA).toEqual(docsA);
  });

  it('Q-LOCK-8b · listAllVendorAgreements filters out non-vendor documents', () => {
    createVendorAgreement(entityCode, {
      vendorId: 'vendor_X', title: 'V-Doc', documentType: 'certification',
      originatingDepartmentId: 'procure360',
      initialVersion: { version_no: '1.0', file_url: '/x.pdf', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');

    const all = listAllVendorAgreements(entityCode);
    expect(all.every((d) => d.vendor_id != null)).toBe(true);
    expect(all).toHaveLength(1);
  });

  it('Q-LOCK-13a · D-NEW-CJ pattern reuse · 3rd consumer institutional pattern at-scale (sentinel · cite preserved)', () => {
    const content = execSync(`cat src/lib/procure360-vendor-agreements-engine.ts`).toString();
    expect(content).toMatch(/D-NEW-CJ-docvault-file-metadata-schema/);
    expect(content).toMatch(/3rd CONSUMER/);
    expect(content).toMatch(/4th consumer FR promotion threshold/);
  });
});
