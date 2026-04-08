/**
 * entity-setup-service.ts — Entity Auto-Setup Engine
 * After saving any entity, creates default ledgers, loads industry L4 groups,
 * and sets up Branch/Division inter-entity ledgers.
 * [JWT] Replace localStorage calls with real API endpoints.
 */
import { MOCK_ENTITIES, type MockEntity } from '@/data/mock-entities';
import { L3_FINANCIAL_GROUPS, L4_INDUSTRY_PACKS } from '@/data/finframe-seed-data';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SetupOptions {
  entityId: string;
  entityName: string;
  shortCode: string;
  entityType: 'parent' | 'subsidiary' | 'branch';
  businessEntity: string;
  industry: string;
  businessActivity: string;
  loadIndustryPack: boolean;
  siblingEntities: MockEntity[];
}

export interface SetupResult {
  ledgersCreated: number;
  l4GroupsCreated: number;
  bdLedgersCreated: number;
  entityRegistered: boolean;
}

interface AnyLedgerDefinition {
  id: string;
  ledgerType: string;
  name: string;
  code: string;
  parentGroupCode: string;
  parentGroupName: string;
  alias: string;
  entityId: string | null;
  entityShortCode: string | null;
  status: 'active' | 'inactive';
  // Cash-specific fields (optional for non-cash types)
  numericCode?: string;
  location?: string;
  cashLimit?: number;
  alertThreshold?: number;
  isMainCash?: boolean;
  voucherSeries?: string;
}

// ── 2.2 Entity Registry ─────────────────────────────────────────────────────

export const registerEntity = (entity: MockEntity): void => {
  const raw = localStorage.getItem('erp_group_entities');
  const all: MockEntity[] = raw ? JSON.parse(raw) : [];
  if (!all.find(e => e.id === entity.id)) {
    all.push(entity);
    localStorage.setItem('erp_group_entities', JSON.stringify(all));
    // [JWT] POST /api/foundation/entities/register
  }
};

// ── 2.3 loadEntities ────────────────────────────────────────────────────────

export const loadEntities = (): MockEntity[] => {
  try {
    const raw = localStorage.getItem('erp_group_entities');
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored.length > 0) return stored;
    }
  } catch { /* ignore */ }
  return MOCK_ENTITIES;
};

// ── Helper: find L3 group name by code ──────────────────────────────────────

const l3Name = (code: string): string => {
  const g = L3_FINANCIAL_GROUPS.find(g => g.code === code);
  return g?.name ?? code;
};

// ── 2.4 Default Ledger Definitions ──────────────────────────────────────────

