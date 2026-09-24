import { describe, expect, it } from 'vitest';
import { FILES_BASE_URL, resolveFileUrl } from './files';

describe('resolveFileUrl', () => {
  it('returns null for empty keys', () => {
    expect(resolveFileUrl(null)).toBeNull();
    expect(resolveFileUrl(undefined)).toBeNull();
    expect(resolveFileUrl('')).toBeNull();
  });

  it('keeps absolute and blob urls', () => {
    expect(resolveFileUrl('https://cdn.example/a.png')).toBe('https://cdn.example/a.png');
    expect(resolveFileUrl('blob:abc')).toBe('blob:abc');
  });

  it('prefixes storage keys with files base url', () => {
    expect(resolveFileUrl('/avatars/me.png')).toBe(`${FILES_BASE_URL}/avatars/me.png`);
    expect(resolveFileUrl('avatars/me.png')).toBe(`${FILES_BASE_URL}/avatars/me.png`);
  });
});
