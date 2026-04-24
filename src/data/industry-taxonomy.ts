/**
 * @file     industry-taxonomy.ts
 * @purpose  Single source of truth for the Business Entity / Industry Sector / Business Activity
 *           hierarchy used across Parent Company, Company, Branch Office, Customer, Vendor, and
 *           Logistic masters. Replaces 6 sets of locally-duplicated flat arrays.
 *           Also exports OPERATING_SCALES (commercial-tier band — NOT strict MSME).
 * @sprint   T-H1.5-C-S3
 * @finding  CC-013, CC-014
 * @source   Industry_Activity_Hierarchy_DRAFT.md (founder-approved Apr 2026)
 */

// ── Business Entity (Legal Identity) ──────────────────────────────────────
export const BUSINESS_ENTITIES = [
  'Private Limited',
  'Public Limited',
  'LLP',
  'OPC',
  'Partnership',
  'Sole Proprietorship',
  'HUF',
  'Trust',
  'Society',
  'Government Entity',
  'Branch Office',
  'Foreign Entity',
] as const;
export type BusinessEntity = typeof BUSINESS_ENTITIES[number];

// ── Industry Sector → Business Activity Hierarchy ─────────────────────────

export interface IndustryActivity {
  /** Short canonical identifier (kebab-case). Used as stored value. */
  id: string;
  /** Display label. Shown in dropdowns. */
  label: string;
}

export interface IndustrySector {
  id: string;
  label: string;
  activities: IndustryActivity[];
}

