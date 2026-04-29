/**
 * demo-asset-centres.ts — Sprint T-Phase-1.1.2-pre · D-218
 * 8 demo Asset Centres seeded across realistic Indian manufacturing setup.
 */
import type { AssetCentre } from '@/types/finecore/asset-centre';

const NOW = new Date().toISOString();

export const DEMO_ASSET_CENTRES: AssetCentre[] = [
  { id: 'ac-demo-001', code: 'ACT-0001', name: 'Plant 1 — Main Floor', category: 'plant_machinery', parent_asset_centre_id: null, division_id: null, department_id: null, location: 'Mumbai', custodian_name: 'Rakesh Kumar', custodian_email: 'rakesh@operix.example', status: 'active', description: 'Primary manufacturing floor', entity_id: null, created_at: NOW, updated_at: NOW },
  { id: 'ac-demo-002', code: 'ACT-0002', name: 'Plant 1 — CNC Line A', category: 'plant_machinery', parent_asset_centre_id: 'ac-demo-001', division_id: null, department_id: null, location: 'Mumbai', custodian_name: 'Suresh Patil', custodian_email: 'suresh@operix.example', status: 'active', description: 'CNC machining bay A', entity_id: null, created_at: NOW, updated_at: NOW },
  { id: 'ac-demo-003', code: 'ACT-0003', name: 'Plant 1 — Welding Bay', category: 'plant_machinery', parent_asset_centre_id: 'ac-demo-001', division_id: null, department_id: null, location: 'Mumbai', custodian_name: 'Anil Verma', custodian_email: 'anil@operix.example', status: 'active', description: 'Welding station', entity_id: null, created_at: NOW, updated_at: NOW },
  { id: 'ac-demo-004', code: 'ACT-0004', name: 'Head Office — Mumbai', category: 'building', parent_asset_centre_id: null, division_id: null, department_id: null, location: 'Mumbai', custodian_name: 'Priya Mehta', custodian_email: 'priya@operix.example', status: 'active', description: 'Corporate HQ building', entity_id: null, created_at: NOW, updated_at: NOW },
  { id: 'ac-demo-005', code: 'ACT-0005', name: 'IT Infrastructure', category: 'computer_it', parent_asset_centre_id: 'ac-demo-004', division_id: null, department_id: null, location: 'Mumbai', custodian_name: 'Vikram Shah', custodian_email: 'vikram@operix.example', status: 'active', description: 'Servers, laptops, networking', entity_id: null, created_at: NOW, updated_at: NOW },
  { id: 'ac-demo-006', code: 'ACT-0006', name: 'Vehicle Fleet', category: 'vehicle', parent_asset_centre_id: null, division_id: null, department_id: null, location: 'Mumbai', custodian_name: 'Ramesh Joshi', custodian_email: 'ramesh@operix.example', status: 'active', description: 'Sales + delivery vehicles', entity_id: null, created_at: NOW, updated_at: NOW },
  { id: 'ac-demo-007', code: 'ACT-0007', name: 'Office Furniture', category: 'furniture_fixture', parent_asset_centre_id: 'ac-demo-004', division_id: null, department_id: null, location: 'Mumbai', custodian_name: 'Priya Mehta', custodian_email: 'priya@operix.example', status: 'active', description: 'Desks, chairs, partitions', entity_id: null, created_at: NOW, updated_at: NOW },
  { id: 'ac-demo-008', code: 'ACT-0008', name: 'Tools & Dies', category: 'tools_dies', parent_asset_centre_id: 'ac-demo-001', division_id: null, department_id: null, location: 'Mumbai', custodian_name: 'Anil Verma', custodian_email: 'anil@operix.example', status: 'active', description: 'Production tooling and dies', entity_id: null, created_at: NOW, updated_at: NOW },
];
