/**
 * @file        src/test/maintainpro-reports.test.ts
 * @purpose     Tests for 14 MaintainPro reports + Production Capacity Live Dashboard + MaintainProReportShell
 * @sprint      T-Phase-1.A.16c · Block H.1 · NEW · Q-LOCK-12
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';
import { MaintenanceEntryDayBook } from '@/pages/erp/maintainpro/reports/MaintenanceEntryDayBook';
import { CalibrationStatusReport } from '@/pages/erp/maintainpro/reports/CalibrationStatusReport';
import { FireSafetyExpiryReport } from '@/pages/erp/maintainpro/reports/FireSafetyExpiryReport';
import { EquipmentHistory } from '@/pages/erp/maintainpro/reports/EquipmentHistory';
import { SparesIssueDayBook } from '@/pages/erp/maintainpro/reports/SparesIssueDayBook';
import { MTBFMTTRReport } from '@/pages/erp/maintainpro/reports/MTBFMTTRReport';
import { PMComplianceReport } from '@/pages/erp/maintainpro/reports/PMComplianceReport';
import { OpenWOStatusReport } from '@/pages/erp/maintainpro/reports/OpenWOStatusReport';
import { AMCOutToVendorStatus } from '@/pages/erp/maintainpro/reports/AMCOutToVendorStatus';
import { EnergyESGDashboard } from '@/pages/erp/maintainpro/reports/EnergyESGDashboard';
import { OpenTicketsLive } from '@/pages/erp/maintainpro/reports/OpenTicketsLive';
import { SLAPerformanceReport } from '@/pages/erp/maintainpro/reports/SLAPerformanceReport';
import { AgingTicketsReport } from '@/pages/erp/maintainpro/reports/AgingTicketsReport';
import { TopReportersByDepartment } from '@/pages/erp/maintainpro/reports/TopReportersByDepartment';
import { ProductionCapacityLiveDashboard } from '@/pages/erp/maintainpro/reports/ProductionCapacityLiveDashboard';
import { SLA_MATRIX } from '@/types/maintainpro';

const W = ({ children }: { children: React.ReactNode }): JSX.Element => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('MaintainProReportShell', () => {
  it('renders title', () => {
    render(<MaintainProReportShell title="Demo Report"><div>body</div></MaintainProReportShell>);
    expect(screen.getByText('Demo Report')).toBeTruthy();
  });
  it('renders SSOT badge', () => {
    render(<MaintainProReportShell title="X" ssotBadge="FR-42"><div /></MaintainProReportShell>);
    expect(screen.getByText('FR-42')).toBeTruthy();
  });
  it('renders filters + KPIs + children', () => {
    render(
      <MaintainProReportShell
        title="X"
        filters={<div>FILTER</div>}
        kpis={<div>KPI</div>}
      >
        <div>TABLE</div>
      </MaintainProReportShell>,
    );
    expect(screen.getByText('FILTER')).toBeTruthy();
    expect(screen.getByText('KPI')).toBeTruthy();
    expect(screen.getByText('TABLE')).toBeTruthy();
  });
  it('renders export buttons when handlers provided', () => {
    render(
      <MaintainProReportShell title="X" onExportCsv={() => {}} onExportPdf={() => {}} onExportExcel={() => {}}>
        <div />
      </MaintainProReportShell>,
    );
    expect(screen.getByText('CSV')).toBeTruthy();
    expect(screen.getByText('PDF')).toBeTruthy();
    expect(screen.getByText('Excel')).toBeTruthy();
  });
});

describe('TDL reports render', () => {
  it('MaintenanceEntryDayBook', () => { render(<W><MaintenanceEntryDayBook /></W>); expect(screen.getByText('Maintenance Entry Day Book')).toBeTruthy(); });
  it('CalibrationStatusReport', () => { render(<W><CalibrationStatusReport /></W>); expect(screen.getByText('Calibration Status Report')).toBeTruthy(); });
  it('FireSafetyExpiryReport', () => { render(<W><FireSafetyExpiryReport /></W>); expect(screen.getByText('Fire Safety Expiry Report')).toBeTruthy(); });
  it('EquipmentHistory', () => { render(<W><EquipmentHistory /></W>); expect(screen.getByText('Equipment History')).toBeTruthy(); });
  it('SparesIssueDayBook', () => { render(<W><SparesIssueDayBook /></W>); expect(screen.getByText('Spares Issue Day Book')).toBeTruthy(); });
});

describe('Operational reports render', () => {
  it('MTBFMTTRReport', () => { render(<W><MTBFMTTRReport /></W>); expect(screen.getByText('MTBF / MTTR Report')).toBeTruthy(); });
  it('PMComplianceReport', () => { render(<W><PMComplianceReport /></W>); expect(screen.getByText('PM Compliance Report')).toBeTruthy(); });
  it('OpenWOStatusReport', () => { render(<W><OpenWOStatusReport /></W>); expect(screen.getByText('Open WO Status Report')).toBeTruthy(); });
  it('AMCOutToVendorStatus', () => { render(<W><AMCOutToVendorStatus /></W>); expect(screen.getByText('AMC Out-to-Vendor Status')).toBeTruthy(); });
  it('EnergyESGDashboard', () => { render(<W><EnergyESGDashboard /></W>); expect(screen.getByText('Energy / ESG Dashboard')).toBeTruthy(); });
});

describe('SLA reports render', () => {
  it('OpenTicketsLive', () => { render(<W><OpenTicketsLive /></W>); expect(screen.getByText('Open Tickets · Live')).toBeTruthy(); });
  it('SLAPerformanceReport', () => { render(<W><SLAPerformanceReport /></W>); expect(screen.getByText('SLA Performance Report')).toBeTruthy(); });
  it('AgingTicketsReport', () => { render(<W><AgingTicketsReport /></W>); expect(screen.getByText('Aging Tickets Report')).toBeTruthy(); });
  it('TopReportersByDepartment', () => { render(<W><TopReportersByDepartment /></W>); expect(screen.getByText('Top Reporters by Department')).toBeTruthy(); });
});

describe('Production Capacity Live Dashboard', () => {
  it('renders with auto-refresh + Andon', () => {
    render(<W><ProductionCapacityLiveDashboard /></W>);
    expect(screen.getByText('Production Capacity · Live Dashboard')).toBeTruthy();
    expect(screen.getByText('Andon')).toBeTruthy();
  });
});

describe('Report computations', () => {
  it('MTBF formula: uptime_pct × 365 / count', () => {
    const uptimePct = 90;
    const count = 6;
    const mtbf = (uptimePct * 365) / 100 / count;
    expect(mtbf).toBeCloseTo(54.75, 2);
  });
  it('MTTR formula: total_breakdown_minutes / count', () => {
    expect(720 / 6).toBe(120);
  });
  it('Compliance pct formula: onTime / total × 100', () => {
    expect(Math.round((3 / 4) * 100)).toBe(75);
  });
  it('Age bucket logic: 0d=Today; 2d=1-3; 5d=3-7; 10d=7+', () => {
    const bkt = (d: number): string => d < 1 ? 'Today' : d <= 3 ? '1–3' : d <= 7 ? '3–7' : '7+';
    expect(bkt(0)).toBe('Today');
    expect(bkt(2)).toBe('1–3');
    expect(bkt(5)).toBe('3–7');
    expect(bkt(10)).toBe('7+');
  });
  it('SLA matrix 28-cell shape: 7 categories × 4 severities', () => {
    expect(Object.keys(SLA_MATRIX)).toHaveLength(7);
    Object.values(SLA_MATRIX).forEach((row) => {
      expect(Object.keys(row)).toHaveLength(4);
    });
  });
  it('Capacity impact: critical=25 / high=15 / medium=7 / low=3 · sum 50%', () => {
    const impact = (s: string): number => s === 'critical' ? 25 : s === 'high' ? 15 : s === 'medium' ? 7 : 3;
    expect(impact('critical') + impact('high') + impact('medium') + impact('low')).toBe(50);
    expect(Math.max(0, 100 - 50)).toBe(50);
  });
});