const createDefaultLedgers = (opts: SetupOptions): number => {
  const isCo = ['Private Limited', 'Public Limited', 'OPC'].includes(opts.businessEntity);
  const isLLP = ['LLP', 'Partnership'].includes(opts.businessEntity);
  const isMfg = opts.businessActivity === 'Manufacturing';
  const isTrade = ['Trading', 'Import / Export', 'Distribution'].includes(opts.businessActivity);
  const isService = ['Services', 'IT Services', 'Consulting'].includes(opts.businessActivity);

  const ledgers: Omit<AnyLedgerDefinition, 'id'>[] = [
    // Cash
    { ledgerType: 'cash', name: 'Cash', code: 'CASH-000001', numericCode: '1203-0001', parentGroupCode: 'CASH', parentGroupName: l3Name('CASH'), alias: 'Cash', entityId: null, entityShortCode: null, location: 'Main Office', cashLimit: 0, alertThreshold: 0, isMainCash: true, voucherSeries: 'CR', status: 'active' },
    // P&L (entity-specific)
    { ledgerType: 'equity', name: 'Profit & Loss A/c', code: `${opts.shortCode}-PL-000001`, parentGroupCode: 'RSRV', parentGroupName: l3Name('RSRV'), alias: 'P&L', entityId: opts.entityId, entityShortCode: opts.shortCode, status: 'active' },
    // GST
    { ledgerType: 'duties_taxes', name: 'CGST', code: 'CGST-000001', parentGroupCode: 'DUTYP', parentGroupName: l3Name('DUTYP'), alias: 'CGST', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'duties_taxes', name: 'SGST', code: 'SGST-000001', parentGroupCode: 'DUTYP', parentGroupName: l3Name('DUTYP'), alias: 'SGST', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'duties_taxes', name: 'IGST', code: 'IGST-000001', parentGroupCode: 'DUTYP', parentGroupName: l3Name('DUTYP'), alias: 'IGST', entityId: null, entityShortCode: null, status: 'active' },
    // TDS
    { ledgerType: 'duties_taxes', name: 'TDS Payable', code: 'TDSP-000001', parentGroupCode: 'TDSP', parentGroupName: l3Name('TDSP'), alias: 'TDS Pay', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'asset', name: 'TDS Receivable', code: 'TDSR-000001', parentGroupCode: 'ADTAX', parentGroupName: l3Name('ADTAX'), alias: 'TDS Rec', entityId: null, entityShortCode: null, status: 'active' },
    // Salary
    { ledgerType: 'liability', name: 'Salary Payable', code: 'SALP-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), alias: 'Sal Pay', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'asset', name: 'Salary Advance', code: 'SALA-000001', parentGroupCode: 'STLA', parentGroupName: l3Name('STLA'), alias: 'Sal Adv', entityId: null, entityShortCode: null, status: 'active' },
    // Advance from Customers
    { ledgerType: 'liability', name: 'Advance from Customers', code: 'AFC-000001', parentGroupCode: 'ADVRC', parentGroupName: l3Name('ADVRC'), alias: 'Adv Rec', entityId: null, entityShortCode: null, status: 'active' },
    // Advance to Suppliers
    { ledgerType: 'asset', name: 'Advance to Suppliers', code: 'ATS-000001', parentGroupCode: 'STLA', parentGroupName: l3Name('STLA'), alias: '', entityId: null, entityShortCode: null, status: 'active' },
    // Suspense
    { ledgerType: 'suspense', name: 'Suspense Account', code: 'SUS-000001', parentGroupCode: 'SUS', parentGroupName: l3Name('SUS'), alias: 'Suspense', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'suspense', name: 'Opening Balance Difference', code: 'OBD-000001', parentGroupCode: 'SUS', parentGroupName: l3Name('SUS'), alias: 'OB Diff', entityId: null, entityShortCode: null, status: 'active' },
    // Expense
    { ledgerType: 'expense', name: 'Rounding Off', code: 'RNDO-000001', parentGroupCode: 'ADMIN', parentGroupName: l3Name('ADMIN'), alias: 'Rounding', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'expense', name: 'Bank Charges', code: 'BKCHG-000001', parentGroupCode: 'BKCHG', parentGroupName: l3Name('BKCHG'), alias: 'Bnk Chrg', entityId: null, entityShortCode: null, status: 'active' },
    // Income
    { ledgerType: 'income', name: 'Sales — Domestic', code: 'SALD-000001', parentGroupCode: 'SALE', parentGroupName: l3Name('SALE'), alias: 'Sales Dom', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'income', name: 'Sales Returns', code: 'SRET-000001', parentGroupCode: 'SRET', parentGroupName: l3Name('SRET'), alias: 'Sal Ret', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'expense', name: 'Purchase — Domestic', code: 'PURCD-000001', parentGroupCode: 'PURCH', parentGroupName: l3Name('PURCH'), alias: 'Purch Dom', entityId: null, entityShortCode: null, status: 'active' },
    { ledgerType: 'expense', name: 'Purchase Returns', code: 'PRET-000001', parentGroupCode: 'PRET', parentGroupName: l3Name('PRET'), alias: 'Purch Ret', entityId: null, entityShortCode: null, status: 'active' },
    // TCS Payable
    { ledgerType: 'duties_taxes', name: 'TCS Payable', code: 'TCSP-000001', parentGroupCode: 'DUTYP', parentGroupName: l3Name('DUTYP'), alias: 'TCS Pay', entityId: null, entityShortCode: null, status: 'active' },
    // Professional Tax Payable
    { ledgerType: 'duties_taxes', name: 'Professional Tax Payable', code: 'PTP-000001', parentGroupCode: 'DUTYP', parentGroupName: l3Name('DUTYP'), alias: 'PT Pay', entityId: null, entityShortCode: null, status: 'active' },
    // PF Payable
    { ledgerType: 'liability', name: 'PF Payable', code: 'PFP-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), alias: 'PF Pay', entityId: null, entityShortCode: null, status: 'active' },
    // ESI Payable
    { ledgerType: 'liability', name: 'ESI Payable', code: 'ESIP-000001', parentGroupCode: 'EMPL', parentGroupName: l3Name('EMPL'), alias: 'ESI Pay', entityId: null, entityShortCode: null, status: 'active' },
    // Retained Earnings
    { ledgerType: 'equity', name: 'Retained Earnings', code: 'RETE-000001', parentGroupCode: 'RSRV', parentGroupName: l3Name('RSRV'), alias: 'Ret Earn', entityId: null, entityShortCode: null, status: 'active' },
    // Security Deposit Paid
    { ledgerType: 'asset', name: 'Security Deposit Paid', code: 'SECDP-000001', parentGroupCode: 'STLA', parentGroupName: l3Name('STLA'), alias: 'Sec Dep', entityId: null, entityShortCode: null, status: 'active' },
  ];

  // Conditional: Service Revenue
  if (isService || isMfg) {
    ledgers.push({ ledgerType: 'income', name: 'Service Revenue', code: 'SERV-000001', parentGroupCode: 'SERV', parentGroupName: l3Name('SERV'), alias: 'Serv Rev', entityId: null, entityShortCode: null, status: 'active' });
  }

  // Capital: Company vs LLP/others
  if (isCo) {
    ledgers.push({ ledgerType: 'capital_equity', name: 'Share Capital', code: `${opts.shortCode}-CAP-000001`, parentGroupCode: 'EQSH', parentGroupName: l3Name('EQSH'), alias: 'Capital', entityId: opts.entityId, entityShortCode: opts.shortCode, status: 'active' });
  } else if (isLLP) {
    ledgers.push({ ledgerType: 'capital_equity', name: "Partners' Capital A/c", code: `${opts.shortCode}-CAP-000001`, parentGroupCode: 'PCAP', parentGroupName: l3Name('PCAP'), alias: 'Capital', entityId: opts.entityId, entityShortCode: opts.shortCode, status: 'active' });
  } else {
    ledgers.push({ ledgerType: 'capital_equity', name: "Proprietor's Capital A/c", code: `${opts.shortCode}-CAP-000001`, parentGroupCode: 'PCAP', parentGroupName: l3Name('PCAP'), alias: 'Capital', entityId: opts.entityId, entityShortCode: opts.shortCode, status: 'active' });
  }

  // Deduplicate against existing
  const raw = localStorage.getItem('erp_group_ledger_definitions');
  const existing: AnyLedgerDefinition[] = raw ? JSON.parse(raw) : [];
  const existingNames = new Set(existing.map(d => d.name.toLowerCase()));

  const toCreate: AnyLedgerDefinition[] = ledgers
    .filter(l => !existingNames.has(l.name.toLowerCase()))
    .map(l => ({ ...l, id: crypto.randomUUID() } as AnyLedgerDefinition));

  const updated = [...existing, ...toCreate];
  localStorage.setItem('erp_group_ledger_definitions', JSON.stringify(updated));
  // [JWT] POST /api/group/finecore/ledger-definitions/bulk

  // Auto-create entity instances for ALL registered entities
  const entities = loadEntities();
  toCreate.forEach(def => {
    entities.forEach(entity => {
      const key = `erp_entity_${entity.id}_ledger_instances`;
      const inst = JSON.parse(localStorage.getItem(key) || '[]');
      if (!inst.find((i: any) => i.ledgerDefinitionId === def.id)) {
        inst.push({
          id: crypto.randomUUID(),
          ledgerDefinitionId: def.id,
          entityId: entity.id,
          entityName: entity.name,
          entityShortCode: entity.shortCode,
          openingBalance: 0,
          openingBalanceType: 'Dr',
          isActive: true,
          displayCode: def.code,
          displayNumericCode: `${entity.shortCode}/${def.numericCode ?? def.code}`,
          currentCustodian: null,
        });
        localStorage.setItem(key, JSON.stringify(inst));
      }
    });
  });

  return toCreate.length;
};

// ── 2.5 loadIndustryPack ────────────────────────────────────────────────────

const loadIndustryPack = (businessActivity: string): number => {
  const packKey = businessActivity === 'Manufacturing' ? 'manufacturing'
    : ['Trading', 'Import / Export', 'Distribution'].includes(businessActivity) ? 'trading'
    : ['Services', 'IT Services', 'Consulting'].includes(businessActivity) ? 'services'
    : null;

  const raw = localStorage.getItem('erp_group_finframe_l4_groups');
  const existing = raw ? JSON.parse(raw) : [];
  const existingNames = new Set(existing.map((g: any) => g.name.toLowerCase()));

  // Always load common pack
  const packs = [
    ...L4_INDUSTRY_PACKS.common,
    ...(packKey ? L4_INDUSTRY_PACKS[packKey] : []),
  ];

  const l3Counters: Record<string, number> = {};
  const toCreate = packs
    .filter(g => !existingNames.has(g.name.toLowerCase()))
    .map(g => {
      const existingCount = existing.filter((e: any) => e.parentL3Code === g.l3Code).length;
      l3Counters[g.l3Code] = (l3Counters[g.l3Code] ?? 0) + 1;
      return {
        id: crypto.randomUUID(),
        name: g.name,
        code: `${g.l3Code}-${String(existingCount + l3Counters[g.l3Code]).padStart(6, '0')}`,
        parentL3Code: g.l3Code,
        parentGroupId: null,
        nature: g.nature,
        gstApplicable: false,
        tdsApplicable: false,
        notes: '',
        status: 'active' as const,
      };
    });

  if (toCreate.length > 0) {
    localStorage.setItem('erp_group_finframe_l4_groups',
      JSON.stringify([...existing, ...toCreate]));
    // [JWT] POST /api/group/finecore/account-groups/bulk
  }
  return toCreate.length;
};

// ── 2.6 createBDLedgers ─────────────────────────────────────────────────────

const createBDLedgers = (opts: SetupOptions): number => {
  if (opts.siblingEntities.length === 0) return 0;

  const raw = localStorage.getItem('erp_group_ledger_definitions');
  const existing: AnyLedgerDefinition[] = raw ? JSON.parse(raw) : [];
  const existingNames = new Set(existing.map(d => d.name.toLowerCase()));

  const toCreate: AnyLedgerDefinition[] = [];

  opts.siblingEntities.forEach((sibling) => {
    // Count existing BD ledgers for this entity to avoid code collision
    const existingBDCountForThis = existing.filter(
      d => d.ledgerType === 'branch_division' && d.entityShortCode === opts.shortCode
    ).length + toCreate.filter(d => d.entityShortCode === opts.shortCode).length;

    // In THIS entity's books: create a ledger for the sibling
    const nameInThis = `${sibling.name} A/c`;
    if (!existingNames.has(nameInThis.toLowerCase())) {
      toCreate.push({
        id: crypto.randomUUID(),
        ledgerType: 'branch_division',
        name: nameInThis,
        code: `${opts.shortCode}-BD-${String(existingBDCountForThis + 1).padStart(6, '0')}`,
        parentGroupCode: 'BD',
        parentGroupName: 'Branch & Division Accounts',
        alias: sibling.shortCode,
        entityId: opts.entityId,
        entityShortCode: opts.shortCode,
        status: 'active',
      });
    }

    // In THE SIBLING's books: create a ledger for this new entity
    const nameInSibling = `${opts.entityName} A/c`;
    const sibRaw = localStorage.getItem('erp_group_ledger_definitions');
    const sibExisting: AnyLedgerDefinition[] = sibRaw ? JSON.parse(sibRaw) : [];
    const sibNames = new Set(sibExisting.map(d => d.name.toLowerCase()));
    if (!sibNames.has(nameInSibling.toLowerCase())) {
      toCreate.push({
        id: crypto.randomUUID(),
        ledgerType: 'branch_division',
        name: nameInSibling,
        code: `${sibling.shortCode}-BD-${String(
          sibExisting.filter(d => d.ledgerType === 'branch_division' && d.entityShortCode === sibling.shortCode).length + 1
        ).padStart(6, '0')}`,
        parentGroupCode: 'BD',
        parentGroupName: 'Branch & Division Accounts',
        alias: opts.shortCode,
        entityId: sibling.id,
        entityShortCode: sibling.shortCode,
        status: 'active',
      });
    }
  });

  if (toCreate.length > 0) {
    const allRaw = localStorage.getItem('erp_group_ledger_definitions');
    const all = allRaw ? JSON.parse(allRaw) : [];
    localStorage.setItem('erp_group_ledger_definitions',
      JSON.stringify([...all, ...toCreate]));
    // [JWT] POST /api/group/finecore/ledger-definitions/bulk
  }
  return opts.siblingEntities.length;
};

// ── 2.7 runEntitySetup — main export ────────────────────────────────────────

export const runEntitySetup = (opts: SetupOptions): SetupResult => {
  // 1. Register entity in the entity registry
  registerEntity({
    id: opts.entityId,
    name: opts.entityName,
    shortCode: opts.shortCode,
    type: opts.entityType,
  });

  // 2. Create default ledgers (+ auto-create instances for all entities)
  const ledgersCreated = createDefaultLedgers(opts);

  // 3. Load industry L4 groups into FinFrame
  const l4GroupsCreated = opts.loadIndustryPack ? loadIndustryPack(opts.businessActivity) : 0;

  // 4. Create Branch/Division inter-entity ledgers
  const bdLedgersCreated = createBDLedgers(opts);

  return { ledgersCreated, l4GroupsCreated, bdLedgersCreated, entityRegistered: true };
};
