import { beforeEach, describe, expect, it } from 'vitest';
import { consumeAuthReturnTo, rememberAuthReturnTo } from './returnTo';

describe('auth returnTo', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores safe app paths and consumes them once', () => {
    rememberAuthReturnTo('/tickets/abc');
    expect(consumeAuthReturnTo('/')).toBe('/tickets/abc');
    expect(consumeAuthReturnTo('/')).toBe('/');
  });

  it('ignores auth paths and empty values', () => {
    rememberAuthReturnTo('/auth/sign_in');
    rememberAuthReturnTo('');
    expect(consumeAuthReturnTo('/fallback')).toBe('/fallback');
  });
});
