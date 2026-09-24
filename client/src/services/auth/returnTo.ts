const AUTH_RETURN_TO_KEY = 'authReturnTo';

function isSafeReturnPath(path: string): boolean {
  return Boolean(path) && path.startsWith('/') && !path.startsWith('/auth');
}

export function rememberAuthReturnTo(path: string) {
  if (isSafeReturnPath(path)) {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, path);
  }
}

export function consumeAuthReturnTo(fallback: string): string {
  const stored = sessionStorage.getItem(AUTH_RETURN_TO_KEY);
  sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
  if (stored && isSafeReturnPath(stored)) {
    return stored;
  }
  return fallback;
}
