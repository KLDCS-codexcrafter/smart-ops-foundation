/**
 * insight-generators.ts — Heuristic insight generators · Phase 1
 * [Phase 2: replaced with real LLM calls]
 */
import type { SmartInsight, InsightSeverity } from '@/types/smart-insight';
import type { Campaign } from '@/types/campaign';
import type { Lead } from '@/types/lead';
import type { CallSession } from '@/types/call-session';
import type { AgentProfile } from '@/types/gamification';
import type { TelecallerCapacity } from '@/types/lead-distribution';
import type { CallReview } from '@/types/call-quality';
import { LEAD_PLATFORM_LABELS } from '@/types/lead';

function mkInsight(
  partial: Omit<SmartInsight, 'id' | 'generated_at'>,
): SmartInsight {
  return {
    ...partial,
    id: `ins-${Math.random().toString(36).slice(2, 10)}`,
    generated_at: new Date().toISOString(),
  };
}

// Campaign insights ───────────────────────────────────────────────────
export function generateCampaignInsights(campaigns: Campaign[]): SmartInsight[] {
  const out: SmartInsight[] = [];
  if (campaigns.length === 0) {
    out.push(mkInsight({
      category: 'campaign', severity: 'warning',
      title: 'No campaigns recorded',
      narrative: 'There are no campaigns in the system yet. Without campaign tracking, source attribution and ROI analysis are not possible.',
      recommendation: 'Create at least one campaign in Campaign Master to start tracking marketing spend and conversions.',
      metric_value: 0, metric_label: 'campaigns',
      related_entity_id: null, related_entity_type: null,
    }));
    return out;
  }
  // Best ROI campaign
  const withMetrics = campaigns.filter(c => c.performance_metrics && (c.budget_breakdown?.actual_spent ?? 0) > 0);
  if (withMetrics.length > 0) {
    const sorted = [...withMetrics].sort((a, b) =>
      (b.performance_metrics?.roi_pct ?? 0) - (a.performance_metrics?.roi_pct ?? 0));
    const best = sorted[0];
    const bestSpent = best.budget_breakdown?.actual_spent ?? 0;
    if (best.performance_metrics) {
      const roi = best.performance_metrics.roi_pct;
      out.push(mkInsight({
        category: 'campaign',
        severity: roi > 50 ? 'positive' : roi > 0 ? 'neutral' : 'warning',
        title: `Top campaign: ${best.campaign_name}`,
        narrative: `${best.campaign_name} generated an ROI of ${roi.toFixed(0)}% with ₹${bestSpent.toLocaleString('en-IN')} spent. Order conversion stands at ${best.performance_metrics.order_conversion_rate.toFixed(1)}%.`,
        recommendation: roi > 50
          ? 'Consider increasing budget for similar campaign types in the next quarter.'
          : 'Review channel mix and target audience to improve ROI.',
        metric_value: roi, metric_label: '%',
        related_entity_id: best.id, related_entity_type: 'campaign',
      }));
    }
    // Worst ROI campaign
    if (sorted.length > 1) {
      const worst = sorted[sorted.length - 1];
      const worstSpent = worst.budget_breakdown?.actual_spent ?? 0;
      if (worst.performance_metrics && worst.performance_metrics.roi_pct < 0) {
        out.push(mkInsight({
          category: 'campaign', severity: 'critical',
          title: `Loss-making campaign: ${worst.campaign_name}`,
          narrative: `${worst.campaign_name} returned ${worst.performance_metrics.roi_pct.toFixed(0)}% ROI on ₹${worstSpent.toLocaleString('en-IN')} spend. Cost per enquiry was ₹${worst.performance_metrics.cost_per_enquiry.toFixed(0)}.`,
          recommendation: 'Pause this campaign or pivot the channel/messaging strategy.',
          metric_value: worst.performance_metrics.roi_pct,
          metric_label: '% ROI',
          related_entity_id: worst.id, related_entity_type: 'campaign',
        }));
      }
    }
  }
  // Channel concentration
  const channelMap = new Map<string, number>();
  campaigns.forEach(c => {
    c.communication_channels?.forEach(ch => channelMap.set(ch, (channelMap.get(ch) ?? 0) + 1));
  });
  if (channelMap.size > 0) {
    const total = [...channelMap.values()].reduce((s, x) => s + x, 0);
    const sortedCh = [...channelMap.entries()].sort((a, b) => b[1] - a[1]);
    const top = sortedCh[0];
    const topPct = Math.round((top[1] / total) * 100);
    if (topPct > 60) {
      out.push(mkInsight({
        category: 'campaign', severity: 'warning',
        title: 'Channel concentration risk',
        narrative: `${topPct}% of campaigns use ${top[0]} as the primary channel. Heavy concentration on a single channel exposes the funnel to platform-specific risks.`,
        recommendation: 'Diversify across at least 3 channels with no single channel exceeding 50% of campaigns.',
        metric_value: topPct, metric_label: '%',
        related_entity_id: null, related_entity_type: null,
      }));
    }
  }
  return out;
}

