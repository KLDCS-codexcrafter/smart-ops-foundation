import { useState } from 'react';
import { toast } from 'sonner';
import type { PriceList, PriceListItem } from '@/types/price-list';

const KEY_LISTS = 'erp_price_lists';
const KEY_ITEMS = 'erp_price_list_items';
const loadLists = (): PriceList[] => { try { return JSON.parse(localStorage.getItem(KEY_LISTS) || '[]'); } catch { return []; } };
const loadItems = (): PriceListItem[] => { try { return JSON.parse(localStorage.getItem(KEY_ITEMS) || '[]'); } catch { return []; } };

export function usePriceLists() {
  const [lists, setLists] = useState<PriceList[]>(loadLists());
  const [items, setItems] = useState<PriceListItem[]>(loadItems());

  const saveLists = (d: PriceList[]) => { localStorage.setItem(KEY_LISTS, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/price-lists */ };
  const saveItems = (d: PriceListItem[]) => { localStorage.setItem(KEY_ITEMS, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/price-lists/items */ };

  // ── Price List CRUD ──
  const createList = (list: PriceList) => {
    const u = [list, ...lists]; setLists(u); saveLists(u);
    toast.success(`Price list "${list.name}" created`);
    // [JWT] POST /api/inventory/price-lists
  };

  const updateList = (id: string, data: Partial<PriceList>) => {
    const u = lists.map(l => l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l);
    setLists(u); saveLists(u);
    // [JWT] PATCH /api/inventory/price-lists/:id
  };

  const deleteList = (id: string) => {
    const u = lists.filter(l => l.id !== id); setLists(u); saveLists(u);
    const ui = items.filter(i => i.price_list_id !== id); setItems(ui); saveItems(ui);
    toast.success('Price list deleted');
    // [JWT] DELETE /api/inventory/price-lists/:id
  };

  // ── Price List Item CRUD ──
  const createItem = (item: PriceListItem) => {
    const u = [item, ...items]; setItems(u); saveItems(u);
    // [JWT] POST /api/inventory/price-lists/items
  };

  const updateItem = (id: string, data: Partial<PriceListItem>) => {
    const u = items.map(i => i.id === id ? { ...i, ...data, updated_at: new Date().toISOString() } : i);
    setItems(u); saveItems(u);
    // [JWT] PATCH /api/inventory/price-lists/items/:id
  };

  const deleteItem = (id: string) => {
    const u = items.filter(i => i.id !== id); setItems(u); saveItems(u);
    // [JWT] DELETE /api/inventory/price-lists/items/:id
  };

  // ── Queries ──
  const getActiveListForCustomer = (customerId: string) =>
    lists.filter(l => l.status === 'active' && (l.customer_ids?.includes(customerId) || l.is_default));
  // [JWT] GET /api/inventory/price-lists?customer_id=&status=active

  const getDefaultList = () => lists.find(l => l.is_default && l.status === 'active') ?? null;
  // [JWT] GET /api/inventory/price-lists?is_default=true&status=active

  const getItemsForList = (listId: string) => items.filter(i => i.price_list_id === listId);

  return {
    lists, items,
    createList, updateList, deleteList,
    createItem, updateItem, deleteItem,
    getActiveListForCustomer, getDefaultList, getItemsForList,
  };
}
