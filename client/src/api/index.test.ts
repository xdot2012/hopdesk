import { describe, expect, it } from 'vitest';
import {
  knowledgeBaseArticleImagePath,
  knowledgeBaseArticlePath,
  sectorPath,
  ticketAssignMePath,
  ticketDetailPath,
  ticketMessagePath,
  ticketMessagesPath,
  userRolePath,
  userSectorPath,
} from './index';

describe('api path helpers', () => {
  it('builds resource urls', () => {
    expect(ticketDetailPath('t1')).toBe('/v1/ticket/t1');
    expect(ticketAssignMePath('t1')).toBe('/v1/ticket/t1/assign_me');
    expect(ticketMessagesPath('t1')).toBe('/v1/ticket/t1/messages');
    expect(ticketMessagePath('t1', 'm1')).toBe('/v1/ticket/t1/messages/m1');
    expect(userRolePath('u1')).toBe('/v1/user/u1/role');
    expect(sectorPath('s1')).toBe('/v1/sector/s1');
    expect(userSectorPath('us1')).toBe('/v1/user_sector/us1');
    expect(knowledgeBaseArticlePath('a1')).toBe('/v1/knowledge_base/articles/a1');
    expect(knowledgeBaseArticleImagePath('a1')).toBe(
      '/v1/knowledge_base/articles/a1/images',
    );
  });
});
