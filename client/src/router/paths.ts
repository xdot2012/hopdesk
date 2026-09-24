export const DASHBOARD = "/";
export const SETTINGS = "/settings";
export const USER_SETTINGS = "/account";
export const CONNECTION_ERROR = "/connection-error";

export const SIGN_IN = "/auth/sign_in";
export const SIGN_UP = "/auth/sign_up";
export const LOGOUT = "/auth/logout";

export const FORGOT_PASSWORD = "/auth/password_recover";
export const RESET_PASSWORD = "/auth/reset_password";
export const CONFIRM_EMAIL = "/auth/confirm_email";

export const TICKETS = "/tickets";
export const TICKET_NEW = "/tickets/new";
export const TICKETS_HISTORY = "/tickets/history";
export const ticketDetail = (id: string) => `/tickets/${id}`;
export const KNOWLEDGE_BASE = "/knowledge-base";
export const knowledgeBaseArticle = (idOrSlug: string) => `/knowledge-base/${idOrSlug}`;
export const knowledgeBaseArticleEdit = (id: string) => `/knowledge-base/${id}/edit`;
export const knowledgeBaseArticleNewChild = (parentId: string) =>
  `/knowledge-base/new?parentId=${encodeURIComponent(parentId)}`;
export const KNOWLEDGE_BASE_PRIORITY_GUIDE_SLUG = "como-definir-prioridades";
export const KNOWLEDGE_BASE_PRIORITY_GUIDE = knowledgeBaseArticle(KNOWLEDGE_BASE_PRIORITY_GUIDE_SLUG);
export const KNOWLEDGE_BASE_JAM_GUIDE_SLUG = "como-gravar-bugs-com-jam";
export const KNOWLEDGE_BASE_JAM_GUIDE = knowledgeBaseArticle(KNOWLEDGE_BASE_JAM_GUIDE_SLUG);
export const KNOWLEDGE_BASE_NEW = "/knowledge-base/new";
export const knowledgeBaseSearch = (query: string) =>
  `${KNOWLEDGE_BASE}?q=${encodeURIComponent(query)}`;
export const SLA = "/sla";
/** @deprecated Legacy path — redirects to Settings → SLA. */
export const SERVICE_LEVEL_AGREEMENT_LEGACY = "/service-level-agreement";
export const USER_SECTORS = "/user-sectors";
/** @deprecated use USER_SECTORS */
export const PORTAL_MEMBERS = USER_SECTORS;
export const INDICATORS = "/indicators";
export const BRAND_IDENTITY = "/brand/identity";
/** @deprecated use BRAND_IDENTITY */
export const BRAND_PREVIEW = BRAND_IDENTITY;

export default {
    DASHBOARD,
    SETTINGS,
    USER_SETTINGS,
    CONNECTION_ERROR,
    SIGN_IN,
    SIGN_UP,
    LOGOUT,
    FORGOT_PASSWORD,
    RESET_PASSWORD,
    CONFIRM_EMAIL,
    TICKETS,
    TICKET_NEW,
    TICKETS_HISTORY,
    KNOWLEDGE_BASE,
    KNOWLEDGE_BASE_NEW,
    SLA,
    USER_SECTORS,
    PORTAL_MEMBERS,
    INDICATORS,
    BRAND_IDENTITY,
    BRAND_PREVIEW,
}
