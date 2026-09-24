import { describe, expect, it } from 'vitest';
import { createUpdatePasswordSchema } from './schema';

describe('createUpdatePasswordSchema', () => {
  const schema = createUpdatePasswordSchema();

  it('accepts valid passwords', () => {
    expect(
      schema.safeParse({ oldPassword: 'password1', newPassword: 'password2' }).success,
    ).toBe(true);
  });

  it('rejects short passwords', () => {
    const result = schema.safeParse({ oldPassword: 'short', newPassword: 'also' });
    expect(result.success).toBe(false);
  });
});
