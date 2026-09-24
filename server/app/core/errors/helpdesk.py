from fastapi import HTTPException
from starlette import status

from app.core.i18n import translate


class TicketNotFoundException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("ticket.not_found", locale),
        )


class InvalidTicketStatusException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.invalid_status", locale),
        )


class InvalidTicketTransitionException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.invalid_transition", locale),
        )


class InvalidTicketPriorityException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.invalid_priority", locale),
        )


class TicketCloseDetailsRequiredException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.close_details_required", locale),
        )


class TicketEffortMinutesRequiredException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.effort_minutes_required", locale),
        )


class InvalidTicketEffortMinutesException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.invalid_effort_minutes", locale),
        )


class InvalidTicketSatisfactionRatingException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.invalid_satisfaction_rating", locale),
        )


class TicketSatisfactionNotEligibleException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.satisfaction_not_eligible", locale),
        )


class TicketSatisfactionAlreadyRatedException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.satisfaction_already_rated", locale),
        )


class TicketSatisfactionCommentTooLongException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.satisfaction_comment_too_long", locale),
        )


class UserSectorRequiredException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.user_sector_required", locale),
        )


class InternalMessageNotAllowedException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=translate("ticket.internal_not_allowed", locale),
        )


class TicketMessageNotFoundException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("ticket.message_not_found", locale),
        )


class EmptyTicketMessageException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.message_empty", locale),
        )


class TicketDescriptionInvalidException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.description_invalid", locale),
        )


class TicketAttachmentRequiredException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.attachment_required", locale),
        )


class TicketAttachmentNotFoundException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("ticket.attachment_not_found", locale),
        )


class UserSectorExistsException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("customer.member_exists", locale),
        )


class UserSectorNotFoundException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("customer.member_not_found", locale),
        )


class SectorNotFoundException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("customer.sector_not_found", locale),
        )


class SectorExistsException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("customer.sector_exists", locale),
        )


class SectorInvalidColorException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("customer.sector_invalid_color", locale),
        )


class NotCustomerException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("customer.not_customer", locale),
        )


class KnowledgeBaseNotFoundException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("knowledge_base.not_found", locale),
        )


class KnowledgeBaseCategoryNotFoundException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("knowledge_base.category_not_found", locale),
        )


class KnowledgeBaseSlugExistsException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("knowledge_base.slug_exists", locale),
        )


class KnowledgeBaseParentNotFoundException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("knowledge_base.parent_not_found", locale),
        )


class KnowledgeBaseInvalidParentException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("knowledge_base.invalid_parent", locale),
        )


class KnowledgeBaseMaxDepthException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("knowledge_base.max_depth", locale),
        )


class SlaNotFoundException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("sla.not_found", locale),
        )


class SlaInvalidTimezoneException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("sla.invalid_timezone", locale),
        )


class InstanceInvalidTimezoneException(HTTPException):
    def __init__(self, locale: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=translate("instance.invalid_timezone", locale),
        )
