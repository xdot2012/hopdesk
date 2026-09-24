import { CONNECTION_ERROR } from '~/router/paths';

const RETURN_TO_KEY = 'connectionErrorReturnTo';

export function rememberConnectionErrorReturnTo(path: string) {
  if (path) {
    sessionStorage.setItem(RETURN_TO_KEY, path);
  }
}

export function getConnectionErrorReturnTo(fallback: string): string {
  return sessionStorage.getItem(RETURN_TO_KEY) || fallback;
}

export function clearConnectionErrorReturnTo() {
  sessionStorage.removeItem(RETURN_TO_KEY);
}

export function redirectOnNetworkError() {
  if (window.location.pathname === CONNECTION_ERROR) {
    return;
  }

  rememberConnectionErrorReturnTo(
    `${window.location.pathname}${window.location.search}`,
  );
  window.location.assign(CONNECTION_ERROR);
}
