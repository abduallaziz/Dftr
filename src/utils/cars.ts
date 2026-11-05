/** Actual (paid) cars = total cars - free cars. Null when the accountant has not recorded a total. */
export function actualCars(total: number | null, freeLarge: number | null, freeSmall: number | null): number | null {
  if (total === null) return null;
  return total - (freeLarge ?? 0) - (freeSmall ?? 0);
}

export type CountStatus = "pending" | "employee_missing" | "match" | "mismatch";

/** Compares the accountant's count with the employee's (employee value is hidden by the server until the accountant has entered theirs). */
export function countStatus(accountant: number | null, employee: number | null): { status: CountStatus; diff: number } {
  if (accountant === null) return { status: "pending", diff: 0 };
  if (employee === null) return { status: "employee_missing", diff: 0 };
  const diff = accountant - employee;
  return { status: diff === 0 ? "match" : "mismatch", diff };
}