// Lead insights ───────────────────────────────────────────────────────
export function generateLeadInsights(leads: Lead[]): SmartInsight[] {
  const out: SmartInsight[] = [];
  if (leads.length === 0) return out;
  const platformMap = new Map<string, { total: number; converted: number; duplicate: number }>();
  leads.forEach(l => {
    const cur = platformMap.get(l.platform) ?? { total: 0, converted: 0, duplicate: 0 };
    cur.total++;
    if (l.status === 'converted') cur.converted++;
    if (l.is_duplicate) cur.duplicate++;
    platformMap.set(l.platform, cur);
  });
  const arr = [...platformMap.entries()].map(([p, s]) => ({
    platform: p, ...s, conv_rate: s.total > 0 ? (s.converted / s.total) * 100 : 0,
    dup_rate: s.total > 0 ? (s.duplicate / s.total) * 100 : 0,
  }));
  const eligible = arr.filter(x => x.total >= 3);
  if (eligible.length > 0) {
    const best = [...eligible].sort((a, b) => b.conv_rate - a.conv_rate)[0];
    if (best.conv_rate > 0) {
      const lbl = LEAD_PLATFORM_LABELS[best.platform as keyof typeof LEAD_PLATFORM_LABELS] ?? best.platform;
      out.push(mkInsight({
        category: 'lead',
        severity: best.conv_rate > 30 ? 'positive' : best.conv_rate > 10 ? 'neutral' : 'warning',
        title: `${lbl}: ${best.conv_rate.toFixed(0)}% conversion`,
        narrative: `${best.total} leads sourced from ${lbl}, of which ${best.converted} converted to enquiries (${best.conv_rate.toFixed(1)}%). This is the strongest source in the current dataset.`,
        recommendation: best.conv_rate > 30
          ? 'Increase budget allocation toward this platform.'
          : null,
        metric_value: best.conv_rate, metric_label: '%',
        related_entity_id: best.platform, related_entity_type: 'lead_platform',
      }));
    }
  }
  const dupHeavy = arr.filter(x => x.total >= 3 && x.dup_rate > 25);
  if (dupHeavy.length > 0) {
    const w = dupHeavy[0];
    const lbl = LEAD_PLATFORM_LABELS[w.platform as keyof typeof LEAD_PLATFORM_LABELS] ?? w.platform;
    out.push(mkInsight({
      category: 'lead', severity: 'warning',
      title: `High duplicate rate from ${lbl}`,
      narrative: `${w.dup_rate.toFixed(0)}% of leads from this platform are duplicates of existing entries. Wasted SDR time and inflated marketing-source attribution result.`,
      recommendation: 'Tune dedup rules or audit the platform integration for repeat-submission bugs.',
      metric_value: w.dup_rate, metric_label: '%',
      related_entity_id: w.platform, related_entity_type: 'lead_platform',
    }));
  }
  return out;
}

