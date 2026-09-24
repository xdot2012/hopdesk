import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../src/locales');

const LOCALES = ['pt-BR', 'en'];
const SOURCE_LOCALE = 'pt-BR';

function loadLocale(locale) {
  const filePath = join(localesDir, `${locale}.json`);
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function flattenKeys(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (nestedValue !== null && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
      return flattenKeys(nestedValue, path);
    }
    return [path];
  });
}

function diffKeys(sourceKeys, targetKeys) {
  const targetSet = new Set(targetKeys);
  return sourceKeys.filter((key) => !targetSet.has(key)).sort();
}

const localeKeys = Object.fromEntries(
  LOCALES.map((locale) => [locale, new Set(flattenKeys(loadLocale(locale)))]),
);

let hasErrors = false;

console.log('Verificando traduções...\n');

for (const locale of LOCALES) {
  if (locale === SOURCE_LOCALE) continue;

  const missing = diffKeys([...localeKeys[SOURCE_LOCALE]], [...localeKeys[locale]]);
  const extra = diffKeys([...localeKeys[locale]], [...localeKeys[SOURCE_LOCALE]]);

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✓ ${locale}: sincronizado com ${SOURCE_LOCALE} (${localeKeys[locale].size} chaves)`);
    continue;
  }

  hasErrors = true;
  console.error(`✗ ${locale}: divergente de ${SOURCE_LOCALE}`);

  if (missing.length > 0) {
    console.error(`  Faltando em ${locale}:`);
    for (const key of missing) {
      console.error(`    - ${key}`);
    }
  }

  if (extra.length > 0) {
    console.error(`  Extras em ${locale} (ausentes em ${SOURCE_LOCALE}):`);
    for (const key of extra) {
      console.error(`    - ${key}`);
    }
  }

  console.error('');
}

if (hasErrors) {
  console.error('Corrija as divergências entre os arquivos em src/locales/.');
  process.exit(1);
}

console.log('\nTodas as traduções estão sincronizadas.');
