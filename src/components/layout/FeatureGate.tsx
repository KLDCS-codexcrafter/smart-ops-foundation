/**
 * FeatureGate.tsx — Conditionally render based on plan tier.
 * Usage:
 *   <FeatureGate feature='voice_order' plan={userPlan}>
 *     <VoiceOrderButton />
 *   </FeatureGate>
 *
 * When locked, shows a grayed card with the feature name and upgrade prompt.
 */

import type React from 'react';
import { Lock } from 'lucide-react';
import { canUseFeature } from '@/lib/feature-gate-engine';
import type { FeatureId } from '@/types/plan-features';
import type { PlanTier } from '@/types/card-entitlement';

interface FeatureGateProps {
  feature: FeatureId;
  plan: PlanTier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** When true, render children greyed out instead of hiding. */
  showLocked?: boolean;
}

export function FeatureGate({
  feature,
  plan,
  children,
  fallback,
  showLocked = false,
}: FeatureGateProps) {
  const gate = canUseFeature(plan, feature);

  if (gate.allowed) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (showLocked) {
    return (
      <div className="relative opacity-50 pointer-events-none">
        {children}
        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
          <div className="flex flex-col items-center gap-1 p-2 rounded bg-background border shadow-sm">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <p className="text-[10px] font-semibold text-muted-foreground">
              {gate.upgrade_prompt}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
      <Lock className="h-4 w-4 text-amber-600 flex-shrink-0" />
      <div className="flex-1 text-xs">
        <p className="font-semibold text-amber-700">{gate.reason}</p>
        {gate.upgrade_prompt && (
          <p className="text-muted-foreground mt-0.5">{gate.upgrade_prompt}</p>
        )}
      </div>
    </div>
  );
}

export default FeatureGate;
