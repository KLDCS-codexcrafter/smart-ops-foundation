/**
 * world-currencies.ts — ISO 4217 active currency reference data
 * Source: ISO 4217 + cross-referenced with world-geography.ts
 * Used in: CurrencyMaster ISO code picker with autofill
 * ~150 active currencies covering all major trading nations
 */

export interface WorldCurrencyEntry {
  iso_code: string;             // USD
  name: string;                 // US Dollar
  symbol: string;               // $
  decimal_places: number;       // 2 (JPY=0, KWD=3, BHD=3, OMR=3)
  symbol_before_amount: boolean;// true = $100, false = 100 kr
  space_between: boolean;       // true = $ 100, false = $100
  countries: string[];          // primary countries using this currency
  flag: string;                 // 🇺🇸 primary flag
}

export const WORLD_CURRENCIES: WorldCurrencyEntry[] = [
  // ── Americas ──────────────────────────────────────────────────────────────
  { iso_code: 'USD', name: 'US Dollar',             symbol: '$',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['United States', 'Ecuador', 'El Salvador', 'Panama'], flag: '🇺🇸' },
  { iso_code: 'CAD', name: 'Canadian Dollar',       symbol: 'C$',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Canada'],              flag: '🇨🇦' },
  { iso_code: 'MXN', name: 'Mexican Peso',          symbol: '$',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Mexico'],              flag: '🇲🇽' },
  { iso_code: 'BRL', name: 'Brazilian Real',        symbol: 'R$',   decimal_places: 2, symbol_before_amount: true,  space_between: true,  countries: ['Brazil'],              flag: '🇧🇷' },
  { iso_code: 'ARS', name: 'Argentine Peso',        symbol: '$',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Argentina'],           flag: '🇦🇷' },
  { iso_code: 'CLP', name: 'Chilean Peso',          symbol: '$',    decimal_places: 0, symbol_before_amount: true,  space_between: false, countries: ['Chile'],               flag: '🇨🇱' },
  { iso_code: 'COP', name: 'Colombian Peso',        symbol: '$',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Colombia'],            flag: '🇨🇴' },
  { iso_code: 'PEN', name: 'Peruvian Sol',          symbol: 'S/',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Peru'],                flag: '🇵🇪' },
  { iso_code: 'UYU', name: 'Uruguayan Peso',        symbol: '$U',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Uruguay'],             flag: '🇺🇾' },
  { iso_code: 'BOB', name: 'Bolivian Boliviano',    symbol: 'Bs.',  decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Bolivia'],             flag: '🇧🇴' },
  { iso_code: 'VES', name: 'Venezuelan Bolívar',    symbol: 'Bs.S', decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Venezuela'],           flag: '🇻🇪' },

  // ── Europe ────────────────────────────────────────────────────────────────
  { iso_code: 'EUR', name: 'Euro',                  symbol: '€',    decimal_places: 2, symbol_before_amount: true,  space_between: true,  countries: ['Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria', 'Portugal', 'Ireland', 'Finland', 'Greece', 'Luxembourg', 'Malta', 'Cyprus', 'Slovakia', 'Slovenia', 'Estonia', 'Latvia', 'Lithuania', 'Croatia'], flag: '🇪🇺' },
  { iso_code: 'GBP', name: 'Pound Sterling',        symbol: '£',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['United Kingdom'],      flag: '🇬🇧' },
  { iso_code: 'CHF', name: 'Swiss Franc',           symbol: 'CHF',  decimal_places: 2, symbol_before_amount: true,  space_between: true,  countries: ['Switzerland', 'Liechtenstein'], flag: '🇨🇭' },
  { iso_code: 'SEK', name: 'Swedish Krona',         symbol: 'kr',   decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Sweden'],              flag: '🇸🇪' },
  { iso_code: 'NOK', name: 'Norwegian Krone',       symbol: 'kr',   decimal_places: 2, symbol_before_amount: true,  space_between: true,  countries: ['Norway'],              flag: '🇳🇴' },
  { iso_code: 'DKK', name: 'Danish Krone',          symbol: 'kr',   decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Denmark'],             flag: '🇩🇰' },
  { iso_code: 'PLN', name: 'Polish Zloty',          symbol: 'zł',   decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Poland'],              flag: '🇵🇱' },
  { iso_code: 'CZK', name: 'Czech Koruna',          symbol: 'Kč',   decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Czech Republic'],      flag: '🇨🇿' },
  { iso_code: 'HUF', name: 'Hungarian Forint',      symbol: 'Ft',   decimal_places: 0, symbol_before_amount: false, space_between: true,  countries: ['Hungary'],             flag: '🇭🇺' },
  { iso_code: 'RON', name: 'Romanian Leu',          symbol: 'lei',  decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Romania'],             flag: '🇷🇴' },
  { iso_code: 'BGN', name: 'Bulgarian Lev',         symbol: 'лв',   decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Bulgaria'],            flag: '🇧🇬' },
  { iso_code: 'HRK', name: 'Croatian Kuna',         symbol: 'kn',   decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Croatia'],             flag: '🇭🇷' },
  { iso_code: 'RUB', name: 'Russian Ruble',         symbol: '₽',    decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Russia'],              flag: '🇷🇺' },
  { iso_code: 'UAH', name: 'Ukrainian Hryvnia',     symbol: '₴',    decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Ukraine'],             flag: '🇺🇦' },
  { iso_code: 'ISK', name: 'Icelandic Króna',       symbol: 'kr',   decimal_places: 0, symbol_before_amount: false, space_between: true,  countries: ['Iceland'],             flag: '🇮🇸' },
  { iso_code: 'TRY', name: 'Turkish Lira',          symbol: '₺',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Turkey'],              flag: '🇹🇷' },
  { iso_code: 'RSD', name: 'Serbian Dinar',         symbol: 'din',  decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Serbia'],              flag: '🇷🇸' },

  // ── Asia — South Asia ────────────────────────────────────────────────────
  { iso_code: 'INR', name: 'Indian Rupee',          symbol: '₹',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['India'],               flag: '🇮🇳' },
  { iso_code: 'PKR', name: 'Pakistani Rupee',       symbol: '₨',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Pakistan'],            flag: '🇵🇰' },
  { iso_code: 'BDT', name: 'Bangladeshi Taka',      symbol: '৳',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Bangladesh'],          flag: '🇧🇩' },
  { iso_code: 'LKR', name: 'Sri Lankan Rupee',      symbol: 'Rs',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Sri Lanka'],           flag: '🇱🇰' },
  { iso_code: 'NPR', name: 'Nepalese Rupee',        symbol: '₨',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Nepal'],               flag: '🇳🇵' },
  { iso_code: 'MVR', name: 'Maldivian Rufiyaa',     symbol: 'Rf',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Maldives'],            flag: '🇲🇻' },
  { iso_code: 'BTN', name: 'Bhutanese Ngultrum',    symbol: 'Nu',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Bhutan'],              flag: '🇧🇹' },

  // ── Asia — East & Southeast ───────────────────────────────────────────────
  { iso_code: 'JPY', name: 'Japanese Yen',          symbol: '¥',    decimal_places: 0, symbol_before_amount: true,  space_between: false, countries: ['Japan'],               flag: '🇯🇵' },
  { iso_code: 'CNY', name: 'Chinese Renminbi',      symbol: '¥',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['China'],               flag: '🇨🇳' },
  { iso_code: 'HKD', name: 'Hong Kong Dollar',      symbol: 'HK$',  decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Hong Kong'],           flag: '🇭🇰' },
  { iso_code: 'TWD', name: 'New Taiwan Dollar',     symbol: 'NT$',  decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Taiwan'],              flag: '🇹🇼' },
  { iso_code: 'KRW', name: 'South Korean Won',      symbol: '₩',    decimal_places: 0, symbol_before_amount: true,  space_between: false, countries: ['South Korea'],         flag: '🇰🇷' },
  { iso_code: 'SGD', name: 'Singapore Dollar',      symbol: 'S$',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Singapore'],           flag: '🇸🇬' },
  { iso_code: 'MYR', name: 'Malaysian Ringgit',     symbol: 'RM',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Malaysia'],            flag: '🇲🇾' },
  { iso_code: 'THB', name: 'Thai Baht',             symbol: '฿',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Thailand'],            flag: '🇹🇭' },
  { iso_code: 'IDR', name: 'Indonesian Rupiah',     symbol: 'Rp',   decimal_places: 0, symbol_before_amount: true,  space_between: true,  countries: ['Indonesia'],           flag: '🇮🇩' },
  { iso_code: 'PHP', name: 'Philippine Peso',       symbol: '₱',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Philippines'],         flag: '🇵🇭' },
  { iso_code: 'VND', name: 'Vietnamese Dong',       symbol: '₫',    decimal_places: 0, symbol_before_amount: false, space_between: true,  countries: ['Vietnam'],             flag: '🇻🇳' },
  { iso_code: 'MMK', name: 'Myanmar Kyat',          symbol: 'K',    decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Myanmar'],             flag: '🇲🇲' },
  { iso_code: 'KHR', name: 'Cambodian Riel',        symbol: '៛',    decimal_places: 2, symbol_before_amount: false, space_between: false, countries: ['Cambodia'],            flag: '🇰🇭' },
  { iso_code: 'LAK', name: 'Lao Kip',               symbol: '₭',    decimal_places: 2, symbol_before_amount: false, space_between: false, countries: ['Laos'],                flag: '🇱🇦' },
  { iso_code: 'BND', name: 'Brunei Dollar',         symbol: 'B$',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Brunei'],              flag: '🇧🇳' },
  { iso_code: 'MOP', name: 'Macanese Pataca',       symbol: 'P',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Macau'],               flag: '🇲🇴' },

  // ── Asia — Central ────────────────────────────────────────────────────────
  { iso_code: 'KZT', name: 'Kazakhstani Tenge',     symbol: '₸',    decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Kazakhstan'],          flag: '🇰🇿' },
  { iso_code: 'UZS', name: 'Uzbekistani Som',       symbol: 'so\'m', decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Uzbekistan'],          flag: '🇺🇿' },
  { iso_code: 'GEL', name: 'Georgian Lari',         symbol: '₾',    decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Georgia'],             flag: '🇬🇪' },
  { iso_code: 'AMD', name: 'Armenian Dram',         symbol: '֏',    decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Armenia'],             flag: '🇦🇲' },
  { iso_code: 'AZN', name: 'Azerbaijani Manat',     symbol: '₼',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Azerbaijan'],          flag: '🇦🇿' },

  // ── Middle East ───────────────────────────────────────────────────────────
  { iso_code: 'AED', name: 'UAE Dirham',            symbol: 'د.إ',  decimal_places: 2, symbol_before_amount: true,  space_between: true,  countries: ['United Arab Emirates'], flag: '🇦🇪' },
  { iso_code: 'SAR', name: 'Saudi Riyal',           symbol: '﷼',   decimal_places: 2, symbol_before_amount: true,  space_between: true,  countries: ['Saudi Arabia'],        flag: '🇸🇦' },
  { iso_code: 'QAR', name: 'Qatari Riyal',          symbol: '﷼',   decimal_places: 2, symbol_before_amount: true,  space_between: true,  countries: ['Qatar'],               flag: '🇶🇦' },
  { iso_code: 'KWD', name: 'Kuwaiti Dinar',         symbol: 'د.ك', decimal_places: 3, symbol_before_amount: true,  space_between: true,  countries: ['Kuwait'],              flag: '🇰🇼' },
  { iso_code: 'BHD', name: 'Bahraini Dinar',        symbol: 'BD',   decimal_places: 3, symbol_before_amount: true,  space_between: true,  countries: ['Bahrain'],             flag: '🇧🇭' },
  { iso_code: 'OMR', name: 'Omani Rial',            symbol: '﷼',   decimal_places: 3, symbol_before_amount: true,  space_between: true,  countries: ['Oman'],                flag: '🇴🇲' },
  { iso_code: 'JOD', name: 'Jordanian Dinar',       symbol: 'JD',   decimal_places: 3, symbol_before_amount: true,  space_between: true,  countries: ['Jordan'],              flag: '🇯🇴' },
  { iso_code: 'ILS', name: 'Israeli New Shekel',    symbol: '₪',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Israel', 'Palestinian Territory'], flag: '🇮🇱' },
  { iso_code: 'IQD', name: 'Iraqi Dinar',           symbol: 'ع.د', decimal_places: 3, symbol_before_amount: true,  space_between: true,  countries: ['Iraq'],                flag: '🇮🇶' },
  { iso_code: 'IRR', name: 'Iranian Rial',          symbol: '﷼',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Iran'],                flag: '🇮🇷' },
  { iso_code: 'LBP', name: 'Lebanese Pound',        symbol: 'ل.ل', decimal_places: 2, symbol_before_amount: true,  space_between: true,  countries: ['Lebanon'],             flag: '🇱🇧' },
  { iso_code: 'SYP', name: 'Syrian Pound',          symbol: '£',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Syria'],               flag: '🇸🇾' },
  { iso_code: 'YER', name: 'Yemeni Rial',           symbol: '﷼',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Yemen'],               flag: '🇾🇪' },

  // ── Africa ────────────────────────────────────────────────────────────────
  { iso_code: 'ZAR', name: 'South African Rand',    symbol: 'R',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['South Africa'],        flag: '🇿🇦' },
  { iso_code: 'EGP', name: 'Egyptian Pound',        symbol: '£',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Egypt'],               flag: '🇪🇬' },
  { iso_code: 'NGN', name: 'Nigerian Naira',        symbol: '₦',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Nigeria'],             flag: '🇳🇬' },
  { iso_code: 'KES', name: 'Kenyan Shilling',       symbol: 'KSh',  decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Kenya'],               flag: '🇰🇪' },
  { iso_code: 'GHS', name: 'Ghanaian Cedi',         symbol: '₵',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Ghana'],               flag: '🇬🇭' },
  { iso_code: 'TZS', name: 'Tanzanian Shilling',    symbol: 'TSh',  decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Tanzania'],            flag: '🇹🇿' },
  { iso_code: 'UGX', name: 'Ugandan Shilling',      symbol: 'USh',  decimal_places: 0, symbol_before_amount: true,  space_between: false, countries: ['Uganda'],              flag: '🇺🇬' },
  { iso_code: 'ETB', name: 'Ethiopian Birr',        symbol: 'Br',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Ethiopia'],            flag: '🇪🇹' },
  { iso_code: 'MAD', name: 'Moroccan Dirham',       symbol: 'MAD',  decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Morocco'],             flag: '🇲🇦' },
  { iso_code: 'DZD', name: 'Algerian Dinar',        symbol: 'دج',   decimal_places: 2, symbol_before_amount: false, space_between: true,  countries: ['Algeria'],             flag: '🇩🇿' },
  { iso_code: 'TND', name: 'Tunisian Dinar',        symbol: 'DT',   decimal_places: 3, symbol_before_amount: false, space_between: true,  countries: ['Tunisia'],             flag: '🇹🇳' },
  { iso_code: 'ZMW', name: 'Zambian Kwacha',        symbol: 'ZK',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Zambia'],              flag: '🇿🇲' },
  { iso_code: 'RWF', name: 'Rwandan Franc',         symbol: 'Fr',   decimal_places: 0, symbol_before_amount: true,  space_between: false, countries: ['Rwanda'],              flag: '🇷🇼' },
  { iso_code: 'MZN', name: 'Mozambican Metical',    symbol: 'MT',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Mozambique'],          flag: '🇲🇿' },
  { iso_code: 'BWP', name: 'Botswana Pula',         symbol: 'P',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Botswana'],            flag: '🇧🇼' },
  { iso_code: 'MUR', name: 'Mauritian Rupee',       symbol: 'Rs',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Mauritius'],           flag: '🇲🇺' },
  { iso_code: 'SCR', name: 'Seychellois Rupee',     symbol: 'Rs',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Seychelles'],          flag: '🇸🇨' },
  { iso_code: 'XOF', name: 'West African CFA Franc',symbol: 'Fr',   decimal_places: 0, symbol_before_amount: true,  space_between: false, countries: ['Senegal', 'Côte d\'Ivoire', 'Burkina Faso', 'Mali', 'Niger', 'Togo', 'Benin', 'Guinea-Bissau'], flag: '🌍' },
  { iso_code: 'XAF', name: 'Central African CFA Franc', symbol: 'Fr', decimal_places: 0, symbol_before_amount: true, space_between: false, countries: ['Cameroon', 'Chad', 'Congo', 'CAR', 'Gabon', 'Equatorial Guinea'], flag: '🌍' },

  // ── Oceania ───────────────────────────────────────────────────────────────
  { iso_code: 'AUD', name: 'Australian Dollar',     symbol: 'A$',   decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Australia'],           flag: '🇦🇺' },
  { iso_code: 'NZD', name: 'New Zealand Dollar',    symbol: 'NZ$',  decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['New Zealand'],         flag: '🇳🇿' },
  { iso_code: 'FJD', name: 'Fijian Dollar',         symbol: 'FJ$',  decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Fiji'],                flag: '🇫🇯' },
  { iso_code: 'PGK', name: 'Papua New Guinean Kina',symbol: 'K',    decimal_places: 2, symbol_before_amount: true,  space_between: false, countries: ['Papua New Guinea'],    flag: '🇵🇬' },
];

/**
 * Look up a world currency entry by ISO code (case-insensitive)
 */
export function getWorldCurrency(isoCode: string): WorldCurrencyEntry | null {
  return WORLD_CURRENCIES.find(c => c.iso_code === isoCode.toUpperCase()) ?? null;
}

/**
 * Search currencies by ISO code, name, or country name
 * Returns top matches for the combobox dropdown
 */
export function searchWorldCurrencies(query: string, limit = 20): WorldCurrencyEntry[] {
  if (!query.trim()) return WORLD_CURRENCIES.slice(0, limit);
  const q = query.toLowerCase().trim();
  const exact: WorldCurrencyEntry[] = [];
  const startsWith: WorldCurrencyEntry[] = [];
  const contains: WorldCurrencyEntry[] = [];

  for (const c of WORLD_CURRENCIES) {
    const isoLower = c.iso_code.toLowerCase();
    const nameLower = c.name.toLowerCase();
    const countryMatch = c.countries.some(co => co.toLowerCase().includes(q));

    if (isoLower === q) { exact.push(c); continue; }
    if (isoLower.startsWith(q) || nameLower.startsWith(q)) { startsWith.push(c); continue; }
    if (isoLower.includes(q) || nameLower.includes(q) || countryMatch) { contains.push(c); }
  }
  return [...exact, ...startsWith, ...contains].slice(0, limit);
}
