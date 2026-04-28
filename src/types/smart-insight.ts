/**
 * smart-insight.ts — AI-style narrative insights · Canvas Wave 6 (T-Phase-1.1.1j)
 * [JWT] GET /api/salesx/smart-insights
 *
 * Phase 1 generates these via heuristic rules over localStorage data.
 * Phase 2 will replace generators with real LLM calls (Anthropic API).
 */

export type InsightCategory =
  | 'campaign'
  | 'lead'
  | 'telecaller'
  | 'capacity'
  | 'quality'
  | 'pipeline';

export const INSIGHT_CATEGORY_LABELS: Record<InsightCategory, string> = {
  campaign:    'Campaign Performance',
  lead:        'Lead Aggregation',
  telecaller:  'Telecaller Performance',
  capacity:    'Distribution Capacity',
  quality:     'Call Quality',
  pipeline:    'Sales Pipeline',
};

export type InsightSeverity = 'positive' | 'neutral' | 'warning' | 'critical';

export const INSIGHT_SEVERITY_COLORS: Record<InsightSeverity, string> = {
  positive: 'bg-green-500/15 text-green-700 border-green-500/30',
  neutral:  'bg-blue-500/15 text-blue-700 border-blue-500/30',
  warning:  'bg-amber-500/15 text-amber-700 border-amber-500/30',
  critical: 'bg-red-500/15 text-red-700 border-red-500/30',
};

export interface SmartInsight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  narrative: string;
  recommendation: string | null;
  metric_value: number | null;
  metric_label: string | null;
  related_entity_id: string | null;
  related_entity_type: string | null;
  generated_at: string;
}
