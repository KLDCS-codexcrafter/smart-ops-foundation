/**
 * @file        src/lib/sanctions-screening-engine.ts
 * @purpose     Sanctions screening 4-source (OFAC + UN + EU + RBI) · v7 Gap #8
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q8=a 4-source · ForeignCustomer + ForeignVendor + Country READ-ONLY
 */
import type { SanctionsListEntry, SanctionsScreeningResult, SanctionsSource } from '@/types/sanctions-list';
import { sanctionsListKey, sanctionsScreeningKey } from '@/types/sanctions-list';

const SEED_SANCTIONS_LIST: SanctionsListEntry[] = [
  { id: 'sn-001', source: 'OFAC_SDN', entity_type: 'organization', primary_name: 'Korea Mining Development Trading Corp', aliases: ['KOMID'], country_code: 'KP', sanction_program: 'North Korea sanctions', listed_date: '2020-01-15', list_url: 'https://ofac.treasury.gov/sdn-list', notes: 'WMD-related' },
  { id: 'sn-002', source: 'UN_Consolidated', entity_type: 'individual', primary_name: 'Abdullah Ahmed Ali Khan', aliases: ['Abu Khattab'], country_code: 'AF', sanction_program: 'Taliban sanctions', listed_date: '2018-06-20', list_url: 'https://www.un.org/securitycouncil/sanctions/un-sc-consolidated-list', notes: 'Asset freeze + travel ban' },
  { id: 'sn-003', source: 'EU_CFSP', entity_type: 'organization', primary_name: 'Rusbank PJSC', aliases: ['Russian State Bank'], country_code: 'RU', sanction_program: 'Russia sanctions package 12', listed_date: '2024-02-23', list_url: 'https://eur-lex.europa.eu/sanctions', notes: 'Financial sector restrictions' },
  { id: 'sn-004', source: 'RBI_EXIM_NegativeList', entity_type: 'country', primary_name: 'Iran', aliases: ['Islamic Republic of Iran'], country_code: 'IR', sanction_program: 'RBI A.P. (DIR Series) Circular · Iran restrictions', listed_date: '2019-11-10', list_url: 'https://rbi.org.in', notes: 'Specific RBI authorization required' },
  { id: 'sn-005', source: 'OFAC_SDN', entity_type: 'organization', primary_name: 'Generic Trading LLC', aliases: ['GenericTrade', 'GenTradLLC'], country_code: 'AE', sanction_program: 'Close-match demo entry', listed_date: '2023-08-01', list_url: 'https://ofac.treasury.gov/sdn-list', notes: 'For false-positive demo · UAE-based · name similarity demo' },
];

export function loadSanctionsList(entityCode: string): SanctionsListEntry[] {
  try {
    const raw = localStorage.getItem(sanctionsListKey(entityCode));
    if (!raw) { localStorage.setItem(sanctionsListKey(entityCode), JSON.stringify(SEED_SANCTIONS_LIST)); return SEED_SANCTIONS_LIST; }
    return JSON.parse(raw) as SanctionsListEntry[];
  } catch { return SEED_SANCTIONS_LIST; }
}

export function loadScreeningResults(entityCode: string): SanctionsScreeningResult[] {
  try {
    const raw = localStorage.getItem(sanctionsScreeningKey(entityCode));
    return raw ? (JSON.parse(raw) as SanctionsScreeningResult[]) : [];
  } catch { return []; }
}

export function saveScreeningResult(entityCode: string, result: SanctionsScreeningResult): void {
  const all = loadScreeningResults(entityCode);
  localStorage.setItem(sanctionsScreeningKey(entityCode), JSON.stringify([...all, result]));
}

function nameMatchScore(name1: string, name2: string): number {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  if (n1 === n2) return 100;
  if (n1.includes(n2) || n2.includes(n1)) return 80;
  const w1 = new Set(n1.split(/\s+/));
  const w2 = new Set(n2.split(/\s+/));
  const common = [...w1].filter((w) => w2.has(w));
  return common.length > 0 ? Math.min(70, common.length * 25) : 0;
}

export function screenParty(entityCode: string, partyName: string, partyCountry: string): { hits: { source: SanctionsSource; entry_id: string; matched_name: string; match_score: number }[]; classification: 'exact_match' | 'fuzzy_match' | null } {
  const list = loadSanctionsList(entityCode);
  const hits: { source: SanctionsSource; entry_id: string; matched_name: string; match_score: number }[] = [];
  for (const entry of list) {
    if (entry.country_code === partyCountry) {
      const score = nameMatchScore(partyName, entry.primary_name);
      if (score >= 60) hits.push({ source: entry.source, entry_id: entry.id, matched_name: entry.primary_name, match_score: score });
      for (const alias of entry.aliases) {
        const aliasScore = nameMatchScore(partyName, alias);
        if (aliasScore >= 60) hits.push({ source: entry.source, entry_id: entry.id, matched_name: alias, match_score: aliasScore });
      }
    }
  }
  if (hits.length === 0) return { hits, classification: null };
  const maxScore = Math.max(...hits.map((h) => h.match_score));
  return { hits, classification: maxScore >= 95 ? 'exact_match' : 'fuzzy_match' };
}
