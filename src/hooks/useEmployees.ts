/**
 * useEmployees.ts — CRUD hook for Employee Master
 * [JWT] GET/POST/PUT/DELETE /api/pay-hub/employees
 */
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { Employee } from '@/types/employee';
import { EMPLOYEES_KEY } from '@/types/employee';

const load = (): Employee[] => {
  try {
    // [JWT] GET /api/pay-hub/employees
    const raw = localStorage.getItem(EMPLOYEES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};

const save = (items: Employee[]) => {
  // [JWT] PUT /api/pay-hub/employees
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(items));
};

const genCode = (all: Employee[]): string => {
  const next = all.length + 1;
  return 'EMP-' + String(next).padStart(6, '0');
};

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(load);

  const createEmployee = (form: Omit<Employee, "id" | "empCode" | "created_at" | "updated_at">, customCode?: string): Employee => {
    const now = new Date().toISOString();
    const all = load();
    const code = customCode?.trim() || genCode(all);
    // Enforce unique code
    if (all.some(e => e.empCode === code)) {
      toast.error(`Employee code '${code}' already exists`);
      throw new Error("Duplicate employee code");
    }
    const emp: Employee = {
      ...form,
      id: `emp-${Date.now()}`,
      empCode: code,
      displayName: form.displayName || `${form.firstName} ${form.lastName}`.trim(),
      created_at: now, updated_at: now,
    };
    const updated = [...all, emp];
    setEmployees(updated); save(updated);
    toast.success(`${emp.displayName} (${emp.empCode}) added`);
    // [JWT] POST /api/pay-hub/employees
    return emp;
  };

  const updateEmployee = (id: string, patch: Partial<Employee>): void => {
    const all = load();
    const updated = all.map(e => {
      if (e.id !== id) return e;
      const merged = { ...e, ...patch, updated_at: new Date().toISOString() };
      // Auto-update displayName if name fields changed
      if (patch.firstName || patch.lastName) {
        merged.displayName = `${merged.firstName} ${merged.lastName}`.trim();
      }
      return merged;
    });
    setEmployees(updated); save(updated);
    toast.success("Employee updated");
    // [JWT] PATCH /api/pay-hub/employees/:id
  };

  const toggleStatus = (id: string): void => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    const next = emp.status === 'active' ? 'inactive' : 'active';
    updateEmployee(id, { status: next });
  };

  // Stats for Dashboard
  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    onNotice: employees.filter(e => e.status === 'on_notice').length,
    relieved: employees.filter(e => e.status === 'relieved').length,
    permanent: employees.filter(e => e.employmentType === 'permanent').length,
  }), [employees]);

  // Search helper
  const search = (q: string): Employee[] => {
    if (!q) return employees;
    const s = q.toLowerCase();
    return employees.filter(e =>
      e.displayName.toLowerCase().includes(s) ||
      e.empCode.toLowerCase().includes(s) ||
      e.designation.toLowerCase().includes(s) ||
      e.departmentName.toLowerCase().includes(s) ||
      e.pan.toLowerCase().includes(s)
    );
  };

  // Years of service helper
  const yearsOfService = (doj: string): string => {
    if (!doj) return "";
    const ms = Date.now() - new Date(doj).getTime();
    const yrs = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
    const months = Math.floor((ms % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000));
    if (yrs === 0) return `${months} month${months !== 1 ? "s" : ""}`;
    return `${yrs} yr${yrs !== 1 ? "s" : ""} ${months} mo`;
  };

  return { employees, stats, createEmployee, updateEmployee, toggleStatus, search, yearsOfService };
}
