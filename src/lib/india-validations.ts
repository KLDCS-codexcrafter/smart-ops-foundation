/** india-validations.ts — India compliance validators, formatters, and helpers */

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
export const CIN_REGEX = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
export const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
export const UDYAM_REGEX = /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/;
export const PIN_REGEX = /^[1-9][0-9]{5}$/;
export const MOBILE_REGEX = /^[6-9][0-9]{9}$/;

export const INDIAN_STATES: Record<string, string> = {
  "Jammu and Kashmir":"01","Himachal Pradesh":"02","Punjab":"03","Chandigarh":"04",
  "Uttarakhand":"05","Haryana":"06","Delhi":"07","Rajasthan":"08","Uttar Pradesh":"09",
  "Bihar":"10","Sikkim":"11","Arunachal Pradesh":"12","Nagaland":"13","Manipur":"14",
  "Mizoram":"15","Tripura":"16","Meghalaya":"17","Assam":"18","West Bengal":"19",
  "Jharkhand":"20","Odisha":"21","Chhattisgarh":"22","Madhya Pradesh":"23","Gujarat":"24",
  "Daman and Diu":"25","Dadra and Nagar Haveli":"26","Maharashtra":"27",
  "Karnataka":"29","Goa":"30","Lakshadweep":"31","Kerala":"32","Tamil Nadu":"33",
  "Puducherry":"34","Andaman and Nicobar Islands":"35","Telangana":"36",
  "Andhra Pradesh":"37","Ladakh":"38",
};
export const INDIAN_STATE_NAMES = Object.keys(INDIAN_STATES);

type VR = { valid: boolean; message: string };

export function validatePAN(pan: string): VR {
  if (!pan) return { valid: true, message: "" };
  const n = pan.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (n.length !== 10) return { valid: false, message: `PAN must be 10 chars (got ${n.length})` };
  if (!PAN_REGEX.test(n)) return { valid: false, message: "Invalid PAN — expected AAAAA0000A" };
  return { valid: true, message: "" };
}

export function validateGSTIN(gstin: string): VR {
  if (!gstin) return { valid: true, message: "" };
  const n = gstin.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (n.length !== 15) return { valid: false, message: `GSTIN must be 15 chars (got ${n.length})` };
  if (!GSTIN_REGEX.test(n)) return { valid: false, message: "Invalid GSTIN — expected 22AAAAA0000A1Z5" };
  return { valid: true, message: "" };
}

export function validateCIN(cin: string): VR {
  if (!cin) return { valid: true, message: "" };
  const n = cin.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (n.length !== 21) return { valid: false, message: `CIN must be 21 chars (got ${n.length})` };
  if (!CIN_REGEX.test(n)) return { valid: false, message: "Invalid CIN — expected U74999DL2020PTC123456" };
  return { valid: true, message: "" };
}

export function validateTAN(tan: string): VR {
  if (!tan) return { valid: true, message: "" };
  const n = tan.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (n.length !== 10) return { valid: false, message: `TAN must be 10 chars (got ${n.length})` };
  if (!TAN_REGEX.test(n)) return { valid: false, message: "Invalid TAN — expected ABCD12345E" };
  return { valid: true, message: "" };
}

export function validateUdyam(udyam: string): VR {
  if (!udyam) return { valid: true, message: "" };
  if (!UDYAM_REGEX.test(udyam.toUpperCase().trim()))
    return { valid: false, message: "Expected UDYAM-KA-01-0000001" };
  return { valid: true, message: "" };
}

export const formatPAN = (v: string) => v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);
export const formatGSTIN = (v: string) => v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 15);
export const formatCIN = (v: string) => v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 21);
export const formatTAN = (v: string) => v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);
export const formatShortCode = (v: string) => v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);

export function suggestShortCode(legalName: string): string {
  const stop = new Set(["pvt", "ltd", "llp", "inc", "opc", "co", "the", "and", "of", "for"]);
  return legalName.trim().split(/\s+/)
    .filter(w => !stop.has(w.toLowerCase()))
    .slice(0, 4).map(w => w[0] ?? "").join("").toUpperCase();
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}

export function formatIndianDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
