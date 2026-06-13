# W1C-7a Close Summary — T-W1C7a-CC-Config-Seed

**Predecessor HEAD:** `64dced9` · **New HEAD:** `TBD_AT_BANK`
**Arc:** Wave-1 Close · demo-seed sprint 1 of 3 (CC-config foundation)
**Grade target:** A · Tier-L · ZERO new SIBLINGs

## What shipped

| Block | Surface | Outcome |
|---|---|---|
| 1 | `cc-config-seed.ts` writers → `erp_comply360_config_${e}` + sub-configs | Compliance Settings & Automation panel renders populated; `isConfigured('erp_comply360_config')` flips **true** |
| 2 | Auto-send rules `enabled:true` per demo entity via `upsertAutoSendRule` | Demo entities show the two W1C-4 rules active; real entities keep the disabled-by-default seed |
| 3 | `SecurityModule.IntegrationsPanel` reads `erp_integrations_${e}` via `loadIntegrationsForEntity` | Demo → Tally / GST Portal / SMTP **connected**; fresh real entity → ALL **not_configured** (ruling b · honest) |
| 4 | `sprint-history` backfill W1C-6 → `64dced9` + self-seed W1C-7a; 4 test files | Coverage assertion: post-seed all three surfaces populate |

## Schema match (Block 1)

Sub-config writes use the **exact** constants the `ComplianceSettingsAutomation`
component reads/writes via its `.defaults.ts` module — no invented fields:

- `COMPLY360_GROUP_KEY`        ← `{ ...DEFAULT_GROUP_CONFIG, enableAdvancedGST/AutoRCM/AutoTDSPayable/AutoTDSReceivable/DiscountAutoPosting/TaxAuditReport/SAMModule: true }`
- `comply360RCMKey(e)`         ← `{ ...DEFAULT_RCM }`         *(ledger ids blank — honest)*
- `comply360SettlementKey(e)`  ← `{ ...DEFAULT_SETTLEMENT }`
- `comply360OutstandingKey(e)` ← `{ ...DEFAULT_OUTSTANDING }`
- `comply360LCKey(e)`          ← `{ ...DEFAULT_LC }`
- `comply360ConfigKey(e)`      ← `Comply360ConfigSummary` (typed)

**Why ledger fields blank:** fincore demo seed does not pre-create the RCM / LC
ledger ids these point at; fabricating ids would violate the no-fake-config rule.

## Auto-send activation (Block 2)

```ts
const rules = listAutoSendRules(entityCode);
for (const r of rules) {
  if (r.event === 'approval.pending' || r.event === 'digest.my_reminders') {
    if (!r.enabled) upsertAutoSendRule(entityCode, { ...r, enabled: true });
  }
}
```

Engine 0-DIFF. Real entities → `listAutoSendRules('NONDEMO_X')` returns
disabled rules (verified by `auto-send-rules-enabled.test.ts`).

## Integrations before / after (Block 3)

Before: 5 hardcoded literals; 3 always "connected" regardless of entity.
After: shape `{ name, category, status: 'connected' | 'not_configured' | 'disconnected' }`
persisted under `erp_integrations_${e}`. Reader:

```ts
loadIntegrationsForEntity('SMRT')         // 3 connected
loadIntegrationsForEntity('NONDEMO_NEW')  // all not_configured
```

## Demo-vs-real distinction (ruling b)

- Demo entities (`SMRT` · `DGTL` · `EXPT`): governance layer **active**.
- Any other entity: governance keys absent → panels honestly show un-configured.

## Wall integrity

| Wall | Status |
|---|---|
| `ComplianceSettingsAutomation.tsx` | 0-DIFF |
| `auto-send-rules-engine.ts` | 0-DIFF (consumed via upsert) |
| Comply360 engines | 0-DIFF |
| All banked pages | 0-DIFF |

## Triple Gate

- TSC `--noEmit`: PASS
- ESLint `--max-warnings 0`: PASS
- Vitest: 4 new test files, zero failures expected

## Touched files

```
src/lib/cc-config-seed.ts                                   (new)
src/hooks/useDemoSeedLoader.ts                              (extended foundation)
src/features/command-center/modules/SecurityModule.tsx     (integrations read-swap)
src/lib/_institutional/sprint-history.ts                    (W1C-6 backfill + W1C-7a)
src/__tests__/w1c-7a/comply360-config-seed.test.ts          (new)
src/__tests__/w1c-7a/auto-send-rules-enabled.test.ts        (new)
src/__tests__/w1c-7a/integrations-config-driven.test.ts     (new)
src/__tests__/w1c-7a/institutional.test.ts                  (new)
audit_workspace/W1C_7a_close_evidence/close_summary.md      (new)
```
