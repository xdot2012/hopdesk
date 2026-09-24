export const EMAIL_CONFIRM_PATH = '/v1/auth/confirm_email'
export const PASSWORD_RECOVERY_PATH = '/v1/auth/password_recovery'
export const PASSWORD_RESET_PATH = '/v1/auth/reset_password'
export const RESEND_TWO_FACTOR_CODE_PATH = '/v1/auth/two_factor'
export const SIGN_IN_PATH = '/v1/auth/sign_in'
export const SIGN_OUT_PATH = '/v1/auth/sign_out'
export const SING_UP_PATH = '/v1/auth/sign_up'
export const RETRIEVE_USER_PATH = '/v1/user/me'
export const LIST_USERS_PATH = '/v1/user/'
export const userRolePath = (userId: string) => `/v1/user/${userId}/role`
export const UPDATE_PROFILE_PATH = '/v1/user/me'
export const UPDATE_PREFERENCES_PATH = '/v1/user/me/preferences'
export const UPDATE_PASSWORD_PATH = '/v1/user/me/password'
export const UPLOAD_AVATAR_PATH = '/v1/user/me/avatar'

export const TICKET_PATH = '/v1/ticket/'
export const TICKET_STATS_PATH = '/v1/ticket/stats'
export const TICKET_PRIORITIES_PATH = '/v1/ticket/priorities'
export const TICKET_ASSIGNEE_OPTIONS_PATH = '/v1/ticket/assignee_options'
export const TICKET_REQUESTER_OPTIONS_PATH = '/v1/ticket/requester_options'
export const TICKET_MENTION_OPTIONS_PATH = '/v1/ticket/mention_options'
export const TICKET_EVENTS_PATH = '/v1/ticket/events'
export const MARK_NOTIFICATIONS_READ_PATH = '/v1/user/me/notifications/read'
export const TICKET_ATTACHMENTS_PATH = '/v1/ticket/attachments'
export const ticketDetailPath = (id: string) => `/v1/ticket/${id}`
export const ticketCancelPath = (id: string) => `/v1/ticket/${id}/cancel`
export const ticketSatisfactionPath = (id: string) => `/v1/ticket/${id}/satisfaction`
export const ticketViewPath = (id: string) => `/v1/ticket/${id}/view`
export const ticketMessagesPath = (id: string) => `/v1/ticket/${id}/messages`
export const ticketMessagePath = (ticketId: string, messageId: string) =>
  `/v1/ticket/${ticketId}/messages/${messageId}`
export const ticketAssignMePath = (id: string) => `/v1/ticket/${id}/assign_me`

export const INSTANCE_PATH = '/v1/instance/'
export const SECTOR_PATH = '/v1/sector/'
export const SECTOR_PUBLIC_PATH = '/v1/sector/public'
export const sectorPath = (id: string) => `/v1/sector/${id}`
export const USER_SECTOR_PATH = '/v1/user_sector/'
export const userSectorPath = (id: string) => `/v1/user_sector/${id}`
export const SLA_PATH = '/v1/sla/'

export const KNOWLEDGE_BASE_ARTICLES_PATH = '/v1/knowledge_base/articles'
export const KNOWLEDGE_BASE_ARTICLES_TREE_PATH = '/v1/knowledge_base/articles/tree'
export const KNOWLEDGE_BASE_ARTICLES_SUGGEST_PATH = '/v1/knowledge_base/articles/suggest'
export const KNOWLEDGE_BASE_ARTICLES_REORDER_PATH = '/v1/knowledge_base/articles/reorder'
export const knowledgeBaseArticlePath = (id: string) => `/v1/knowledge_base/articles/${id}`
export const knowledgeBaseArticleImagePath = (id: string) => `/v1/knowledge_base/articles/${id}/images`
