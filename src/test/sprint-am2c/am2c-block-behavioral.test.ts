/**
 * @file        src/test/sprint-am2c/am2c-block-behavioral.test.ts
 * @purpose     AM.2c · operix-go pending captures · house posture · non-forward-looking
 *              Verifies: (a) SiteX/MaintainPro/ShopFloor captures CONSUME their engines (no reimplement)
 *                       (b) GateFlow-legacy entry REMOVED from MOBILE_PRODUCTS source
 *                       (c) 3 landings flipped phase2→live in source
 *                       (d) honest banners present · NO OCR / NO transcript / NO OEE-live fabricated
 *                       (e) sprint-history: AM.2 flipped to 0f8e8069 + AM.2c row exists · non-forward-looking
 *                       (f) §H walls 0-DIFF (engines / bridges / MobileRouter core greppable)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf-8');

const OPERIX_GO   = read('src/pages/mobile/OperixGoPage.tsx');
const SHOPFLOOR   = read('src/pages/mobile/MobileShopFloorOperatorPage.tsx');
const SITE_LAND   = read('src/pages/mobile/MobileSiteEngineerPage.tsx');
const MAINT_LAND  = read('src/pages/mobile/MobileMaintenanceTechnicianPage.tsx');
const SITE_DPR    = read('src/components/mobile/MobileSiteDPRCapture.tsx');
const BREAKDOWN   = read('src/components/mobile/MobileBreakdownCapture.tsx');
const PM_TICK     = read('src/components/mobile/MobilePMTickoffCapture.tsx');
const SPARES      = read('src/components/mobile/MobileSparesIssueCapture.tsx');
const ASSET_PHOTO = read('src/components/mobile/MobileAssetPhotoCapture.tsx');
const PROD_CONF   = read('src/pages/mobile/MobileProductionConfirmationPage.tsx');
const HISTORY     = read('src/lib/_institutional/sprint-history.ts');

describe('AM.2c · OperixGo pending captures', () => {
  // ───── (a) engine consumption (no reimplement) ─────
  it('SiteX DPR capture consumes sitex-engine (greppable)', () => {
    expect(SITE_DPR).toMatch(/from\s+['"]@\/lib\/sitex-engine['"]/);
  });

  it('MaintainPro Breakdown capture consumes maintainpro-engine via createBreakdownReport', () => {
    expect(BREAKDOWN).toContain('createBreakdownReport');
    expect(BREAKDOWN).toMatch(/from\s+['"]@\/lib\/maintainpro-engine['"]/);
  });

  it('MaintainPro PM tick-off capture consumes maintainpro-engine via createPMTickoff', () => {
    expect(PM_TICK).toContain('createPMTickoff');
    expect(PM_TICK).toMatch(/from\s+['"]@\/lib\/maintainpro-engine['"]/);
  });

  it('MaintainPro Spares Issue capture consumes maintainpro-engine via createSparesIssue', () => {
    expect(SPARES).toContain('createSparesIssue');
    expect(SPARES).toMatch(/from\s+['"]@\/lib\/maintainpro-engine['"]/);
  });

  it('MaintainPro Asset Photo capture consumes maintainpro-engine', () => {
    expect(ASSET_PHOTO).toMatch(/from\s+['"]@\/lib\/maintainpro-engine['"]/);
  });

  it('ShopFloor production-confirmation consumes production-confirmation-engine', () => {
    expect(PROD_CONF).toContain('createProductionConfirmation');
    expect(PROD_CONF).toMatch(/from\s+['"]@\/lib\/production-confirmation-engine['"]/);
  });

  it('ShopFloor production-confirmation offers voice input + barcode scan paths', () => {
    expect(PROD_CONF.toLowerCase()).toContain('voice');
    expect(PROD_CONF.toLowerCase()).toContain('barcode');
  });

  // ───── (b) GateFlow-legacy entry removed from source ─────
  it('GateFlow-legacy planned entry is REMOVED from OperixGoPage MOBILE_PRODUCTS', () => {
    expect(OPERIX_GO).not.toContain("id: 'gateflow'");
    expect(OPERIX_GO).not.toContain('GateFlow Mobile (legacy planned)');
    expect(OPERIX_GO).not.toContain("'/operix-go/gateflow'");
  });

  // ───── (c) phase2 → live flips ─────
  it('SiteEngineer landing tile flipped to phase: live', () => {
    const slice = OPERIX_GO.slice(OPERIX_GO.indexOf("id: 'site-engineer'"));
    expect(slice.slice(0, 600)).toMatch(/phase:\s*'live'/);
  });

  it('MaintenanceTechnician landing tile flipped to phase: live', () => {
    const slice = OPERIX_GO.slice(OPERIX_GO.indexOf("id: 'maintenance-technician'"));
    expect(slice.slice(0, 1200)).toMatch(/phase:\s*'live'/);
  });

  it('ShopFloorOperator landing tile flipped to phase: live', () => {
    const slice = OPERIX_GO.slice(OPERIX_GO.indexOf("id: 'shop-floor-operator'"));
    expect(slice.slice(0, 600)).toMatch(/phase:\s*'live'/);
  });

  // ───── (d) honest banners · no fabricated AI ─────
  it('ShopFloor landing exposes SHOPFLOOR_OEE_HONESTY (Wave-2 disclaimer)', () => {
    expect(SHOPFLOOR).toContain('SHOPFLOOR_OEE_HONESTY');
    expect(SHOPFLOOR).toMatch(/Wave-2/);
  });

  it('SiteX/MaintainPro captures contain NO client-side OCR call', () => {
    for (const src of [SITE_DPR, BREAKDOWN, PM_TICK, SPARES, ASSET_PHOTO]) {
      expect(src.toLowerCase()).not.toMatch(/tesseract|ocr-extract\(/);
    }
  });

  it('ShopFloor production-confirmation does NOT fabricate an OEE live value', () => {
    expect(PROD_CONF).not.toMatch(/oee_live|oeeLive/i);
  });

  // ───── (e) sprint-history flip + AM.2c row · non-forward-looking ─────
  it('sprint-history flipped AM.2 → 0f8e8069 (provenance CONFIRMED)', () => {
    const am2 = HISTORY.slice(HISTORY.indexOf("'T-AM2-Mobile-Captures'"));
    expect(am2.slice(0, 400)).toContain("headSha: '0f8e8069'");
    expect(am2.slice(0, 400)).toContain("provenance: 'CONFIRMED'");
  });

  it('sprint-history has the AM.2c row with predecessorSha 0f8e8069 + empty newSiblings', () => {
    const am2c = HISTORY.slice(HISTORY.indexOf("'T-AM2c-OperixGo-Captures'"));
    expect(am2c.slice(0, 400)).toContain("predecessorSha: '0f8e8069'");
    expect(am2c.slice(0, 400)).toMatch(/newSiblings:\s*\[\]/);
  });

  it('test file does not contain forward-looking newest-first assertions', () => {
    const self = read('src/test/sprint-am2c/am2c-block-behavioral.test.ts');
    expect(self).not.toMatch(/rows\[0\]\.code\)\.toBe\(/);
  });

  // ───── (f) §H walls 0-DIFF — engines / bridges / MobileRouter core ─────
  it('walls: maintainpro-engine still exports its capture creators (signature spine)', () => {
    const eng = read('src/lib/maintainpro-engine.ts');
    expect(eng).toContain('export function createBreakdownReport');
    expect(eng).toContain('export function createPMTickoff');
    expect(eng).toContain('export function createSparesIssue');
  });

  it('walls: production-confirmation-engine still exports createProductionConfirmation', () => {
    const eng = read('src/lib/production-confirmation-engine.ts');
    expect(eng).toContain('export function createProductionConfirmation');
  });

  it('walls: sitex-engine still exports listSites + getSite (spine)', () => {
    const eng = read('src/lib/sitex-engine.ts');
    expect(eng).toContain('export function listSites');
    expect(eng).toContain('export function getSite');
  });

  it('walls: camera-bridge + geolocation-bridge + offline-queue-engine all expose their public API', () => {
    expect(read('src/lib/camera-bridge.ts')).toContain('export async function capturePhoto');
    expect(read('src/lib/geolocation-bridge.ts')).toContain('export async function getCurrentLocation');
    expect(read('src/lib/offline-queue-engine.ts')).toContain('export function enqueueWrite');
  });

  it('walls: MobileRouter core handler renderRoleRoute still present (0-DIFF spine)', () => {
    expect(read('src/pages/mobile/MobileRouter.tsx')).toContain('function renderRoleRoute');
  });

  it('walls: VoiceNote AM.2 shell intact (no transcript fabrication added)', () => {
    const vn = read('src/components/mobile/VoiceNote.tsx');
    expect(vn).toContain('VOICE_NOTE_HONESTY');
    expect(vn.toLowerCase()).not.toContain('transcript:');
  });

  // ───── landings still point to live capture routes ─────
  it('SiteEngineer landing routes to the 4 institutional captures', () => {
    expect(SITE_LAND).toContain('/operix-go/site-dpr');
    expect(SITE_LAND).toContain('/operix-go/site-snag');
    expect(SITE_LAND).toContain('/operix-go/site-safety');
    expect(SITE_LAND).toContain('/operix-go/site-material-issue');
  });

  it('MaintenanceTechnician landing routes to the 4 MaintainPro captures', () => {
    expect(MAINT_LAND).toContain('/operix-go/breakdown-capture');
    expect(MAINT_LAND).toContain('/operix-go/pm-tickoff-capture');
    expect(MAINT_LAND).toContain('/operix-go/spares-issue-capture');
    expect(MAINT_LAND).toContain('/operix-go/asset-photo-capture');
  });

  it('OperixGo page does not reference removed /operix-go/gateflow route', () => {
    expect(OPERIX_GO).not.toContain('/operix-go/gateflow');
  });

  it('AM.2c sprint narrative records the 3 phase2→live flips + GateFlow-legacy removal', () => {
    expect(HISTORY).toMatch(/AM\.2c[\s\S]{0,2000}phase2.*live/);
    expect(HISTORY).toMatch(/AM\.2c[\s\S]{0,2000}GateFlow-legacy/);
  });
});
