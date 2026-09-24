import { describe, expect, it } from 'vitest';
import { passwordReceverySchema } from './schema';

describe('passwordReceverySchema', () => {
  it('accepts a valid email', () => {
    expect(passwordReceverySchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(passwordReceverySchema.safeParse({ email: 'bad' }).success).toBe(false);
  });
});
