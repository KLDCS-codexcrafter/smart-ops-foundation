/**
 * demo-items-master.ts — Item/service masters per archetype
 * [JWT] Read by orchestrator → POST /api/inventory/items
 */
import type { DemoArchetype } from '@/data/demo-customers-vendors';

export interface DemoItem {
  id: string; itemCode: string; itemName: string;
  hsn: string; uom: string; gstRate: number;
  rate: number; openingStock: number;
  itemType: 'goods' | 'service' | 'raw_material' | 'finished';
  _archetype: DemoArchetype;
}

export const DEMO_ITEMS_TRADING: DemoItem[] = [
  { id: 'it-t-1', itemCode: 'TR-001', itemName: 'Basmati Rice 25kg', hsn: '1006', uom: 'BAG', gstRate: 5,  rate: 2200, openingStock: 200, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-2', itemCode: 'TR-002', itemName: 'Refined Oil 15L',   hsn: '1507', uom: 'LTR', gstRate: 5,  rate: 1900, openingStock: 150, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-3', itemCode: 'TR-003', itemName: 'Sugar 50kg',         hsn: '1701', uom: 'BAG', gstRate: 5,  rate: 2100, openingStock: 180, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-4', itemCode: 'TR-004', itemName: 'Cement Bag 50kg',    hsn: '2523', uom: 'BAG', gstRate: 28, rate: 380,  openingStock: 500, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-5', itemCode: 'TR-005', itemName: 'Steel Rod 12mm',     hsn: '7214', uom: 'KG',  gstRate: 18, rate: 65,   openingStock: 400, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-6', itemCode: 'TR-006', itemName: 'Wheat Flour 10kg',   hsn: '1101', uom: 'BAG', gstRate: 5,  rate: 480,  openingStock: 250, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-7', itemCode: 'TR-007', itemName: 'Toor Dal 25kg',      hsn: '0713', uom: 'BAG', gstRate: 5,  rate: 2900, openingStock: 100, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-8', itemCode: 'TR-008', itemName: 'Tea Powder 1kg',     hsn: '0902', uom: 'PCS', gstRate: 5,  rate: 380,  openingStock: 320, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-9', itemCode: 'TR-009', itemName: 'Soap Bar 100g',      hsn: '3401', uom: 'PCS', gstRate: 18, rate: 28,   openingStock: 480, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-10', itemCode: 'TR-010', itemName: 'Detergent 1kg',     hsn: '3402', uom: 'PCS', gstRate: 18, rate: 165,  openingStock: 280, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-11', itemCode: 'TR-011', itemName: 'Mineral Water 1L',  hsn: '2201', uom: 'PCS', gstRate: 18, rate: 20,   openingStock: 460, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-12', itemCode: 'TR-012', itemName: 'Biscuit Pack 500g', hsn: '1905', uom: 'PCS', gstRate: 18, rate: 75,   openingStock: 350, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-13', itemCode: 'TR-013', itemName: 'Spice Mix 200g',    hsn: '0910', uom: 'PCS', gstRate: 5,  rate: 95,   openingStock: 220, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-14', itemCode: 'TR-014', itemName: 'Shampoo Bottle',    hsn: '3305', uom: 'PCS', gstRate: 18, rate: 195,  openingStock: 180, itemType: 'goods', _archetype: 'trading' },
  { id: 'it-t-15', itemCode: 'TR-015', itemName: 'Toothpaste 100g',   hsn: '3306', uom: 'PCS', gstRate: 18, rate: 110,  openingStock: 380, itemType: 'goods', _archetype: 'trading' },
];

export const DEMO_ITEMS_SERVICES: DemoItem[] = [
  { id: 'it-s-1', itemCode: 'SV-001', itemName: 'IT Consulting (per hour)',           hsn: '998313', uom: 'HRS',   gstRate: 18, rate: 3500,  openingStock: 0, itemType: 'service', _archetype: 'services' },
  { id: 'it-s-2', itemCode: 'SV-002', itemName: 'Software Development',               hsn: '998314', uom: 'PROJ',  gstRate: 18, rate: 250000, openingStock: 0, itemType: 'service', _archetype: 'services' },
  { id: 'it-s-3', itemCode: 'SV-003', itemName: 'Audit Services',                     hsn: '998221', uom: 'PROJ',  gstRate: 18, rate: 150000, openingStock: 0, itemType: 'service', _archetype: 'services' },
  { id: 'it-s-4', itemCode: 'SV-004', itemName: 'Legal Retainer Monthly',             hsn: '998211', uom: 'MONTH', gstRate: 18, rate: 75000,  openingStock: 0, itemType: 'service', _archetype: 'services' },
  { id: 'it-s-5', itemCode: 'SV-005', itemName: 'Training Program Per Day',           hsn: '999293', uom: 'DAY',   gstRate: 18, rate: 45000,  openingStock: 0, itemType: 'service', _archetype: 'services' },
  { id: 'it-s-6', itemCode: 'SV-006', itemName: 'Digital Marketing Retainer',         hsn: '998361', uom: 'MONTH', gstRate: 18, rate: 65000,  openingStock: 0, itemType: 'service', _archetype: 'services' },
  { id: 'it-s-7', itemCode: 'SV-007', itemName: 'Compliance Filing Services',         hsn: '998222', uom: 'PROJ',  gstRate: 18, rate: 35000,  openingStock: 0, itemType: 'service', _archetype: 'services' },
  { id: 'it-s-8', itemCode: 'SV-008', itemName: 'Infrastructure Support Quarterly',   hsn: '998313', uom: 'QTR',   gstRate: 18, rate: 180000, openingStock: 0, itemType: 'service', _archetype: 'services' },
];

export const DEMO_ITEMS_MFG: DemoItem[] = [
  // 12 finished
  { id: 'it-m-1',  itemCode: 'MF-F001', itemName: 'Automotive Gear Assembly', hsn: '87084000', uom: 'PCS', gstRate: 28, rate: 8500,  openingStock: 80,  itemType: 'finished',     _archetype: 'manufacturing' },
  { id: 'it-m-2',  itemCode: 'MF-F002', itemName: 'Pump Housing',             hsn: '84133000', uom: 'PCS', gstRate: 18, rate: 4200,  openingStock: 100, itemType: 'finished',     _archetype: 'manufacturing' },
  { id: 'it-m-3',  itemCode: 'MF-F003', itemName: 'Motor Coil 3-Phase',       hsn: '85011000', uom: 'PCS', gstRate: 18, rate: 6500,  openingStock: 120, itemType: 'finished',     _archetype: 'manufacturing' },
  { id: 'it-m-4',  itemCode: 'MF-F004', itemName: 'Valve Body Brass',         hsn: '84818090', uom: 'PCS', gstRate: 18, rate: 1850,  openingStock: 200, itemType: 'finished',     _archetype: 'manufacturing' },
  { id: 'it-m-5',  itemCode: 'MF-F005', itemName: 'Bearing 6204',             hsn: '84821010', uom: 'PCS', gstRate: 18, rate: 280,   openingStock: 150, itemType: 'finished',     _archetype: 'manufacturing' },
  { id: 'it-m-6',  itemCode: 'MF-F006', itemName: 'Hydraulic Cylinder',       hsn: '84122100', uom: 'PCS', gstRate: 18, rate: 12500, openingStock: 60,  itemType: 'finished',     _archetype: 'manufacturing' },
  { id: 'it-m-7',  itemCode: 'MF-F007', itemName: 'Crankshaft Forged',        hsn: '87084099', uom: 'PCS', gstRate: 28, rate: 18500, openingStock: 50,  itemType: 'finished',     _archetype: 'manufacturing' },
  { id: 'it-m-8',  itemCode: 'MF-F008', itemName: 'Brake Disc',               hsn: '87083000', uom: 'PCS', gstRate: 28, rate: 2800,  openingStock: 180, itemType: 'finished',     _archetype: 'manufacturing' },
  { id: 'it-m-9',  itemCode: 'MF-F009', itemName: 'Clutch Plate',             hsn: '87089300', uom: 'PCS', gstRate: 28, rate: 1950,  openingStock: 140, itemType: 'finished',     _archetype: 'manufacturing' },
  { id: 'it-m-10', itemCode: 'MF-F010', itemName: 'Radiator Assembly',        hsn: '87089100', uom: 'PCS', gstRate: 28, rate: 7200,  openingStock: 75,  itemType: 'finished',     _archetype: 'manufacturing' },
  { id: 'it-m-11', itemCode: 'MF-F011', itemName: 'Alternator Body',          hsn: '85113000', uom: 'PCS', gstRate: 18, rate: 9500,  openingStock: 90,  itemType: 'finished',     _archetype: 'manufacturing' },
  { id: 'it-m-12', itemCode: 'MF-F012', itemName: 'Fuel Injector',            hsn: '84099919', uom: 'PCS', gstRate: 18, rate: 5800,  openingStock: 110, itemType: 'finished',     _archetype: 'manufacturing' },
  // 8 raw
  { id: 'it-m-13', itemCode: 'MF-R001', itemName: 'Mild Steel 20mm',          hsn: '72142000', uom: 'KG',  gstRate: 18, rate: 75,    openingStock: 200, itemType: 'raw_material', _archetype: 'manufacturing' },
  { id: 'it-m-14', itemCode: 'MF-R002', itemName: 'Brass Rod',                hsn: '74072100', uom: 'KG',  gstRate: 18, rate: 580,   openingStock: 150, itemType: 'raw_material', _archetype: 'manufacturing' },
  { id: 'it-m-15', itemCode: 'MF-R003', itemName: 'Copper Wire 2.5sqmm',      hsn: '74081100', uom: 'MTR', gstRate: 18, rate: 95,    openingStock: 180, itemType: 'raw_material', _archetype: 'manufacturing' },
  { id: 'it-m-16', itemCode: 'MF-R004', itemName: 'Rubber Seal Kit',          hsn: '40169320', uom: 'KIT', gstRate: 18, rate: 320,   openingStock: 100, itemType: 'raw_material', _archetype: 'manufacturing' },
  { id: 'it-m-17', itemCode: 'MF-R005', itemName: 'Packaging Box 12x12',      hsn: '48191010', uom: 'PCS', gstRate: 12, rate: 45,    openingStock: 200, itemType: 'raw_material', _archetype: 'manufacturing' },
  { id: 'it-m-18', itemCode: 'MF-R006', itemName: 'Aluminum Sheet 2mm',       hsn: '76061190', uom: 'KG',  gstRate: 18, rate: 220,   openingStock: 160, itemType: 'raw_material', _archetype: 'manufacturing' },
  { id: 'it-m-19', itemCode: 'MF-R007', itemName: 'Plastic Granules HDPE',    hsn: '39012000', uom: 'KG',  gstRate: 18, rate: 110,   openingStock: 180, itemType: 'raw_material', _archetype: 'manufacturing' },
  { id: 'it-m-20', itemCode: 'MF-R008', itemName: 'Lubricant Oil Industrial', hsn: '27101981', uom: 'LTR', gstRate: 18, rate: 165,   openingStock: 120, itemType: 'raw_material', _archetype: 'manufacturing' },
];

export function itemsForArchetype(a: DemoArchetype): DemoItem[] {
  if (a === 'trading')      return DEMO_ITEMS_TRADING;
  if (a === 'services')     return DEMO_ITEMS_SERVICES;
  return DEMO_ITEMS_MFG;
}
