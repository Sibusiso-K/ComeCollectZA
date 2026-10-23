// Whether this phone has already seen the first-time tour. It is per phone, not per account, so a second
// person signing in on a shared phone can still replay it from Settings.
const KEY = "ccza.tour.done";

export function tourDone(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markTourDone(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Storage blocked: the tour may show again next time. That is harmless.
  }
}

export function resetTour(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to reset.
  }
}
