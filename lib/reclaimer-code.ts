// Reclaimer codes look like ccza_r_7Q2KX9. Anything else from a typed or scanned code is refused before it reaches the API.
// The pattern has no nested repeats, so it runs in linear time on any input.
export const RECLAIMER_CODE = /^ccza_r_[A-Z0-9]{4,32}$/;

export function isReclaimerCode(value: string): boolean {
  return value.length <= 39 && RECLAIMER_CODE.test(value);
}

// Idempotency keys come from the centre console: 8 to 128 letters, digits, dashes or underscores.
export const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,128}$/;
