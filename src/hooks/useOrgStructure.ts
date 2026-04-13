/**
 * useOrgStructure.ts — Division & Department CRUD hook
 * [JWT] Replace with GET/POST/PUT/DELETE /api/foundation/org-structure when backend ready
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { Division, Department } from '@/types/org-structure';
import { DIVISIONS_KEY, DEPARTMENTS_KEY } from '@/types/org-structure';
import { resolvePreset, type OrgPresetPackage } from '@/data/org-presets';

// ── Loaders ──────────────────────────────────────────────────────────────

const loadDivisions = (): Division[] => {
  try {
    // [JWT] GET /api/foundation/divisions
    const raw = localStorage.getItem(DIVISIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const loadDepartments = (): Department[] => {
  try {
    // [JWT] GET /api/foundation/departments
    const raw = localStorage.getItem(DEPARTMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

// ── Save helpers ─────────────────────────────────────────────────────────

const saveDivisions = (items: Division[]) => {
  // [JWT] PUT /api/foundation/divisions
  localStorage.setItem(DIVISIONS_KEY, JSON.stringify(items));
};
const saveDepartments = (items: Department[]) => {
  // [JWT] PUT /api/foundation/departments
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(items));
};

// ── Code generators ──────────────────────────────────────────────────────

const genDivCode = (all: Division[]) => 'DIV-' + String(all.length + 1).padStart(4, '0');
const genDeptCode = (all: Department[]) => 'DEPT-' + String(all.length + 1).padStart(4, '0');

// ── Hook ─────────────────────────────────────────────────────────────────

export function useOrgStructure() {
  const [divisions, setDivisions] = useState<Division[]>(loadDivisions);
  const [departments, setDepartments] = useState<Department[]>(loadDepartments);

  // ── Division CRUD ───────────────────────────────────────────────────

  const createDivision = (form: Omit<Division, "id" | "code" | "created_at" | "updated_at">) => {
    if (divisions.some(d => d.name.trim().toLowerCase() === form.name.trim().toLowerCase())) {
      toast.error('A division with this name already exists');
      return null;
    }
    const now = new Date().toISOString();
    const d: Division = { ...form, id: `div-${Date.now()}`, code: genDivCode(divisions), created_at: now, updated_at: now };
    const updated = [...divisions, d];
    setDivisions(updated); saveDivisions(updated);
    toast.success(`Division '${d.name}' created`);
    // [JWT] POST /api/foundation/divisions
    return d;
  };

  const updateDivision = (id: string, patch: Partial<Division>) => {
    const updated = divisions.map(d => d.id === id ? { ...d, ...patch, updated_at: new Date().toISOString() } : d);
    setDivisions(updated); saveDivisions(updated);
    toast.success('Division updated');
    // [JWT] PATCH /api/foundation/divisions/:id
  };

  const deleteDivision = (id: string) => {
    const hasDepts = departments.some(d => d.division_id === id);
    if (hasDepts) {
      toast.error('Cannot delete — this division has departments. Move or delete them first.');
      return;
    }
    const updated = divisions.filter(d => d.id !== id);
    setDivisions(updated); saveDivisions(updated);
    toast.success('Division deleted');
    // [JWT] DELETE /api/foundation/divisions/:id
  };

  const toggleDivisionStatus = (id: string) => {
    updateDivision(id, { status: divisions.find(d => d.id === id)?.status === 'active' ? 'inactive' : 'active' });
  };

  // ── Department CRUD ─────────────────────────────────────────────────

  const createDepartment = (form: Omit<Department, "id" | "code" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const d: Department = { ...form, id: `dept-${Date.now()}`, code: genDeptCode(departments), created_at: now, updated_at: now };
    const updated = [...departments, d];
    setDepartments(updated); saveDepartments(updated);
    toast.success(`Department '${d.name}' created`);
    // [JWT] POST /api/foundation/departments
    return d;
  };

  const updateDepartment = (id: string, patch: Partial<Department>) => {
    const updated = departments.map(d => d.id === id ? { ...d, ...patch, updated_at: new Date().toISOString() } : d);
    setDepartments(updated); saveDepartments(updated);
    toast.success('Department updated');
    // [JWT] PATCH /api/foundation/departments/:id
  };

  const deleteDepartment = (id: string) => {
    const updated = departments.filter(d => d.id !== id);
    setDepartments(updated); saveDepartments(updated);
    toast.success('Department deleted');
    // [JWT] DELETE /api/foundation/departments/:id
  };

  const toggleDepartmentStatus = (id: string) => {
    updateDepartment(id, { status: departments.find(d => d.id === id)?.status === 'active' ? 'inactive' : 'active' });
  };

  // ── Preset Import ───────────────────────────────────────────────────

  const importPreset = (preset: OrgPresetPackage) => {
    const now = new Date().toISOString();
    const { divisions: newDivs, departments: newDepts } = resolvePreset(preset, now);
    const updatedDivs = [...divisions, ...newDivs];
    const updatedDepts = [...departments, ...newDepts];
    setDivisions(updatedDivs); saveDivisions(updatedDivs);
    setDepartments(updatedDepts); saveDepartments(updatedDepts);
    // [JWT] POST /api/foundation/org-structure/import-preset
    toast.success(`Imported ${newDivs.length} divisions and ${newDepts.length} departments`);
  };

  // ── Stats ────────────────────────────────────────────────────────────
  const activeDivisions = divisions.filter(d => d.status === 'active').length;
  const activeDepartments = departments.filter(d => d.status === 'active').length;

  return {
    divisions, departments,
    activeDivisions, activeDepartments,
    createDivision, updateDivision, deleteDivision, toggleDivisionStatus,
    createDepartment, updateDepartment, deleteDepartment, toggleDepartmentStatus,
    importPreset,
  };
}
