/**
 * @file     default-entity.ts
 * @purpose  Single source of truth for the default/fallback entity shortCode used
 *           across demo data, URL fallbacks, and test fixtures. Replaces 20+
 *           hardcoded 'SMRT' literals that pre-dated the OWW banned-patterns list.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2b.3b-C
 * @sprint   T10-pre.2b.3b-C
 * @iso      Maintainability (HIGH — single source) · Portability (HIGH — future multi-tenant rename is one-line change)
 * @whom     Demo-data modules · Print panels with entity URL fallback · Test fixtures
 * @depends  (none — pure constant)
 * @consumers mock-entities.ts, demo-*-data.ts, SalesInvoicePrint.tsx
 */

export const DEFAULT_ENTITY_SHORTCODE = 'SMRT' as const;
export type DefaultEntityShortCode = typeof DEFAULT_ENTITY_SHORTCODE;
