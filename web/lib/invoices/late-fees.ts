// UK Late Payment of Commercial Debts (Interest) Act 1998

export function calculateLateFee(invoiceAmount: number): number {
  if (invoiceAmount < 1000) return 40;
  if (invoiceAmount < 10000) return 70;
  return 100;
}

export function calculateLateFeeWithInterest(
  invoiceAmount: number,
  daysOverdue: number
): { lateFee: number; interest: number; total: number } {
  const lateFee = calculateLateFee(invoiceAmount);

  // Bank of England base rate + 8% (simplified calculation)
  const annualRate = 0.08; // 8% for example
  const dailyRate = annualRate / 365;
  const interest = invoiceAmount * dailyRate * daysOverdue;

  return {
    lateFee,
    interest: Number(interest.toFixed(2)),
    total: Number((lateFee + interest).toFixed(2)),
  };
}
