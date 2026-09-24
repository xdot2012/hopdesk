import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  getApiErrorMessage,
  getFieldValidationMessage,
  getZodValidationErrors,
  hasFieldValidationErrors,
} from './functions';

describe('getZodValidationErrors', () => {
  it('maps zod issues to form paths', () => {
    const parsed = z.object({ email: z.string().email() }).safeParse({ email: 'x' });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(getZodValidationErrors(parsed.error)).toEqual([
      { path: ['email'], message: expect.any(String) },
    ]);
  });
});

describe('field validation helpers', () => {
  it('detects 400 detail arrays from axios', () => {
    const error = new AxiosError('Bad Request');
    error.response = {
      status: 400,
      data: { detail: [{ field: 'email', message: 'já usado' }] },
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} as never },
    };

    expect(hasFieldValidationErrors(error)).toBe(true);
    expect(getFieldValidationMessage(error, 'email')).toBe('já usado');
    expect(getFieldValidationMessage(error, 'name')).toBeUndefined();
  });
});

describe('getApiErrorMessage', () => {
  it('prefers string detail and mapped status messages', () => {
    expect(getApiErrorMessage('falhou direto')).toBe('falhou direto');

    const unauthorized = new AxiosError('Unauthorized');
    unauthorized.response = {
      status: 401,
      data: {},
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: {} as never },
    };
    expect(getApiErrorMessage(unauthorized)).toBe('E-mail ou senha incorretos');

    const withDetail = new AxiosError('Bad Request');
    withDetail.response = {
      status: 400,
      data: { detail: 'Campo inválido' },
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} as never },
    };
    expect(getApiErrorMessage(withDetail)).toBe('Campo inválido');
  });

  it('falls back for unknown errors', () => {
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback');
    expect(getApiErrorMessage(new Error('boom'))).toBe('boom');
  });
});
