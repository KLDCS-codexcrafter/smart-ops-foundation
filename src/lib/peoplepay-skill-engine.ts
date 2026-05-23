/**
 * @file        src/lib/peoplepay-skill-engine.ts
 * @sprint      T-Phase-3.PROD-1 · ST9 · PROD-LEAK-12 · Q-LOCK-12
 * @purpose     PeoplePay operator-skill master + PO-release skill match check.
 *              Advisory pattern · non-blocking (matches BOM shortage ratified in ST2).
 * @[JWT]       GET/PUT /api/peoplepay/operator-skills/:entityCode
 */
import type { ProductionOrder } from '@/types/production-order';

export interface OperatorSkill {
  id: string;
  operator_id: string;
  operator_name: string;
  skill_codes: string[];
  certified_machines: string[];
  certification_expiry: string | null;
}

export interface SkillOperationMapping {
  id: string;
  operation_name: string;
  required_skill_codes: string[];
  machine_compatibility: string[];
}

export interface SkillWarning {
  operator_id: string;
  operator_name: string;
  required_skill: string;
  has_skill: boolean;
  machine_id: string;
  is_certified: boolean;
}

export interface SkillMatchCheckResult {
  warnings: SkillWarning[];
}

export const operatorSkillsKey = (entityCode: string): string =>
  `erp_operator_skills_${entityCode}`;

export const skillOperationMappingKey = (entityCode: string): string =>
  `erp_skill_operation_mapping_${entityCode}`;

function lsRead<T>(key: string, fallback: T): T {
  try {
    // [JWT] GET /api/* (engine-side)
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite(key: string, value: unknown): void {
  try {
    // [JWT] POST/PUT /api/*
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function getOperatorSkills(entityCode: string): OperatorSkill[] {
  return lsRead<OperatorSkill[]>(operatorSkillsKey(entityCode), []);
}

export function setOperatorSkills(entityCode: string, skills: OperatorSkill[]): void {
  lsWrite(operatorSkillsKey(entityCode), skills);
}

export function getSkillOperationMappings(entityCode: string): SkillOperationMapping[] {
  return lsRead<SkillOperationMapping[]>(skillOperationMappingKey(entityCode), []);
}

export function setSkillOperationMappings(
  entityCode: string,
  mappings: SkillOperationMapping[],
): void {
  lsWrite(skillOperationMappingKey(entityCode), mappings);
}

/**
 * Advisory skill match check at PO release. Non-blocking · returns warnings only.
 * Q-LOCK-3 advisory pattern · matches BOM shortage gate from ST2.
 */
export function checkSkillMatchAtPORelease(
  po: ProductionOrder,
  entityCode: string,
): SkillMatchCheckResult {
  const skills = getOperatorSkills(entityCode);
  const mappings = getSkillOperationMappings(entityCode);
  const warnings: SkillWarning[] = [];

  // Department-based operation inference · use department_name as operation_name
  const operationName = (po.department_name ?? '').toLowerCase();
  const mapping = mappings.find(m => m.operation_name.toLowerCase() === operationName);
  if (!mapping) return { warnings };

  // For each required skill · ensure at least one operator covers it
  for (const required of mapping.required_skill_codes) {
    const operatorsWithSkill = skills.filter(s => s.skill_codes.includes(required));
    if (operatorsWithSkill.length === 0) {
      warnings.push({
        operator_id: '',
        operator_name: '(no operator)',
        required_skill: required,
        has_skill: false,
        machine_id: '',
        is_certified: false,
      });
      continue;
    }
    // For each compatible machine · ensure at least one operator is certified
    for (const machineId of mapping.machine_compatibility) {
      const certified = operatorsWithSkill.find(o => o.certified_machines.includes(machineId));
      if (!certified) {
        const first = operatorsWithSkill[0];
        warnings.push({
          operator_id: first.operator_id,
          operator_name: first.operator_name,
          required_skill: required,
          has_skill: true,
          machine_id: machineId,
          is_certified: false,
        });
      }
    }
  }

  return { warnings };
}
