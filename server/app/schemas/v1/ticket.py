import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import Field

from app.schemas.v1.base import RequestBaseModel, ResponseBaseModel


class TicketPriorityResponse(ResponseBaseModel):
    id: UUID
    code: str
    label: str
    sort_order: int


class TicketAttachmentResponse(ResponseBaseModel):
    id: UUID
    file_key: str
    original_filename: str
    content_type: str
    size: int
    url: Optional[str] = None


class TicketMessageResponse(ResponseBaseModel):
    id: UUID
    ticket_id: UUID
    author_user_id: UUID
    author_name: Optional[str] = None
    author_avatar_url: Optional[str] = None
    visibility: str
    body: str
    customer_pending: bool = False
    created_at: datetime.datetime
    updated_at: datetime.datetime
    attachments: List[TicketAttachmentResponse] = []


class TicketResponse(ResponseBaseModel):
    id: UUID
    number: int
    subject: str
    description: str
    page_url: str = ""
    external_id: Optional[str] = None
    status: str
    priority_id: UUID
    priority_code: Optional[str] = None
    priority_label: Optional[str] = None
    sector_id: Optional[UUID] = None
    sector_name: Optional[str] = None
    sector_color: Optional[str] = None
    requester_user_id: UUID
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    requester_avatar_url: Optional[str] = None
    assignee_user_id: Optional[UUID] = None
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    assignee_avatar_url: Optional[str] = None
    response_due_at: Optional[datetime.datetime] = None
    resolution_due_at: Optional[datetime.datetime] = None
    first_responded_at: Optional[datetime.datetime] = None
    resolved_at: Optional[datetime.datetime] = None
    sla_status: Optional[str] = None
    total_hold_seconds: int = 0
    hold_started_at: Optional[datetime.datetime] = None
    awaiting_customer_reply: bool = False
    attachment_count: int = 0
    cause: Optional[str] = None
    solution: Optional[str] = None
    solution_internal: bool = False
    effort_minutes: Optional[int] = None
    satisfaction_rating: Optional[int] = None
    satisfaction_comment: Optional[str] = None
    satisfaction_rated_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    messages: List[TicketMessageResponse] = []
    attachments: List[TicketAttachmentResponse] = []


class TicketListItemResponse(ResponseBaseModel):
    id: UUID
    number: int
    subject: str
    description: str = ""
    page_url: str = ""
    external_id: Optional[str] = None
    status: str
    priority_id: UUID
    priority_code: Optional[str] = None
    priority_label: Optional[str] = None
    sector_id: Optional[UUID] = None
    sector_name: Optional[str] = None
    sector_color: Optional[str] = None
    requester_user_id: Optional[UUID] = None
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    requester_avatar_url: Optional[str] = None
    assignee_user_id: Optional[UUID] = None
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    assignee_avatar_url: Optional[str] = None
    response_due_at: Optional[datetime.datetime] = None
    resolution_due_at: Optional[datetime.datetime] = None
    first_responded_at: Optional[datetime.datetime] = None
    sla_status: Optional[str] = None
    total_hold_seconds: int = 0
    hold_started_at: Optional[datetime.datetime] = None
    resolved_at: Optional[datetime.datetime] = None
    awaiting_customer_reply: bool = False
    attachment_count: int = 0
    created_at: datetime.datetime
    updated_at: datetime.datetime
    has_unread_update: bool = False


class TicketQueueCountsResponse(ResponseBaseModel):
    all: int
    triage: int
    open: int
    waiting_customer: int
    unassigned: int
    sla_failed: int


class TicketListPageResponse(ResponseBaseModel):
    items: List[TicketListItemResponse]
    total: int
    page: int
    size: int
    pages: int
    counts: TicketQueueCountsResponse


class TicketFilterUserOptionResponse(ResponseBaseModel):
    id: UUID
    name: Optional[str] = None
    email: str


class TicketFilterUserPageResponse(ResponseBaseModel):
    items: List[TicketFilterUserOptionResponse]
    total: int
    page: int
    size: int
    pages: int


