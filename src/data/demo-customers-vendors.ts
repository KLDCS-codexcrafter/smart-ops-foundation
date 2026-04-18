/**
 * demo-customers-vendors.ts — Indian B2B masters for demo seeding
 * Pure data — no side effects on import. Archetype-tagged.
 * [JWT] Read by orchestrator → POST /api/masters/customers + /api/masters/vendors
 */

export type DemoArchetype = 'trading' | 'services' | 'manufacturing';

interface DemoContact {
  id: string; contactPerson: string; designation: string;
  phone: string; mobile: string; email: string; isPrimary: boolean;
}
interface DemoAddress {
  id: string; label: string; addressLine: string;
  stateName: string; gstStateCode: string; cityName: string;
  districtName: string; pinCode: string;
  isBilling: boolean; isDefaultShipTo: boolean;
}
export interface ArchetypedCustomer {
  _archetype: DemoArchetype | 'all';
  partyCode: string; partyName: string; mailingName?: string;
  customerType: string; gstin: string; pan: string;
  creditLimit: number; creditDays: number;
  contacts: DemoContact[]; addresses: DemoAddress[];
  isActive: boolean; openingBalance: number;
}
export interface ArchetypedVendor {
  _archetype: DemoArchetype | 'all';
  partyCode: string; partyName: string;
  vendorType: string; gstin: string; pan: string;
  creditDays: number;
  contacts: DemoContact[]; addresses: DemoAddress[];
  isActive: boolean; openingBalance: number;
}

const addr = (city: string, state: string, code: string, pin: string, line: string): DemoAddress => ({
  id: `a-${city.toLowerCase()}`, label: 'HO', addressLine: line,
  stateName: state, gstStateCode: code, cityName: city,
  districtName: city, pinCode: pin, isBilling: true, isDefaultShipTo: true,
});
const contact = (name: string, phone: string, email: string): DemoContact => ({
  id: `c-${name.split(' ')[0].toLowerCase()}`, contactPerson: name,
  designation: 'Proprietor', phone: '022-22223333', mobile: phone, email, isPrimary: true,
});

