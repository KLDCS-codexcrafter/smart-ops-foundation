/**
 * geo-seed-data.ts — Static reference data for geography seeding
 * UAE Emirates + areas · Indian ports (21) · UAE ports (8) · India sales regions (8)
 */

// ── UAE Emirates (as States) ──────────────────────────────────
export const UAE_EMIRATES = [
  { code:'AE-AUH', name:'Abu Dhabi', countryCode:'AE', gstStateCode:null, unionTerritory:false, status:'active' as const },
  { code:'AE-DXB', name:'Dubai', countryCode:'AE', gstStateCode:null, unionTerritory:false, status:'active' as const },
  { code:'AE-SHJ', name:'Sharjah', countryCode:'AE', gstStateCode:null, unionTerritory:false, status:'active' as const },
  { code:'AE-AJM', name:'Ajman', countryCode:'AE', gstStateCode:null, unionTerritory:false, status:'active' as const },
  { code:'AE-UAQ', name:'Umm Al Quwain', countryCode:'AE', gstStateCode:null, unionTerritory:false, status:'active' as const },
  { code:'AE-RAK', name:'Ras Al Khaimah', countryCode:'AE', gstStateCode:null, unionTerritory:false, status:'active' as const },
  { code:'AE-FUJ', name:'Fujairah', countryCode:'AE', gstStateCode:null, unionTerritory:false, status:'active' as const },
];

// ── UAE Districts (major business areas per emirate) ──────────
export const UAE_DISTRICTS = [
  // Dubai
  { code:'DXB-DEIRA', name:'Deira', stateCode:'AE-DXB', countryCode:'AE', headquarters:'Deira City Centre' },
  { code:'DXB-BUR', name:'Bur Dubai', stateCode:'AE-DXB', countryCode:'AE', headquarters:'Bur Dubai' },
  { code:'DXB-JBR', name:'Jumeirah Beach Residence', stateCode:'AE-DXB', countryCode:'AE', headquarters:'JBR' },
  { code:'DXB-BBAY', name:'Business Bay', stateCode:'AE-DXB', countryCode:'AE', headquarters:'Business Bay' },
  { code:'DXB-ALQZ', name:'Al Quoz Industrial', stateCode:'AE-DXB', countryCode:'AE', headquarters:'Al Quoz' },
  { code:'DXB-JAFZA', name:'Jebel Ali Free Zone', stateCode:'AE-DXB', countryCode:'AE', headquarters:'Jebel Ali' },
  { code:'DXB-BARSHA', name:'Al Barsha', stateCode:'AE-DXB', countryCode:'AE', headquarters:'Al Barsha' },
  { code:'DXB-DIFC', name:'DIFC Financial Centre', stateCode:'AE-DXB', countryCode:'AE', headquarters:'DIFC' },
  { code:'DXB-SOUTH', name:'Dubai South', stateCode:'AE-DXB', countryCode:'AE', headquarters:'Dubai South' },
  { code:'DXB-MIRDIF', name:'Mirdif', stateCode:'AE-DXB', countryCode:'AE', headquarters:'Mirdif' },
  // Abu Dhabi
  { code:'AUH-DOWN', name:'Abu Dhabi Downtown', stateCode:'AE-AUH', countryCode:'AE', headquarters:'Corniche' },
  { code:'AUH-KHALIF', name:'Khalifa City', stateCode:'AE-AUH', countryCode:'AE', headquarters:'Khalifa City A' },
  { code:'AUH-REEM', name:'Al Reem Island', stateCode:'AE-AUH', countryCode:'AE', headquarters:'Al Reem Island' },
  { code:'AUH-KIZAD', name:'Khalifa Industrial Zone (KIZAD)', stateCode:'AE-AUH', countryCode:'AE', headquarters:'KIZAD' },
  { code:'AUH-ADGM', name:'ADGM Financial Free Zone', stateCode:'AE-AUH', countryCode:'AE', headquarters:'Al Maryah Island' },
  // Sharjah
  { code:'SHJ-MAIN', name:'Sharjah City', stateCode:'AE-SHJ', countryCode:'AE', headquarters:'Al Nud' },
  { code:'SHJ-IND', name:'Sharjah Industrial Area', stateCode:'AE-SHJ', countryCode:'AE', headquarters:'Ind Area 1' },
  { code:'SHJ-HAM', name:'Hamriyah Free Zone', stateCode:'AE-SHJ', countryCode:'AE', headquarters:'Hamriyah' },
  { code:'SHJ-KHF', name:'Khorfakkan (East Coast)', stateCode:'AE-SHJ', countryCode:'AE', headquarters:'Khorfakkan' },
  // Other emirates
  { code:'AJM-MAIN', name:'Ajman City', stateCode:'AE-AJM', countryCode:'AE', headquarters:'Ajman' },
  { code:'AJM-FZ', name:'Ajman Free Zone', stateCode:'AE-AJM', countryCode:'AE', headquarters:'Ajman FZ' },
  { code:'RAK-MAIN', name:'RAK City', stateCode:'AE-RAK', countryCode:'AE', headquarters:'Ras Al Khaimah' },
  { code:'RAK-RAKEZ', name:'RAK Economic Zone (RAKEZ)', stateCode:'AE-RAK', countryCode:'AE', headquarters:'RAKEZ' },
  { code:'FUJ-MAIN', name:'Fujairah City', stateCode:'AE-FUJ', countryCode:'AE', headquarters:'Fujairah' },
  { code:'FUJ-FZ', name:'Fujairah Free Zone', stateCode:'AE-FUJ', countryCode:'AE', headquarters:'Fujairah FZ' },
  { code:'UAQ-MAIN', name:'Umm Al Quwain City', stateCode:'AE-UAQ', countryCode:'AE', headquarters:'UAQ' },
];

