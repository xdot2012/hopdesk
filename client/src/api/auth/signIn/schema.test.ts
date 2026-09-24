import { describe, expect, it } from 'vitest';
import { signInSchema } from './schema';

describe('signInSchema', () => {
  it('accepts a valid payload', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      password: 'password1',
      keepConnected: true,
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid email and short password', () => {
    const result = signInSchema.safeParse({
      email: 'not-an-email',
      password: 'short',
      keepConnected: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toContain('email');
      expect(paths).toContain('password');
    }
  });
});