// Telecaller / gamification insights ──────────────────────────────────
export function generateTelecallerInsights(
  profiles: AgentProfile[], sessions: CallSession[],
): SmartInsight[] {
  const out: SmartInsight[] = [];
  if (profiles.length === 0) return out;
  const sorted = [...profiles].sort((a, b) => b.total_points - a.total_points);
  const top = sorted[0];
  out.push(mkInsight({
    category: 'telecaller', severity: 'positive',
    title: `Top performer: ${top.telecaller_name}`,
    narrative: `${top.telecaller_name} is at level ${top.level} with ${top.total_points} points, ${top.lifetime_calls} lifetime calls, and ${top.lifetime_conversions} conversions. Current streak: ${top.current_streak_days} days.`,
    recommendation: 'Recognize publicly in next team meeting and capture their playbook for sharing.',
    metric_value: top.total_points, metric_label: 'pts',
    related_entity_id: top.telecaller_id, related_entity_type: 'telecaller',
  }));
  const withCalls = profiles.filter(p => p.lifetime_calls >= 10);
  if (withCalls.length >= 2) {
    const ranked = [...withCalls].sort((a, b) =>
      (b.lifetime_conversions / b.lifetime_calls) - (a.lifetime_conversions / a.lifetime_calls));
    const bestRate = ranked[0].lifetime_conversions / ranked[0].lifetime_calls;
    const worstRate = ranked[ranked.length - 1].lifetime_conversions / ranked[ranked.length - 1].lifetime_calls;
    const gap = (bestRate - worstRate) * 100;
    if (gap > 10) {
      out.push(mkInsight({
        category: 'telecaller', severity: 'warning',
        title: `Conversion gap: ${gap.toFixed(0)}% spread`,
        narrative: `${ranked[0].telecaller_name} converts ${(bestRate * 100).toFixed(0)}% of calls while ${ranked[ranked.length - 1].telecaller_name} converts only ${(worstRate * 100).toFixed(0)}%. A 10%+ spread typically indicates a coachable skill gap rather than territory difficulty.`,
        recommendation: 'Schedule 1-on-1 coaching session and pair the lower performer with the top performer for 5 shadow calls.',
        metric_value: gap, metric_label: '%',
        related_entity_id: ranked[ranked.length - 1].telecaller_id,
        related_entity_type: 'telecaller',
      }));
    }
  }
  const last24h = sessions.filter(s =>
    new Date(s.created_at).getTime() > Date.now() - 86400000);
  if (last24h.length === 0) {
    out.push(mkInsight({
      category: 'telecaller', severity: 'critical',
      title: 'No calls in last 24 hours',
      narrative: 'Zero call sessions have been logged in the last 24 hours. Either the team is offline or session-logging discipline has slipped.',
      recommendation: 'Confirm team presence and verify the Call Screen save flow is working.',
      metric_value: 0, metric_label: 'calls',
      related_entity_id: null, related_entity_type: null,
    }));
  }
  return out;
}

