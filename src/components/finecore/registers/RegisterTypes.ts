/**
 * @file     RegisterTypes.ts
 * @purpose  Shared types for 13 voucher-type register pages. Generic column definition
 *           that is register-agnostic — future customization (2d-C) filters the column
 *           array via RegisterConfig without touching the shared grid component.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-B
 * @sprint   T10-pre.2d-B
 * @iso      Maintainability (HIGH — single type owns shape of all 13 registers)
 *           Functional Suitability (HIGH — generic over row type)
 * @whom     RegisterGrid.tsx · 13 register panels · (future 2d-C) RegisterConfig consumer
 * @depends  — (pure types)
 * @consumers RegisterGrid.tsx · all 13 register panels
 */

import type { ReactNode } from 'react';
import type { Voucher } from '@/types/voucher';
import type { RegisterTypeCode, RegisterToggles, RegisterGroupKey } from '@/types/register-config';

/**
 * [Abstract] Generic register column. Each register supplies its own column array.
 * The `toggleKey` field connects columns to RegisterConfig — 2d-C will filter the array
 * by checking `toggles[column.toggleKey]`. Columns without toggleKey are always shown.
 */
export interface RegisterColumn<T = Voucher> {
  /** Unique key for React list rendering. */
  key: string;
  /** Column header text. */
  label: string;
  /** Column alignment. Default: 'left'. */
  align?: 'left' | 'right' | 'center';
  /** Optional width hint (Tailwind class, e.g. 'w-32'). */
  width?: string;
  /** Render the cell for a given row. Receives the full row object. */
  render: (row: T) => ReactNode;
  /**
   * [Creative] Optional RegisterToggles key. When present, 2d-C will hide the
   * column if toggles[toggleKey] is false. When absent, column is always shown.
   * This is a forward-compatible field — 2d-B ignores it (always shows everything).
   */
  toggleKey?: keyof RegisterToggles;
  /**
   * Optional key for CSV/XLSX export. If provided, exporter uses this as cell value.
   * If absent, the column is render-only (not included in export).
   */
  exportKey?: keyof T | ((row: T) => string | number | null);
  /** Optional export header override. Default: label. */
  exportLabel?: string;
  /**
   * [T-T10-pre.2d-D] When true, the cell becomes a clickable button that
   * invokes RegisterGrid's onNavigateToVoucher callback. Used for voucher-no
   * cells to drill to source voucher in read-only mode.
   */
  clickable?: boolean;
}

/**
 * [Abstract] Register filter state. Held in RegisterGrid's local state; passed back
 * to DayBook on drill-down.
 */
export interface RegisterFilters {
  dateFrom: string;
  dateTo: string;
  search: string;
  statusFilter: 'all' | 'draft' | 'posted' | 'cancelled';
}

/**
 * [Abstract] Summary card shape for the 5-card strip above the table.
 */
export interface SummaryCard {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
}

/**
 * [Abstract] Register metadata — passed to RegisterGrid by each register panel.
 */
export interface RegisterMeta {
  registerCode: RegisterTypeCode;
  title: string;
  /**
   * Function that filters vouchers to this register's scope. Handles special cases
   * like stock_adjustment vs stock_journal (both share base_voucher_type).
   */
  voucherFilter: (v: Voucher) => boolean;
  /**
   * Optional voucher-type label for CSV filename and the DayBook drill-down preset.
   * If drillDownType is set and user clicks a row, DayBook opens with typeFilter = drillDownType.
   */
  drillDownType: string;
}
