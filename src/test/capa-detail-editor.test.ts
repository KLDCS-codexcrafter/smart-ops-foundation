/**
 * @file src/test/capa-detail-editor.test.ts
 * @purpose CapaDetail full 8D editor integration tests · 5 Whys persistence + verification flow
 * @sprint T-Phase-1.A.5.c-T1-Audit-Closure
 * @decisions D-NEW-BR (CapaDetail full 8D editor) · D-NEW-BJ (3-arg API · adapt within bound)
 * @disciplines FR-19 (consume α-b capa-engine public API · zero engine touches)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { raiseCapa, updateEightDStep, recordVerification, getCapaById } from '@/lib/capa-engine';

const ENTITY = 'TEST_SMRT';
const USER = 'test_user';

beforeEach(() => { localStorage.clear(); });

describe('CapaDetail editor integration', () => {
  it('updateEightDStep with 5 Whys data on Step 4 (D4 Root Cause) persists via capa-engine', () => {
    const capa = raiseCapa(ENTITY, USER, {
      entity_id: ENTITY,
      source: 'internal_review',
      severity: 'major',
      title: 'Test CAPA',
      description: 'Persistence verification',
    });

    const fiveWhys = {
      why_1: { question: 'Why did the failure occur?', answer: 'Bolt loose' },
      why_2: { question: 'Why was the bolt loose?',     answer: 'Torque not verified' },
      why_3: { question: 'Why not verified?',           answer: 'No work instruction' },
      why_4: { question: 'Why no instruction?',         answer: 'New process not standardized' },
      why_5: { question: 'Why not standardized?',       answer: 'Process owner not assigned' },
      root_cause_summary: 'Process not standardized · no owner assigned',
    };

    updateEightDStep(ENTITY, USER, capa.id, 4, {
      status: 'complete',
      five_whys: fiveWhys,
    });

    const updated = getCapaById(ENTITY, capa.id);
    const step4 = updated?.eight_d_steps.find((s) => s.step === 4);
    expect(step4?.status).toBe('complete');
    expect(step4?.five_whys?.root_cause_summary).toBe(
      'Process not standardized · no owner assigned'
    );
    expect(step4?.five_whys?.why_5?.answer).toBe('Process owner not assigned');
  });

  it('recordVerification on milestones 30/60/90 persists effective flag and audit log', () => {
    const capa = raiseCapa(ENTITY, USER, {
      entity_id: ENTITY,
      source: 'internal_review',
      severity: 'minor',
      title: 'Effectiveness test',
    });

    recordVerification(ENTITY, USER, capa.id, 30, true, 'NCR rate down 50%');
    recordVerification(ENTITY, USER, capa.id, 60, true, 'NCR rate down 70%');
    recordVerification(ENTITY, USER, capa.id, 90, true, 'NCR rate stable at zero');

    const final = getCapaById(ENTITY, capa.id);
    expect(final?.verifications.length).toBe(3);
    expect(final?.verifications.every((v) => v.effective === true)).toBe(true);
    expect(final?.audit_log.filter((a) => a.action === 'verify').length).toBeGreaterThanOrEqual(3);
  });
});
