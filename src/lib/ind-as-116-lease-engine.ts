/**
 * ind-as-116-lease-engine.ts — 41st SIBLING ⭐
 * Ind AS 116 Lease (Right-of-Use) calculator.
 * @sprint T-Phase-4.FAR-1 · FAR-CAP-9
 *
 * Storage key: erp_leases_${entityCode} (FR-26 entity-scoped).
 * [JWT] Replace with /api/leases endpoints.
 */
import type {
  LeaseTerms,
  ROUSchedule,
  ROUScheduleRow,
  ROUDisclosureRow,
  LeaseModification,
} from '@/types/statutory-pack';
import { dAdd, dSub, dMul, roundTo } from './decimal-helpers';

export const leasesKey = (entityCode: string): string =>
  `erp_leases_${entityCode}`;

function loadLeases(entityCode: string): LeaseTerms[] {
  try {
    const raw = localStorage.getItem(leasesKey(entityCode));
    return raw ? (JSON.parse(raw) as LeaseTerms[]) : [];
  } catch { return []; }
}

function addMonths(iso: string, n: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

/** Present value of an annuity-due-style monthly lease. */
function presentValue(monthlyRent: number, months: number, annualRatePct: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return roundTo(monthlyRent * months, 2);
  // Ordinary annuity PV (payments at month-end).
  const pv = monthlyRent * (1 - Math.pow(1 + r, -months)) / r;
  return roundTo(pv, 2);
}

/** Compute Right-of-Use asset + initial liability at commencement. */
export function computeROUAtCommencement(leaseTerms: LeaseTerms): ROUSchedule {
  const liability = presentValue(
    leaseTerms.monthlyRentInr,
    leaseTerms.termMonths,
    leaseTerms.discountRatePct,
  );
  const initialRou = dAdd(liability, leaseTerms.initialDirectCostsInr ?? 0);

  const rows: ROUScheduleRow[] = [];
  let openingLiability = liability;
  let rouOpening = initialRou;
  const rMonth = leaseTerms.discountRatePct / 100 / 12;
  const monthlyAmort = roundTo(initialRou / leaseTerms.termMonths, 2);

  for (let i = 1; i <= leaseTerms.termMonths; i++) {
    const interest = roundTo(openingLiability * rMonth, 2);
    const payment = leaseTerms.monthlyRentInr;
    const principal = dSub(payment, interest);
    const closingLiability = Math.max(0, roundTo(dSub(openingLiability, principal), 2));
    const amortization = i === leaseTerms.termMonths
      ? rouOpening // last month absorbs rounding
      : monthlyAmort;
    const rouClosing = Math.max(0, roundTo(dSub(rouOpening, amortization), 2));

    rows.push({
      monthIndex: i,
      date: addMonths(leaseTerms.commencementDate, i),
      openingLiability,
      interest,
      payment,
      closingLiability,
      amortization,
      rouOpening,
      rouClosing,
    });

    openingLiability = closingLiability;
    rouOpening = rouClosing;
  }

  return {
    leaseId: leaseTerms.leaseId,
    entityCode: leaseTerms.entityCode,
    initialRou,
    initialLiability: liability,
    rows,
  };
}

export function computeMonthlyAmortization(
  rou: ROUSchedule,
  monthIndex: number,
): { amortization: number; remainingRou: number } {
  const row = rou.rows.find(r => r.monthIndex === monthIndex);
  if (!row) return { amortization: 0, remainingRou: 0 };
  return { amortization: row.amortization, remainingRou: row.rouClosing };
}

export function computeInterestExpense(
  liability: number,
  ratePct: number,
  periodMonths: number,
): number {
  const r = ratePct / 100 / 12;
  return roundTo(dMul(dMul(liability, r), periodMonths), 2);
}

export function handleLeaseModification(
  rou: ROUSchedule,
  modification: LeaseModification,
): ROUSchedule {
  const before = rou.rows.filter(r => r.monthIndex < modification.effectiveFromMonthIndex);
  const carryRow = before[before.length - 1];
  const remainingMonths = (modification.newTermMonths ?? rou.rows.length)
    - modification.effectiveFromMonthIndex + 1;
  const newRent = modification.newMonthlyRentInr ?? rou.rows[0].payment;
  const newRate = modification.newDiscountRatePct
    ?? (rou.rows[0].interest / Math.max(1, rou.rows[0].openingLiability) * 12 * 100);

  const reLease: LeaseTerms = {
    leaseId: rou.leaseId,
    entityCode: rou.entityCode,
    description: 'remeasured',
    commencementDate: carryRow?.date ?? new Date().toISOString().slice(0, 10),
    termMonths: Math.max(1, remainingMonths),
    monthlyRentInr: newRent,
    discountRatePct: newRate,
  };
  const reSchedule = computeROUAtCommencement(reLease);
  // Shift monthIndex onto continuing series.
  const shifted = reSchedule.rows.map((r, idx) => ({
    ...r,
    monthIndex: modification.effectiveFromMonthIndex + idx,
  }));
  return {
    ...rou,
    rows: [...before, ...shifted],
  };
}

/** Build schedule from a stored lease. */
export function generateROUSchedule(leaseId: string, entityCode: string): ROUSchedule {
  const lease = loadLeases(entityCode).find(l => l.leaseId === leaseId);
  if (!lease) {
    return { leaseId, entityCode, initialRou: 0, initialLiability: 0, rows: [] };
  }
  return computeROUAtCommencement(lease);
}

/** Aggregate FY disclosure across all leases of an entity. */
export function generateAggregateDisclosure(
  entityCode: string,
  fyStart: string,
  fyEnd: string,
): ROUDisclosureRow[] {
  const leases = loadLeases(entityCode);
  return leases.map(lease => {
    const sched = computeROUAtCommencement(lease);
    const inWindow = sched.rows.filter(r => r.date >= fyStart && r.date <= fyEnd);
    const amort = inWindow.reduce((s, r) => s + r.amortization, 0);
    const interest = inWindow.reduce((s, r) => s + r.interest, 0);
    const cash = inWindow.reduce((s, r) => s + r.payment, 0);
    const openingRow = inWindow[0];
    const closingRow = inWindow[inWindow.length - 1];
    return {
      entityCode,
      fyStart,
      fyEnd,
      openingRou: openingRow?.rouOpening ?? 0,
      additions: lease.commencementDate >= fyStart && lease.commencementDate <= fyEnd ? sched.initialRou : 0,
      amortization: roundTo(amort, 2),
      closingRou: closingRow?.rouClosing ?? 0,
      interestExpense: roundTo(interest, 2),
      totalCashOutflow: roundTo(cash, 2),
    };
  });
}
