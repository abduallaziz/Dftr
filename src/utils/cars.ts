/** Actual (paid) cars = total cars - free cars. Null when the accountant has not recorded a total. */
export function actualCars(total: number | null, freeLarge: number | null, freeSmall: number | null): number | null {
  if (total === null) return null;
  return total - (freeLarge ?? 0) - (freeSmall ?? 0);
}
