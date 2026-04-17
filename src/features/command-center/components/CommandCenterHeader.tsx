import { useMemo } from 'react';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { journalKey } from '@/lib/finecore-engine';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';
import type { CommandCenterModule } from '../pages/CommandCenterPage';

const GROUP_LABELS: Partial<Record<CommandCenterModule, string>> = {
  overview: 'Overview',
  foundation: 'Foundation & Core',
  geography: 'Geography',
  'org-structure': 'Organisation Structure',
  'finecore-hub': 'Finance & Compliance',
  console: 'Security Console',
  'utility-import': 'Utilities',
  'opening-ledger-balances': 'Opening Balances',
  'opening-employee-loans': 'Opening Balances',
};

function getGroupLabel(m: CommandCenterModule): string {
  if (m.startsWith('finecore-')) return 'Finance & Compliance';
  if (m.startsWith('inventory-')) return 'Inventory Masters';
  if (m.startsWith('ph-')) return 'People Core';
  if (m.startsWith('opening-')) return 'Opening Balances';
  if (m.startsWith('utility-')) return 'Utilities';
  return GROUP_LABELS[m] ?? '';
}

function getModuleLabel(m: CommandCenterModule): string {
  const known: Partial<Record<CommandCenterModule, string>> = {
    overview: 'Overview',
    foundation: 'Entity Management',
    geography: 'Geography',
    'org-structure': 'Business Units',
    console: 'Security Console',
    'finecore-hub': 'Finance & Compliance Hub',
    'finecore-ledgers': 'Ledger Master',
    'finecore-finframe': 'FinFrame',
    'finecore-gst-config': 'GST Config',
    'finecore-comply360': 'Comply360',
    'ph-pay-heads': 'Pay Heads',
    'ph-salary-structures': 'Salary Structures',
    'opening-ledger-balances': 'Opening Ledger Balances',
    'utility-import': 'Import Hub',
  };
  return known[m] ?? m.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface CommandCenterHeaderProps {
  activeModule: CommandCenterModule;
  onModuleChange: (module: CommandCenterModule) => void;
}

export function CommandCenterHeader({ activeModule }: CommandCenterHeaderProps) {
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all' ? selectedCompany : 'SMRT';

  const lastEntryLabel = useMemo<string | undefined>(() => {
    try {
      // [JWT] GET /api/accounting/journal/last-entry?entityCode={entityCode}
      const raw = localStorage.getItem(journalKey(entityCode));
      if (!raw) return undefined;
      const entries: Array<{ created_at: string }> = JSON.parse(raw);
      if (!entries.length) return undefined;
      const latest = entries.reduce((a, b) => (a.created_at > b.created_at ? a : b));
      const d = new Date(latest.created_at);
      return 'Last entry: ' +
        d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
        ' ' +
        d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return undefined;
    }
  }, [entityCode]);

  const group = getGroupLabel(activeModule);
  const moduleLabel = getModuleLabel(activeModule);
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: 'Operix Core', href: '/erp/dashboard' },
    { label: 'Command Centre', href: '/erp/command-center' },
  ];
  if (group && group !== moduleLabel) crumbs.push({ label: group });
  if (moduleLabel) crumbs.push({ label: moduleLabel });

  return (
    <ERPHeader
      breadcrumbs={crumbs}
      companies={[]}
      showDatePicker={true}
      showCompany={true}
      lastEntryLabel={lastEntryLabel}
    />
  );
}