// ── Port types & customs zones ────────────────────────────────
export type PortType = 'sea_port' | 'airport' | 'icd' | 'land_border' | 'river_port' | 'dry_port';
export type CustomsZone = 'regular' | 'free_zone' | 'sez' | 'bonded' | 'special';

export interface PortRecord {
  portCode: string; portName: string; portType: PortType;
  countryCode: string; stateCode: string; nearestCity: string;
  operator: string; customsZone: CustomsZone;
  latitude: number; longitude: number; status: 'active' | 'inactive';
  iataCode?: string; unlocCode?: string;
}

// ── Indian Ports (21) ─────────────────────────────────────────
export const INDIA_PORTS: PortRecord[] = [
  // Sea Ports
  { portCode:'INJNP', portName:'Jawaharlal Nehru Port (JNPT), Mumbai', portType:'sea_port',
    countryCode:'IN', stateCode:'MH', nearestCity:'Mumbai', operator:'JNPT Authority',
    customsZone:'regular', latitude:18.9480, longitude:72.9490, status:'active', unlocCode:'INJNP' },
  { portCode:'INCHQ', portName:'Chennai Port', portType:'sea_port',
    countryCode:'IN', stateCode:'TN', nearestCity:'Chennai', operator:'Chennai Port Trust',
    customsZone:'regular', latitude:13.0866, longitude:80.2973, status:'active', unlocCode:'INCHQ' },
  { portCode:'INKND', portName:'Kandla Port (Deendayal Port)', portType:'sea_port',
    countryCode:'IN', stateCode:'GJ', nearestCity:'Gandhidham', operator:'Deendayal Port Authority',
    customsZone:'regular', latitude:23.0225, longitude:70.2162, status:'active', unlocCode:'INKND' },
  { portCode:'INMUN', portName:'Mundra Port (Adani)', portType:'sea_port',
    countryCode:'IN', stateCode:'GJ', nearestCity:'Mundra', operator:'Adani Ports',
    customsZone:'sez', latitude:22.7300, longitude:69.7100, status:'active', unlocCode:'INMUN' },
  { portCode:'INCOK', portName:'Cochin Port (Kochi)', portType:'sea_port',
    countryCode:'IN', stateCode:'KL', nearestCity:'Kochi', operator:'Cochin Port Authority',
    customsZone:'regular', latitude:9.9793, longitude:76.2706, status:'active', unlocCode:'INCOK' },
  { portCode:'INVTZ', portName:'Visakhapatnam Port', portType:'sea_port',
    countryCode:'IN', stateCode:'AP', nearestCity:'Visakhapatnam', operator:'Visakhapatnam Port Authority',
    customsZone:'regular', latitude:17.6868, longitude:83.2185, status:'active', unlocCode:'INVTZ' },
  { portCode:'INKOL', portName:'Kolkata Port (Haldia Dock)', portType:'sea_port',
    countryCode:'IN', stateCode:'WB', nearestCity:'Haldia', operator:'Syama Prasad Mookerjee Port',
    customsZone:'regular', latitude:22.0270, longitude:88.0723, status:'active', unlocCode:'INKOL' },
  { portCode:'INMRM', portName:'Mormugao Port, Goa', portType:'sea_port',
    countryCode:'IN', stateCode:'GA', nearestCity:'Vasco da Gama', operator:'Mormugao Port Authority',
    customsZone:'regular', latitude:15.4073, longitude:73.7960, status:'active', unlocCode:'INMRM' },
  { portCode:'INPAV', portName:'Pipavav Port (APM Terminals)', portType:'sea_port',
    countryCode:'IN', stateCode:'GJ', nearestCity:'Rajula', operator:'Gujarat Pipavav Port Ltd',
    customsZone:'regular', latitude:21.0200, longitude:71.5100, status:'active', unlocCode:'INPAV' },
  // ICDs
  { portCode:'INTKD', portName:'Tughlakabad ICD, New Delhi', portType:'icd',
    countryCode:'IN', stateCode:'DL', nearestCity:'New Delhi', operator:'Container Corporation of India',
    customsZone:'bonded', latitude:28.4900, longitude:77.2800, status:'active' },
  { portCode:'INWFD', portName:'Whitefield ICD, Bengaluru', portType:'icd',
    countryCode:'IN', stateCode:'KA', nearestCity:'Bengaluru', operator:'Container Corporation of India',
    customsZone:'bonded', latitude:12.9720, longitude:77.7481, status:'active' },
  { portCode:'INSBM', portName:'Sabarmati ICD, Ahmedabad', portType:'icd',
    countryCode:'IN', stateCode:'GJ', nearestCity:'Ahmedabad', operator:'Container Corporation of India',
    customsZone:'bonded', latitude:23.0500, longitude:72.6100, status:'active' },
  // Airports
  { portCode:'BOM', portName:'Chhatrapati Shivaji Maharaj Intl, Mumbai', portType:'airport',
    countryCode:'IN', stateCode:'MH', nearestCity:'Mumbai', operator:'CSIA',
    customsZone:'regular', latitude:19.0896, longitude:72.8656, status:'active', iataCode:'BOM' },
  { portCode:'DEL', portName:'Indira Gandhi International, Delhi', portType:'airport',
    countryCode:'IN', stateCode:'DL', nearestCity:'New Delhi', operator:'DIAL (GMR)',
    customsZone:'regular', latitude:28.5562, longitude:77.1000, status:'active', iataCode:'DEL' },
  { portCode:'MAA', portName:'Chennai International Airport', portType:'airport',
    countryCode:'IN', stateCode:'TN', nearestCity:'Chennai', operator:'AAI',
    customsZone:'regular', latitude:12.9941, longitude:80.1709, status:'active', iataCode:'MAA' },
  { portCode:'CCU', portName:'Netaji Subhas Chandra Bose Intl, Kolkata', portType:'airport',
    countryCode:'IN', stateCode:'WB', nearestCity:'Kolkata', operator:'AAI',
    customsZone:'regular', latitude:22.6549, longitude:88.4467, status:'active', iataCode:'CCU' },
  { portCode:'BLR', portName:'Kempegowda International, Bengaluru', portType:'airport',
    countryCode:'IN', stateCode:'KA', nearestCity:'Bengaluru', operator:'BIAL',
    customsZone:'regular', latitude:13.1986, longitude:77.7066, status:'active', iataCode:'BLR' },
  { portCode:'HYD', portName:'Rajiv Gandhi International, Hyderabad', portType:'airport',
    countryCode:'IN', stateCode:'TS', nearestCity:'Hyderabad', operator:'GMR',
    customsZone:'regular', latitude:17.2403, longitude:78.4294, status:'active', iataCode:'HYD' },
  // Land Borders
  { portCode:'INATW', portName:'Attari-Wagah Land Border, Amritsar', portType:'land_border',
    countryCode:'IN', stateCode:'PB', nearestCity:'Amritsar', operator:'Land Customs Station',
    customsZone:'regular', latitude:31.6036, longitude:74.5497, status:'active' },
  { portCode:'INPTL', portName:'Petrapole Land Border, West Bengal', portType:'land_border',
    countryCode:'IN', stateCode:'WB', nearestCity:'Bongaon', operator:'Land Customs Station',
    customsZone:'regular', latitude:23.0019, longitude:88.9265, status:'active' },
  { portCode:'INRXL', portName:'Raxaul Land Border, Bihar (Nepal Gate)', portType:'land_border',
    countryCode:'IN', stateCode:'BR', nearestCity:'Raxaul', operator:'Land Customs Station',
    customsZone:'regular', latitude:26.9986, longitude:84.8512, status:'active' },
];

