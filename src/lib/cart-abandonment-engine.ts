/**
 * cart-abandonment-engine.ts — Detect abandoned carts + generate nudges
 * Uses Sprint 12 describeUnlockGap for scheme-based nudges.
 * Pure: no React, no localStorage.
 */

import { describeUnlockGap, type SchemeCart } from './scheme-engine';
import type { Scheme } from '@/types/scheme';
import type { CustomerCart } from '@/types/customer-order';

export interface AbandonmentNudge {
  customer_id: string;
  cart_value_paise: number;
  minutes_idle: number;
  nudge_type: 'scheme_unlock' | 'low_value' | 'gentle_reminder' | 'high_value_save';
  message: string;
  cta: string;
  severity: 'info' | 'warn';
}

const IDLE_WARN_MINUTES = 30;
const IDLE_CRITICAL_MINUTES = 120;

export function minutesSince(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
}

export function detectAbandonment(
  cart: CustomerCart, schemes: Scheme[],
  customerSegment?: string, now: Date = new Date(),
): AbandonmentNudge | null {
  if (cart.lines.length === 0) return null;

  const idle = minutesSince(cart.updated_at, now);
  if (idle < IDLE_WARN_MINUTES) return null;

  const schemeCart: SchemeCart = {
    audience: 'customer',
    customer_segment: customerSegment,
    order_value_paise: cart.subtotal_paise,
    lines: cart.lines.map(l => ({
      line_id: l.id, item_id: l.item_id,
      qty: l.qty,
      unit_price_paise: l.unit_price_paise,
      line_total_paise: l.line_total_paise,
    })),
  };

  const hints = describeUnlockGap(schemeCart, schemes);
  if (hints.length > 0) {
    return {
      customer_id: cart.customer_id,
      cart_value_paise: cart.subtotal_paise,
      minutes_idle: idle,
      nudge_type: 'scheme_unlock',
      message: hints[0],
      cta: 'Complete your order now',
      severity: idle >= IDLE_CRITICAL_MINUTES ? 'warn' : 'info',
    };
  }

  // High-value save — cart > ₹5000
  if (cart.subtotal_paise > 500_000) {
    return {
      customer_id: cart.customer_id,
      cart_value_paise: cart.subtotal_paise,
      minutes_idle: idle,
      nudge_type: 'high_value_save',
      message: `You have ₹${(cart.subtotal_paise / 100).toFixed(0)} in your cart. We saved it for you.`,
      cta: 'Checkout now',
      severity: idle >= IDLE_CRITICAL_MINUTES ? 'warn' : 'info',
    };
  }

  // Generic reminder
  return {
    customer_id: cart.customer_id,
    cart_value_paise: cart.subtotal_paise,
    minutes_idle: idle,
    nudge_type: 'gentle_reminder',
    message: `You left ${cart.lines.length} item(s) in your cart`,
    cta: 'Continue shopping',
    severity: 'info',
  };
}

/** Scan all active carts and return nudges. For background job or dashboard. */
export function scanAbandonedCarts(
  carts: CustomerCart[], schemes: Scheme[], now: Date = new Date(),
): AbandonmentNudge[] {
  return carts
    .map(c => detectAbandonment(c, schemes, undefined, now))
    .filter((n): n is AbandonmentNudge => n !== null);
}
