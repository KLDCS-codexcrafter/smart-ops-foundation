/**
 * @file     emi-schedule-builder.ts
 * @purpose  Auto-generate EMI amortization schedule using standard formula.
 *           Read-only preview in S6.5b · H1.5-D makes it actionable.
 * @sprint   T-H1.5-C-S6.5b
 * @finding  CC-059 / CC-061
 */

export interface EMIScheduleRow {
  emiNumber: number;
  dueDate: string;       // ISO yyyy-mm-dd
  principal: number;     // ₹ rounded to 2dp
  interest: number;      // ₹ rounded to 2dp
  runningBalance: number;
  status: 'scheduled';
}

export interface BuildScheduleInput {
  principal: number;
  annualRatePercent: number;
  tenureMonths: number;
  firstEmiDate: string;  // ISO
}

export function buildEMISchedule(input: BuildScheduleInput): EMIScheduleRow[] {
  const { principal, annualRatePercent, tenureMonths, firstEmiDate } = input;
  if (principal <= 0 || tenureMonths <= 0 || annualRatePercent < 0 || !firstEmiDate) return [];

  const monthlyRate = annualRatePercent / 12 / 100;
  const emi = monthlyRate === 0
    ? principal / tenureMonths
    : (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  const rows: EMIScheduleRow[] = [];
  let balance = principal;
  const startDate = new Date(firstEmiDate);
  if (Number.isNaN(startDate.getTime())) return [];

  for (let i = 1; i <= tenureMonths; i++) {
    const interest = balance * monthlyRate;
    const principalPortion = emi - interest;
    balance = Math.max(0, balance - principalPortion);

    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + (i - 1));

    rows.push({
      emiNumber: i,
      dueDate: dueDate.toISOString().slice(0, 10),
      principal: Math.round(principalPortion * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      runningBalance: Math.round(balance * 100) / 100,
      status: 'scheduled',
    });
  }
  return rows;
}

export function calculateEMIAmount(principal: number, annualRatePercent: number, tenureMonths: number): number {
  if (principal <= 0 || tenureMonths <= 0 || annualRatePercent < 0) return 0;
  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate === 0) return Math.round((principal / tenureMonths) * 100) / 100;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
}
