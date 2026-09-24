TICKET_STATUS_TRIAGE = "triage"
TICKET_STATUS_OPEN = "open"
TICKET_STATUS_IN_PROGRESS = "in_progress"
TICKET_STATUS_TESTING = "testing"
TICKET_STATUS_CLOSED = "closed"
TICKET_STATUS_CANCELLED_BY_REQUESTER = "cancelled_by_requester"

TICKET_STATUSES = (
    TICKET_STATUS_OPEN,
    TICKET_STATUS_TRIAGE,
    TICKET_STATUS_IN_PROGRESS,
    TICKET_STATUS_TESTING,
    TICKET_STATUS_CLOSED,
    TICKET_STATUS_CANCELLED_BY_REQUESTER,
)

BOARD_STATUS_ORDER = (
    TICKET_STATUS_OPEN,
    TICKET_STATUS_TRIAGE,
    TICKET_STATUS_IN_PROGRESS,
    TICKET_STATUS_TESTING,
    TICKET_STATUS_CLOSED,
)

TICKET_STATUS_LABELS = {
    TICKET_STATUS_TRIAGE: "Triagem",
    TICKET_STATUS_OPEN: "Aberto",
    TICKET_STATUS_IN_PROGRESS: "Em atendimento",
    TICKET_STATUS_TESTING: "Testando",
    TICKET_STATUS_CLOSED: "Fechado",
    TICKET_STATUS_CANCELLED_BY_REQUESTER: "Cancelado pelo solicitante",
}

STATUS_CHANGE_MESSAGE_PREFIX = "status_change:"
TICKET_OPENED_MESSAGE_PREFIX = "ticket_opened:"
ASSIGNEE_CHANGE_MESSAGE_PREFIX = "assignee_change:"

# Statuses that still need agent attention (not finished).
ACTIVE_TICKET_STATUSES = (
    TICKET_STATUS_TRIAGE,
    TICKET_STATUS_OPEN,
    TICKET_STATUS_IN_PROGRESS,
)

STATUS_CATEGORY_OPEN = "open"
STATUS_CATEGORY_RESOLVED = "resolved"

TICKET_STATUS_CATEGORIES = {
    TICKET_STATUS_TRIAGE: STATUS_CATEGORY_OPEN,
    TICKET_STATUS_OPEN: STATUS_CATEGORY_OPEN,
    TICKET_STATUS_IN_PROGRESS: STATUS_CATEGORY_OPEN,
    TICKET_STATUS_TESTING: STATUS_CATEGORY_RESOLVED,
    TICKET_STATUS_CLOSED: STATUS_CATEGORY_RESOLVED,
    TICKET_STATUS_CANCELLED_BY_REQUESTER: STATUS_CATEGORY_RESOLVED,
}

MESSAGE_VISIBILITY_PUBLIC = "public"
MESSAGE_VISIBILITY_INTERNAL = "internal"

SLA_STATUS_DUE = "due"
SLA_STATUS_PAUSED = "paused"
SLA_STATUS_FULFILLED = "fulfilled"
SLA_STATUS_FAILED = "failed"

# Virtual keys for dashboard charts (not persisted).
SLA_CHART_DUE_FIRST_RESPONSE = "due_first_response"
SLA_CHART_DUE_RESOLUTION = "due_resolution"

KNOWLEDGE_BASE_STATUS_DRAFT = "draft"
KNOWLEDGE_BASE_STATUS_PUBLISHED = "published"
KNOWLEDGE_BASE_STATUS_ARCHIVED = "archived"

KNOWLEDGE_BASE_VISIBILITY_PUBLIC = "public"
KNOWLEDGE_BASE_VISIBILITY_STAFF = "staff"

KNOWLEDGE_BASE_CATEGORY_GENERAL_SLUG = "general"
KNOWLEDGE_BASE_CATEGORY_USER_GUIDE_SLUG = "user-guide"
KNOWLEDGE_BASE_CATEGORY_DEVELOPER_GUIDE_SLUG = "developer-guide"

# Seeded help articles.
KNOWLEDGE_BASE_PRIORITY_GUIDE_SLUG = "como-definir-prioridades"
KNOWLEDGE_BASE_JAM_GUIDE_SLUG = "como-gravar-bugs-com-jam"


def normalize_ticket_status(status: str) -> str:
    if status == "resolved":
        return TICKET_STATUS_TESTING
    if status == "waiting_customer":
        return TICKET_STATUS_IN_PROGRESS
    return status


def is_valid_status_transition(old_status: str, new_status: str) -> bool:
    old_status = normalize_ticket_status(old_status)
    new_status = normalize_ticket_status(new_status)

    if old_status == new_status:
        return True
    if new_status not in TICKET_STATUSES:
        return False
    # Only set via cancel_ticket_by_requester — never through agent board/PATCH.
    if new_status == TICKET_STATUS_CANCELLED_BY_REQUESTER:
        return False
    if old_status not in BOARD_STATUS_ORDER:
        return False

    if new_status == TICKET_STATUS_CLOSED:
        return True
    if new_status == TICKET_STATUS_TRIAGE and old_status != TICKET_STATUS_OPEN:
        return False

    old_index = BOARD_STATUS_ORDER.index(old_status)
    new_index = BOARD_STATUS_ORDER.index(new_status)
    return new_index > old_index
