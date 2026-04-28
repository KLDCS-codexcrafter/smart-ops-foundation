/**
 * useLeadDistribution.ts — Lead distribution config + capacity + assignment engine
 * [JWT] /api/salesx/lead-distribution
 */
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type {
  DistributionConfig, TelecallerCapacity, DistributionLog, DistributionStrategy,
} from '@/types/lead-distribution';
import {
  distributionConfigKey, telecallerCapacitiesKey, distributionLogsKey,
} from '@/types/lead-distribution';

function ls<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) || '[]') as T[]; }
  catch { return []; }
}

function lsObj<T>(k: string, def: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) as T : def;
  } catch { return def; }
}

export function useLeadDistribution(entityCode: string) {
  const cKey = distributionConfigKey(entityCode);
  const capKey = telecallerCapacitiesKey(entityCode);
  const logKey = distributionLogsKey(entityCode);

  const defaultConfig: DistributionConfig = useMemo(() => ({
    id: `dc-${entityCode}`,
    entity_id: entityCode,
    strategy: 'round_robin',
    rotation_cursor: 0,
    weights: {},
    skills: {},
    auto_redistribute_enabled: false,
    redistribute_when_overcap_pct: 110,
    last_distributed_at: null,
    last_distributed_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }), [entityCode]);

  const [config, setConfig] = useState<DistributionConfig>(() => lsObj(cKey, defaultConfig));
  const [capacities, setCapacities] = useState<TelecallerCapacity[]>(() => ls<TelecallerCapacity>(capKey));
  const [logs, setLogs] = useState<DistributionLog[]>(() => ls<DistributionLog>(logKey));

  const persistConfig = useCallback((next: DistributionConfig) => {
    // [JWT] PUT /api/salesx/lead-distribution/config
    localStorage.setItem(cKey, JSON.stringify(next));
    setConfig(next);
  }, [cKey]);

  const persistCapacities = useCallback((next: TelecallerCapacity[]) => {
    // [JWT] PUT /api/salesx/lead-distribution/capacities
    localStorage.setItem(capKey, JSON.stringify(next));
    setCapacities(next);
  }, [capKey]);

  const persistLogs = useCallback((next: DistributionLog[]) => {
    // [JWT] PUT /api/salesx/lead-distribution/logs
    localStorage.setItem(logKey, JSON.stringify(next));
    setLogs(next);
  }, [logKey]);

  const updateConfig = useCallback((patch: Partial<DistributionConfig>) => {
    const updated = { ...config, ...patch, updated_at: new Date().toISOString() };
    persistConfig(updated);
  }, [config, persistConfig]);

  const saveCapacity = useCallback((
    data: Omit<TelecallerCapacity, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  ) => {
    const now = new Date().toISOString();
    const list = ls<TelecallerCapacity>(capKey);
    if (data.id) {
      const idx = list.findIndex(c => c.id === data.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
    } else {
      list.push({ ...data, id: `cap-${Date.now()}`, created_at: now, updated_at: now });
    }
    persistCapacities(list);
    return list;
  }, [capKey, persistCapacities]);

  const deleteCapacity = useCallback((id: string) => {
    persistCapacities(ls<TelecallerCapacity>(capKey).filter(c => c.id !== id));
  }, [capKey, persistCapacities]);

  const pickNextTelecaller = useCallback((
    leadProductInterest?: string | null,
  ): { telecallerId: string; telecallerName: string; reason: string } | null => {
    const eligible = ls<TelecallerCapacity>(capKey).filter(c => c.active && c.current_daily_load < c.daily_capacity);
    if (eligible.length === 0) return null;
    const cfg = lsObj<DistributionConfig>(cKey, defaultConfig);

    if (cfg.strategy === 'round_robin') {
      const cursor = cfg.rotation_cursor % eligible.length;
      const picked = eligible[cursor];
      persistConfig({ ...cfg, rotation_cursor: cursor + 1, updated_at: new Date().toISOString() });
      return { telecallerId: picked.telecaller_id, telecallerName: picked.telecaller_name,
               reason: `Round-robin position ${cursor + 1}/${eligible.length}` };
    }

    if (cfg.strategy === 'weighted') {
      const weighted = eligible.map(c => ({
        ...c, w: cfg.weights[c.telecaller_id] ?? 1,
      }));
      const totalW = weighted.reduce((s, x) => s + x.w, 0);
      if (totalW === 0) return null;
      let rand = Math.random() * totalW;
      for (const c of weighted) {
        rand -= c.w;
        if (rand <= 0) {
          return { telecallerId: c.telecaller_id, telecallerName: c.telecaller_name,
                   reason: `Weighted (w=${c.w}/${totalW})` };
        }
      }
      const fallback = weighted[0];
      return { telecallerId: fallback.telecaller_id, telecallerName: fallback.telecaller_name,
               reason: 'Weighted fallback' };
    }

    if (cfg.strategy === 'skill_based' && leadProductInterest) {
      const lead_kw = leadProductInterest.toLowerCase();
      const matched = eligible.filter(c => {
        const skills = cfg.skills[c.telecaller_id] ?? c.product_skills ?? [];
        return skills.some(s => lead_kw.includes(s.toLowerCase()));
      });
      if (matched.length > 0) {
        const picked = [...matched].sort((a, b) => a.utilisation_pct - b.utilisation_pct)[0];
        return { telecallerId: picked.telecaller_id, telecallerName: picked.telecaller_name,
                 reason: `Skill match · load ${picked.utilisation_pct.toFixed(0)}%` };
      }
    }

    if (cfg.strategy === 'manual') {
      return null;
    }

    const cursor = cfg.rotation_cursor % eligible.length;
    const picked = eligible[cursor];
    persistConfig({ ...cfg, rotation_cursor: cursor + 1, updated_at: new Date().toISOString() });
    return { telecallerId: picked.telecaller_id, telecallerName: picked.telecaller_name,
             reason: `Fallback to round-robin (no skill match)` };
  }, [capKey, cKey, defaultConfig, persistConfig]);

  const distributeLead = useCallback((
    leadId: string, leadNo: string, productInterest?: string | null,
  ): DistributionLog | null => {
    const pick = pickNextTelecaller(productInterest);
    if (!pick) {
      toast.error('No eligible telecaller found (all at capacity or strategy is manual)');
      return null;
    }
    const cfg = lsObj<DistributionConfig>(cKey, defaultConfig);
    const now = new Date().toISOString();
    const log: DistributionLog = {
      id: `dl-${Date.now()}`,
      entity_id: entityCode,
      distributed_at: now,
      strategy: cfg.strategy,
      lead_id: leadId, lead_no: leadNo,
      assigned_telecaller_id: pick.telecallerId,
      assigned_telecaller_name: pick.telecallerName,
      reason: pick.reason,
      created_at: now,
    };
    persistLogs([...ls<DistributionLog>(logKey), log]);
    const capList = ls<TelecallerCapacity>(capKey).map(c =>
      c.telecaller_id === pick.telecallerId
        ? { ...c, current_daily_load: c.current_daily_load + 1,
            current_weekly_load: c.current_weekly_load + 1,
            utilisation_pct: ((c.current_daily_load + 1) / c.daily_capacity) * 100,
            updated_at: now }
        : c,
    );
    persistCapacities(capList);
    persistConfig({ ...cfg, last_distributed_at: now,
      last_distributed_by: 'supervisor', updated_at: now });
    toast.success(`Assigned to ${pick.telecallerName}`);
    return log;
  }, [pickNextTelecaller, cKey, capKey, logKey, entityCode, defaultConfig,
      persistLogs, persistCapacities, persistConfig]);

  const autoRedistribute = useCallback(() => {
    const capList = ls<TelecallerCapacity>(capKey);
    const cfg = lsObj<DistributionConfig>(cKey, defaultConfig);
    const overCap = capList.filter(c => c.active && c.utilisation_pct >= cfg.redistribute_when_overcap_pct);
    if (overCap.length === 0) {
      toast.info('All agents within capacity — no redistribution needed');
      return 0;
    }
    const now = new Date().toISOString();
    const updated = capList.map(c => {
      if (overCap.find(o => o.id === c.id)) {
        const targetLoad = Math.floor(c.daily_capacity * 0.85);
        return {
          ...c,
          current_daily_load: targetLoad,
          utilisation_pct: (targetLoad / c.daily_capacity) * 100,
          updated_at: now,
        };
      }
      return c;
    });
    persistCapacities(updated);
    toast.success(`Rebalanced ${overCap.length} over-capacity agent(s)`);
    return overCap.length;
  }, [capKey, cKey, defaultConfig, persistCapacities]);

  const setStrategy = useCallback((strategy: DistributionStrategy) => {
    updateConfig({ strategy });
  }, [updateConfig]);

  const stats = useMemo(() => ({
    totalAgents: capacities.length,
    activeAgents: capacities.filter(c => c.active).length,
    overCapAgents: capacities.filter(c => c.utilisation_pct >= config.redistribute_when_overcap_pct).length,
    avgUtilisation: capacities.length > 0
      ? Math.round(capacities.reduce((s, c) => s + c.utilisation_pct, 0) / capacities.length)
      : 0,
  }), [capacities, config.redistribute_when_overcap_pct]);

  return {
    config, capacities, logs, stats,
    updateConfig, setStrategy,
    saveCapacity, deleteCapacity,
    pickNextTelecaller, distributeLead, autoRedistribute,
  };
}