// ─── Customers ─────────────────────────────────────────────────────────
export const DEMO_CUSTOMERS: ArchetypedCustomer[] = [
  // 20 Trading
  { _archetype: 'trading', partyCode: 'CUST-T001', partyName: 'Sharma Traders',
    customerType: 'distributor', gstin: '27ABCDE1234F1Z5', pan: 'ABCDE1234F',
    creditLimit: 500000, creditDays: 30,
    contacts: [contact('Rajesh Sharma', '+919820123456', 'rajesh@sharmatraders.in')],
    addresses: [addr('Mumbai', 'Maharashtra', '27', '400002', '12 Zaveri Bazaar')],
    isActive: true, openingBalance: 0 },
  { _archetype: 'trading', partyCode: 'CUST-T002', partyName: 'Gupta Enterprises',
    customerType: 'distributor', gstin: '07AAACG1234F1Z5', pan: 'AAACG1234F',
    creditLimit: 800000, creditDays: 45,
    contacts: [contact('Amit Gupta', '+919811111222', 'amit@guptaent.in')],
    addresses: [addr('Delhi', 'Delhi', '07', '110001', '45 Connaught Place')],
    isActive: true, openingBalance: 0 },
  { _archetype: 'trading', partyCode: 'CUST-T003', partyName: 'Patel & Sons',
    customerType: 'retailer', gstin: '24AAAPP1234F1Z5', pan: 'AAAPP1234F',
    creditLimit: 300000, creditDays: 30,
    contacts: [contact('Hiren Patel', '+919898111222', 'hiren@patelsons.in')],
    addresses: [addr('Ahmedabad', 'Gujarat', '24', '380001', '88 CG Road')],
    isActive: true, openingBalance: 0 },
  { _archetype: 'trading', partyCode: 'CUST-T004', partyName: 'Verma Distributors',
    customerType: 'distributor', gstin: '09AAAVD1234F1Z5', pan: 'AAAVD1234F',
    creditLimit: 600000, creditDays: 45,
    contacts: [contact('Suresh Verma', '+919415111333', 'suresh@vermadist.in')],
    addresses: [addr('Lucknow', 'Uttar Pradesh', '09', '226001', '23 Hazratganj')],
    isActive: true, openingBalance: 0 },
  { _archetype: 'trading', partyCode: 'CUST-T005', partyName: 'Khanna Bros',
    customerType: 'wholesaler', gstin: '03AAAKB1234F1Z5', pan: 'AAAKB1234F',
    creditLimit: 1000000, creditDays: 60,
    contacts: [contact('Vikram Khanna', '+919876111000', 'vikram@khannabros.in')],
    addresses: [addr('Ludhiana', 'Punjab', '03', '141001', '5 Model Town')],
    isActive: true, openingBalance: 0 },
  ...['T006','T007','T008','T009','T010','T011','T012','T013','T014','T015',
      'T016','T017','T018','T019','T020'].map((c, i): ArchetypedCustomer => ({
    _archetype: 'trading', partyCode: `CUST-${c}`,
    partyName: ['Agarwal Trading','Sinha Wholesale','Mishra Stores','Iyer Distributors',
      'Reddy Enterprises','Naidu Traders','Pandey Bros','Tiwari Stockists',
      'Bhandari Mart','Jindal Distribution','Shah Enterprises','Goel Trade',
      'Mehta Wholesalers','Kapoor Trading','Bansal & Co'][i],
    customerType: 'distributor',
    gstin: `27AAA${c}1234F1Z5`, pan: `AAA${c}1234F`,
    creditLimit: 200000 + i * 50000, creditDays: [30, 45, 60][i % 3],
    contacts: [contact(`Trader ${i+1}`, `+9198${20000000 + i}`, `t${i+1}@example.in`)],
    addresses: [addr(['Pune','Nagpur','Surat','Indore','Bhopal'][i % 5],
      'Maharashtra', '27', '411001', `Plot ${i+1}, Industrial Area`)],
    isActive: true, openingBalance: 0,
  })),

  // 12 Services
  { _archetype: 'services', partyCode: 'CUST-S001', partyName: 'Accenture Consulting India Pvt Ltd',
    customerType: 'service_recipient', gstin: '29AABCA1234F1Z5', pan: 'AABCA1234F',
    creditLimit: 2500000, creditDays: 45,
    contacts: [contact('Ananya Rao', '+919900100200', 'ananya.rao@accenture.in')],
    addresses: [addr('Bangalore', 'Karnataka', '29', '560001', 'IBC Knowledge Park')],
    isActive: true, openingBalance: 0 },
  { _archetype: 'services', partyCode: 'CUST-S002', partyName: 'Deloitte Services',
    customerType: 'service_recipient', gstin: '36AABCD1234F1Z5', pan: 'AABCD1234F',
    creditLimit: 3000000, creditDays: 60,
    contacts: [contact('Rohit Mehra', '+919901100200', 'rohit@deloitte.in')],
    addresses: [addr('Hyderabad', 'Telangana', '36', '500032', 'HITEC City')],
    isActive: true, openingBalance: 0 },
  { _archetype: 'services', partyCode: 'CUST-S003', partyName: 'TechMahindra Solutions',
    customerType: 'service_recipient', gstin: '27AAACT1234F1Z5', pan: 'AAACT1234F',
    creditLimit: 1500000, creditDays: 30,
    contacts: [contact('Priya Nair', '+919902200200', 'priya@techmahindra.in')],
    addresses: [addr('Pune', 'Maharashtra', '27', '411014', 'Hinjewadi Phase 2')],
    isActive: true, openingBalance: 0 },
  { _archetype: 'services', partyCode: 'CUST-S004', partyName: 'Wipro Business Services',
    customerType: 'service_recipient', gstin: '29AAACW1234F1Z5', pan: 'AAACW1234F',
    creditLimit: 2000000, creditDays: 45,
    contacts: [contact('Karthik Iyer', '+919903300200', 'karthik@wipro.in')],
    addresses: [addr('Bangalore', 'Karnataka', '29', '560100', 'Sarjapur Road')],
    isActive: true, openingBalance: 0 },
  ...['S005','S006','S007','S008','S009','S010','S011','S012'].map((c, i): ArchetypedCustomer => ({
    _archetype: 'services', partyCode: `CUST-${c}`,
    partyName: ['Infosys Limited','TCS Services','HCL Tech','Zensar Tech',
      'Mindtree Consulting','Capgemini India','Cognizant Solutions','LTI Mindtree'][i],
    customerType: 'service_recipient', gstin: `29AABC${c}234F1Z5`, pan: `AABC${c}234F`,
    creditLimit: 800000 + i * 200000, creditDays: [30, 45, 60][i % 3],
    contacts: [contact(`Service Lead ${i+1}`, `+9199${10000000 + i}`, `lead${i+1}@svc.in`)],
    addresses: [addr(['Bangalore','Chennai','Pune','Mumbai'][i % 4], 'Karnataka', '29', '560066', `Tech Park Block ${i+1}`)],
    isActive: true, openingBalance: 0,
  })),

  // 13 Manufacturing
  { _archetype: 'manufacturing', partyCode: 'CUST-M001', partyName: 'Hero Auto Parts Ltd',
    customerType: 'manufacturer', gstin: '06AAACB1234F1Z5', pan: 'AAACB1234F',
    creditLimit: 5000000, creditDays: 60,
    contacts: [contact('Rajiv Munjal', '+919812345001', 'rajiv@heroauto.in')],
    addresses: [addr('Gurgaon', 'Haryana', '06', '122001', 'Sector 33')],
    isActive: true, openingBalance: 0 },
  { _archetype: 'manufacturing', partyCode: 'CUST-M002', partyName: 'Bajaj Steel Works',
    customerType: 'manufacturer', gstin: '27AAACB2234F1Z5', pan: 'AAACB2234F',
    creditLimit: 4500000, creditDays: 60,
    contacts: [contact('Sanjay Bajaj', '+919812345002', 'sanjay@bajajsteel.in')],
    addresses: [addr('Pune', 'Maharashtra', '27', '411019', 'Akurdi MIDC')],
    isActive: true, openingBalance: 0 },
  { _archetype: 'manufacturing', partyCode: 'CUST-M003', partyName: 'Godrej Appliances',
    customerType: 'manufacturer', gstin: '27AAACG3234F1Z5', pan: 'AAACG3234F',
    creditLimit: 3500000, creditDays: 45,
    contacts: [contact('Meher Pudumjee', '+919812345003', 'meher@godrej.in')],
    addresses: [addr('Mumbai', 'Maharashtra', '27', '400079', 'Vikhroli')],
    isActive: true, openingBalance: 0 },
  ...['M004','M005','M006','M007','M008','M009','M010','M011','M012','M013'].map((c, i): ArchetypedCustomer => ({
    _archetype: 'manufacturing', partyCode: `CUST-${c}`,
    partyName: ['Larsen Industrial','Tata Motors Components','Mahindra Forgings','Ashok Leyland Parts',
      'Cummins Engines','Bosch Auto Parts','Schneider Electric','ABB Industrial',
      'Siemens Components','Voltas Engineering'][i],
    customerType: 'manufacturer', gstin: `27AAA${c}1234F1Z5`, pan: `AAA${c}1234F`,
    creditLimit: 1500000 + i * 300000, creditDays: [45, 60, 90][i % 3],
    contacts: [contact(`Plant Mgr ${i+1}`, `+9198${33000000 + i}`, `mgr${i+1}@mfg.in`)],
    addresses: [addr(['Chennai','Pune','Coimbatore','Vadodara','Faridabad'][i % 5],
      'Tamil Nadu', '33', '600001', `Industrial Estate Plot ${i+1}`)],
    isActive: true, openingBalance: 0,
  })),
];

