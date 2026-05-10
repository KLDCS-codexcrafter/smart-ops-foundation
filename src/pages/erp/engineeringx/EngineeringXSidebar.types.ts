/**
 * EngineeringXSidebar.types.ts
 * Sprint T-Phase-1.A.13 · Q-LOCK-13a · Block D.1 · CLOSEOUT
 * 13 modules · FLAT IDs · A.13 closes out · 2 placeholders RENAMED + 2 NEW IDs added · 11 → 13 elements.
 */
export type EngineeringXModule =
  | 'welcome'
  | 'drawing-register'              // A.11
  | 'drawing-entry'                 // A.11
  | 'drawing-approvals'             // A.11
  | 'drawing-version-history'       // A.11
  | 'bom-extractor'                 // A.12
  | 'bom-register'                  // A.12
  | 'reference-library'             // A.12
  | 'clone-drawing'                 // A.12
  | 'similarity-predictor'          // A.13 (renamed from 'similarity-placeholder')
  | 'change-impact-analyzer'        // A.13 NEW
  | 'production-handoff'            // A.13 NEW
  | 'engineeringx-reports';         // A.13 (renamed from 'reports-placeholder')
