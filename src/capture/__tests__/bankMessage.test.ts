import { interpretBankMessage, isOtpMessage } from '../bankMessage';

describe('bank message capture', () => {
  it('ignores OTP and verification texts, even when they mention a purchase', () => {
    expect(isOtpMessage('Your OTP for purchase of EGP 500 at Amazon is 482913. Do not share it.')).toBe(true);
    expect(interpretBankMessage('Your OTP for purchase of EGP 500 at Amazon is 482913', 'CIB').action).toBe('ignore');
    expect(interpretBankMessage('رمز التحقق الخاص بك هو 5521 لا تشارك هذا الرمز', 'NBE').action).toBe('ignore');
  });

  it('records a card purchase as an expense', () => {
    const d = interpretBankMessage('Your card ending 1234 was debited with EGP 350.00 at CARREFOUR MAADI on 14/09/2026', 'CIB');
    expect(d.action).toBe('record');
    expect(d.kind).toBe('expense');
    expect(d.parsed?.amount).toBe(350);
  });

  it('records an incoming credit as income', () => {
    const d = interpretBankMessage('Your account was credited with EGP 32,000.00 salary', 'CIB');
    expect(d.action).toBe('record');
    expect(d.kind).toBe('income');
  });

  it('ignores texts without an amount', () => {
    expect(interpretBankMessage('Visit our branch to get your new card', 'CIB').action).toBe('ignore');
  });
});
