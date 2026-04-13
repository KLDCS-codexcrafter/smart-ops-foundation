/**
 * world-currencies.ts — ISO 4217 reference data (~90 major currencies)
 * Used by CurrencyMaster combobox for auto-fill.
 * [JWT] Replace with GET /api/reference/world-currencies when backend is ready
 */

export interface WorldCurrencyEntry {
  iso_code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  symbol_before_amount: boolean;
  space_between: boolean;
  countries: string[];
  flag: string;
}

const WORLD_CURRENCIES: WorldCurrencyEntry[] = [
  { iso_code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2, symbol_before_amount: true, space_between: true, countries: ['United Arab Emirates'], flag: '🇦🇪' },
  { iso_code: 'AFN', name: 'Afghan Afghani', symbol: '؋', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Afghanistan'], flag: '🇦🇫' },
  { iso_code: 'ALL', name: 'Albanian Lek', symbol: 'L', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Albania'], flag: '🇦🇱' },
  { iso_code: 'AMD', name: 'Armenian Dram', symbol: '֏', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Armenia'], flag: '🇦🇲' },
  { iso_code: 'ARS', name: 'Argentine Peso', symbol: '$', decimal_places: 2, symbol_before_amount: true, space_between: true, countries: ['Argentina'], flag: '🇦🇷' },
  { iso_code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Australia', 'Kiribati', 'Nauru', 'Tuvalu'], flag: '🇦🇺' },
  { iso_code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Azerbaijan'], flag: '🇦🇿' },
  { iso_code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', symbol: 'KM', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Bosnia and Herzegovina'], flag: '🇧🇦' },
  { iso_code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Bangladesh'], flag: '🇧🇩' },
  { iso_code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Bulgaria'], flag: '🇧🇬' },
  { iso_code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', decimal_places: 3, symbol_before_amount: true, space_between: true, countries: ['Bahrain'], flag: '🇧🇭' },
  { iso_code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimal_places: 2, symbol_before_amount: true, space_between: true, countries: ['Brazil'], flag: '🇧🇷' },
  { iso_code: 'BSD', name: 'Bahamian Dollar', symbol: 'B$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Bahamas'], flag: '🇧🇸' },
  { iso_code: 'BWP', name: 'Botswana Pula', symbol: 'P', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Botswana'], flag: '🇧🇼' },
  { iso_code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Belarus'], flag: '🇧🇾' },
  { iso_code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Canada'], flag: '🇨🇦' },
  { iso_code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimal_places: 2, symbol_before_amount: true, space_between: true, countries: ['Switzerland', 'Liechtenstein'], flag: '🇨🇭' },
  { iso_code: 'CLP', name: 'Chilean Peso', symbol: '$', decimal_places: 0, symbol_before_amount: true, space_between: false, countries: ['Chile'], flag: '🇨🇱' },
  { iso_code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['China'], flag: '🇨🇳' },
  { iso_code: 'COP', name: 'Colombian Peso', symbol: '$', decimal_places: 2, symbol_before_amount: true, space_between: true, countries: ['Colombia'], flag: '🇨🇴' },
  { iso_code: 'CRC', name: 'Costa Rican Colón', symbol: '₡', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Costa Rica'], flag: '🇨🇷' },
  { iso_code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Czech Republic'], flag: '🇨🇿' },
  { iso_code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Denmark', 'Greenland', 'Faroe Islands'], flag: '🇩🇰' },
  { iso_code: 'DOP', name: 'Dominican Peso', symbol: 'RD$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Dominican Republic'], flag: '🇩🇴' },
  { iso_code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Algeria'], flag: '🇩🇿' },
  { iso_code: 'EGP', name: 'Egyptian Pound', symbol: '£', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Egypt'], flag: '🇪🇬' },
  { iso_code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Ethiopia'], flag: '🇪🇹' },
  { iso_code: 'EUR', name: 'Euro', symbol: '€', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria', 'Ireland', 'Portugal', 'Finland', 'Greece', 'Luxembourg'], flag: '🇪🇺' },
  { iso_code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Fiji'], flag: '🇫🇯' },
  { iso_code: 'GBP', name: 'British Pound', symbol: '£', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['United Kingdom', 'Jersey', 'Guernsey', 'Isle of Man'], flag: '🇬🇧' },
  { iso_code: 'GEL', name: 'Georgian Lari', symbol: '₾', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Georgia'], flag: '🇬🇪' },
  { iso_code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Ghana'], flag: '🇬🇭' },
  { iso_code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Guatemala'], flag: '🇬🇹' },
  { iso_code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Hong Kong'], flag: '🇭🇰' },
  { iso_code: 'HNL', name: 'Honduran Lempira', symbol: 'L', decimal_places: 2, symbol_before_amount: true, space_between: true, countries: ['Honduras'], flag: '🇭🇳' },
  { iso_code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Croatia'], flag: '🇭🇷' },
  { iso_code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimal_places: 0, symbol_before_amount: false, space_between: true, countries: ['Hungary'], flag: '🇭🇺' },
  { iso_code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimal_places: 0, symbol_before_amount: true, space_between: false, countries: ['Indonesia'], flag: '🇮🇩' },
  { iso_code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', decimal_places: 2, symbol_before_amount: true, space_between: true, countries: ['Israel'], flag: '🇮🇱' },
  { iso_code: 'INR', name: 'Indian Rupee', symbol: '₹', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['India'], flag: '🇮🇳' },
  { iso_code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', decimal_places: 3, symbol_before_amount: false, space_between: true, countries: ['Iraq'], flag: '🇮🇶' },
  { iso_code: 'IRR', name: 'Iranian Rial', symbol: '﷼', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Iran'], flag: '🇮🇷' },
  { iso_code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', decimal_places: 0, symbol_before_amount: false, space_between: true, countries: ['Iceland'], flag: '🇮🇸' },
  { iso_code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Jamaica'], flag: '🇯🇲' },
  { iso_code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD', decimal_places: 3, symbol_before_amount: true, space_between: true, countries: ['Jordan'], flag: '🇯🇴' },
  { iso_code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimal_places: 0, symbol_before_amount: true, space_between: false, countries: ['Japan'], flag: '🇯🇵' },
  { iso_code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Kenya'], flag: '🇰🇪' },
  { iso_code: 'KGS', name: 'Kyrgyzstani Som', symbol: 'сом', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Kyrgyzstan'], flag: '🇰🇬' },
  { iso_code: 'KHR', name: 'Cambodian Riel', symbol: '៛', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Cambodia'], flag: '🇰🇭' },
  { iso_code: 'KRW', name: 'South Korean Won', symbol: '₩', decimal_places: 0, symbol_before_amount: true, space_between: false, countries: ['South Korea'], flag: '🇰🇷' },
  { iso_code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', decimal_places: 3, symbol_before_amount: true, space_between: true, countries: ['Kuwait'], flag: '🇰🇼' },
  { iso_code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Kazakhstan'], flag: '🇰🇿' },
  { iso_code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Lebanon'], flag: '🇱🇧' },
  { iso_code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', decimal_places: 2, symbol_before_amount: true, space_between: true, countries: ['Sri Lanka'], flag: '🇱🇰' },
  { iso_code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Morocco'], flag: '🇲🇦' },
  { iso_code: 'MMK', name: 'Myanmar Kyat', symbol: 'K', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Myanmar'], flag: '🇲🇲' },
  { iso_code: 'MNT', name: 'Mongolian Tugrik', symbol: '₮', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Mongolia'], flag: '🇲🇳' },
  { iso_code: 'MUR', name: 'Mauritian Rupee', symbol: '₨', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Mauritius'], flag: '🇲🇺' },
  { iso_code: 'MXN', name: 'Mexican Peso', symbol: '$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Mexico'], flag: '🇲🇽' },
  { iso_code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Malaysia'], flag: '🇲🇾' },
  { iso_code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Mozambique'], flag: '🇲🇿' },
  { iso_code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Nigeria'], flag: '🇳🇬' },
  { iso_code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Norway', 'Svalbard', 'Jan Mayen'], flag: '🇳🇴' },
  { iso_code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Nepal'], flag: '🇳🇵' },
  { iso_code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['New Zealand', 'Cook Islands', 'Niue', 'Pitcairn Islands', 'Tokelau'], flag: '🇳🇿' },
  { iso_code: 'OMR', name: 'Omani Rial', symbol: '﷼', decimal_places: 3, symbol_before_amount: true, space_between: true, countries: ['Oman'], flag: '🇴🇲' },
  { iso_code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Panama'], flag: '🇵🇦' },
  { iso_code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', decimal_places: 2, symbol_before_amount: true, space_between: true, countries: ['Peru'], flag: '🇵🇪' },
  { iso_code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Philippines'], flag: '🇵🇭' },
  { iso_code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Pakistan'], flag: '🇵🇰' },
  { iso_code: 'PLN', name: 'Polish Zloty', symbol: 'zł', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Poland'], flag: '🇵🇱' },
  { iso_code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', decimal_places: 2, symbol_before_amount: true, space_between: true, countries: ['Qatar'], flag: '🇶🇦' },
  { iso_code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Romania'], flag: '🇷🇴' },
  { iso_code: 'RSD', name: 'Serbian Dinar', symbol: 'дин.', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Serbia'], flag: '🇷🇸' },
  { iso_code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Russia'], flag: '🇷🇺' },
  { iso_code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimal_places: 2, symbol_before_amount: true, space_between: true, countries: ['Saudi Arabia'], flag: '🇸🇦' },
  { iso_code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Sweden'], flag: '🇸🇪' },
  { iso_code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Singapore'], flag: '🇸🇬' },
  { iso_code: 'THB', name: 'Thai Baht', symbol: '฿', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Thailand'], flag: '🇹🇭' },
  { iso_code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', decimal_places: 3, symbol_before_amount: false, space_between: true, countries: ['Tunisia'], flag: '🇹🇳' },
  { iso_code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Turkey'], flag: '🇹🇷' },
  { iso_code: 'TTD', name: 'Trinidad & Tobago Dollar', symbol: 'TT$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Trinidad and Tobago'], flag: '🇹🇹' },
  { iso_code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Taiwan'], flag: '🇹🇼' },
  { iso_code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Tanzania'], flag: '🇹🇿' },
  { iso_code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Ukraine'], flag: '🇺🇦' },
  { iso_code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', decimal_places: 0, symbol_before_amount: true, space_between: false, countries: ['Uganda'], flag: '🇺🇬' },
  { iso_code: 'USD', name: 'US Dollar', symbol: '$', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['United States', 'Ecuador', 'El Salvador', 'Panama', 'Puerto Rico'], flag: '🇺🇸' },
  { iso_code: 'UYU', name: 'Uruguayan Peso', symbol: '$U', decimal_places: 2, symbol_before_amount: true, space_between: true, countries: ['Uruguay'], flag: '🇺🇾' },
  { iso_code: 'UZS', name: 'Uzbekistani Som', symbol: 'сўм', decimal_places: 2, symbol_before_amount: false, space_between: true, countries: ['Uzbekistan'], flag: '🇺🇿' },
  { iso_code: 'VND', name: 'Vietnamese Dong', symbol: '₫', decimal_places: 0, symbol_before_amount: false, space_between: true, countries: ['Vietnam'], flag: '🇻🇳' },
  { iso_code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA', decimal_places: 0, symbol_before_amount: false, space_between: true, countries: ['Cameroon', 'Central African Republic', 'Chad', 'Congo', 'Equatorial Guinea', 'Gabon'], flag: '🌍' },
  { iso_code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', decimal_places: 0, symbol_before_amount: false, space_between: true, countries: ['Senegal', 'Mali', 'Ivory Coast', 'Burkina Faso', 'Niger', 'Togo', 'Benin', 'Guinea-Bissau'], flag: '🌍' },
  { iso_code: 'ZAR', name: 'South African Rand', symbol: 'R', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['South Africa', 'Lesotho', 'Namibia', 'Eswatini'], flag: '🇿🇦' },
  { iso_code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', decimal_places: 2, symbol_before_amount: true, space_between: false, countries: ['Zambia'], flag: '🇿🇲' },
];

/**
 * Look up a single currency by ISO code.
 */
export function getWorldCurrency(isoCode: string): WorldCurrencyEntry | null {
  return WORLD_CURRENCIES.find(c => c.iso_code === isoCode.toUpperCase()) ?? null;
}

/**
 * Search world currencies by ISO code, name, or countries.
 * Returns ranked results (exact code match first, then name, then country).
 */
export function searchWorldCurrencies(query: string, limit = 20): WorldCurrencyEntry[] {
  if (!query.trim()) return WORLD_CURRENCIES.slice(0, limit);
  const q = query.toUpperCase();

  const exactCode: WorldCurrencyEntry[] = [];
  const startsCode: WorldCurrencyEntry[] = [];
  const nameMatch: WorldCurrencyEntry[] = [];
  const countryMatch: WorldCurrencyEntry[] = [];

  for (const entry of WORLD_CURRENCIES) {
    if (entry.iso_code === q) { exactCode.push(entry); continue; }
    if (entry.iso_code.startsWith(q)) { startsCode.push(entry); continue; }
    if (entry.name.toUpperCase().includes(q)) { nameMatch.push(entry); continue; }
    if (entry.countries.some(c => c.toUpperCase().includes(q))) { countryMatch.push(entry); continue; }
  }

  return [...exactCode, ...startsCode, ...nameMatch, ...countryMatch].slice(0, limit);
}

export default WORLD_CURRENCIES;
