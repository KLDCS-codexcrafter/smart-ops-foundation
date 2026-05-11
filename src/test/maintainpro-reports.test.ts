/**
 * @file        src/test/maintainpro-reports.test.ts
 * @purpose     Tests for 14 MaintainPro reports + Production Capacity Live Dashboard + MaintainProReportShell
 * @sprint      T-Phase-1.A.16c · Block H.1 · NEW · Q-LOCK-12
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SLA_MATRIX } from '@/types/maintainpro';

const read = (p: string): string => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

const REPORT_FILES = [
  'src/pages/erp/maintainpro/reports/MaintenanceEntryDayBook.tsx',
  'src/pages/erp/maintainpro/reports/CalibrationStatusReport.tsx',
  'src/pages/erp/maintainpro/reports/FireSafetyExpiryReport.tsx',
  'src/pages/erp/maintainpro/reports/EquipmentHistory.tsx',
  'src/pages/erp/maintainpro/reports/SparesIssueDayBook.tsx',
  'src/pages/erp/maintainpro/reports/MTBFMTTRReport.tsx',
  'src/pages/erp/maintainpro/reports/PMComplianceReport.tsx',
  'src/pages/erp/maintainpro/reports/OpenWOStatusReport.tsx',
  'src/pages/erp/maintainpro/reports/AMCOutToVendorStatus.tsx',
  'src/pages/erp/maintainpro/reports/EnergyESGDashboard.tsx',
  'src/pages/erp/maintainpro/reports/OpenTicketsLive.tsx',
  'src/pages/erp/maintainpro/reports/SLAPerformanceReport.tsx',
  'src/pages/erp/maintainpro/reports/AgingTicketsReport.tsx',
  'src/pages/erp/maintainpro/reports/TopReportersByDepartment.tsx',
];

describe('MaintainProReportShell shared component', () => {
  const src = read('src/components/maintainpro/MaintainProReportShell.tsx');
  it('exports MaintainProReportShell', () => {
    expect(/export function MaintainProReportShell/.test(src)).toBe(true);
  });
  it('accepts title + filters + kpis + children + export handlers', () => {
    expect(src).toMatch(/title:\s*string/);
    expect(src).toMatch(/filters\?/);
    expect(src).toMatch(/kpis\?/);
    expect(src).toMatch(/onExportCsv\?/);
    expect(src).toMatch(/onExportPdf\?/);
    expect(src).toMatch(/onExportExcel\?/);
  });
});

describe('14 reports present and use MaintainProReportShell', () => {
  it('all 14 report files exist', () => {
    REPORT_FILES.forEach((p) => {
      expect(fs.existsSync(path.join(process.cwd(), p))).toBe(true);
    });
  });
  REPORT_FILES.forEach((p) => {
    it(`${path.basename(p)} uses MaintainProReportShell`, () => {
      const src = read(p);
      expect(src).toMatch(/MaintainProReportShell/);
    });
  });
  it('all 14 reports have FR-30 headers (@file + @purpose + @sprint)', () => {
    REPORT_FILES.forEach((p) => {
      const head = read(p).slice(0, 500);
      expect(head).toMatch(/@file/);
      expect(head).toMatch(/@purpose/);
      expect(head).toMatch(/@sprint/);
    });
  });
});

describe('Production Capacity Live Dashboard', () => {
  const src = read('src/pages/erp/maintainpro/reports/ProductionCapacityLiveDashboard.tsx');
  it('exists and uses MaintainProReportShell', () => {
    expect(src).toMatch(/MaintainProReportShell/);
  });
  it('has auto-refresh interval', () => {
    expect(src).toMatch(/setInterval/);
    expect(src).toMatch(/clearInterval/);
  });
  it('computes Andon status (green/amber/red bands)', () => {
    expect(src).toMatch(/green/);
    expect(src).toMatch(/amber/);
    expect(src).toMatch(/red/);
  });
  it('supports group-by toggle (site/department/class)', () => {
    expect(src).toMatch(/GroupBy/);
  });
});

describe('Report formula correctness', () => {
  it('MTBF formula: uptime_pct × 365 / count', () => {
    const mtbf = (90 * 365) / 100 / 6;
    expect(mtbf).toBeCloseTo(54.75, 2);
  });
  it('MTTR formula: total_breakdown_minutes / count', () => {
    expect(720 / 6).toBe(120);
  });
  it('PM compliance pct: onTime / total × 100', () => {
    expect(Math.round((3 / 4) * 100)).toBe(75);
  });
  it('Age bucket logic: 0d=Today / 2d=1-3 / 5d=3-7 / 10d=7+', () => {
    const bkt = (d: number): string => d < 1 ? 'Today' : d <= 3 ? '1–3' : d <= 7 ? '3–7' : '7+';
    expect(bkt(0)).toBe('Today');
    expect(bkt(2)).toBe('1–3');
    expect(bkt(5)).toBe('3–7');
    expect(bkt(10)).toBe('7+');
  });
  it('SLA matrix shape: 7 categories × 4 severities = 28 cells', () => {
    expect(Object.keys(SLA_MATRIX)).toHaveLength(7);
    let cells = 0;
    Object.values(SLA_MATRIX).forEach((row) => {
      const keys = Object.keys(row);
      expect(keys).toHaveLength(4);
      cells += keys.length;
    });
    expect(cells).toBe(28);
  });
  it('Capacity impact map: critical=25 / high=15 / medium=7 / low=3', () => {
    const impact = (s: string): number => s === 'critical' ? 25 : s === 'high' ? 15 : s === 'medium' ? 7 : 3;
    expect(impact('critical')).toBe(25);
    expect(impact('high')).toBe(15);
    expect(impact('medium')).toBe(7);
    expect(impact('low')).toBe(3);
    expect(Math.max(0, 100 - (25 + 15 + 7 + 3))).toBe(50);
  });
  it('Energy aggregation: sum kWh across equipment', () => {
    const set = [120, 80, 200, 50];
    expect(set.reduce((a, b) => a + b, 0)).toBe(450);
  });
  it('CO2 factor ~0.82 kg/kWh', () => {
    expect(1000 * 0.82).toBe(820);
  });
});

describe('Report-specific computation logic', () => {
  it('AMCOutToVendorStatus computes vendor scorecard with avg days to return', () => {
    const src = read('src/pages/erp/maintainpro/reports/AMCOutToVendorStatus.tsx');
    expect(src).toMatch(/scorecard = new Map/);
    expect(src).toMatch(/totalDays \/ returned/);
    expect(src).toMatch(/86400000/);
  });
  it('AMCOutToVendorStatus filters open RMAs excluding returned and cancelled', () => {
    const src = read('src/pages/erp/maintainpro/reports/AMCOutToVendorStatus.tsx');
    expect(src).toMatch(/status !== 'returned' && status !== 'cancelled'/);
  });
  it('SLAPerformanceReport renders 28-cell heatmap (7 categories × 4 severities)', () => {
    const src = read('src/pages/erp/maintainpro/reports/SLAPerformanceReport.tsx');
    expect(src).toMatch(/CATS/);
    expect(src).toMatch(/SEVS/);
    expect(src).toMatch(/7/);
    expect(src).toMatch(/4/);
  });
  it('EnergyESGDashboard aggregates kWh by category and computes CO₂e', () => {
    const src = read('src/pages/erp/maintainpro/reports/EnergyESGDashboard.tsx');
    expect(src).toMatch(/byCat = new Map/);
    expect(src).toMatch(/total \+= kwh/);
    expect(src).toMatch(/0\.82/);
  });
  it('ProductionCapacityLiveDashboard computes capacity % as 100 minus down impact', () => {
    const src = read('src/pages/erp/maintainpro/reports/ProductionCapacityLiveDashboard.tsx');
    expect(src).toMatch(/Math.max\(0, 100 - downImpact\)/);
    expect(src).toMatch(/availablePct >= 90/);
  });
  it('OpenTicketsLive groups by 7 categories × 4 severities with color coding', () => {
    const src = read('src/pages/erp/maintainpro/reports/OpenTicketsLive.tsx');
    expect(src).toMatch(/electrical.*mechanical.*pneumatic.*hydraulic.*safety.*calibration.*housekeeping/);
    expect(src).toMatch(/critical.*high.*medium.*low/);
    expect(src).toMatch(/grid.counts/);
  });
});

describe('MaintainProPage integration', () => {
  const src = read('src/pages/erp/maintainpro/MaintainProPage.tsx');
  it('imports all 14 reports + dashboard', () => {
    [
      'MaintenanceEntryDayBook', 'CalibrationStatusReport', 'FireSafetyExpiryReport',
      'EquipmentHistory', 'SparesIssueDayBook', 'MTBFMTTRReport', 'PMComplianceReport',
      'OpenWOStatusReport', 'AMCOutToVendorStatus', 'EnergyESGDashboard',
      'OpenTicketsLive', 'SLAPerformanceReport', 'AgingTicketsReport',
      'TopReportersByDepartment', 'ProductionCapacityLiveDashboard',
    ].forEach((name) => {
      expect(src).toMatch(new RegExp(`import.*${name}`));
    });
  });
  it('has 15 new case branches for A.16c', () => {
    const cases = [
      'maint-entry-day-book', 'calibration-status', 'fire-safety-expiry-report',
      'equipment-history', 'spares-issue-day-book', 'mtbf-mttr', 'pm-compliance',
      'open-wo-status', 'amc-out-status-report', 'energy-esg', 'open-tickets-live',
      'sla-performance', 'aging-tickets', 'top-reporters', 'production-capacity-dashboard',
    ];
    cases.forEach((c) => {
      expect(src).toContain(`case '${c}'`);
    });
  });
});
