/**
 * ShellHeader — Sprint A-3.1 wrapper around legacy ERPHeader.
 *
 * PURPOSE  Visual consistency during card-by-card migration.
 * INPUT    breadcrumbs, chips, lastEntryLabel
 * OUTPUT   Rendered ERPHeader with chip-derived flags
 * DEPENDENCIES  @/components/layout/ERPHeader
 * TALLY-ON-TOP BEHAVIOR  Chip filtering already done by Shell; this just reads chip presence.
 * SPEC DOC  Operix_ONE_Shell_Specification.xlsx
 *
 * Sprint A-3.2+ replaces this with native chip rendering.
 */
import type { HeaderChip } from '../types';
import { ERPHeader, type BreadcrumbEntry } from '@/components/layout/ERPHeader';

interface Props {
  breadcrumbs?: BreadcrumbEntry[];
  chips: HeaderChip[];
  lastEntryLabel?: string;
}

export function ShellHeader({ breadcrumbs = [], chips, lastEntryLabel }: Props) {
  const showCompany = chips.some(c => c.type === 'entity-selector');
  const showDatePicker = chips.some(c => c.type === 'financial-year');

  return (
    <ERPHeader
      breadcrumbs={breadcrumbs}
      companies={[]}
      showDatePicker={showDatePicker}
      showCompany={showCompany}
      lastEntryLabel={lastEntryLabel}
    />
  );
}
