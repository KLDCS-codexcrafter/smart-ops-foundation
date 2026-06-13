import { describe, it } from 'vitest';
import { seedEntityDemoData } from '@/lib/demo-seed-orchestrator';
function dump(label: string, entity: string, archetype: any) {
  localStorage.clear();
  const r = seedEntityDemoData(entity, archetype);
  const items = JSON.parse(localStorage.getItem('erp_inventory_items') || '[]');
  const custs = JSON.parse(localStorage.getItem('erp_group_customer_master') || '[]');
  const vends = JSON.parse(localStorage.getItem('erp_group_vendor_master') || '[]');
  const bom = JSON.parse(localStorage.getItem(`erp_bom_${entity}`) || '[]');
  console.log(`\n=== ${label} (${entity}/${archetype}) ===`);
  console.log('  counts:', r);
  console.log('  items[0..3]:', items.slice(0,4).map((i:any)=>i.itemCode));
  console.log('  has VLV-BFV-DN100:', items.some((i:any)=>i.itemCode==='VLV-BFV-DN100'));
  console.log('  custs[0..5]:', custs.slice(0,5).map((c:any)=>c.partyName));
  console.log('  vends[0..5]:', vends.slice(0,5).map((v:any)=>v.partyName));
  console.log('  bom_'+entity+' rows:', bom.length, bom[0]?.product_item_code);
  console.log('  total keys:', localStorage.length);
}
describe('seed smoke', () => {
  it('SigmaFlow valve-mfg', () => dump('SigmaFlow','SIGMA','valve-mfg'));
  it('Sinha manufacturing', () => dump('Sinha','SINHA','manufacturing'));
  it('Cherise manufacturing', () => dump('Cherise','CHRSE','manufacturing'));
});