class CreateTicketAttachmentInput(RequestBaseModel):
    key: str = Field(min_length=1, max_length=500)
    original_filename: str = Field(min_length=1, max_length=500)
    content_type: str = Field(min_length=1, max_length=200)
    size: int = Field(ge=0)


class CreateTicketRequest(RequestBaseModel):
    subject: str = Field(min_length=3, max_length=300)
    description: str = Field(min_length=1)
    external_id: Optional[str] = Field(default=None, max_length=200)
    attachments: List[CreateTicketAttachmentInput] = Field(default_factory=list)
    priority_id: Optional[UUID] = None
    sector_id: Optional[UUID] = None


class UpdateTicketRequest(RequestBaseModel):
    status: Optional[str] = None
    priority_id: Optional[UUID] = None
    assignee_user_id: Optional[UUID] = None
    cause: Optional[str] = Field(default=None, min_length=1)
    solution: Optional[str] = Field(default=None, min_length=1)
    solution_internal: Optional[bool] = None
    effort_minutes: Optional[int] = Field(default=None, ge=1, le=24 * 60)


class RateTicketSatisfactionRequest(RequestBaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=1000)


class CreateTicketMessageRequest(RequestBaseModel):
    body: str = ""
    visibility: str = "public"
    customer_pending: bool = False
    attachments: List[CreateTicketAttachmentInput] = []


class UpdateTicketMessageRequest(RequestBaseModel):
    body: str = Field(min_length=1)


class UploadTicketAttachmentResponse(ResponseBaseModel):
    key: str
    url: str
    content_type: str
    size: int
    original_filename: str


class TicketCountBucketResponse(ResponseBaseModel):
    key: str
    count: int


class TicketLabeledCountBucketResponse(ResponseBaseModel):
    key: str
    label: str
    count: int
    color: Optional[str] = None


class TicketDailyCountResponse(ResponseBaseModel):
    date: str
    count: int
    by_priority: List[TicketCountBucketResponse] = []
    by_sector: List[TicketLabeledCountBucketResponse] = []


class TicketSlaOutcomeResponse(ResponseBaseModel):
    fulfilled_count: int = 0
    failed_count: int = 0
    rate: Optional[float] = None


class TicketOpenClosedDayResponse(ResponseBaseModel):
    date: str
    opened: int = 0
    closed: int = 0


class TicketAvgTimeDayResponse(ResponseBaseModel):
    date: str
    avg_first_response_minutes: Optional[float] = None
    avg_resolution_minutes: Optional[float] = None


class TicketSlaComplianceDayResponse(ResponseBaseModel):
    date: str
    fulfilled_count: int = 0
    failed_count: int = 0
    fulfillment_rate: Optional[float] = None


class TicketGroupBucketResponse(ResponseBaseModel):
    key: str
    label: str
    opened: int = 0
    closed: int = 0
    fulfilled_count: int = 0
    failed_count: int = 0
    fulfillment_rate: Optional[float] = None
    avg_first_response_minutes: Optional[float] = None
    avg_resolution_minutes: Optional[float] = None
    first_response_sla: TicketSlaOutcomeResponse = TicketSlaOutcomeResponse()
    resolution_sla: TicketSlaOutcomeResponse = TicketSlaOutcomeResponse()


class TicketStatsByGroupResponse(ResponseBaseModel):
    priority: List[TicketGroupBucketResponse] = []
    requester: List[TicketGroupBucketResponse] = []
    agent: List[TicketGroupBucketResponse] = []
    sector: List[TicketGroupBucketResponse] = []


class TicketGroupCountBucketResponse(ResponseBaseModel):
    key: str
    label: str
    count: int = 0
    opened: int = 0
    closed: int = 0


class TicketGroupTimeBucketResponse(ResponseBaseModel):
    key: str
    label: str
    avg_first_response_minutes: Optional[float] = None
    avg_resolution_minutes: Optional[float] = None


