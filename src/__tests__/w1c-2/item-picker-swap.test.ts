/**
 * W1C-2 · Block 2 · ItemPicker swap in StockTransferLineGrid.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const GRID_SRC = readFileSync(resolve(process.cwd(), 'src/components/fincore/StockTransferLineGrid.tsx'), 'utf8');
const PICKER_PATH = resolve(process.cwd(), 'src/components/fincore/pickers/ItemPicker.tsx');

describe('W1C-2 Block 2 · StockTransferLineGrid ItemPicker swap', () => {
  it('ItemPicker.tsx exists in /pickers/', () => {
    expect(existsSync(PICKER_PATH)).toBe(true);
  });
  it('StockTransferLineGrid imports ItemPicker', () => {
    expect(GRID_SRC).toMatch(/from '@\/components\/fincore\/pickers\/ItemPicker'/);
    expect(GRID_SRC).toContain('<ItemPicker');
  });
  it('plain-text Item Input and TODO header note removed', () => {
    expect(GRID_SRC).not.toMatch(/TODO \(T10-pre\.2\)/);
    expect(GRID_SRC).not.toContain('Item name');
    expect(GRID_SRC).not.toMatch(/TODO for T10-pre\.2/);
  });
  it('selection populates item_id + item_name + uom (line behavior preserved)', () => {
    expect(GRID_SRC).toContain('item_id: row?.id');
    expect(GRID_SRC).toContain('item_name: row?.name');
    expect(GRID_SRC).toContain('uom: row?.uom');
  });
  it('ItemPicker reads erp_inventory_items (same engine as useInventoryItems)', () => {
    const PICKER_SRC = readFileSync(PICKER_PATH, 'utf8');
    expect(PICKER_SRC).toContain('erp_inventory_items');
  });
});
