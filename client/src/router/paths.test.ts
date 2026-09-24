import { describe, expect, it } from 'vitest';
import {
  knowledgeBaseArticle,
  knowledgeBaseArticleEdit,
  knowledgeBaseArticleNewChild,
  knowledgeBaseSearch,
  ticketDetail,
} from './paths';

describe('router path helpers', () => {
  it('builds ticket and knowledge-base urls', () => {
    expect(ticketDetail('abc')).toBe('/tickets/abc');
    expect(knowledgeBaseArticle('guia')).toBe('/knowledge-base/guia');
    expect(knowledgeBaseArticleEdit('id-1')).toBe('/knowledge-base/id-1/edit');
  });

  it('encodes query params', () => {
    expect(knowledgeBaseSearch('sla & prioridade')).toBe(
      '/knowledge-base?q=sla%20%26%20prioridade',
    );
    expect(knowledgeBaseArticleNewChild('parent/1')).toBe(
      '/knowledge-base/new?parentId=parent%2F1',
    );
  });
});
