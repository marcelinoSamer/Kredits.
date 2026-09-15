import { parseCapturedAmount } from '../parse';

describe('parseCapturedAmount', () => {
  it('handles currency text from Shortcuts', () => {
    expect(parseCapturedAmount('EGP 1,234.50')).toEqual({ amount: 1234.5, currency: 'EGP' });
    expect(parseCapturedAmount('£12.99').amount).toBe(12.99);
    expect(parseCapturedAmount('12,50 €').amount).toBe(12.5);
    expect(parseCapturedAmount('١٢٠٫٥٠ ج.م').amount).toBe(120.5);
    expect(parseCapturedAmount('-45').amount).toBe(45);
    expect(parseCapturedAmount('abc').amount).toBeNull();
  });
});
