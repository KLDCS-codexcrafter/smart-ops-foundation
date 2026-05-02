/**
 * UniversalRegisterTypes.ts — Generic register type contracts (D-226 UTS · sibling to FineCore RegisterTypes)
 *
 * Sprint T-Phase-1.2.6a · Card #2.6 sub-sprint 1 of 5
 *
 * Sibling discipline: this file is the type contract for non-voucher
 * registers. The voucher-typed `src/components/finecore/registers/RegisterTypes.ts`
 * stays untouched and continues to back 13 production voucher consumers.
 *
 * Consumers (1.2.6b/c/d retrofits): GRN, MIN, RTV, Quotation, SRM, IM, SOM,
 * DOM, DM, SecondarySales, Project, ProjectMilestone, TimeEntry, CycleCount,
 * ConsumptionEntry registers.
 */

import type { ReactNode } from 'react';

/**
 * Generic register column over <T extends { id: string }>.
 * `exportKey` accepts either a keyof T (simple field) or a function (computed value).
 */
export interface RegisterColumn<T extends { id: string }> {
  /** Unique key for React list rendering. */
  key: string;
  /** Column header text. */
  label: string;
  /** Cell alignment. Default: 'left'. */
  align?: 'left' | 'right' | 'center';
  /** Optional Tailwind width hint, e.g. 'w-32'. */
  width?: string;
  /** Render the cell for a given row. */
  render: (row: T) => ReactNode;
  /** Optional accessor for CSV/XLSX/PDF/Word export. Absent = render-only column. */
  exportKey?: keyof T | ((row: T) => string | number | null);
  /** Optional export header override. Defaults to `label`. */
  exportLabel?: string;
  /** When true, the cell becomes a clickable button → onNavigateToRecord. */
  clickable?: boolean;
}

/**
 * 5-card summary strip above the table.
 */
export interface SummaryCard {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
}

/**
 * Register metadata. Each consumer supplies one.
 */
export interface RegisterMeta<T extends { id: string }> {
  /** Stable register identifier (e.g. 'grn_register'). Used for CSV filename + audit. */
  registerCode: string;
  /** Human title (e.g. 'GRN Register'). */
  title: string;
  /** Subtitle / one-line description. */
  description?: string;
  /**
   * Accessor for the record's primary date — used by the date-range filter.
   * Pattern (D-226): row.effective_date ?? row.primary_date.
   */
  dateAccessor: (row: T) => string;
}

/**
 * Filter state held inside UniversalRegisterGrid.
 */
export interface RegisterFilters {
  dateFrom: string;
  dateTo: string;
  search: string;
  status: string;
}

/**
 * Status dropdown option.
 */
export interface StatusOption {
  value: string;
  label: string;
}
