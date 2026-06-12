/**
 * @sprint W1C-1 · 10 manual mounts reference ReportSendHeader
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const TARGETS = [
  'src/features/command-center/pages/PromoterCockpitPage.tsx',
  'src/features/command-center/pages/CrossCardDayBookPage.tsx',
  'src/pages/erp/receivx/cockpits/CreditXRayPage.tsx',
  'src/pages/erp/procure-hub/cockpits/SpendFunnelPage.tsx',
  'src/pages/erp/production/cockpits/OEEBoardPage.tsx',
  'src/pages/erp/qualicheck/cockpits/COQPage.tsx',
  'src/pages/erp/projx/cockpits/EVMPage.tsx',
  'src/pages/erp/comply360/audit-framework/AuditFrameworkDashboardPage.tsx',
  'src/pages/erp/comply360/cost-audit/CostAuditDashboardPage.tsx',
  'src/components/operix-core/report-framework/ReportBuilder.tsx',
];

describe('W1C-1 · 10 manual mounts', () => {
  TARGETS.forEach((p) => {
    it(`mounts ReportSendHeader in ${p}`, () => {
      const src = readFileSync(join(process.cwd(), p), 'utf8');
      expect(src).toMatch(/ReportSendHeader/);
      expect(src).toMatch(/<ReportSendHeader\b/);
    });
  });
});
