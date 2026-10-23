// Money is stored in integer cents. Display only converts at the edge.
export function formatRand(cents: number): string {
  const rands = cents / 100;
  return "R" + rands.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPricePerKg(centsPerKg: number): string {
  return formatRand(centsPerKg) + "/kg";
}

// Cents per kg times 1000 kg, shown in whole rands: 1020 c/kg is R10 200/t.
export function formatPricePerTonne(centsPerKg: number): string {
  const rands = Math.round((centsPerKg * 1000) / 100);
  return "R" + rands.toLocaleString("en-ZA").replace(/,/g, " ") + "/t";
}
