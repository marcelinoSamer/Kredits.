import { buildRateLookup } from '../fx';
import { goldEquivalent, gramPrice, TROY_OUNCE_GRAMS } from '../gold';

const lookup = buildRateLookup([{ base: 'XAU', quote: 'EGP', rate: 155_517.384, updatedAt: 0 }]);

describe('gold', () => {
  it('derives a 24k gram price from the ounce rate', () => {
    expect(gramPrice('EGP', lookup, 24)).toBeCloseTo(155_517.384 / TROY_OUNCE_GRAMS, 3);
  });

  it('scales 21k by 21/24', () => {
    const g24 = gramPrice('EGP', lookup, 24)!;
    expect(gramPrice('EGP', lookup, 21)).toBeCloseTo(g24 * (21 / 24), 6);
  });

  it('converts net worth to grams', () => {
    const eq = goldEquivalent(100_000, 'EGP', lookup, 21)!;
    expect(eq.karat).toBe(21);
    expect(eq.grams).toBeCloseTo(100_000 / eq.gramPrice, 6);
  });

  it('returns null without a gold rate', () => {
    expect(goldEquivalent(1, 'USD', buildRateLookup([]))).toBeNull();
  });
});
