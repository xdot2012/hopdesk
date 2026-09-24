import type { Editor } from '@tiptap/core';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from 'lucide-react';

export default function AlignIcon({ editor }: { editor: Editor }) {
  if (editor.isActive({ textAlign: 'center' })) return <AlignCenter />;
  if (editor.isActive({ textAlign: 'right' })) return <AlignRight />;
  if (editor.isActive({ textAlign: 'justify' })) return <AlignJustify />;
  return <AlignLeft />;
}
