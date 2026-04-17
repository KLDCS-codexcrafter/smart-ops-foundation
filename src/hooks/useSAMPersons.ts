/**
 * useSAMPersons.ts — CRUD for SAM Person master
 * [JWT] GET/POST/PUT/DELETE /api/salesx/sam/persons
 * [JWT] GET/POST /api/entities/setup/ledger-definitions
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { SAMPerson, SAMHierarchyLevel, SAMPersonType } from '@/types/sam-person';
import { samPersonsKey, samHierarchyKey, genPersonCode, SAM_GROUP_CODE } from '@/types/sam-person';

// ── internal helpers ──────────────────────────────────────────────────
function loadPersons(entityCode: string): SAMPerson[] {
  try {
    // [JWT] GET /api/salesx/sam/persons?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(samPersonsKey(entityCode)) || '[]');
  } catch { return []; }
}
function savePersons(entityCode: string, data: SAMPerson[]) {
  // [JWT] PUT /api/salesx/sam/persons?entityCode={entityCode}
  localStorage.setItem(samPersonsKey(entityCode), JSON.stringify(data));
}

function getGroupName(code: string): string {
  const m: Record<string, string> = {
    SLSM: 'Sales Man', AGNT: 'Agent', BRKR: 'Broker',
    RCVR: 'Receiver', REFR: 'Reference',
  };
  return m[code] ?? code;
}

function autoCreateLedgerEntry(person: SAMPerson) {
  // [JWT] GET /api/entities/setup/ledger-definitions
  const raw = localStorage.getItem('erp_group_ledger_definitions');
  const existing: Array<{ name: string }> = raw ? JSON.parse(raw) : [];
  if (existing.some(e => e.name.toLowerCase() === person.display_name.toLowerCase())) return;
  const entry = {
    id: person.ledger_id,
    ledgerType: 'creditor_individual',
    name: person.display_name,
    code: person.person_code,
    parentGroupCode: person.parent_group_code,
    parentGroupName: getGroupName(person.parent_group_code),
    alias: person.alias || '',
    entityId: person.entity_id,
    entityShortCode: null,
    status: 'active',
  };
  // [JWT] PUT /api/entities/setup/ledger-definitions
  localStorage.setItem(
    'erp_group_ledger_definitions',
    JSON.stringify([...existing, entry]),
  );
}

// ── main hook ─────────────────────────────────────────────────────────
export function useSAMPersons(entityCode: string) {
  const [persons, setPersons] = useState<SAMPerson[]>(() => loadPersons(entityCode));

  const createPerson = (
    type: SAMPersonType,
    form: Omit<SAMPerson,
      'id' | 'person_code' | 'ledger_id' | 'parent_group_code'
      | 'entity_id' | 'created_at' | 'updated_at' | 'person_type'>,
  ): SAMPerson => {
    const all = loadPersons(entityCode);
    const code = genPersonCode(type, all);
    const now = new Date().toISOString();
    const person: SAMPerson = {
      ...form,
      id: `sam-${Date.now()}`,
      entity_id: entityCode,
      person_type: type,
      person_code: code,
      ledger_id: `led-sam-${Date.now()}`,
      parent_group_code: SAM_GROUP_CODE[type],
      created_at: now,
      updated_at: now,
    };
    const updated = [...all, person];
    setPersons(updated);
    savePersons(entityCode, updated);
    autoCreateLedgerEntry(person);
    toast.success(`${person.display_name} (${code}) created`);
    // [JWT] POST /api/salesx/sam/persons
    return person;
  };

  const updatePerson = (id: string, patch: Partial<SAMPerson>): void => {
    const all = loadPersons(entityCode);
    const updated = all.map(p =>
      p.id === id
        ? { ...p, ...patch, updated_at: new Date().toISOString() }
        : p,
    );
    setPersons(updated);
    savePersons(entityCode, updated);
    toast.success('Saved');
    // [JWT] PATCH /api/salesx/sam/persons/:id
  };

  const deactivatePerson = (id: string): void => {
    updatePerson(id, { is_active: false });
  };

  return { persons, createPerson, updatePerson, deactivatePerson };
}

// ── hierarchy hook ────────────────────────────────────────────────────
function loadHierarchy(entityCode: string): SAMHierarchyLevel[] {
  try {
    // [JWT] GET /api/salesx/sam/hierarchy?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(samHierarchyKey(entityCode)) || '[]');
  } catch { return []; }
}

export function useSAMHierarchy(entityCode: string) {
  const [levels, setLevels] = useState<SAMHierarchyLevel[]>(() => loadHierarchy(entityCode));

  const saveLevel = (form: Omit<SAMHierarchyLevel, 'id' | 'created_at' | 'updated_at'>): void => {
    const all = loadHierarchy(entityCode);
    const now = new Date().toISOString();
    const existing = all.find(l => l.level_number === form.level_number);
    let updated: SAMHierarchyLevel[];
    if (existing) {
      updated = all.map(l =>
        l.level_number === form.level_number
          ? { ...l, ...form, updated_at: now }
          : l,
      );
    } else {
      updated = [...all, {
        ...form,
        id: `hl-${Date.now()}`,
        created_at: now,
        updated_at: now,
      }];
    }
    updated.sort((a, b) => a.level_number - b.level_number);
    setLevels(updated);
    // [JWT] PUT /api/salesx/sam/hierarchy?entityCode={entityCode}
    localStorage.setItem(samHierarchyKey(entityCode), JSON.stringify(updated));
    toast.success('Hierarchy saved');
  };

  const deleteLevel = (level_number: number): void => {
    const updated = loadHierarchy(entityCode).filter(l => l.level_number !== level_number);
    setLevels(updated);
    // [JWT] DELETE /api/salesx/sam/hierarchy/:level_number?entityCode={entityCode}
    localStorage.setItem(samHierarchyKey(entityCode), JSON.stringify(updated));
    toast.success('Level removed');
  };

  return { levels, saveLevel, deleteLevel };
}
