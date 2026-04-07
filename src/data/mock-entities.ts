export interface MockEntity {
  id: string;
  name: string;
  shortCode: string; // max 6 chars — prefixes all transaction codes for this entity
  type: 'parent' | 'subsidiary' | 'branch';
}

// [JWT] Replace with: const MOCK_ENTITIES = await fetch('/api/foundation/entities')
export const MOCK_ENTITIES: MockEntity[] = [
  { id: 'e1', name: '4DSmartOps Pvt Ltd',   shortCode: 'SMRT', type: 'parent' },
  { id: 'e2', name: 'SmartOps Digital LLP',  shortCode: 'DGTL', type: 'subsidiary' },
  { id: 'e3', name: '4D Exports SEZ Unit',   shortCode: 'EXPT', type: 'branch' },
];

export const getPrimaryEntity = () =>
  MOCK_ENTITIES.find(e => e.type === 'parent') ?? MOCK_ENTITIES[0];
