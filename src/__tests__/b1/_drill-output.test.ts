import { describe, it, beforeEach } from 'vitest';
import { seedAbdosGroup } from '@/data/demo-abdos-group';
import { listGroupStructure } from '@/lib/intercompany-group-structure-engine';
import { listICTransactions } from '@/lib/intercompany-transaction-engine';
import { consolidate, buildConsolidatedPnL, getConsolidationSummary } from '@/lib/group-consolidation-engine';

describe('B1 drill output (for close summary)', () => {
  beforeEach(() => localStorage.clear());
  it('prints consolidate() output', () => {
    const r = seedAbdosGroup();
    console.log('SEED_RESULT', JSON.stringify(r));
    console.log('STRUCTURE', JSON.stringify(listGroupStructure().map(n => ({
      e: n.entity_id, rel: n.relationship, pct: n.ownership_pct, m: n.consolidation_method,
    }))));
    console.log('IC_TXNS', JSON.stringify(listICTransactions().map(t => ({
      t: t.txn_type, f: t.from_entity, to: t.to_entity, amt: t.amount, s: t.status,
    }))));
    const c = consolidate({ fy: '2024-25' });
    console.log('CONSOLIDATE', JSON.stringify({
      fy: c.fy, entity_count: c.entity_count, eliminations_applied: c.eliminations_applied,
      balanced: c.balanced, line_count: c.lines.length,
    }));
    console.log('SUMMARY', JSON.stringify(getConsolidationSummary('2024-25')));
    const pnl = buildConsolidatedPnL({ fy: '2024-25' });
    console.log('PNL', JSON.stringify({
      revenue: pnl.revenue, cogs: pnl.cogs, gross_profit: pnl.gross_profit,
      expenses: pnl.expenses, operating_profit: pnl.operating_profit, pbt: pnl.profit_before_tax,
    }));
  });
});
