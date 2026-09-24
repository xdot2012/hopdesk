import type { ParseKeys } from 'i18next';

export const NETWORK_ERROR = "ERR_NETWORK"

export const LOCALE_STORAGE_KEY = 'locale'
export const DEFAULT_LOCALE = 'pt-BR' as const
export type AppLocale = 'pt-BR' | 'en'

export const SUPPORTED_LOCALES: { value: AppLocale; labelKey: ParseKeys }[] = [
  { value: 'pt-BR', labelKey: 'language.pt-BR' },
  { value: 'en', labelKey: 'language.en' },
]

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === 'pt-BR' || value === 'en';
}

export enum ColorModes {
  DARK = 'dark',
  LIGHT = 'light'
}