export const INDUSTRY_SECTORS: IndustrySector[] = [
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    activities: [
      { id: 'pharmaceuticals', label: 'Pharmaceuticals (API, Formulations, Schedule H/H1)' },
      { id: 'chemicals-petrochemicals', label: 'Chemicals & Petrochemicals' },
      { id: 'textiles-apparel', label: 'Textiles & Apparel' },
      { id: 'steel-metals', label: 'Steel & Metals Processing' },
      { id: 'electronics-electrical', label: 'Electronics & Electrical' },
      { id: 'automotive-components', label: 'Automotive Components' },
      { id: 'food-beverage-processing', label: 'Food & Beverage Processing' },
      { id: 'fmcg-manufacturing', label: 'FMCG Manufacturing' },
      { id: 'plastics-packaging', label: 'Plastics & Packaging' },
      { id: 'engineering-goods', label: 'Engineering Goods (Machinery)' },
      { id: 'capital-goods', label: 'Capital Goods (Turnkey Projects)' },
      { id: 'contract-manufacturing', label: 'Contract Manufacturing (Job Work)' },
      { id: 'assembly-operations', label: 'Assembly Operations' },
      { id: 'others', label: 'Others — Manufacturing' },
    ],
  },
  {
    id: 'trading-distribution',
    label: 'Trading & Distribution',
    activities: [
      { id: 'wholesale-trading', label: 'Wholesale Trading' },
      { id: 'retail-single', label: 'Retail — Single Outlet' },
      { id: 'retail-multi', label: 'Retail — Multi-Outlet / Chain' },
      { id: 'franchise-operations', label: 'Franchise Operations' },
      { id: 'ecommerce-d2c', label: 'E-Commerce / D2C' },
      { id: 'marketplace-seller', label: 'Marketplace Seller (Amazon/Flipkart/Blinkit etc.)' },
      { id: 'b2b-distribution', label: 'B2B Distribution (C&F / Super Stockist / Distributor)' },
      { id: 'quick-commerce', label: 'Quick Commerce (10-min delivery)' },
      { id: 'import-export-house', label: 'Import / Export House' },
      { id: 'stockist-dealer', label: 'Stockist / Dealer' },
      { id: 'commission-agent', label: 'Commission Agent / Broker' },
      { id: 'multi-brand-showroom', label: 'Multi-Brand Showroom' },
      { id: 'others', label: 'Others — Trading' },
    ],
  },
  {
    id: 'services-professional',
    label: 'Services (Professional)',
    activities: [
      { id: 'it-services', label: 'IT Services & Software Development' },
      { id: 'ites-bpo-kpo', label: 'IT-Enabled Services (BPO/KPO)' },
      { id: 'consulting-management', label: 'Consulting — Management' },
      { id: 'consulting-technology', label: 'Consulting — Technology' },
      { id: 'legal-services', label: 'Legal Services' },
      { id: 'accounting-auditing', label: 'Accounting / Auditing / CA Practice' },
      { id: 'architecture-design', label: 'Architecture / Design' },
      { id: 'advertising-marketing', label: 'Advertising & Marketing' },
      { id: 'hr-staffing', label: 'HR / Staffing / Recruitment' },
      { id: 'research-analytics', label: 'Research & Analytics' },
      { id: 'others', label: 'Others — Professional Services' },
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    activities: [
      { id: 'hospital-multi-specialty', label: 'Hospital — Multi-Specialty' },
      { id: 'hospital-single-specialty', label: 'Hospital — Single-Specialty' },
      { id: 'clinic-polyclinic', label: 'Clinic / Polyclinic / Day-Care' },
      { id: 'diagnostic-lab', label: 'Diagnostic Lab / Pathology' },
      { id: 'pharmacy-retail', label: 'Pharmacy — Retail' },
      { id: 'pharmacy-hospital', label: 'Pharmacy — Hospital' },
      { id: 'medical-device-distribution', label: 'Medical Device Distribution' },
      { id: 'homecare-telemedicine', label: 'Homecare / Telemedicine' },
      { id: 'ayurveda-ayush', label: 'Ayurveda / AYUSH' },
      { id: 'others', label: 'Others — Healthcare' },
    ],
  },
  {
    id: 'construction-realestate',
    label: 'Construction & Real Estate',
    activities: [
      { id: 'realestate-residential', label: 'Real Estate — Residential Developer' },
      { id: 'realestate-commercial', label: 'Real Estate — Commercial Developer' },
      { id: 'realestate-rental', label: 'Real Estate — Rental / Leasing / Property Mgmt' },
      { id: 'construction-civil', label: 'Construction — Civil / Building' },
      { id: 'construction-infra', label: 'Construction — Infrastructure (Roads/Bridges)' },
      { id: 'construction-epc', label: 'Construction — EPC Contractor' },
      { id: 'interior-design', label: 'Interior Design & Fit-Out' },
      { id: 'architecture-planning', label: 'Architecture & Planning' },
      { id: 'others', label: 'Others — Construction & Real Estate' },
    ],
  },
  {
    id: 'logistics-transport',
    label: 'Logistics & Transport',
    activities: [
      { id: 'freight-forwarding', label: 'Freight Forwarding' },
      { id: 'road-transport-ftl', label: 'Road Transport (Full Truckload)' },
      { id: 'road-transport-lcl', label: 'Road Transport (LCL / Courier)' },
      { id: 'warehousing-3pl', label: 'Warehousing & 3PL' },
      { id: 'cold-chain', label: 'Cold Chain Logistics' },
      { id: 'last-mile', label: 'Last-Mile Delivery' },
      { id: 'cha', label: 'Customs House Agent (CHA)' },
      { id: 'shipping-maritime', label: 'Shipping / Maritime' },
      { id: 'others', label: 'Others — Logistics' },
    ],
  },
  {
    id: 'financial-services',
    label: 'Financial Services',
    activities: [
      { id: 'nbfc-lending', label: 'NBFC / Lending' },
      { id: 'insurance-broking', label: 'Insurance Broking' },
      { id: 'stock-broking', label: 'Stock Broking / Investment Advisory' },
      { id: 'mutual-fund-distribution', label: 'Mutual Fund Distribution' },
      { id: 'fintech', label: 'Fintech' },
      { id: 'payment-services', label: 'Payment Services' },
      { id: 'others', label: 'Others — Financial Services' },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    activities: [
      { id: 'school-k12', label: 'School (K-12)' },
      { id: 'college-university', label: 'College / University' },
      { id: 'coaching-tutoring', label: 'Coaching / Tutoring Institute' },
      { id: 'vocational-skill', label: 'Vocational / Skill Training' },
      { id: 'edtech', label: 'EdTech (Online)' },
      { id: 'others', label: 'Others — Education' },
    ],
  },
  {
    id: 'hospitality-foodservice',
    label: 'Hospitality & Food Service',
    activities: [
      { id: 'hotel-resort', label: 'Hotel / Resort' },
      { id: 'restaurant-dinein', label: 'Restaurant — Dine-in' },
      { id: 'restaurant-cloud-kitchen', label: 'Restaurant — Cloud Kitchen / Delivery-only' },
      { id: 'catering-services', label: 'Catering Services' },
      { id: 'cafe-qsr', label: 'Café / Quick Service Restaurant' },
      { id: 'event-management', label: 'Event Management' },
      { id: 'others', label: 'Others — Hospitality' },
    ],
  },
  {
    id: 'services-personal',
    label: 'Services (Personal / Lifestyle)',
    activities: [
      { id: 'salon-spa-wellness', label: 'Salon / Spa / Wellness' },
      { id: 'gym-fitness', label: 'Gym / Fitness Centre' },
      { id: 'laundry-drycleaning', label: 'Laundry / Dry Cleaning' },
      { id: 'home-services', label: 'Home Services (Plumbing/Electrical/Pest)' },
      { id: 'automotive-service', label: 'Automotive Service (Garage / Dealer Service)' },
      { id: 'others', label: 'Others — Personal Services' },
    ],
  },
  {
    id: 'others',
    label: 'Others',
    activities: [
      { id: 'agriculture-farming', label: 'Agriculture / Farming' },
      { id: 'dairy-livestock', label: 'Dairy / Livestock' },
      { id: 'mining-quarrying', label: 'Mining & Quarrying' },
      { id: 'energy-power', label: 'Energy / Power / Renewables' },
      { id: 'media-publishing', label: 'Media / Publishing / Broadcasting' },
      { id: 'ngo-trust', label: 'NGO / Trust / Non-Profit' },
      { id: 'government-psu', label: 'Government / PSU' },
      { id: 'cooperative-society', label: 'Cooperative Society' },
      { id: 'others', label: 'Others — Custom' },
    ],
  },
];

// ── Resolver helpers ──────────────────────────────────────────────────────

export function getActivitiesForSector(sectorId: string): IndustryActivity[] {
  const sector = INDUSTRY_SECTORS.find(s => s.id === sectorId);
  return sector?.activities ?? [];
}

export function getSectorLabel(sectorId: string): string {
  return INDUSTRY_SECTORS.find(s => s.id === sectorId)?.label ?? sectorId;
}

export function getActivityLabel(sectorId: string, activityId: string): string {
  const act = getActivitiesForSector(sectorId).find(a => a.id === activityId);
  return act?.label ?? activityId;
}

// ── Operating Scale (commercial tier — NOT strict MSME) ───────────────────

export const OPERATING_SCALES = [
  { id: 'micro',      label: 'Micro',      hint: 'Turnover < ₹5 Cr' },
  { id: 'small',      label: 'Small',      hint: 'Turnover ₹5 Cr – ₹50 Cr' },
  { id: 'medium',     label: 'Medium',     hint: 'Turnover ₹50 Cr – ₹250 Cr' },
  { id: 'large',      label: 'Large',      hint: 'Turnover ₹250 Cr – ₹1,000 Cr' },
  { id: 'enterprise', label: 'Enterprise', hint: 'Turnover > ₹1,000 Cr' },
] as const;
export type OperatingScale = typeof OPERATING_SCALES[number]['id'];
