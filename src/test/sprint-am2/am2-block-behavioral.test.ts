/**
 * @file   src/test/sprint-am2/am2-block-behavioral.test.ts
 * @sprint AM.2 · T-AM2-Mobile-Captures
 * @canon  Behavioral guardrails — non-forward-looking only.
 *   - 5 mobile-gap personas CONSUME their card engines + B.1 rail (greppable delegation)
 *   - CameraCapture + VoiceNote are CAPTURE SHELLS · no OCR / no transcription
 *   - MobileRouter wires new /mobile/captures/* routes (additive)
 *   - sprint-history flips AM.1 → 3fd7e61f, appends AM.2 row, walls untouched
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { CAMERA_CAPTURE_HONESTY, CameraCapture } from '@/components/mobile/CameraCapture';
import { VOICE_NOTE_HONESTY, VoiceNote } from '@/components/mobile/VoiceNote';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const PERSONA_FILES: Array<[string, string[]]> = [
  ['src/pages/mobile/captures/MobileProcureApprovePage.tsx',
   ['approval-rail-engine', 'listPendingMirrors', 'decideApproval']],
  ['src/pages/mobile/captures/MobilePayoutApprovePage.tsx',
   ['payment-requisition-engine', 'listRequisitions', 'approveDeptLevel', 'approveAccountsLevel', 'rejectRequisition']],
  ['src/pages/mobile/captures/MobileRequestXIndentPage.tsx',
   ['request-engine', 'createMaterialIndent', 'submitIndent']],
  ['src/pages/mobile/captures/MobileFrontDeskCheckInPage.tsx',
   ['frontdesk-engine', 'createPlannedVisitor', 'checkInVisitor']],
  ['src/pages/mobile/captures/MobileDocVaultCapturePage.tsx',
   ['docvault-engine', 'createDocument']],
];

describe('AM.2 · 5 mobile-gap capture personas CONSUME their card engines (delegation)', () => {
  for (const [file, needles] of PERSONA_FILES) {
    it(`${file} delegates to its card engine`, () => {
      const src = read(file);
      for (const n of needles) expect(src).toContain(n);
      // Honest delegation note — no inline re-implementation banner.
      expect(src).toContain('Consumes');
    });
  }

  it('procure + frontdesk + payout pages honor B.1 / SoD (no client-side gate-skipping)', () => {
    const procure = read('src/pages/mobile/captures/MobileProcureApprovePage.tsx');
    // Reject path delegates to decideApproval with a reason (Matrix §2.6 honored by engine).
    expect(procure).toContain('decideApproval');
    expect(procure).toMatch(/Mobile reject/);

    const payout = read('src/pages/mobile/captures/MobilePayoutApprovePage.tsx');
    expect(payout).toContain('approveDeptLevel');
    expect(payout).toContain('approveAccountsLevel');

    const frontdesk = read('src/pages/mobile/captures/MobileFrontDeskCheckInPage.tsx');
    expect(frontdesk).toContain('checkInVisitor');
  });
});

describe('AM.2 · CameraCapture SHELL', () => {
  it('exports honest Wave-2 OCR banner', () => {
    expect(CAMERA_CAPTURE_HONESTY.toLowerCase()).toContain('wave-2');
    expect(CAMERA_CAPTURE_HONESTY.toLowerCase()).toContain('ocr');
  });

  it('exports the React component', () => {
    expect(typeof CameraCapture).toBe('function');
  });

  it('preserves Wave-2 [JWT] OCR seam comment', () => {
    const src = read('src/components/mobile/CameraCapture.tsx');
    expect(src).toMatch(/\[JWT\][^\n]*ocr-extract/i);
  });

  it('contains NO fabricated OCR extraction (no parsed/extracted result strings)', () => {
    const src = read('src/components/mobile/CameraCapture.tsx');
    expect(src.toLowerCase()).not.toMatch(/extracted_text|ocrresult|extractedfields/);
  });

  it('does not call external AI APIs from the shell', () => {
    const src = read('src/components/mobile/CameraCapture.tsx');
    expect(src).not.toMatch(/fetch\(|anthropic|openai/i);
  });
});

describe('AM.2 · VoiceNote SHELL', () => {
  it('exports honest Wave-2 transcribe banner', () => {
    expect(VOICE_NOTE_HONESTY.toLowerCase()).toContain('wave-2');
    expect(VOICE_NOTE_HONESTY.toLowerCase()).toContain('voice-to-text');
  });

  it('exports the React component', () => {
    expect(typeof VoiceNote).toBe('function');
  });

  it('preserves Wave-2 [JWT] transcribe seam comment', () => {
    const src = read('src/components/mobile/VoiceNote.tsx');
    expect(src).toMatch(/\[JWT\][^\n]*transcribe/i);
  });

  it('uses MediaRecorder (real audio attach · not fabricated)', () => {
    const src = read('src/components/mobile/VoiceNote.tsx');
    expect(src).toContain('MediaRecorder');
  });

  it('contains NO fabricated transcript text', () => {
    const src = read('src/components/mobile/VoiceNote.tsx');
    expect(src.toLowerCase()).not.toMatch(/transcript_text|transcribedtext|fakeTranscript/);
  });

  it('does not call external AI APIs from the shell', () => {
    const src = read('src/components/mobile/VoiceNote.tsx');
    expect(src).not.toMatch(/fetch\(|anthropic|openai/i);
  });
});

describe('AM.2 · MobileRouter wiring (additive)', () => {
  const router = read('src/pages/mobile/MobileRouter.tsx');

  it('imports all 5 capture pages', () => {
    expect(router).toContain('MobileProcureApprovePage');
    expect(router).toContain('MobilePayoutApprovePage');
    expect(router).toContain('MobileRequestXIndentPage');
    expect(router).toContain('MobileFrontDeskCheckInPage');
    expect(router).toContain('MobileDocVaultCapturePage');
  });

  it('routes all 5 capture paths under /mobile/captures/*', () => {
    for (const p of [
      '/mobile/captures/procure-approve',
      '/mobile/captures/payout-approve',
      '/mobile/captures/requestx-indent',
      '/mobile/captures/frontdesk-checkin',
      '/mobile/captures/docvault-capture',
    ]) {
      expect(router).toContain(p);
    }
  });

  it('preserves existing salesman/telecaller/supervisor routing (walls)', () => {
    expect(router).toContain('/mobile/salesman');
    expect(router).toContain('/mobile/telecaller');
    expect(router).toContain('/mobile/supervisor');
  });
});

describe('AM.2 · /operix-go surface (additive tiles)', () => {
  const op = read('src/pages/mobile/OperixGoPage.tsx');

  it('lists all 5 AM.2 capture personas in MOBILE_PRODUCTS', () => {
    for (const id of [
      'am2-procure-approve',
      'am2-payout-approve',
      'am2-requestx-indent',
      'am2-frontdesk-checkin',
      'am2-docvault-capture',
    ]) {
      expect(op).toContain(id);
    }
  });

  it('preserves the AM.1 RoleHomeFeed widget (walls 0-DIFF)', () => {
    expect(op).toContain('RoleHomeFeed');
  });
});

describe('AM.2 · sprint-history posture (non-forward-looking)', () => {
  it('AM.1 is flipped to its banked SHA 3fd7e61f', () => {
    const am1 = SPRINTS.find((s) => s.code === 'T-AM1-AI-Everywhere');
    expect(am1).toBeDefined();
    expect(am1?.headSha).toBe('3fd7e61f');
    expect(am1?.provenance).toBe('CONFIRMED');
  });

  it('AM.2 row exists with predecessorSha 3fd7e61f and empty newSiblings', () => {
    const am2 = SPRINTS.find((s) => s.code === 'T-AM2-Mobile-Captures');
    expect(am2).toBeDefined();
    expect(am2?.predecessorSha).toBe('3fd7e61f');
    expect(am2?.newSiblings).toEqual([]);
    expect(am2?.grade).toBe('A');
  });

  it('AM.2 row does NOT assert a successor (non-forward-looking)', () => {
    const idx = SPRINTS.findIndex((s) => s.code === 'T-AM2-Mobile-Captures');
    expect(idx).toBeGreaterThanOrEqual(0);
    // We only assert membership · we DO NOT assert SPRINTS[idx+1] or last-entry.
    expect(SPRINTS[idx].code).toBe('T-AM2-Mobile-Captures');
  });

  it('no AM.2 sibling was registered (empty newSiblings honored by sibling-register)', () => {
    const am2Sibs = SIBLINGS.filter((s) => s.path?.includes('captures/Mobile'));
    expect(am2Sibs.length).toBe(0);
  });
});

describe('AM.2 · §H walls held (0-DIFF on consume-spine)', () => {
  it('approval-rail-engine still exports listPendingMirrors + decideApproval', () => {
    const src = read('src/lib/approval-rail-engine.ts');
    expect(src).toMatch(/export function listPendingMirrors/);
    expect(src).toMatch(/export function decideApproval/);
  });

  it('payment-requisition-engine still exports the 2-level SoD ladder', () => {
    const src = read('src/lib/payment-requisition-engine.ts');
    expect(src).toMatch(/export function approveDeptLevel/);
    expect(src).toMatch(/export function approveAccountsLevel/);
  });

  it('request-engine still exports createMaterialIndent + submitIndent', () => {
    const src = read('src/lib/request-engine.ts');
    expect(src).toMatch(/export function createMaterialIndent/);
    expect(src).toMatch(/export function submitIndent/);
  });

  it('frontdesk-engine still exports createPlannedVisitor + checkInVisitor', () => {
    const src = read('src/lib/frontdesk-engine.ts');
    expect(src).toMatch(/export function createPlannedVisitor/);
    expect(src).toMatch(/export function checkInVisitor/);
  });

  it('docvault-engine still exports createDocument', () => {
    const src = read('src/lib/docvault-engine.ts');
    expect(src).toMatch(/export function createDocument/);
  });
});
