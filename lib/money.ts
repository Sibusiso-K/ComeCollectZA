// Money is stored in integer cents. Display only converts at the edge.
export function formatRand(cents: number): string {
  const rands = cents / 100;
  return "R" + rands.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPricePerKg(centsPerKg: number): string {
  return formatRand(centsPerKg) + "/kg";
}
