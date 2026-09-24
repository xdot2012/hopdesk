import {
  Archive,
  File,
  FileSpreadsheet,
  FileText,
  Film,
  Image as ImageIcon,
  type LucideIcon,
} from 'lucide-react';

export function isImageContentType(contentType: string): boolean {
  return contentType.startsWith('image/');
}

export function isVideoContentType(contentType: string): boolean {
  return contentType.startsWith('video/');
}

export function getFileTypeIcon(contentType: string): LucideIcon {
  if (isImageContentType(contentType)) return ImageIcon;
  if (isVideoContentType(contentType)) return Film;
  if (contentType === 'application/pdf' || contentType.startsWith('text/')) return FileText;
  if (
    contentType.includes('sheet') ||
    contentType.includes('excel') ||
    contentType === 'application/vnd.ms-excel'
  ) {
    return FileSpreadsheet;
  }
  if (contentType.includes('zip') || contentType.includes('compressed')) return Archive;
  if (contentType.includes('word') || contentType.includes('document')) return FileText;
  return File;
}