// ── UAE Ports (8) ─────────────────────────────────────────────
export const UAE_PORTS: PortRecord[] = [
  { portCode:'AEJEA', portName:'Jebel Ali Port (DP World), Dubai', portType:'sea_port',
    countryCode:'AE', stateCode:'AE-DXB', nearestCity:'Dubai', operator:'DP World',
    customsZone:'free_zone', latitude:25.0116, longitude:55.0575, status:'active', unlocCode:'AEJEA' },
  { portCode:'AEAUH', portName:'Abu Dhabi Port (Khalifa Port + Zayed)', portType:'sea_port',
    countryCode:'AE', stateCode:'AE-AUH', nearestCity:'Abu Dhabi', operator:'Abu Dhabi Ports (AD Ports Group)',
    customsZone:'regular', latitude:24.8029, longitude:54.6451, status:'active', unlocCode:'AEAUH' },
  { portCode:'AESHJ', portName:'Port Khalid + Khorfakkan, Sharjah', portType:'sea_port',
    countryCode:'AE', stateCode:'AE-SHJ', nearestCity:'Sharjah', operator:'Sharjah Ports Authority',
    customsZone:'regular', latitude:25.3394, longitude:55.3931, status:'active', unlocCode:'AESHJ' },
  { portCode:'AERAK', portName:'Ras Al Khaimah Port', portType:'sea_port',
    countryCode:'AE', stateCode:'AE-RAK', nearestCity:'Ras Al Khaimah', operator:'Ras Al Khaimah Port Authority',
    customsZone:'regular', latitude:25.7877, longitude:55.9565, status:'active', unlocCode:'AERAK' },
  { portCode:'DXB', portName:'Dubai International Airport (Air Cargo)', portType:'airport',
    countryCode:'AE', stateCode:'AE-DXB', nearestCity:'Dubai', operator:'Dubai Airports',
    customsZone:'regular', latitude:25.2532, longitude:55.3657, status:'active', iataCode:'DXB' },
  { portCode:'DWC', portName:'Al Maktoum International (Dubai South)', portType:'airport',
    countryCode:'AE', stateCode:'AE-DXB', nearestCity:'Dubai', operator:'Dubai Airports',
    customsZone:'free_zone', latitude:24.8972, longitude:55.1712, status:'active', iataCode:'DWC' },
  { portCode:'AUH', portName:'Abu Dhabi International Airport', portType:'airport',
    countryCode:'AE', stateCode:'AE-AUH', nearestCity:'Abu Dhabi', operator:'Abu Dhabi Airports',
    customsZone:'regular', latitude:24.4330, longitude:54.6511, status:'active', iataCode:'AUH' },
  { portCode:'SHJ', portName:'Sharjah International Airport', portType:'airport',
    countryCode:'AE', stateCode:'AE-SHJ', nearestCity:'Sharjah', operator:'Sharjah Airport Authority',
    customsZone:'free_zone', latitude:25.3274, longitude:55.5172, status:'active', iataCode:'SHJ' },
];

