/**
 * @file        src/pages/erp/comply360/widgets/QuickActionsWidget.tsx
 * @purpose     Role-aware quick actions · jump to high-frequency mega-menus
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 3
 */
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Receipt, Users, Wallet, Archive, FileBarChart } from 'lucide-react';
import type { Comply360Module } from '../Comply360Sidebar.types';

interface Props {
  onOpen: (module: Comply360Module) => void;
}

const ACTIONS: Array<{ icon: typeof Zap; label: string; module: Comply360Module }> = [
  { icon: Receipt,     label: 'File GSTR-3B',      module: 'tax-gst' },
  { icon: Users,       label: 'Run Payroll ECR',   module: 'payroll' },
  { icon: Wallet,      label: 'Statutory Payment', module: 'payments' },
  { icon: Archive,     label: 'Open Challan Vault',module: 'challan-vault' },
  { icon: FileBarChart,label: 'Run Report',        module: 'reports' },
];

export function QuickActionsWidget({ onOpen }: Props): JSX.Element {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-warning" />
        <h3 className="font-semibold">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Button
              key={a.label}
              variant="outline"
              size="sm"
              className="justify-start h-auto py-2.5"
              onClick={() => onOpen(a.module)}
            >
              <Icon className="h-4 w-4 mr-2 shrink-0" />
              <span className="text-xs truncate">{a.label}</span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
