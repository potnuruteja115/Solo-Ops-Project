const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const FORMAT = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** GSTIN check character: weighted mod-36 over the first 14 characters. */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = CHARSET.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(value / 36) + (value % 36);
  }
  return CHARSET[(36 - (sum % 36)) % 36];
}

export function validateGstin(input: string): { valid: boolean; reason?: string } {
  const gstin = input.trim().toUpperCase();
  if (gstin.length !== 15) return { valid: false, reason: 'GSTIN must be 15 characters.' };
  if (!FORMAT.test(gstin)) return { valid: false, reason: 'GSTIN format is not valid.' };
  const state = Number(gstin.slice(0, 2));
  if (state < 1 || state > 38) return { valid: false, reason: 'State code in GSTIN is not valid.' };
  if (gstinCheckChar(gstin.slice(0, 14)) !== gstin[14]) {
    return { valid: false, reason: 'GSTIN check digit does not match.' };
  }
  return { valid: true };
}
