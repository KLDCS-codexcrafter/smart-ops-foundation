/**
 * hsn-sac-seed-data.ts — HSN (80) + SAC (20) seed codes for Zone 3
 */

export interface HSNSACCode {
  code: string;
  codeType: 'hsn' | 'sac';
  description: string;
  chapter: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number | null;
  reverseCharge: boolean;
  exemptionApplicable: boolean;
}

export const HSN_CODES: HSNSACCode[] = [
  // Ch 01 – Live animals
  { code: '0102', codeType: 'hsn', description: 'Live bovine animals', chapter: '01', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 02 – Meat
  { code: '0201', codeType: 'hsn', description: 'Meat of bovine animals, fresh or chilled', chapter: '02', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 03 – Fish
  { code: '0302', codeType: 'hsn', description: 'Fish, fresh or chilled', chapter: '03', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 04 – Dairy
  { code: '0401', codeType: 'hsn', description: 'Milk and cream, not concentrated', chapter: '04', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 05 – Animal products
  { code: '0511', codeType: 'hsn', description: 'Animal products not elsewhere specified', chapter: '05', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 06 – Live trees/plants
  { code: '0602', codeType: 'hsn', description: 'Live plants, cuttings, mushroom spawn', chapter: '06', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 07 – Vegetables
  { code: '0701', codeType: 'hsn', description: 'Potatoes, fresh or chilled', chapter: '07', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 08 – Fruits/nuts
  { code: '0801', codeType: 'hsn', description: 'Coconuts, Brazil nuts, cashew nuts', chapter: '08', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 09 – Coffee/tea/spices
  { code: '0901', codeType: 'hsn', description: 'Coffee (not roasted)', chapter: '09', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 10 – Cereals
  { code: '1001', codeType: 'hsn', description: 'Wheat and meslin', chapter: '10', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 11 – Milling products
  { code: '1101', codeType: 'hsn', description: 'Wheat or meslin flour', chapter: '11', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 12 – Oil seeds
  { code: '1201', codeType: 'hsn', description: 'Soya beans', chapter: '12', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 13 – Lac, gums
  { code: '1301', codeType: 'hsn', description: 'Lac, natural gums, resins', chapter: '13', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 14 – Vegetable plaiting
  { code: '1401', codeType: 'hsn', description: 'Vegetable materials for plaiting', chapter: '14', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 15 – Animal/vegetable fats
  { code: '1501', codeType: 'hsn', description: 'Pig fat and poultry fat', chapter: '15', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 16 – Meat preparations
  { code: '1601', codeType: 'hsn', description: 'Sausages and similar products of meat', chapter: '16', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 17 – Sugars
  { code: '1701', codeType: 'hsn', description: 'Cane or beet sugar, solid form', chapter: '17', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 18 – Cocoa
  { code: '1806', codeType: 'hsn', description: 'Chocolate and cocoa preparations', chapter: '18', cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 19 – Cereal preparations
  { code: '1905', codeType: 'hsn', description: 'Bread, pastry, cakes, biscuits', chapter: '19', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 20 – Vegetable preparations
  { code: '2009', codeType: 'hsn', description: 'Fruit or vegetable juices', chapter: '20', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 21 – Miscellaneous edible
  { code: '2106', codeType: 'hsn', description: 'Food preparations not elsewhere specified', chapter: '21', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 22 – Beverages
  { code: '2202', codeType: 'hsn', description: 'Aerated waters and beverages', chapter: '22', cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: 12, reverseCharge: false, exemptionApplicable: false },
  // Ch 23 – Residues from food industries
  { code: '2301', codeType: 'hsn', description: 'Flours and meals of meat or fish', chapter: '23', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 24 – Tobacco
  { code: '2402', codeType: 'hsn', description: 'Cigars, cheroots, cigarettes', chapter: '24', cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: 65, reverseCharge: false, exemptionApplicable: false },
  // Ch 25 – Salt, sulphur, earths, stone
  { code: '2501', codeType: 'hsn', description: 'Salt and pure sodium chloride', chapter: '25', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 26 – Ores, slag, ash
  { code: '2601', codeType: 'hsn', description: 'Iron ores and concentrates', chapter: '26', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 27 – Mineral fuels
  { code: '2710', codeType: 'hsn', description: 'Petroleum oils (not crude)', chapter: '27', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 28 – Inorganic chemicals
  { code: '2801', codeType: 'hsn', description: 'Fluorine, chlorine, bromine, iodine', chapter: '28', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 29 – Organic chemicals
  { code: '2901', codeType: 'hsn', description: 'Acyclic hydrocarbons', chapter: '29', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 30 – Pharmaceutical products
  { code: '3004', codeType: 'hsn', description: 'Medicaments in measured doses', chapter: '30', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 31 – Fertilizers
  { code: '3102', codeType: 'hsn', description: 'Mineral or chemical nitrogenous fertilizers', chapter: '31', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 32 – Tanning/dyeing
  { code: '3208', codeType: 'hsn', description: 'Paints and varnishes', chapter: '32', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 33 – Essential oils/cosmetics
  { code: '3304', codeType: 'hsn', description: 'Beauty or make-up preparations', chapter: '33', cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 34 – Soap, waxes
  { code: '3401', codeType: 'hsn', description: 'Soap and organic surface-active products', chapter: '34', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 35 – Albuminoidal substances
  { code: '3506', codeType: 'hsn', description: 'Prepared glues and adhesives', chapter: '35', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 36 – Explosives
  { code: '3604', codeType: 'hsn', description: 'Fireworks, signalling flares', chapter: '36', cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 37 – Photographic goods
  { code: '3701', codeType: 'hsn', description: 'Photographic plates and film', chapter: '37', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 38 – Miscellaneous chemical products
  { code: '3808', codeType: 'hsn', description: 'Insecticides, fungicides, herbicides', chapter: '38', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 39 – Plastics
  { code: '3917', codeType: 'hsn', description: 'Tubes, pipes and hoses of plastics', chapter: '39', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 40 – Rubber
  { code: '4011', codeType: 'hsn', description: 'New pneumatic tyres of rubber', chapter: '40', cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 41 – Hides/skins
  { code: '4101', codeType: 'hsn', description: 'Raw hides and skins of bovine animals', chapter: '41', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 42 – Leather articles
  { code: '4202', codeType: 'hsn', description: 'Trunks, suit-cases, handbags', chapter: '42', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 43 – Furskins
  { code: '4302', codeType: 'hsn', description: 'Tanned or dressed furskins', chapter: '43', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 44 – Wood
  { code: '4407', codeType: 'hsn', description: 'Wood sawn or chipped lengthwise', chapter: '44', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 45 – Cork
  { code: '4503', codeType: 'hsn', description: 'Articles of natural cork', chapter: '45', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 46 – Straw/basketware
  { code: '4602', codeType: 'hsn', description: 'Basketwork, wickerwork and other articles', chapter: '46', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 47 – Pulp of wood
  { code: '4701', codeType: 'hsn', description: 'Mechanical wood pulp', chapter: '47', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 48 – Paper
  { code: '4802', codeType: 'hsn', description: 'Uncoated paper for writing or printing', chapter: '48', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 49 – Printed books
  { code: '4901', codeType: 'hsn', description: 'Printed books, brochures, leaflets', chapter: '49', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 50 – Silk
  { code: '5004', codeType: 'hsn', description: 'Silk yarn (not for retail sale)', chapter: '50', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 51 – Wool
  { code: '5101', codeType: 'hsn', description: 'Wool, not carded or combed', chapter: '51', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 52 – Cotton
  { code: '5201', codeType: 'hsn', description: 'Cotton, not carded or combed', chapter: '52', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 53 – Vegetable textile fibres
  { code: '5303', codeType: 'hsn', description: 'Jute and other textile bast fibres', chapter: '53', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  // Ch 54 – Man-made filaments
  { code: '5402', codeType: 'hsn', description: 'Synthetic filament yarn', chapter: '54', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 55 – Man-made staple fibres
  { code: '5503', codeType: 'hsn', description: 'Synthetic staple fibres, not carded', chapter: '55', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 56 – Wadding, felt
  { code: '5601', codeType: 'hsn', description: 'Wadding of textile materials', chapter: '56', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 57 – Carpets
  { code: '5701', codeType: 'hsn', description: 'Carpets and textile floor coverings, knotted', chapter: '57', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 58 – Special woven fabrics
  { code: '5801', codeType: 'hsn', description: 'Woven pile fabrics and chenille fabrics', chapter: '58', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 59 – Impregnated textiles
  { code: '5903', codeType: 'hsn', description: 'Textile fabrics impregnated, coated', chapter: '59', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 60 – Knitted fabrics
  { code: '6001', codeType: 'hsn', description: 'Pile fabrics, knitted or crocheted', chapter: '60', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 61 – Knitted apparel
  { code: '6109', codeType: 'hsn', description: 'T-shirts, singlets and vests, knitted', chapter: '61', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 62 – Woven apparel
  { code: '6203', codeType: 'hsn', description: 'Men\'s suits, jackets, trousers', chapter: '62', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 63 – Other made up textile
  { code: '6302', codeType: 'hsn', description: 'Bed linen, table linen, toilet linen', chapter: '63', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 64 – Footwear
  { code: '6403', codeType: 'hsn', description: 'Footwear with outer soles of rubber/plastic', chapter: '64', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 65 – Headgear
  { code: '6505', codeType: 'hsn', description: 'Hats and headgear, knitted or crocheted', chapter: '65', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 66 – Umbrellas
  { code: '6601', codeType: 'hsn', description: 'Umbrellas and sun umbrellas', chapter: '66', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 67 – Feathers
  { code: '6702', codeType: 'hsn', description: 'Artificial flowers, foliage and fruit', chapter: '67', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 68 – Stone/cement articles
  { code: '6802', codeType: 'hsn', description: 'Worked monumental or building stone', chapter: '68', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 69 – Ceramic products
  { code: '6908', codeType: 'hsn', description: 'Glazed ceramic flags and paving', chapter: '69', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 70 – Glass
  { code: '7005', codeType: 'hsn', description: 'Float glass and surface ground glass', chapter: '70', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 71 – Precious metals
  { code: '7108', codeType: 'hsn', description: 'Gold, unwrought or semi-manufactured', chapter: '71', cgstRate: 1.5, sgstRate: 1.5, igstRate: 3, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 72 – Iron and steel
  { code: '7210', codeType: 'hsn', description: 'Flat-rolled iron or steel, coated', chapter: '72', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 73 – Iron/steel articles
  { code: '7318', codeType: 'hsn', description: 'Screws, bolts, nuts, washers of iron/steel', chapter: '73', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 74 – Copper
  { code: '7408', codeType: 'hsn', description: 'Copper wire', chapter: '74', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 76 – Aluminium
  { code: '7606', codeType: 'hsn', description: 'Aluminium plates, sheets and strip', chapter: '76', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 82 – Tools
  { code: '8203', codeType: 'hsn', description: 'Files, rasps, pliers, pincers, tweezers', chapter: '82', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 84 – Machinery
  { code: '8471', codeType: 'hsn', description: 'Automatic data processing machines (computers)', chapter: '84', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 85 – Electrical machinery
  { code: '8517', codeType: 'hsn', description: 'Telephone sets including smartphones', chapter: '85', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 86 – Railway
  { code: '8601', codeType: 'hsn', description: 'Rail locomotives powered from external source', chapter: '86', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 87 – Vehicles
  { code: '8703', codeType: 'hsn', description: 'Motor cars and vehicles for transport of persons', chapter: '87', cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: 1, reverseCharge: false, exemptionApplicable: false },
  // Ch 88 – Aircraft
  { code: '8802', codeType: 'hsn', description: 'Aeroplanes and other aircraft', chapter: '88', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 89 – Ships/boats
  { code: '8901', codeType: 'hsn', description: 'Cruise ships, cargo ships, barges', chapter: '89', cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 90 – Optical/medical instruments
  { code: '9018', codeType: 'hsn', description: 'Instruments and appliances used in medical science', chapter: '90', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 91 – Clocks/watches
  { code: '9101', codeType: 'hsn', description: 'Wrist-watches, pocket-watches', chapter: '91', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 92 – Musical instruments
  { code: '9201', codeType: 'hsn', description: 'Pianos, including automatic pianos', chapter: '92', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 93 – Arms and ammunition
  { code: '9302', codeType: 'hsn', description: 'Revolvers and pistols', chapter: '93', cgstRate: 14, sgstRate: 14, igstRate: 28, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 94 – Furniture
  { code: '9403', codeType: 'hsn', description: 'Other furniture and parts thereof', chapter: '94', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 95 – Toys/games
  { code: '9503', codeType: 'hsn', description: 'Tricycles, scooters, dolls, puzzles, toys', chapter: '95', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 96 – Miscellaneous manufactured
  { code: '9608', codeType: 'hsn', description: 'Ball point pens, felt tipped pens', chapter: '96', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 97 – Works of art
  { code: '9703', codeType: 'hsn', description: 'Original sculptures and statuary', chapter: '97', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  // Ch 98 – Project imports
  { code: '9801', codeType: 'hsn', description: 'Project imports, lump sum assessment', chapter: '98', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
];

export const SAC_CODES: HSNSACCode[] = [
  { code: '9954', codeType: 'sac', description: 'Construction services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: true, exemptionApplicable: false },
  { code: '9971', codeType: 'sac', description: 'Financial and related services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9972', codeType: 'sac', description: 'Real estate services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9973', codeType: 'sac', description: 'Leasing or rental services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9981', codeType: 'sac', description: 'Research and development services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9982', codeType: 'sac', description: 'Legal and accounting services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: true, exemptionApplicable: false },
  { code: '9983', codeType: 'sac', description: 'Professional, scientific, technical services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9984', codeType: 'sac', description: 'Telecom, broadcasting services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9985', codeType: 'sac', description: 'Support services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9987', codeType: 'sac', description: 'Maintenance, repair, installation services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9988', codeType: 'sac', description: 'Manufacturing services on owned inputs', chapter: '99', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9992', codeType: 'sac', description: 'Education services', chapter: '99', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  { code: '9993', codeType: 'sac', description: 'Health and social care services', chapter: '99', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  { code: '9994', codeType: 'sac', description: 'Sewage and waste treatment services', chapter: '99', cgstRate: 6, sgstRate: 6, igstRate: 12, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9995', codeType: 'sac', description: 'Membership organisation services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9996', codeType: 'sac', description: 'Recreational, cultural, sporting services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9997', codeType: 'sac', description: 'Other services', chapter: '99', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: null, reverseCharge: false, exemptionApplicable: false },
  { code: '9961', codeType: 'sac', description: 'Wholesale trade services', chapter: '99', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  { code: '9991', codeType: 'sac', description: 'Government services', chapter: '99', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
  { code: '9998', codeType: 'sac', description: 'Domestic services', chapter: '99', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: null, reverseCharge: false, exemptionApplicable: true },
];
