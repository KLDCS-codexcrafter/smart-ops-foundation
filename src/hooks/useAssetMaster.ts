/**
 * useAssetMaster.ts — CRUD + assign/return for Pay Hub Asset Master
 * [JWT] GET/POST/PUT/DELETE /api/pay-hub/assets
 * Bidirectional sync: assign/return also updates erp_employees equipmentIssued[]
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { Asset, AssetAssignment, AssetCondition } from '@/types/asset-master';
import { ASSETS_KEY } from '@/types/asset-master';
import type { Employee } from '@/types/employee';
import { EMPLOYEES_KEY } from '@/types/employee';

const loadAssets = (): Asset[] => {
  try {
    // [JWT] GET /api/pay-hub/assets
    const raw = localStorage.getItem(ASSETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};

const saveAssets = (items: Asset[]) => {
  // [JWT] PUT /api/pay-hub/assets
  localStorage.setItem(ASSETS_KEY, JSON.stringify(items));
};

const loadEmployees = (): Employee[] => {
  try {
    // [JWT] GET /api/pay-hub/employees
    const raw = localStorage.getItem(EMPLOYEES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};

const saveEmployees = (items: Employee[]) => {
  // [JWT] PUT /api/pay-hub/employees
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(items));
};

const genCode = (all: Asset[]) => 'AST-' + String(all.length + 1).padStart(6, '0');

export function useAssetMaster() {
  const [assets, setAssets] = useState<Asset[]>(loadAssets);

  // ── createAsset ─────────────────────────────────────────────────
  const createAsset = (form: Omit<Asset, "id" | "assetCode" | "created_at" | "updated_at">, customCode?: string): Asset => {
    const now = new Date().toISOString();
    const all = loadAssets();
    const code = customCode?.trim() || genCode(all);
    if (all.some(a => a.assetCode === code)) {
      toast.error(`Asset code '${code}' already exists`);
      throw new Error("Duplicate asset code");
    }
    const asset: Asset = { ...form, id: `ast-${Date.now()}`, assetCode: code, created_at: now, updated_at: now };
    const updated = [...all, asset];
    setAssets(updated); saveAssets(updated);
    toast.success(`${asset.name} (${asset.assetCode}) added`);
    // [JWT] POST /api/pay-hub/assets
    return asset;
  };

  // ── updateAsset ─────────────────────────────────────────────────
  const updateAsset = (id: string, patch: Partial<Asset>): void => {
    const all = loadAssets();
    const updated = all.map(a => a.id === id ? { ...a, ...patch, updated_at: new Date().toISOString() } : a);
    setAssets(updated); saveAssets(updated);
    toast.success("Asset updated");
    // [JWT] PATCH /api/pay-hub/assets/:id
  };

  // ── assignAsset ─────────────────────────────────────────────────
  const assignAsset = (assetId: string, employeeId: string, employeeCode: string,
    employeeName: string, assignedDate: string, condition: AssetCondition, notes: string): void => {

    const allAssets = loadAssets();
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) { toast.error('Asset not found'); return; }

    const entry: AssetAssignment = {
      id: `asgn-${Date.now()}`,
      employeeId, employeeCode, employeeName,
      assignedDate, returnedDate: '',
      conditionOut: condition, conditionIn: 'good',
      notes, assignedBy: 'Admin',
    };

    const updatedAsset: Asset = {
      ...asset,
      status: 'assigned',
      currentAssigneeId: employeeId,
      currentAssigneeCode: employeeCode,
      currentAssigneeName: employeeName,
      assignedDate,
      assignments: [...asset.assignments, entry],
      updated_at: new Date().toISOString(),
    };
    const updatedAssets = allAssets.map(a => a.id === assetId ? updatedAsset : a);
    setAssets(updatedAssets); saveAssets(updatedAssets);
    // [JWT] POST /api/pay-hub/assets/:id/assign

    // ── Sync to employee equipmentIssued[] ───────────────────────
    const allEmps = loadEmployees();
    const updatedEmps = allEmps.map(e => {
      if (e.id !== employeeId) return e;
      const newEquipment = {
        id: `eq-${Date.now()}`,
        assetCode: asset.assetCode,
        description: `${asset.name} (${asset.make} ${asset.model})`.trim(),
        serialNo: asset.serialNo,
        dateIssued: assignedDate,
        expectedReturn: '',
        status: 'issued' as const,
      };
      return { ...e, equipmentIssued: [...e.equipmentIssued, newEquipment], updated_at: new Date().toISOString() };
    });
    saveEmployees(updatedEmps);
    // [JWT] PATCH /api/pay-hub/employees/:id/equipment

    toast.success(`${asset.name} assigned to ${employeeName}`);
  };

  // ── returnAsset ─────────────────────────────────────────────────
  const returnAsset = (assetId: string, returnDate: string,
    conditionIn: AssetCondition, notes: string): void => {

    const allAssets = loadAssets();
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) { toast.error('Asset not found'); return; }

    // Close the open assignment entry
    const closedAssignments = asset.assignments.map(a =>
      a.returnedDate === '' ? { ...a, returnedDate: returnDate, conditionIn, notes: notes || a.notes } : a
    );

    const updatedAsset: Asset = {
      ...asset,
      status: 'available',
      currentAssigneeId: '', currentAssigneeCode: '',
      currentAssigneeName: '', assignedDate: '',
      condition: conditionIn,
      assignments: closedAssignments,
      updated_at: new Date().toISOString(),
    };
    const updatedAssets = allAssets.map(a => a.id === assetId ? updatedAsset : a);
    setAssets(updatedAssets); saveAssets(updatedAssets);
    // [JWT] POST /api/pay-hub/assets/:id/return

    // ── Sync return to employee equipmentIssued[] ───────────────
    const allEmps = loadEmployees();
    const empId = asset.currentAssigneeId;
    const updatedEmps = allEmps.map(e => {
      if (e.id !== empId) return e;
      const updatedEquip = e.equipmentIssued.map(eq =>
        eq.assetCode === asset.assetCode && eq.status === 'issued'
          ? { ...eq, status: 'returned' as const }
          : eq
      );
      return { ...e, equipmentIssued: updatedEquip, updated_at: new Date().toISOString() };
    });
    saveEmployees(updatedEmps);
    // [JWT] PATCH /api/pay-hub/employees/:id/equipment

    toast.success(`${asset.name} returned and marked available`);
  };

  // ── Stats ────────────────────────────────────────────────────────
  const stats = {
    total: assets.length,
    available: assets.filter(a => a.status === 'available').length,
    assigned: assets.filter(a => a.status === 'assigned').length,
    underRepair: assets.filter(a => a.status === 'under_repair').length,
    disposed: assets.filter(a => a.status === 'disposed').length,
    totalValue: assets.reduce((s, a) => s + (a.purchaseValue || 0), 0),
  };

  return { assets, stats, createAsset, updateAsset, assignAsset, returnAsset };
}
