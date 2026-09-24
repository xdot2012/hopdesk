import { describe, expect, it } from 'vitest';
import { isAdminRole, isAgentRole, isCustomerRole } from './roles';

describe('roles', () => {
  it('detects agent and admin as staff agents', () => {
    expect(isAgentRole('agent')).toBe(true);
    expect(isAgentRole('Admin')).toBe(true);
    expect(isAgentRole('customer')).toBe(false);
  });

  it('detects admin and customer precisely', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('agent')).toBe(false);
    expect(isCustomerRole('customer')).toBe(true);
    expect(isCustomerRole('agent')).toBe(false);
  });
});
