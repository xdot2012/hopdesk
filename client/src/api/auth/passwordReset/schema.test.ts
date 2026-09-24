import { describe, expect, it } from 'vitest';
import { createPasswordResetSchema } from './schema';

describe('createPasswordResetSchema', () => {
  const schema = createPasswordResetSchema();

  it('accepts matching passwords', () => {
    expect(
      schema.safeParse({ password: 'password1', confirm: 'password1' }).success,
    ).toBe(true);
  });

  it('rejects mismatch', () => {
    const result = schema.safeParse({ password: 'password1', confirm: 'password2' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'confirm')).toBe(true);
    }
  });
});
