export const FILES_BASE_URL = 'http://localhost:8000/v1/files';

export function resolveFileUrl(fileKey: string | null | undefined): string | null {
  if (!fileKey) return null;
  if (fileKey.startsWith('http://') || fileKey.startsWith('https://') || fileKey.startsWith('blob:') || fileKey.startsWith('data:')) {
    return fileKey;
  }

  const normalizedKey = fileKey.replace(/^\/+/, '');
  return `${FILES_BASE_URL}/${normalizedKey}`;
}
