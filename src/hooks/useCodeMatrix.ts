import { useState } from 'react';
import { toast } from 'sonner';
import type { CodeMatrixRule } from '@/types/code-matrix';

const KEY = 'erp_code_matrix_rules';
// [JWT] GET /api/inventory/code-matrix
const load = (): CodeMatrixRule[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function useCodeMatrix() {
  const [rules, setRules] = useState<CodeMatrixRule[]>(load());
  // [JWT] Replace with GET /api/inventory/code-matrix
  const save = (d: CodeMatrixRule[]) => { localStorage.setItem(KEY, JSON.stringify(d)); };

  const generatePreview = (rule: Partial<CodeMatrixRule>): string => {
    const yr = rule.include_year ? (rule.year_format === 'YYYY' ? '2025' : '25') + (rule.separator || '-') : '';
    const seq = String((rule.current_sequence || 1)).padStart(rule.sequence_digits || 5, '0');
    return `${rule.prefix || ''}${rule.separator || '-'}${yr}${seq}${rule.suffix || ''}`;
  };

  const createRule = (r: CodeMatrixRule) => {
    const u = [r, ...rules]; setRules(u); save(u);
    toast.success(`${r.name} created`);
    // [JWT] POST /api/inventory/code-matrix
  };

  const updateRule = (id: string, data: Partial<CodeMatrixRule>) => {
    const u = rules.map(x => x.id === id ? { ...x, ...data, updated_at: new Date().toISOString() } : x);
    setRules(u); save(u);
    // [JWT] PATCH /api/inventory/code-matrix/:id
  };

  const deleteRule = (id: string) => {
    const u = rules.filter(x => x.id !== id); setRules(u); save(u);
    toast.success('Rule deleted');
    // [JWT] DELETE /api/inventory/code-matrix/:id
  };

  return { rules, generatePreview, createRule, updateRule, deleteRule };
}
