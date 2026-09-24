import { CAT, classifyMerchant } from '../classify';

describe('classifyMerchant', () => {
  it('reads messy bank descriptors', () => {
    expect(classifyMerchant('FAWRY*MOBIL GAS STATION 360')).toBe(CAT.fuel);
    expect(classifyMerchant('Chillout fuel')).toBe(CAT.fuel);
    expect(classifyMerchant('SHELL SELECT MARKET')).toBe(CAT.fuel);
    expect(classifyMerchant('AHMED MARKET')).toBe(CAT.groceries);
    expect(classifyMerchant('Mohamed Minimart 12')).toBe(CAT.groceries);
    expect(classifyMerchant('SPINNEYS EG CAIRO')).toBe(CAT.groceries);
    expect(classifyMerchant('TALABAT*ZOOBA')).toBe(CAT.food);
    expect(classifyMerchant('ABO ALI RESTAURANT')).toBe(CAT.food);
    expect(classifyMerchant('UBER *TRIP HELP.UBER.COM')).toBe(CAT.transport);
    expect(classifyMerchant('Netflix.com')).toBe(CAT.subscriptions);
    expect(classifyMerchant('APPLE.COM/BILL')).toBe(CAT.subscriptions);
    expect(classifyMerchant('SEIF PHARMACY')).toBe(CAT.health);
    expect(classifyMerchant('EL EZABY PHRMCY')).toBe(CAT.health);
    expect(classifyMerchant('VODAFONE CASH TOPUP')).toBe(CAT.bills);
    expect(classifyMerchant('Fawry')).toBe(CAT.bills);
    expect(classifyMerchant('ZARA CITY STARS')).toBe(CAT.shopping);
  });
  it('reads Arabic', () => {
    expect(classifyMerchant('كارفور المعادي')).toBe(CAT.groceries);
    expect(classifyMerchant('صيدلية العزبي')).toBe(CAT.health);
    expect(classifyMerchant('محطة وطنية')).toBe(CAT.fuel);
    expect(classifyMerchant('مطعم أبو شقرة')).toBe(CAT.food);
  });
  it('returns null for unknown merchants', () => {
    expect(classifyMerchant('Ahmed')).toBeNull();
    expect(classifyMerchant('Transfer to Mona')).toBeNull();
    expect(classifyMerchant(null)).toBeNull();
  });
  it('does not confuse the Metro supermarket with the metro', () => {
    expect(classifyMerchant('METRO MARKET ZAMALEK')).toBe(CAT.groceries);
    expect(classifyMerchant('Cairo Metro')).toBe(CAT.transport);
  });
});
