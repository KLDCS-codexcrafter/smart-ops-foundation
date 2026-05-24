/**
 * @file     process-genealogy.ts
 * @sprint   T-Phase-3.PROD-3.5.PASS2 · ST5b
 * @purpose  FDA 21 CFR Part 211 batch genealogy type definitions.
 *           Q-LOCK-8 Option A · Full FDA format export.
 */

export type GenealogyNodeType =
  | 'raw_lot'
  | 'intermediate_batch'
  | 'finished_batch'
  | 'sample'
  | 'co_product'
  | 'by_product';

export type GenealogyQualityStatus =
  | 'pending'
  | 'released'
  | 'rejected'
  | 'quarantined'
  | 'recalled';

export interface GenealogyNode {
  id: string;
  type: GenealogyNodeType;
  parent_ids: string[];
  child_ids: string[];
  qty: number;
  uom: string;
  timestamp: string;
  vendor_id?: string;
  vendor_lot_no?: string;
  quality_status: GenealogyQualityStatus;
  batch_id?: string;
  item_id?: string;
  item_name?: string;
}

export interface GenealogyEdge {
  from: string;
  to: string;
  qty: number;
  uom: string;
  relationship: 'consumed' | 'produced' | 'sampled' | 'split_off';
  timestamp: string;
}

export interface GenealogyTree {
  root_id: string;
  nodes: Record<string, GenealogyNode>;
  edges: GenealogyEdge[];
  built_at: string;
}

export interface FDAGenealogyExport {
  facility_name: string;
  facility_registration_no: string;
  batch_no: string;
  product_code: string;
  product_name: string;
  manufacturing_date: string;
  expiry_date: string;
  raw_materials: Array<{
    name: string;
    vendor: string;
    vendor_lot: string;
    qty_used: number;
    uom: string;
    qa_release_date: string;
  }>;
  in_process_samples: Array<{
    sample_id: string;
    sampled_at: string;
    parameters: Record<string, unknown>;
    pass: boolean;
  }>;
  finished_product_release: {
    released_by: string;
    released_at: string;
    coa_doc_id?: string;
  };
  exported_at: string;
  exported_by: string;
}

export const genealogyTreesKey = (entityCode: string): string =>
  `genealogy_trees_${entityCode}`;
