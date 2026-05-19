/**
 * @file        src/data/foreign-parties-seed-data.ts
 * @purpose     Sinha demo seed · 2 foreign customers + 2 foreign vendors + 5 countries + 5 ports
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   EX-1-Q7=b minimal seed · FR-72 Sinha demo continuity · Q5 Sinha extended
 */

import type { ForeignCustomer } from '@/types/foreign-customer';
import type { ForeignVendor } from '@/types/foreign-vendor';

export const SINHA_FOREIGN_CUSTOMERS: ForeignCustomer[] = [
  {
    id: 'fc-sinha-001',
    entity_id: 'sinha-trading',
    customer_name: 'Al-Rashid Trading LLC',
    country_code: 'AE',
    country_name: 'United Arab Emirates',
    customer_type: 'distributor',
    primary_contact: 'Khalid Al-Rashid',
    email: 'khalid@alrashid-trading.ae',
    phone: '+971-50-1234567',
    billing_address: 'Office 412, Al Garhoud Plaza, Dubai',
    shipping_address: 'Jebel Ali Free Zone, Warehouse B-17, Dubai',
    currency_code: 'AED',
    payment_terms: '30 days LC at sight via Emirates NBD',
    preferred_incoterm: 'CIF',
    credit_limit: 500000,
    created_at: '2025-04-01T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z',
  },
  {
    id: 'fc-sinha-002',
    entity_id: 'sinha-trading',
    customer_name: 'PT Indah Mas Trading',
    country_code: 'ID',
    country_name: 'Indonesia',
    customer_type: 'end-customer',
    primary_contact: 'Budi Hartono',
    email: 'budi@indahmas.co.id',
    phone: '+62-21-5550-9876',
    billing_address: 'Jl. Sudirman Kav. 32, Jakarta Pusat',
    shipping_address: 'Tanjung Priok Port, Container Yard 4, Jakarta',
    currency_code: 'USD',
    payment_terms: '60 days from BL date',
    preferred_incoterm: 'FOB',
    credit_limit: 250000,
    created_at: '2025-04-15T00:00:00Z',
    updated_at: '2025-04-15T00:00:00Z',
  },
];

export const SINHA_FOREIGN_VENDORS: ForeignVendor[] = [
  {
    id: 'fv-sinha-001',
    entity_id: 'sinha-trading',
    vendor_name: 'Guangzhou Industrial Supply Co., Ltd.',
    country_code: 'CN',
    country_name: 'China',
    vendor_type: 'manufacturer',
    primary_contact: 'Li Wei',
    email: 'liwei@gz-industrial.cn',
    phone: '+86-20-8888-1234',
    address: 'Building 7, Pazhou Industrial Park, Guangzhou 510000',
    currency_code: 'USD',
    payment_terms: '30% advance + 70% against BL copy',
    preferred_incoterm: 'CIF',
    created_at: '2025-04-01T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z',
  },
  {
    id: 'fv-sinha-002',
    entity_id: 'sinha-trading',
    vendor_name: 'Bangkok Components Trading Ltd.',
    country_code: 'TH',
    country_name: 'Thailand',
    vendor_type: 'trader',
    primary_contact: 'Somchai Phanuwat',
    email: 'somchai@bkk-components.co.th',
    phone: '+66-2-555-7890',
    address: '88/12 Phaholyothin Road, Bangkok 10400',
    currency_code: 'USD',
    payment_terms: '45 days from invoice date',
    preferred_incoterm: 'FOB',
    created_at: '2025-04-10T00:00:00Z',
    updated_at: '2025-04-10T00:00:00Z',
  },
];

export const SINHA_COUNTRIES_SEED = [
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'CN', name: 'China' },
  { code: 'TH', name: 'Thailand' },
  { code: 'SG', name: 'Singapore' },
];

export const SINHA_PORTS_SEED = [
  { code: 'INNSA', name: 'Nhava Sheva, India' },
  { code: 'AEJEA', name: 'Jebel Ali, UAE' },
  { code: 'IDTPP', name: 'Tanjung Priok, Indonesia' },
  { code: 'CNGZH', name: 'Guangzhou, China' },
  { code: 'THBKK', name: 'Bangkok, Thailand' },
];
