/**
 * @file        src/pages/erp/docvault/DocVaultSidebar.types.ts
 * @purpose     DocVaultModule union type · 4 modules at A.8 Foundation · 2 deferred to A.9
 * @who         DocVault page shell · sidebar consumers
 * @when        2026-05-09 (T1 backfill)
 * @sprint      T-Phase-1.A.8.α-a-T1-Audit-Fix · Block C · F-4 backfill
 * @iso         ISO 25010 Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema (CANONICAL · A.8 Foundation) ·
 *              D-NEW-CC sidebar keyboard uniqueness ·
 *              FR-30 11/11 header standard (T1 backfill)
 * @disciplines FR-30 · FR-67
 * @reuses      N/A (pure type definition)
 * @[JWT]       N/A (type module · no storage · no API)
 */
export type DocVaultModule =
  | 'welcome'
  | 'documents-register'
  | 'document-entry'
  | 'approvals-pending';
