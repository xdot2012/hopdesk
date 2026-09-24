export const ROLE_CUSTOMER = 'customer';
export const ROLE_AGENT = 'agent';
export const ROLE_ADMIN = 'admin';

function normalizeRole(role?: string | null) {
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
}

export function isAgentRole(role?: string | null) {
  const value = normalizeRole(role);
  return value === ROLE_AGENT || value === ROLE_ADMIN;
}

export function isAdminRole(role?: string | null) {
  return normalizeRole(role) === ROLE_ADMIN;
}

export function isCustomerRole(role?: string | null) {
  return normalizeRole(role) === ROLE_CUSTOMER;
}
