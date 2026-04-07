import { ERPHeader } from '@/components/layout/ERPHeader';
import type { CommandCenterModule } from '../pages/CommandCenterPage';

const MODULE_OPTIONS = [
  { value: 'overview', label: 'Overview' },
  { value: 'foundation', label: 'Foundation & Core' },
  { value: 'geography', label: 'Geography Masters' },
  { value: 'finecore-hub', label: 'FineCore Masters' },
  { value: 'finecore-tax-rates', label: 'Tax Rate Master' },
  { value: 'finecore-tds', label: 'TDS Sections' },
  { value: 'finecore-tcs', label: 'TCS Sections' },
  { value: 'finecore-hsn-sac', label: 'HSN / SAC Codes' },
  { value: 'finecore-professional-tax', label: 'Professional Tax' },
  { value: 'finecore-epf-esi-lwf', label: 'EPF / ESI / LWF' },
  { value: 'finecore-statutory-reg', label: 'Statutory Registrations' },
  { value: 'finecore-gst-config', label: 'GST Entity Config' },
  { value: 'finecore-comply360', label: 'Comply360 Config' },
  { value: 'console', label: 'Security Console' },
];

interface CommandCenterHeaderProps {
  activeModule: CommandCenterModule;
  onModuleChange: (module: CommandCenterModule) => void;
}

function getBreadcrumbs(activeModule: CommandCenterModule) {
  const base = [
    { label: 'Operix Core', href: '/erp/dashboard' },
    { label: 'Command Centre', href: '/erp/command-center' },
  ];
  const currentLabel = MODULE_OPTIONS.find(o => o.value === activeModule)?.label ?? '';

  if (activeModule.startsWith('finecore-') && activeModule !== 'finecore-hub') {
    return [...base, { label: 'FineCore Masters', href: '/erp/command-center#finecore-hub' }, { label: currentLabel }];
  }

  return [...base, { label: currentLabel }];
}

export function CommandCenterHeader({ activeModule, onModuleChange }: CommandCenterHeaderProps) {
  return (
    <ERPHeader
      moduleOptions={MODULE_OPTIONS}
      activeModule={activeModule}
      onModuleChange={(v) => onModuleChange(v as CommandCenterModule)}
      breadcrumbs={getBreadcrumbs(activeModule)}
      companies={[]}
      showDatePicker={true}
      showCompany={true}
    />
  );
}