import { useState } from 'react';
import { toast } from 'sonner';
import type { ItemPartyCode } from '@/types/item-party-code';

const KEY = 'erp_item_party_codes';
const load = (): ItemPartyCode[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function useItemPartyCodes() {
  const [codes, setCodes] = useState<ItemPartyCode[]>(load());
  // [JWT] Replace with GET /api/inventory/items/:id/party-codes
  const save = (d: ItemPartyCode[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/items/:id/party-codes */ };

  const createCode = (c: ItemPartyCode) => {
    const u = [c, ...codes]; setCodes(u); save(u);
    toast.success('Party code added');
    // [JWT] Replace with POST /api/inventory/items/:id/party-codes
  };

  const updateCode = (id: string, data: Partial<ItemPartyCode>) => {
    const u = codes.map(x => x.id === id ? { ...x, ...data, updated_at: new Date().toISOString() } : x);
    setCodes(u); save(u);
    // [JWT] Replace with PATCH /api/inventory/items/:id/party-codes/:codeId
  };

  const deleteCode = (id: string) => {
    const u = codes.filter(x => x.id !== id); setCodes(u); save(u);
    toast.success('Party code removed');
    // [JWT] Replace with DELETE /api/inventory/items/:id/party-codes/:codeId
  };

  const getByItemId = (itemId: string) => codes.filter(c => c.item_id === itemId);

  return { codes, createCode, updateCode, deleteCode, getByItemId };
}
