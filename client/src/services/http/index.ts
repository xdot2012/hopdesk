import axios, { AxiosError, InternalAxiosRequestConfig} from 'axios';
import { clearSession, getSession, isRefreshTokenValid, saveSession } from '../session';
import i18n from '~/i18n';
import { NETWORK_ERROR } from '~/util/constants';
import { redirectOnNetworkError } from './redirectOnNetworkError';

const http = axios.create({
  baseURL: 'http://localhost:8000/',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});


http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { tokenType, accessToken } = getSession();
    const headers = {
      'Accept-Language': i18n.language,
      ...config.headers,
    };

    if (accessToken) {
      return {
        ...config,
        headers: { Authorization: `${tokenType} ${accessToken}`, ...headers },
      } as any as InternalAxiosRequestConfig;
    }

    return {
      ...config,
      headers,
    } as any as InternalAxiosRequestConfig;
  },
  (err: AxiosError) => {
    console.log(err)
    return Promise.reject(err);
  }
);

let tokenIsRefreshing = false;

type RequestInQueue = {
  onSuccess: (tokenType: string, accessToken: string) => void
  onFailure: (err: AxiosError) => void
}

let failedRequestQueue: RequestInQueue[] = [];

type AuthApiResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

const REFRESH_TOKEN_URI = "v1/auth/refresh"

const isTokenExpiredError = (error: AxiosError) =>
  error.response?.status === 401 &&
  (error.response?.data as { detail?: string } | undefined)?.detail === "token.expired";

const canRefreshSession = (error: AxiosError) => {
  if (error.config?.url?.includes(REFRESH_TOKEN_URI)) {
    return false;
  }

  const { refreshToken } = getSession();
  return isRefreshTokenValid(refreshToken);
};

const shouldAttemptTokenRefresh = (error: AxiosError) => {
  if (!canRefreshSession(error)) {
    return false;
  }

  if (isTokenExpiredError(error)) {
    return true;
  }

  // Só 401: 403 é permissão e deve chegar à UI
  return error.response?.status === 401;
};

const handleUnauthorizedRequest = (error: AxiosError): Promise<unknown> | undefined => {
  if (!shouldAttemptTokenRefresh(error)) {
    if (error.response?.status === 401) {
      clearSession();
    }
    return undefined;
  }

  const { tokenType, refreshToken } = getSession();
  const originalConfig = error.config;

  if (!originalConfig) {
    clearSession();
    return undefined;
  }

  if (!tokenIsRefreshing) {
    tokenIsRefreshing = true;

    http.post(REFRESH_TOKEN_URI, undefined, {
      headers: { Authorization: `${tokenType} ${refreshToken}` },
    }).then((response) => {
      const { accessToken, refreshToken: newRefreshToken, tokenType: newTokenType } =
        response.data as AuthApiResponse;
      saveSession(newTokenType, accessToken, newRefreshToken);
      failedRequestQueue.forEach((request) => request.onSuccess(newTokenType, accessToken));
      failedRequestQueue = [];
    }).catch((err: AxiosError) => {
      failedRequestQueue.forEach((request) => request.onFailure(err));
      failedRequestQueue = [];
      clearSession();
    }).finally(() => {
      tokenIsRefreshing = false;
    });
  }

  return new Promise((resolve, reject) => {
    failedRequestQueue.push({
      onSuccess: (newTokenType: string, accessToken: string) => {
        originalConfig.headers = originalConfig.headers ?? {};
        originalConfig.headers.Authorization = `${newTokenType} ${accessToken}`;
        resolve(http(originalConfig));
      },
      onFailure: (err: AxiosError) => {
        reject(err);
      },
    });
  });
};

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401) {
      const refreshResult = handleUnauthorizedRequest(error);
      if (refreshResult) {
        return refreshResult;
      }
    } else if (error.request) {
      if (error.code === NETWORK_ERROR) {
        redirectOnNetworkError();
      }
    } else {
      console.log('Error', error);
    }

    return Promise.reject(error);
  },
)
export default http;