import { describe, expect, it } from 'vitest';
import { isAppLocale } from './constants';

describe('isAppLocale', () => {
  it('accepts supported locales only', () => {
    expect(isAppLocale('pt-BR')).toBe(true);
    expect(isAppLocale('en')).toBe(true);
    expect(isAppLocale('es')).toBe(false);
    expect(isAppLocale(null)).toBe(false);
  });
});
