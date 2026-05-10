/**
 * @file        src/pages/erp/docvault/DocVaultSidebar.types.ts
 * @purpose     DocVaultModule union type · 10 modules at A.9 BUNDLED close
 * @who         DocVault page shell · sidebar consumers
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.9 BUNDLED · Block A.8
 * @iso         ISO 25010 Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema (CANONICAL) ·
 *              D-NEW-CL-docvault-version-tree-pattern (CANONICAL · A.9 NEW) ·
 *              D-NEW-CC sidebar keyboard uniqueness · FR-30 11/11 header standard
 * @disciplines FR-30 · FR-67
 * @reuses      N/A (pure type definition)
 * @[JWT]       N/A (type module)
 */
export type DocVaultModule =
  | 'welcome'
  | 'documents-register'
  | 'document-entry'
  | 'approvals-pending'
  | 'drawing-register-tree'
  | 'tag-index'
  | 'similarity-viewer'
  | 'documents-by-dept'
  | 'approval-latency'
  | 'version-velocity';
