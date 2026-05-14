/**
 * Sprint T-Phase-1.C.1a · Block I.7 + I.8 · ServiceDesk Shell routing + additive extension verification
 */
import { describe, it, expect } from 'vitest';
import { servicedeskShellConfig } from '@/apps/erp/configs/servicedesk-shell-config';
import { servicedeskSidebarItems } from '@/apps/erp/configs/servicedesk-sidebar-config';
import { SAM_GROUP_CODE, type SAMPersonType } from '@/types/sam-person';
import { DEFAULT_NON_FINECORE_VOUCHER_TYPES, type NonFinCoreVoucherFamily } from '@/lib/non-fincore-voucher-type-registry';
import { MOBILE_PRODUCTS } from '@/config/mobile-products';

describe('ServiceDesk Shell routing · 12th card on Shell', () => {
  it('shell config has product code SD and landingRoute /erp/servicedesk', () => {
    expect(servicedeskShellConfig.product.code).toBe('SD');
    expect(servicedeskShellConfig.routing.landingRoute).toBe('/erp/servicedesk');
  });
  it('sidebar has 12 groups + welcome item (10 from C.1e + Marketplace+Refurb + Phase 2 Preview at C.1f)', () => {
    expect(servicedeskSidebarItems.length).toBe(13);
    expect(servicedeskSidebarItems[0].id).toBe('welcome');
  });
  it('FR-74 keyboard namespace "d" registered on welcome', () => {
    expect(servicedeskSidebarItems[0].keyboard).toBe('d w');
  });
  it('all sidebar items require servicedesk card', () => {
    const flat = servicedeskSidebarItems.flatMap((i) => [i, ...(i.children ?? [])]);
    const items = flat.filter((i) => i.type === 'item');
    items.forEach((i) => expect(i.requiredCards).toEqual(['servicedesk']));
  });
});

describe('SAMPersonType extension · additive · existing values preserved', () => {
  it('includes 2 new service roles', () => {
    const roles: SAMPersonType[] = ['service_engineer', 'service_call_center_agent'];
    roles.forEach((r) => expect(SAM_GROUP_CODE[r]).toBeTruthy());
  });
  it('existing roles preserved (project_manager + salesman + receiver)', () => {
    expect(SAM_GROUP_CODE.project_manager).toBe('MGMT');
    expect(SAM_GROUP_CODE.salesman).toBe('SLSM');
    expect(SAM_GROUP_CODE.receiver).toBe('RCVR');
  });
});

describe('NonFinCoreVoucherFamily extension · D-127/128a sibling discipline preserved', () => {
  it('registers 5 ServiceDesk voucher types', () => {
    const ids = ['vt-amc-invoice', 'vt-amc-proposal', 'vt-service-invoice', 'vt-oem-claim-cn', 'vt-amc-receipt'];
    ids.forEach((id) => expect(DEFAULT_NON_FINECORE_VOUCHER_TYPES.find((v) => v.id === id)).toBeTruthy());
  });
  it('amc_invoice and service_invoice families are present', () => {
    const families: NonFinCoreVoucherFamily[] = ['amc_invoice', 'service_invoice'];
    families.forEach((f) =>
      expect(DEFAULT_NON_FINECORE_VOUCHER_TYPES.some((v) => v.family === f)).toBe(true),
    );
  });
});

describe('MOBILE_PRODUCTS additive · D-NEW-CV 2 → 3', () => {
  it('registers servicedesk entry with correct shape', () => {
    const sd = MOBILE_PRODUCTS.find((p) => p.id === 'servicedesk');
    expect(sd).toBeTruthy();
    expect(sd?.role).toBe('service_engineer');
    expect(sd?.landingPath).toBe('/operix-go/service-engineer');
  });
  it('preserves sitex + maintainpro entries', () => {
    expect(MOBILE_PRODUCTS.find((p) => p.id === 'sitex')).toBeTruthy();
    expect(MOBILE_PRODUCTS.find((p) => p.id === 'maintainpro')).toBeTruthy();
  });
});