// ── India Sales Regions (8) ───────────────────────────────────
export const INDIA_REGIONS = [
  { code:'NORTH-IN', name:'North India', countryCode:'IN',
    states:['DL','HR','PB','CH','HP','UK','UP','JK','LA'] },
  { code:'SOUTH-IN', name:'South India', countryCode:'IN',
    states:['TN','KL','KA','TS','AP','PY'] },
  { code:'EAST-IN', name:'East India', countryCode:'IN',
    states:['WB','BR','JH','OD'] },
  { code:'WEST-IN', name:'West India', countryCode:'IN',
    states:['MH','GJ','GA','RJ','DN','DD'] },
  { code:'CENTRAL-IN', name:'Central India', countryCode:'IN',
    states:['MP','CG'] },
  { code:'NE-IN', name:'Northeast India', countryCode:'IN',
    states:['AS','MN','ML','MZ','NL','TR','AR','SK'] },
  { code:'ISLANDS-IN', name:'Islands & Territories', countryCode:'IN',
    states:['AN','LD'] },
];

export const UAE_REGIONS = [
  { code:'UAE-MAIN', name:'UAE Operations', countryCode:'AE',
    states:['AE-AUH','AE-DXB','AE-SHJ','AE-AJM','AE-UAQ','AE-RAK','AE-FUJ'] },
];

// ── All ports combined helper ─────────────────────────────────
export const ALL_PORTS = [...INDIA_PORTS, ...UAE_PORTS];
