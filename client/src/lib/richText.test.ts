import { describe, expect, it } from 'vitest';
import { isRichTextEmpty, looksLikeHtml, stripHtmlToText } from './richText';

describe('looksLikeHtml', () => {
  it('detects markup', () => {
    expect(looksLikeHtml('<p>oi</p>')).toBe(true);
    expect(looksLikeHtml('texto simples')).toBe(false);
  });
});

describe('stripHtmlToText', () => {
  it('strips tags and collapses whitespace', () => {
    expect(stripHtmlToText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('returns empty for empty-ish html', () => {
    expect(stripHtmlToText('<p><br></p>')).toBe('');
    expect(isRichTextEmpty('<p><br></p>')).toBe(true);
  });
});
