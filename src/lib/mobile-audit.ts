/**
 * mobile-audit.ts — Mobile-aware audit helper
 * Wraps logAudit from card-audit-engine with mobile-specific refType
 * and includes platform info automatically.
 *
 * Closes the gap from Sprint 14a audit: MobileRouter + MobileHome
 * weren't wiring logAudit directly.
 */

import { logAudit } from './card-audit-engine';
import { getPlatform } from './platform-engine';
import type { CardAuditAction } from '@/types/card-audit';
import type { CardId } from '@/types/card-entitlement';

interface MobileAuditInput {
  entityCode: string;
  userId: string;
  userName?: string;
  role: 'distributor' | 'customer' | 'unknown';
  action: CardAuditAction;
  moduleId?: string;
  refType?: string;
  refId?: string;
  refLabel?: string;
}

export function logMobileAudit(input: MobileAuditInput): void {
  const platform = getPlatform();
  logAudit({
    entityCode: input.entityCode,
    userId: input.userId,
    userName: input.userName ?? input.userId,
    // OperixGo is not in CardId enum — use a synthetic card identifier.
    // The Bell drawer + activity store will group by this.
    cardId: 'operix-go' as unknown as CardId,
    moduleId: input.moduleId,
    action: input.action,
    refType: input.refType ?? `mobile_${input.role}`,
    refId: input.refId,
    refLabel: input.refLabel ?? `${platform.kind} · ${input.role}`,
  });
}

/** Convenience for login events. */
export function logMobileLogin(
  entityCode: string,
  userId: string,
  userName: string,
  role: 'distributor' | 'customer',
): void {
  logMobileAudit({
    entityCode,
    userId,
    userName,
    role,
    action: 'card_open',
    refType: 'mobile_login',
    refLabel: `Logged in as ${role}`,
  });
}

/** Convenience for tile-click events. */
export function logMobileTileClick(
  entityCode: string,
  userId: string,
  role: 'distributor' | 'customer' | 'unknown',
  tileLabel: string,
  to: string,
): void {
  logMobileAudit({
    entityCode,
    userId,
    role,
    action: 'module_open',
    refType: 'mobile_tile',
    refId: to,
    refLabel: `Tapped ${tileLabel}`,
  });
}
