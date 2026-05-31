/**
 * @file        src/lib/comply360-cfo-pitch-deck-engine.ts
 * @sibling     NEW @ Sprint 87 · DP-S87-5 · Q27b CFO Pitch Deck · OOB-3 FUNCTIONAL
 * @realizes    CFO Compliance Pitch Deck PDF generation via jspdf.
 *              USE-SITE READS S87 ai-control-center ROI + audit-ready-score.
 * @reads-from  audit-trail-engine · audit-trail-aggregator · ai-control-center · audit-ready-score
 * @sprint      Sprint 87 · T-Phase-5.D.4.2 · FLOOR 4 CLOSES · OOB-3 FUNCTIONAL
 * [JWT] Phase 8: POST /api/comply360/cfo-pitch-deck/generate
 */
import jsPDF from 'jspdf';
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
import { listROICalculations } from './comply360-ai-control-center-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-ai-control-center-engine',
    'comply360-audit-ready-score-engine',
  ],
  storage_keys: ['erp_cfo_pitch_decks'],
} as const;

export interface CFOPitchDeckSection {
  title: string;
  body_lines: string[];
}

export interface CFOPitchDeck {
  id: string;
  fy: string;
  company_name: string;
  prepared_by_bap: BAPAccountId;
  audit_ready_score: number;
  roi_percentage: number;
  cost_savings_inr: number;
  sections: CFOPitchDeckSection[];
  generated_at: string;
  pdf_bytes_base64: string | null;
}

const D_KEY = 'erp_cfo_pitch_decks';

function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJson(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
}
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; } catch { return 'OPERIX-DEMO'; }
}

export function buildPitchDeckSections(input: {
  fy: string; company_name: string;
  audit_ready_score: number; roi_percentage: number; cost_savings_inr: number;
}): CFOPitchDeckSection[] {
  return [
    {
      title: '1. Executive Summary',
      body_lines: [
        `Company: ${input.company_name}`,
        `Financial Year: ${input.fy}`,
        `Audit Readiness Score: ${input.audit_ready_score}%`,
        `Compliance ROI: ${input.roi_percentage}%`,
        `Annualised Savings (INR): Rs ${input.cost_savings_inr.toLocaleString('en-IN')}`,
      ],
    },
    {
      title: '2. Compliance Posture',
      body_lines: [
        'MCA Rule 3(1) audit trail: ENABLED across all financial entities.',
        'Section 128(5) 8-year retention: ENFORCED.',
        'Cross-card lineage: TRACED end-to-end.',
      ],
    },
    {
      title: '3. ROI Justification (OOB-2)',
      body_lines: [
        `Cost savings vs industry baseline: Rs ${input.cost_savings_inr.toLocaleString('en-IN')}`,
        `Return on Investment: ${input.roi_percentage}%`,
        'Time savings: see Compliance ROI dashboard for FY-wise breakdown.',
      ],
    },
    {
      title: '4. Risk Mitigation',
      body_lines: [
        'Mock Audit Simulator (S81d): readiness band computed quarterly.',
        'NLP Audit Ask (S80c): 30+ query patterns for auditor self-service.',
        'AI Tutor (OOB-9): on-demand compliance Q&A with citations.',
      ],
    },
    {
      title: '5. Sector-Pack Coverage',
      body_lines: [
        'NBFC: NPA classification + ALM + LCR per RBI Master Directions.',
        'SEBI LODR: Reg 33 quarterly + Reg 49 Audit Committee + Reg 30 disclosures.',
        'RERA: Project registration + Quarterly Progress Reports.',
        'FEMA: FC-GPR + FC-TRS + Annual Foreign Liabilities Return.',
      ],
    },
    {
      title: '6. Next Steps',
      body_lines: [
        'Continue quarterly mock audits with target readiness > 85%.',
        'Maintain ICC composition (POSH) and Vigil Mechanism (Whistleblower) per Companies Act.',
        'Scale CSR spend (Section 135) per Schedule VII allocation.',
      ],
    },
  ];
}

export function generateCFOPitchDeckPDF(input: {
  fy: string; company_name: string;
  audit_ready_score: number; roi_percentage: number; cost_savings_inr: number;
  prepared_by_bap: BAPAccountId;
}): CFOPitchDeck {
  const sections = buildPitchDeckSections(input);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // Cover page
  doc.setFontSize(22); doc.text('CFO Compliance Pitch Deck', 40, 80);
  doc.setFontSize(14); doc.text(input.company_name, 40, 110);
  doc.text(`FY ${input.fy}`, 40, 130);
  doc.text(`Prepared by: ${input.prepared_by_bap}`, 40, 150);

  // Sections
  let y = 200;
  for (const s of sections) {
    if (y > 740) { doc.addPage(); y = 60; }
    doc.setFontSize(14); doc.text(s.title, 40, y); y += 20;
    doc.setFontSize(11);
    for (const line of s.body_lines) {
      if (y > 780) { doc.addPage(); y = 60; }
      doc.text(`- ${line}`, 50, y); y += 16;
    }
    y += 12;
  }

  const pdf_bytes_base64 = doc.output('datauristring').split(',')[1] ?? '';
  const r: CFOPitchDeck = {
    id: uid('cfo'),
    fy: input.fy,
    company_name: input.company_name,
    prepared_by_bap: input.prepared_by_bap,
    audit_ready_score: input.audit_ready_score,
    roi_percentage: input.roi_percentage,
    cost_savings_inr: input.cost_savings_inr,
    sections,
    generated_at: new Date().toISOString(),
    pdf_bytes_base64,
  };
  const all = readJson<CFOPitchDeck[]>(D_KEY, []);
  // Store without raw bytes to respect quota; bytes remain on the returned object.
  all.push({ ...r, pdf_bytes_base64: null });
  writeJson(D_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create',
    entityType: AUD('cfo_pitch_deck_generation'),
    recordId: r.id, recordLabel: `CFO Deck · ${input.company_name} · FY ${input.fy}`,
    beforeState: null, afterState: { ...r, pdf_bytes_base64: '[redacted]' } as unknown as Record<string, unknown>,
    sourceModule: 'comply360-cfo-pitch-deck-engine',
  });
  return r;
}

export function listCFOPitchDecks(opts: { fy?: string } = {}): CFOPitchDeck[] {
  return readJson<CFOPitchDeck[]>(D_KEY, []).filter((d) => !opts.fy || d.fy === opts.fy);
}

export function getLatestROISnapshot(fy: string): { roi_percentage: number; cost_savings_inr: number } {
  const rois = listROICalculations({ fy });
  if (rois.length === 0) return { roi_percentage: 0, cost_savings_inr: 0 };
  const latest = rois[rois.length - 1];
  return { roi_percentage: latest.roi_percentage, cost_savings_inr: latest.cost_savings_inr };
}

registerAuditEntityType({ id: 'cfo_pitch_deck_generation', module: 'other', label: 'CFO · Pitch Deck Generated (OOB-3)' });
