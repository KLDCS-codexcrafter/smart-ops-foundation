/**
 * world-geography.ts — 55 countries for the geography library picker
 */

export interface WorldCountry {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  currencyCode: string;
  currencySymbol: string;
  capital: string;
  region: string;
  timezone: string;
}

export const countries: WorldCountry[] = [
  { code:'IN', name:'India', flag:'🇮🇳', dialCode:'+91', currencyCode:'INR', currencySymbol:'₹', capital:'New Delhi', region:'Asia', timezone:'Asia/Kolkata' },
  { code:'AE', name:'United Arab Emirates', flag:'🇦🇪', dialCode:'+971', currencyCode:'AED', currencySymbol:'د.إ', capital:'Abu Dhabi', region:'Middle East', timezone:'Asia/Dubai' },
  { code:'US', name:'United States', flag:'🇺🇸', dialCode:'+1', currencyCode:'USD', currencySymbol:'$', capital:'Washington D.C.', region:'Americas', timezone:'America/New_York' },
  { code:'GB', name:'United Kingdom', flag:'🇬🇧', dialCode:'+44', currencyCode:'GBP', currencySymbol:'£', capital:'London', region:'Europe', timezone:'Europe/London' },
  { code:'DE', name:'Germany', flag:'🇩🇪', dialCode:'+49', currencyCode:'EUR', currencySymbol:'€', capital:'Berlin', region:'Europe', timezone:'Europe/Berlin' },
  { code:'FR', name:'France', flag:'🇫🇷', dialCode:'+33', currencyCode:'EUR', currencySymbol:'€', capital:'Paris', region:'Europe', timezone:'Europe/Paris' },
  { code:'JP', name:'Japan', flag:'🇯🇵', dialCode:'+81', currencyCode:'JPY', currencySymbol:'¥', capital:'Tokyo', region:'Asia', timezone:'Asia/Tokyo' },
  { code:'CN', name:'China', flag:'🇨🇳', dialCode:'+86', currencyCode:'CNY', currencySymbol:'¥', capital:'Beijing', region:'Asia', timezone:'Asia/Shanghai' },
  { code:'SG', name:'Singapore', flag:'🇸🇬', dialCode:'+65', currencyCode:'SGD', currencySymbol:'S$', capital:'Singapore', region:'Asia', timezone:'Asia/Singapore' },
  { code:'AU', name:'Australia', flag:'🇦🇺', dialCode:'+61', currencyCode:'AUD', currencySymbol:'A$', capital:'Canberra', region:'Oceania', timezone:'Australia/Sydney' },
  { code:'CA', name:'Canada', flag:'🇨🇦', dialCode:'+1', currencyCode:'CAD', currencySymbol:'C$', capital:'Ottawa', region:'Americas', timezone:'America/Toronto' },
  { code:'SA', name:'Saudi Arabia', flag:'🇸🇦', dialCode:'+966', currencyCode:'SAR', currencySymbol:'﷼', capital:'Riyadh', region:'Middle East', timezone:'Asia/Riyadh' },
  { code:'QA', name:'Qatar', flag:'🇶🇦', dialCode:'+974', currencyCode:'QAR', currencySymbol:'﷼', capital:'Doha', region:'Middle East', timezone:'Asia/Qatar' },
  { code:'KW', name:'Kuwait', flag:'🇰🇼', dialCode:'+965', currencyCode:'KWD', currencySymbol:'د.ك', capital:'Kuwait City', region:'Middle East', timezone:'Asia/Kuwait' },
  { code:'BH', name:'Bahrain', flag:'🇧🇭', dialCode:'+973', currencyCode:'BHD', currencySymbol:'BD', capital:'Manama', region:'Middle East', timezone:'Asia/Bahrain' },
  { code:'OM', name:'Oman', flag:'🇴🇲', dialCode:'+968', currencyCode:'OMR', currencySymbol:'﷼', capital:'Muscat', region:'Middle East', timezone:'Asia/Muscat' },
  { code:'NZ', name:'New Zealand', flag:'🇳🇿', dialCode:'+64', currencyCode:'NZD', currencySymbol:'NZ$', capital:'Wellington', region:'Oceania', timezone:'Pacific/Auckland' },
  { code:'ZA', name:'South Africa', flag:'🇿🇦', dialCode:'+27', currencyCode:'ZAR', currencySymbol:'R', capital:'Pretoria', region:'Africa', timezone:'Africa/Johannesburg' },
  { code:'BR', name:'Brazil', flag:'🇧🇷', dialCode:'+55', currencyCode:'BRL', currencySymbol:'R$', capital:'Brasília', region:'Americas', timezone:'America/Sao_Paulo' },
  { code:'MX', name:'Mexico', flag:'🇲🇽', dialCode:'+52', currencyCode:'MXN', currencySymbol:'$', capital:'Mexico City', region:'Americas', timezone:'America/Mexico_City' },
  { code:'KR', name:'South Korea', flag:'🇰🇷', dialCode:'+82', currencyCode:'KRW', currencySymbol:'₩', capital:'Seoul', region:'Asia', timezone:'Asia/Seoul' },
  { code:'MY', name:'Malaysia', flag:'🇲🇾', dialCode:'+60', currencyCode:'MYR', currencySymbol:'RM', capital:'Kuala Lumpur', region:'Asia', timezone:'Asia/Kuala_Lumpur' },
  { code:'TH', name:'Thailand', flag:'🇹🇭', dialCode:'+66', currencyCode:'THB', currencySymbol:'฿', capital:'Bangkok', region:'Asia', timezone:'Asia/Bangkok' },
  { code:'ID', name:'Indonesia', flag:'🇮🇩', dialCode:'+62', currencyCode:'IDR', currencySymbol:'Rp', capital:'Jakarta', region:'Asia', timezone:'Asia/Jakarta' },
  { code:'PH', name:'Philippines', flag:'🇵🇭', dialCode:'+63', currencyCode:'PHP', currencySymbol:'₱', capital:'Manila', region:'Asia', timezone:'Asia/Manila' },
  { code:'VN', name:'Vietnam', flag:'🇻🇳', dialCode:'+84', currencyCode:'VND', currencySymbol:'₫', capital:'Hanoi', region:'Asia', timezone:'Asia/Ho_Chi_Minh' },
  { code:'BD', name:'Bangladesh', flag:'🇧🇩', dialCode:'+880', currencyCode:'BDT', currencySymbol:'৳', capital:'Dhaka', region:'SAARC', timezone:'Asia/Dhaka' },
  { code:'LK', name:'Sri Lanka', flag:'🇱🇰', dialCode:'+94', currencyCode:'LKR', currencySymbol:'Rs', capital:'Colombo', region:'SAARC', timezone:'Asia/Colombo' },
  { code:'NP', name:'Nepal', flag:'🇳🇵', dialCode:'+977', currencyCode:'NPR', currencySymbol:'₨', capital:'Kathmandu', region:'SAARC', timezone:'Asia/Kathmandu' },
  { code:'PK', name:'Pakistan', flag:'🇵🇰', dialCode:'+92', currencyCode:'PKR', currencySymbol:'₨', capital:'Islamabad', region:'SAARC', timezone:'Asia/Karachi' },
  { code:'IT', name:'Italy', flag:'🇮🇹', dialCode:'+39', currencyCode:'EUR', currencySymbol:'€', capital:'Rome', region:'Europe', timezone:'Europe/Rome' },
  { code:'ES', name:'Spain', flag:'🇪🇸', dialCode:'+34', currencyCode:'EUR', currencySymbol:'€', capital:'Madrid', region:'Europe', timezone:'Europe/Madrid' },
  { code:'NL', name:'Netherlands', flag:'🇳🇱', dialCode:'+31', currencyCode:'EUR', currencySymbol:'€', capital:'Amsterdam', region:'Europe', timezone:'Europe/Amsterdam' },
  { code:'CH', name:'Switzerland', flag:'🇨🇭', dialCode:'+41', currencyCode:'CHF', currencySymbol:'CHF', capital:'Bern', region:'Europe', timezone:'Europe/Zurich' },
  { code:'SE', name:'Sweden', flag:'🇸🇪', dialCode:'+46', currencyCode:'SEK', currencySymbol:'kr', capital:'Stockholm', region:'Europe', timezone:'Europe/Stockholm' },
  { code:'NO', name:'Norway', flag:'🇳🇴', dialCode:'+47', currencyCode:'NOK', currencySymbol:'kr', capital:'Oslo', region:'Europe', timezone:'Europe/Oslo' },
  { code:'DK', name:'Denmark', flag:'🇩🇰', dialCode:'+45', currencyCode:'DKK', currencySymbol:'kr', capital:'Copenhagen', region:'Europe', timezone:'Europe/Copenhagen' },
  { code:'IE', name:'Ireland', flag:'🇮🇪', dialCode:'+353', currencyCode:'EUR', currencySymbol:'€', capital:'Dublin', region:'Europe', timezone:'Europe/Dublin' },
  { code:'BE', name:'Belgium', flag:'🇧🇪', dialCode:'+32', currencyCode:'EUR', currencySymbol:'€', capital:'Brussels', region:'Europe', timezone:'Europe/Brussels' },
  { code:'AT', name:'Austria', flag:'🇦🇹', dialCode:'+43', currencyCode:'EUR', currencySymbol:'€', capital:'Vienna', region:'Europe', timezone:'Europe/Vienna' },
  { code:'PT', name:'Portugal', flag:'🇵🇹', dialCode:'+351', currencyCode:'EUR', currencySymbol:'€', capital:'Lisbon', region:'Europe', timezone:'Europe/Lisbon' },
  { code:'PL', name:'Poland', flag:'🇵🇱', dialCode:'+48', currencyCode:'PLN', currencySymbol:'zł', capital:'Warsaw', region:'Europe', timezone:'Europe/Warsaw' },
  { code:'RU', name:'Russia', flag:'🇷🇺', dialCode:'+7', currencyCode:'RUB', currencySymbol:'₽', capital:'Moscow', region:'Europe', timezone:'Europe/Moscow' },
  { code:'TR', name:'Turkey', flag:'🇹🇷', dialCode:'+90', currencyCode:'TRY', currencySymbol:'₺', capital:'Ankara', region:'Middle East', timezone:'Europe/Istanbul' },
  { code:'EG', name:'Egypt', flag:'🇪🇬', dialCode:'+20', currencyCode:'EGP', currencySymbol:'£', capital:'Cairo', region:'Africa', timezone:'Africa/Cairo' },
  { code:'NG', name:'Nigeria', flag:'🇳🇬', dialCode:'+234', currencyCode:'NGN', currencySymbol:'₦', capital:'Abuja', region:'Africa', timezone:'Africa/Lagos' },
  { code:'KE', name:'Kenya', flag:'🇰🇪', dialCode:'+254', currencyCode:'KES', currencySymbol:'KSh', capital:'Nairobi', region:'Africa', timezone:'Africa/Nairobi' },
  { code:'GH', name:'Ghana', flag:'🇬🇭', dialCode:'+233', currencyCode:'GHS', currencySymbol:'₵', capital:'Accra', region:'Africa', timezone:'Africa/Accra' },
  { code:'TZ', name:'Tanzania', flag:'🇹🇿', dialCode:'+255', currencyCode:'TZS', currencySymbol:'TSh', capital:'Dodoma', region:'Africa', timezone:'Africa/Dar_es_Salaam' },
  { code:'AR', name:'Argentina', flag:'🇦🇷', dialCode:'+54', currencyCode:'ARS', currencySymbol:'$', capital:'Buenos Aires', region:'Americas', timezone:'America/Argentina/Buenos_Aires' },
  { code:'CL', name:'Chile', flag:'🇨🇱', dialCode:'+56', currencyCode:'CLP', currencySymbol:'$', capital:'Santiago', region:'Americas', timezone:'America/Santiago' },
  { code:'CO', name:'Colombia', flag:'🇨🇴', dialCode:'+57', currencyCode:'COP', currencySymbol:'$', capital:'Bogotá', region:'Americas', timezone:'America/Bogota' },
  { code:'HK', name:'Hong Kong', flag:'🇭🇰', dialCode:'+852', currencyCode:'HKD', currencySymbol:'HK$', capital:'Hong Kong', region:'Asia', timezone:'Asia/Hong_Kong' },
  { code:'TW', name:'Taiwan', flag:'🇹🇼', dialCode:'+886', currencyCode:'TWD', currencySymbol:'NT$', capital:'Taipei', region:'Asia', timezone:'Asia/Taipei' },
  { code:'IL', name:'Israel', flag:'🇮🇱', dialCode:'+972', currencyCode:'ILS', currencySymbol:'₪', capital:'Jerusalem', region:'Middle East', timezone:'Asia/Jerusalem' },
];
