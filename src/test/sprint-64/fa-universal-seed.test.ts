/**
 * @file FAR-0 Theme 1 · Universal FA seed smoke tests · Lesson 19 ID-lookup only
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  FA_UNIVERSAL_CATEGORIES,
  seedFAUniversalCategories,
  faUniversalCategoriesKey,
} from '@/data/fa-universal-categories-seed-data';
import {
  FA_UNIVERSAL_LOCATIONS,
  seedFAUniversalLocations,
  faUniversalLocationsKey,
} from '@/data/fa-universal-locations-seed-data';
import {
  FA_UNIVERSAL_DEPARTMENTS,
  seedFAUniversalDepartments,
  faUniversalDepartmentsKey,
} from '@/data/fa-universal-departments-seed-data';
import {
  FA_UNIVERSAL_VENDOR_CATEGORIES,
  seedFAUniversalVendorCategories,
  faUniversalVendorCategoriesKey,
} from '@/data/fa-universal-vendor-categories-seed-data';
import {
  FA_UNIVERSAL_DOCUMENT_TYPES,
  seedFAUniversalDocumentTypes,
  faUniversalDocumentTypesKey,
} from '@/data/fa-universal-document-types-seed-data';

const E = 'TEST64';

beforeEach(() => {
  localStorage.removeItem(faUniversalCategoriesKey(E));
  localStorage.removeItem(faUniversalLocationsKey(E));
  localStorage.removeItem(faUniversalDepartmentsKey(E));
  localStorage.removeItem(faUniversalVendorCategoriesKey(E));
  localStorage.removeItem(faUniversalDocumentTypesKey(E));
});

describe('FAR-0 Theme 1 · Universal FA seed data', () => {
  it('FA_UNIVERSAL_CATEGORIES contains Plant & Machinery with Schedule II rates', () => {
    const plant = FA_UNIVERSAL_CATEGORIES.find(c => c.id === 'cat-plant-mach');
    expect(plant?.schedule_ii_rate_wdv).toBe(0.1518);
    expect(plant?.it_act_block).toBe('Plant & Machinery');
  });

  it('seedFAUniversalCategories is idempotent · entity-scoped key', () => {
    seedFAUniversalCategories(E);
    seedFAUniversalCategories(E);
    const stored = JSON.parse(localStorage.getItem(faUniversalCategoriesKey(E)) || '[]');
    expect(stored.length).toBe(FA_UNIVERSAL_CATEGORIES.length);
  });

  it('seedFAUniversalLocations · bonded warehouse present', () => {
    seedFAUniversalLocations(E);
    const stored = JSON.parse(localStorage.getItem(faUniversalLocationsKey(E)) || '[]');
    expect(stored.find((l: { id: string }) => l.id === 'loc-bonded-warehouse')).toBeDefined();
    expect(stored.length).toBe(FA_UNIVERSAL_LOCATIONS.length);
  });

  it('seedFAUniversalDepartments seeds Production · QC · IT', () => {
    seedFAUniversalDepartments(E);
    const stored = JSON.parse(localStorage.getItem(faUniversalDepartmentsKey(E)) || '[]');
    expect(stored.find((d: { id: string }) => d.id === 'dept-production')).toBeDefined();
    expect(stored.length).toBe(FA_UNIVERSAL_DEPARTMENTS.length);
  });

  it('seedFAUniversalVendorCategories seeds OEM · Foreign · Lease', () => {
    seedFAUniversalVendorCategories(E);
    const stored = JSON.parse(localStorage.getItem(faUniversalVendorCategoriesKey(E)) || '[]');
    expect(stored.find((v: { id: string }) => v.id === 'vcat-oem')).toBeDefined();
    expect(stored.length).toBe(FA_UNIVERSAL_VENDOR_CATEGORIES.length);
  });

  it('seedFAUniversalDocumentTypes seeds Capitalization Voucher', () => {
    seedFAUniversalDocumentTypes(E);
    const stored = JSON.parse(localStorage.getItem(faUniversalDocumentTypesKey(E)) || '[]');
    expect(stored.find((d: { id: string }) => d.id === 'doc-capitalization-voucher')).toBeDefined();
    expect(stored.length).toBe(FA_UNIVERSAL_DOCUMENT_TYPES.length);
  });
});
