/**
 * src/lib/depreciation-methods-extended.ts
 *
 * Sprint 67 FAR-3 · Block 7 · NEW SIBLING (6 named exports)
 * 6 additional depreciation methods: DBM, SYDM, DDBM, SFM, AM, DCFM.
 */

export function computeDBM(cost: number, salvage: number, rate: number, yearNum: number): number {
  if (yearNum < 1) return 0;
  let bookValue = cost;
  let depreciation = 0;
  for (let y = 1; y <= yearNum; y++) {
    depreciation = (bookValue - salvage) * rate;
    bookValue = Math.max(salvage, bookValue - depreciation);
    if (bookValue <= salvage) {
      depreciation = y === yearNum ? Math.max(0, bookValue + depreciation - salvage) : 0;
      break;
    }
  }
  return Math.round(Math.max(0, depreciation));
}

export function computeSYDM(cost: number, salvage: number, usefulLifeYears: number, yearNum: number): number {
  if (yearNum < 1 || yearNum > usefulLifeYears || usefulLifeYears < 1) return 0;
  const sumOfDigits = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
  const remainingLife = usefulLifeYears - yearNum + 1;
  const depreciableAmount = cost - salvage;
  const annualDepr = depreciableAmount * (remainingLife / sumOfDigits);
  return Math.round(Math.max(0, annualDepr));
}

export function computeDDBM(cost: number, salvage: number, usefulLifeYears: number, yearNum: number): number {
  if (yearNum < 1 || usefulLifeYears < 1) return 0;
  const rate = 2 / usefulLifeYears;
  let bookValue = cost;
  let depreciation = 0;
  for (let y = 1; y <= yearNum; y++) {
    depreciation = bookValue * rate;
    if (bookValue - depreciation < salvage) {
      depreciation = Math.max(0, bookValue - salvage);
    }
    bookValue -= depreciation;
    if (y === yearNum) break;
  }
  return Math.round(Math.max(0, depreciation));
}

export function computeSFM(cost: number, salvage: number, usefulLifeYears: number, interestRate: number): number {
  if (usefulLifeYears < 1 || interestRate <= 0) return 0;
  const depreciableAmount = cost - salvage;
  const factor = (Math.pow(1 + interestRate, usefulLifeYears) - 1) / interestRate;
  if (factor === 0) return 0;
  return Math.round(Math.max(0, depreciableAmount / factor));
}

export function computeAM(cost: number, usefulLifeYears: number, interestRate: number): number {
  if (usefulLifeYears < 1 || interestRate <= 0) return 0;
  const denom = 1 - Math.pow(1 + interestRate, -usefulLifeYears);
  if (denom === 0) return 0;
  return Math.round(Math.max(0, (cost * interestRate) / denom));
}

export function computeDCFM(
  cost: number,
  expectedCashFlows: number[],
  discountRate: number,
  yearNum: number,
): number {
  if (yearNum < 1 || yearNum > expectedCashFlows.length || discountRate <= 0) return 0;
  const cashFlow = expectedCashFlows[yearNum - 1];
  if (cashFlow === undefined) return 0;
  const pv = cashFlow / Math.pow(1 + discountRate, yearNum);
  const totalPV = expectedCashFlows.reduce((sum, cf, idx) => sum + cf / Math.pow(1 + discountRate, idx + 1), 0);
  if (totalPV === 0) return 0;
  return Math.round(Math.max(0, cost * (pv / totalPV)));
}
