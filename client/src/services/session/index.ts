import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode'

type TokenData = {
  type: string
  key: string
  exp: number
  factionID: string | undefined
}

const cookieOptions = { secure: window.location.protocol === 'https:', sameSite: 'Strict' as const };

function isRefreshTokenValid(refreshToken?: string): boolean {
  if (!refreshToken) {
    return false;
  }

  try {
    const decodedRefreshToken: TokenData = jwtDecode(refreshToken);
    return decodedRefreshToken.exp >= Date.now() / 1000;
  } catch {
    return false;
  }
}

function getSession() {
  var tokenType = Cookies.get('tokenType')!;
  var accessToken = Cookies.get('accessToken')!;
  var refreshToken = Cookies.get('refreshToken')!;

  return { tokenType, accessToken, refreshToken };
}

function saveSession(tokenType: string, accessToken: string, refreshToken: string) {
  const decodedRefreshToken: TokenData = jwtDecode(refreshToken);
  const refreshTokenExp = new Date(decodedRefreshToken.exp * 1000);

  Cookies.set('tokenType', tokenType, { ...cookieOptions, expires: refreshTokenExp });
  // Keep the access token cookie alive as long as the refresh token so the client
  // can still send the expired JWT and receive token.expired to trigger refresh.
  Cookies.set('accessToken', accessToken, { ...cookieOptions, expires: refreshTokenExp });
  Cookies.set('refreshToken', refreshToken, { ...cookieOptions, expires: refreshTokenExp });
}

function clearSession() {
  Cookies.remove('accessToken');
  Cookies.remove('tokenType');
  Cookies.remove('refreshToken');
}

function accessTokenIsValid(): boolean {
  const refreshToken = Cookies.get('refreshToken');
  if (!isRefreshTokenValid(refreshToken)) {
    clearSession();
    return false;
  }

  return true;
}

export function getUserFactionID(): string | undefined {
  var accessToken = Cookies.get('accessToken');
  if(!accessToken) {
    return undefined;
  }

  const decodedAccessToken: TokenData = jwtDecode(accessToken);
  return decodedAccessToken.factionID
}

export { getSession, saveSession, clearSession, accessTokenIsValid, isRefreshTokenValid };