// ─── Vendors ───────────────────────────────────────────────────────────
export const DEMO_VENDORS: ArchetypedVendor[] = [
  // 15 Trading vendors
  ...Array.from({ length: 15 }, (_, i): ArchetypedVendor => ({
    _archetype: 'trading', partyCode: `VEND-T${String(i+1).padStart(3,'0')}`,
    partyName: ['Hindustan Wholesale','Mumbai Cargo','National Logistics','Reliance Suppliers',
      'Adani Trading','ITC Distribution','Britannia Foods Supply','Marico Wholesale',
      'Dabur Distribution','Patanjali Trade','Amul Cooperative','Nestle Suppliers',
      'PepsiCo India','Coca Cola Bottlers','HUL Distribution'][i],
    vendorType: 'supplier', gstin: `27AAAVT${String(i+1).padStart(2,'0')}34F1Z5`, pan: `AAAVT${String(i+1).padStart(2,'0')}34F`,
    creditDays: [15, 30, 45][i % 3],
    contacts: [contact(`Vendor T${i+1}`, `+9198${44000000 + i}`, `vt${i+1}@vendor.in`)],
    addresses: [addr('Mumbai', 'Maharashtra', '27', '400001', `Vendor Premises ${i+1}`)],
    isActive: true, openingBalance: 0,
  })),
  // 10 Services vendors
  ...Array.from({ length: 10 }, (_, i): ArchetypedVendor => ({
    _archetype: 'services', partyCode: `VEND-S${String(i+1).padStart(3,'0')}`,
    partyName: ['AWS India','Microsoft Azure','Google Cloud Platform','Salesforce India',
      'Oracle Cloud','Adobe Systems','SAP India','Workday India',
      'Zoom Technologies','Slack Technologies'][i],
    vendorType: 'service_provider', gstin: `29AAAVS${String(i+1).padStart(2,'0')}34F1Z5`, pan: `AAAVS${String(i+1).padStart(2,'0')}34F`,
    creditDays: 30,
    contacts: [contact(`Cloud Mgr ${i+1}`, `+9198${55000000 + i}`, `cm${i+1}@cloud.in`)],
    addresses: [addr('Bangalore', 'Karnataka', '29', '560001', `Tech Tower ${i+1}`)],
    isActive: true, openingBalance: 0,
  })),
  // 25 Manufacturing vendors
  ...Array.from({ length: 25 }, (_, i): ArchetypedVendor => ({
    _archetype: 'manufacturing', partyCode: `VEND-M${String(i+1).padStart(3,'0')}`,
    partyName: `Raw Material Supplier ${i+1}`,
    vendorType: 'raw_material_supplier', gstin: `27AAAVM${String(i+1).padStart(2,'0')}34F1Z5`, pan: `AAAVM${String(i+1).padStart(2,'0')}34F`,
    creditDays: [30, 45, 60][i % 3],
    contacts: [contact(`RM Supplier ${i+1}`, `+9198${66000000 + i}`, `rm${i+1}@material.in`)],
    addresses: [addr(['Mumbai','Pune','Chennai','Delhi'][i % 4], 'Maharashtra', '27', '400070', `RM Plot ${i+1}`)],
    isActive: true, openingBalance: 0,
  })),
];

export function customersForArchetype(a: DemoArchetype): ArchetypedCustomer[] {
  return DEMO_CUSTOMERS.filter(c => c._archetype === a || c._archetype === 'all');
}
export function vendorsForArchetype(a: DemoArchetype): ArchetypedVendor[] {
  return DEMO_VENDORS.filter(v => v._archetype === a || v._archetype === 'all');
}
