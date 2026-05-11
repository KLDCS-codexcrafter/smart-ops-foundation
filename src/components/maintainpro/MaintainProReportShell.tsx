/**
 * @file        src/components/maintainpro/MaintainProReportShell.tsx
 * @purpose     Shared report layout component for MaintainPro 14 reports + dashboard · D-NEW-DC POSSIBLE 26th canonical Report Shell Component Pattern
 * @sprint      T-Phase-1.A.16c · Q-LOCK-2 · Block A · NEW
 * @decisions   D-NEW-DC Report Shell Component POSSIBLE 26th canonical (FR-72 candidate)
 * @disciplines FR-13 replica banner · FR-30 standard headers
 */
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

export interface MaintainProReportShellProps {
  title: string;
  ssotBadge?: string;
  filters?: ReactNode;
  kpis?: ReactNode;
  children: ReactNode;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
}

export function MaintainProReportShell(props: MaintainProReportShellProps): JSX.Element {
  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{props.title}</h2>
          {props.ssotBadge && (
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border">
              {props.ssotBadge}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {/* [JWT] Phase 2 wires real export · Phase 1 stub */}
          {props.onExportCsv && (
            <Button size="sm" variant="outline" onClick={props.onExportCsv}>
              <Download className="h-4 w-4 mr-1" />CSV
            </Button>
          )}
          {props.onExportExcel && (
            <Button size="sm" variant="outline" onClick={props.onExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />Excel
            </Button>
          )}
          {props.onExportPdf && (
            <Button size="sm" variant="outline" onClick={props.onExportPdf}>
              <FileText className="h-4 w-4 mr-1" />PDF
            </Button>
          )}
        </div>
      </header>
      {props.filters && <section className="flex flex-wrap gap-2">{props.filters}</section>}
      {props.kpis && <section className="grid grid-cols-2 md:grid-cols-4 gap-3">{props.kpis}</section>}
      <Card>
        <CardContent className="p-4">{props.children}</CardContent>
      </Card>
    </div>
  );
}

export default MaintainProReportShell;
