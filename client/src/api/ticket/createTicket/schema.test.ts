import { describe, expect, it } from 'vitest';
import { createTicketSchema } from './schema';

describe('createTicketSchema', () => {
  it('accepts plain text description', () => {
    const result = createTicketSchema.safeParse({
      subject: 'Login falha',
      description: 'Não consigo entrar no sistema',
    });

    expect(result.success).toBe(true);
  });

  it('accepts html description when visible text is long enough', () => {
    const result = createTicketSchema.safeParse({
      subject: 'Bug no form',
      description: '<p>Não consigo <strong>enviar</strong> o formulário</p>',
    });

    expect(result.success).toBe(true);
  });

  it('rejects short subject or empty html description', () => {
    const shortSubject = createTicketSchema.safeParse({
      subject: 'ab',
      description: 'descrição ok',
    });
    const emptyHtml = createTicketSchema.safeParse({
      subject: 'Assunto ok',
      description: '<p><br></p>',
    });

    expect(shortSubject.success).toBe(false);
    expect(emptyHtml.success).toBe(false);
  });
});