// Capacity insights ───────────────────────────────────────────────────
export function generateCapacityInsights(capacities: TelecallerCapacity[]): SmartInsight[] {
  const out: SmartInsight[] = [];
  if (capacities.length === 0) return out;
  const overCap = capacities.filter(c => c.active && c.utilisation_pct >= 100);
  const underUsed = capacities.filter(c => c.active && c.utilisation_pct < 30);
  const avgUtil = capacities.reduce((s, c) => s + c.utilisation_pct, 0) / capacities.length;
  if (overCap.length > 0) {
    out.push(mkInsight({
      category: 'capacity', severity: 'critical',
      title: `${overCap.length} agent(s) over capacity`,
      narrative: `${overCap.map(c => c.telecaller_name).join(', ')} ${overCap.length > 1 ? 'are' : 'is'} at or above 100% daily capacity. Overload increases burnout risk and hurts call quality.`,
      recommendation: 'Trigger auto-redistribute in Lead Distribution Hub or raise their daily capacity if sustainable.',
      metric_value: overCap.length, metric_label: 'agents',
      related_entity_id: null, related_entity_type: null,
    }));
  }
  if (underUsed.length > 0 && avgUtil < 60) {
    out.push(mkInsight({
      category: 'capacity', severity: 'neutral',
      title: 'Spare capacity available',
      narrative: `${underUsed.length} agent(s) running below 30% utilisation. Average team utilisation is ${avgUtil.toFixed(0)}%. There is room to push more leads into the funnel without hiring.`,
      recommendation: 'Increase outbound calling targets or redirect more leads from passive sources to the underused agents.',
      metric_value: avgUtil, metric_label: '%',
      related_entity_id: null, related_entity_type: null,
    }));
  }
  return out;
}

// Quality insights ────────────────────────────────────────────────────
export function generateQualityInsights(reviews: CallReview[]): SmartInsight[] {
  const out: SmartInsight[] = [];
  if (reviews.length === 0) return out;
  const completed = reviews.filter(r => r.status === 'completed');
  if (completed.length === 0) return out;
  const avgScore = completed.reduce((s, r) => s + r.total_score, 0) / completed.length;
  const sev: InsightSeverity = avgScore >= 80 ? 'positive' : avgScore >= 60 ? 'neutral' : 'warning';
  out.push(mkInsight({
    category: 'quality', severity: sev,
    title: `Average call quality: ${avgScore.toFixed(0)}/100`,
    narrative: `${completed.length} call(s) reviewed with an average weighted score of ${avgScore.toFixed(1)}. ${avgScore >= 80 ? 'Strong overall.' : avgScore >= 60 ? 'Acceptable but room to grow.' : 'Below acceptable threshold.'}`,
    recommendation: avgScore < 70 ? 'Identify the lowest-weighted criteria and run targeted coaching.' : null,
    metric_value: avgScore, metric_label: '/100',
    related_entity_id: null, related_entity_type: null,
  }));
  const critScores = new Map<string, { sum: number; count: number; name: string }>();
  completed.forEach(r => {
    r.scores.forEach(s => {
      const cur = critScores.get(s.criterion_code) ?? { sum: 0, count: 0, name: s.criterion_name };
      cur.sum += s.score; cur.count++;
      critScores.set(s.criterion_code, cur);
    });
  });
  if (critScores.size > 0) {
    const arr = [...critScores.entries()].map(([code, v]) => ({
      code, name: v.name, avg: v.sum / v.count,
    }));
    const weakest = arr.sort((a, b) => a.avg - b.avg)[0];
    if (weakest.avg < 75) {
      out.push(mkInsight({
        category: 'quality', severity: 'warning',
        title: `Weakest area: ${weakest.name}`,
        narrative: `Across ${completed.length} reviews, "${weakest.name}" averaged ${weakest.avg.toFixed(0)}/100 — the lowest among all criteria. This is a team-wide skill gap, not an individual issue.`,
        recommendation: 'Run a 30-min team training session focused on this single criterion.',
        metric_value: weakest.avg, metric_label: '/100',
        related_entity_id: weakest.code, related_entity_type: 'quality_criterion',
      }));
    }
  }
  return out;
}

// Master generator ────────────────────────────────────────────────────
export function generateAllInsights(data: {
  campaigns: Campaign[];
  leads: Lead[];
  profiles: AgentProfile[];
  sessions: CallSession[];
  capacities: TelecallerCapacity[];
  reviews: CallReview[];
}): SmartInsight[] {
  return [
    ...generateCampaignInsights(data.campaigns),
    ...generateLeadInsights(data.leads),
    ...generateTelecallerInsights(data.profiles, data.sessions),
    ...generateCapacityInsights(data.capacities),
    ...generateQualityInsights(data.reviews),
  ];
}
