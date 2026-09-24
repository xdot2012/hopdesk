import { describe, expect, it } from 'vitest';
import { toCsv } from './csvExport';

describe('toCsv', () => {
  it('serializes header and rows with CRLF', () => {
    const csv = toCsv(
      [
        { name: 'Ada', note: 'ok' },
        { name: 'Grace', note: 'ok' },
      ],
      [
        { key: 'name', header: 'Name' },
        { key: 'note', header: 'Note' },
      ],
    );

    expect(csv).toBe('Name,Note\r\nAda,ok\r\nGrace,ok');
  });

  it('escapes commas, quotes and newlines', () => {
    const csv = toCsv(
      [{ title: 'Hello, "world"\nline2' }],
      [{ key: 'title', header: 'Title' }],
    );

    expect(csv).toBe('Title\r\n"Hello, ""world""\nline2"');
  });

  it('treats nullish cells as empty', () => {
    const csv = toCsv(
      [{ a: null, b: undefined, c: 0 }],
      [
        { key: 'a', header: 'A' },
        { key: 'b', header: 'B' },
        { key: 'c', header: 'C' },
      ],
    );

    expect(csv).toBe('A,B,C\r\n,,0');
  });
});
