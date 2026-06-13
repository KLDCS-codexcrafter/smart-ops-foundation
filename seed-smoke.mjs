import { seedEntityDemoData } from '@/lib/demo-seed-orchestrator.ts';

// Polyfill localStorage
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.has(k) ? store.get(k) : null,
  setItem: (k,v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size; },
};

function dump(label, entity, archetype) {
  store.clear();
  const r = seedEntityDemoData(entity, archetype);
  const items = JSON.parse(localStorage.getItem('erp_inventory_items') || '[]');
  const custs = JSON.parse(localStorage.getItem('erp_group_customer_master') || '[]');
  const vends = JSON.parse(localStorage.getItem('erp_group_vendor_master') || '[]');
  console.log(`\n=== ${label} (${entity} · ${archetype}) ===`);
  console.log('  counts:', JSON.stringify(r));
  console.log('  items sample:', items.slice(0,3).map(i=>i.itemCode||i.name).join(' | '));
  console.log('  items.has(VLV-BFV-DN100):', items.some(i=>i.itemCode==='VLV-BFV-DN100'));
  console.log('  custs sample:', custs.slice(0,4).map(c=>c.partyName).join(' | '));
  console.log('  vends sample:', vends.slice(0,4).map(v=>v.partyName||v.vendorName).join(' | '));
  console.log('  total keys written:', store.size);
}

dump('SigmaFlow', 'SIGMA', 'valve-mfg');
dump('Sinha', 'SINHA', 'manufacturing');
dump('Abdos', 'ABDOS', 'manufacturing');
