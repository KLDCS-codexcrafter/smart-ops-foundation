import { ERPHeader } from '@/components/layout/ERPHeader';
import type { CommandCenterModule } from '../pages/CommandCenterPage';

const MODULE_OPTIONS = [
  { value: 'overview', label: 'Overview' },
  { value: 'core',     label: 'Foundation & Core' },
  { value: 'console',  label: 'Security Console' },
];

interface CommandCenterHeaderProps {
  activeModule: CommandCenterModule;
  onModuleChange: (module: CommandCenterModule) => void;
}

export function CommandCenterHeader({ activeModule, onModuleChange }: CommandCenterHeaderProps) {
  return (
    <ERPHeader
      moduleOptions={MODULE_OPTIONS}
      activeModule={activeModule}
      onModuleChange={(v) => onModuleChange(v as CommandCenterModule)}
      breadcrumbs={[
        { label: 'Operix Core', href: '/erp/dashboard' },
        { label: 'Command Center', href: '/erp/command-center' },
        { label: MODULE_OPTIONS.find(o => o.value === activeModule)?.label ?? '' },
      ]}
      companies={[]}
      showDatePicker={true}
      showCompany={true}
    />
  );
}