class TicketGroupSlaBucketResponse(ResponseBaseModel):
    key: str
    label: str
    fulfilled_count: int = 0
    failed_count: int = 0
    fulfillment_rate: Optional[float] = None


class TicketOpenClosedDayByGroupResponse(ResponseBaseModel):
    date: str
    opened: int = 0
    closed: int = 0
    by_group: List[TicketGroupCountBucketResponse] = []


class TicketAvgTimeDayByGroupResponse(ResponseBaseModel):
    date: str
    avg_first_response_minutes: Optional[float] = None
    avg_resolution_minutes: Optional[float] = None
    by_group: List[TicketGroupTimeBucketResponse] = []


class TicketSlaComplianceDayByGroupResponse(ResponseBaseModel):
    date: str
    fulfilled_count: int = 0
    failed_count: int = 0
    fulfillment_rate: Optional[float] = None
    by_group: List[TicketGroupSlaBucketResponse] = []


class TicketStatsGroupedOpenClosedSeriesResponse(ResponseBaseModel):
    priority: List[TicketOpenClosedDayByGroupResponse] = []
    requester: List[TicketOpenClosedDayByGroupResponse] = []
    agent: List[TicketOpenClosedDayByGroupResponse] = []
    sector: List[TicketOpenClosedDayByGroupResponse] = []


class TicketStatsAvgTimeGroupedSeriesResponse(ResponseBaseModel):
    priority: List[TicketAvgTimeDayByGroupResponse] = []
    requester: List[TicketAvgTimeDayByGroupResponse] = []
    agent: List[TicketAvgTimeDayByGroupResponse] = []
    sector: List[TicketAvgTimeDayByGroupResponse] = []


class TicketStatsSlaGroupedSeriesResponse(ResponseBaseModel):
    priority: List[TicketSlaComplianceDayByGroupResponse] = []
    requester: List[TicketSlaComplianceDayByGroupResponse] = []
    agent: List[TicketSlaComplianceDayByGroupResponse] = []
    sector: List[TicketSlaComplianceDayByGroupResponse] = []


class TicketStatsResponse(ResponseBaseModel):
    total: int
    open_count: int
    unassigned_count: int
    closed_count: int = 0
    fulfilled_count: int
    failed_count: int
    fulfillment_rate: Optional[float] = None
    avg_first_response_minutes: Optional[float] = None
    avg_resolution_minutes: Optional[float] = None
    avg_satisfaction: Optional[float] = None
    satisfaction_count: int = 0
    first_response_sla: TicketSlaOutcomeResponse = TicketSlaOutcomeResponse()
    resolution_sla: TicketSlaOutcomeResponse = TicketSlaOutcomeResponse()
    by_status: List[TicketCountBucketResponse]
    by_sla: List[TicketCountBucketResponse]
    by_priority: List[TicketCountBucketResponse]
    by_assignee: List[TicketLabeledCountBucketResponse]
    by_sector: List[TicketLabeledCountBucketResponse]
    by_aging: List[TicketCountBucketResponse]
    created_by_day: List[TicketDailyCountResponse]
    open_closed_by_day: List[TicketOpenClosedDayResponse] = []
    avg_time_by_day: List[TicketAvgTimeDayResponse] = []
    sla_compliance_by_day: List[TicketSlaComplianceDayResponse] = []
    by_group: TicketStatsByGroupResponse = TicketStatsByGroupResponse()
    open_closed_by_day_by_group: TicketStatsGroupedOpenClosedSeriesResponse = (
        TicketStatsGroupedOpenClosedSeriesResponse()
    )
    avg_time_by_day_by_group: TicketStatsAvgTimeGroupedSeriesResponse = (
        TicketStatsAvgTimeGroupedSeriesResponse()
    )
    sla_compliance_by_day_by_group: TicketStatsSlaGroupedSeriesResponse = (
        TicketStatsSlaGroupedSeriesResponse()
    )
    period: str = "last_15_days"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
