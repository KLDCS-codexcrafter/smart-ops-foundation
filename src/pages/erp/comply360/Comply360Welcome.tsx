/**
 * @file        src/pages/erp/comply360/Comply360Welcome.tsx
 * @purpose     Comply360 home/landing · Host for Block 3 (Sprint 69) Home Dashboard widgets
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 1 · Q12 widgets land in Block 3
 * @decisions   D-S69-1 (100% native architecture)
 * @iso         Usability
 */
import { Card } from '@/components/ui/card';
import {
  Shield, Receipt, Users, Building, Award, Leaf, Calendar, FileBarChart,
} from 'lucide-react';
import type { Comply360Module } from './Comply360Sidebar.types';

interface Props {
  onNavigate: (m: Comply360Module) => void;
}

const TILES = [
  { icon: Calendar,    title: 'Compliance Calendar',  description: '15 modules · due dates · filings tracker. Lands Sprint 78 (Q11).',    target: 'calendar' as Comply360Module },
  { icon: Receipt,     title: 'Tax & GST',            description: '27 modules · GSTR-1/3B/9 · TDS · TCS · E-invoice. Lands Sprints 70-75.', target: 'tax-gst' as Comply360Module },
  { icon: Users,       title: 'Payroll & HR',         description: '27 modules · EPF · ESI · PT · LWF · Form 16. Lands Sprints 76-77.',     target: 'payroll' as Comply360Module },
  { icon: Building,    title: 'ROC / Secretarial',    description: '14 modules · MGT-7 · AOC-4 · DIR-12. Phase 8 P2BB (Q29).',              target: 'roc' as Comply360Module },
  { icon: Award,       title: 'Licenses & Regulatory',description: '13 modules · factory · trade · drug · pollution. Sprint 79 (Q25).',     target: 'licenses' as Comply360Module },
  { icon: Leaf,        title: 'ESG / Safety',         description: '12 modules · BRSR · CSR · safety audits. Sprint 79-80 (Q7+Q26).',       target: 'esg' as Comply360Module },
  { icon: FileBarChart,title: 'Reports & Analytics',  description: '12 modules · D.3 InsightX integration. Phase 8.',                       target: 'reports' as Comply360Module },
];

export function Comply360Welcome({ onNavigate }: Props): JSX.Element {
  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Shield className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Comply360 · India + Global Statutory Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sprint 69 scaffolding live. 23 mega-menus · 305 modules per Bharat Comply 360 SSOT. Home Dashboard + Compliance Health Score land in Block 3.
          </p>
        </div>
      </div>
      <Card className="p-6">
        <h2 className="font-semibold mb-3">Sprint 69 scope (live)</h2>
        <p className="text-sm text-muted-foreground">
          Q1 Card scaffolding · Q2 23 mega-menu sidebar · Q12 Home Dashboard host. Compliance Health Score (OOB-1) · Statutory Memory (OOB-5) · Mega Search · Role-based menu · Quick Actions land in Block 3. FA tile refresh (sub-task) in Block 4.
        </p>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Card
              key={t.title}
              className="p-5 cursor-pointer hover:border-primary transition-colors"
              onClick={() => onNavigate(t.target)}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
