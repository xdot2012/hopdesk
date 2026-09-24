import { describe, expect, it } from 'vitest';
import { createSignUpSchema } from './schema';

describe('createSignUpSchema', () => {
  const schema = createSignUpSchema();
  const sectorId = '11111111-1111-4111-8111-111111111111';

  it('accepts matching passwords with sector', () => {
    const result = schema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1',
      confirm: 'password1',
      sectorId,
    });

    expect(result.success).toBe(true);
  });

  it('rejects password mismatch on confirm', () => {
    const result = schema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1',
      confirm: 'password2',
      sectorId,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'confirm')).toBe(true);
    }
  });

  it('rejects missing sector', () => {
    const result = schema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1',
      confirm: 'password1',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'sectorId')).toBe(true);
    }
  });
});
