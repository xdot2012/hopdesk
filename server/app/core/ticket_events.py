import asyncio
import json
from typing import Any, TypedDict
from uuid import UUID

from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER

TICKET_CHANGED = "ticket.changed"
ACTION_CREATED = "created"
ACTION_UPDATED = "updated"
ACTION_MESSAGE = "message"

_HEARTBEAT_SECONDS = 25.0
_QUEUE_MAXSIZE = 64


class _Subscriber(TypedDict):
    queue: asyncio.Queue
    user_id: UUID
    role_name: str
    managed_sector_id: UUID | None


class TicketEventBus:
    def __init__(self) -> None:
        self._subscribers: list[_Subscriber] = []

    def subscribe(
        self,
        user_id: UUID,
        role_name: str,
        *,
        managed_sector_id: UUID | None = None,
    ) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=_QUEUE_MAXSIZE)
        self._subscribers.append(
            {
                "queue": queue,
                "user_id": user_id,
                "role_name": role_name,
                "managed_sector_id": managed_sector_id,
            }
        )
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers = [sub for sub in self._subscribers if sub["queue"] is not queue]

    def publish(self, event: dict[str, Any]) -> None:
        for sub in list(self._subscribers):
            if not self._can_receive(sub, event):
                continue
            try:
                sub["queue"].put_nowait(event)
            except asyncio.QueueFull:
                try:
                    sub["queue"].get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    sub["queue"].put_nowait(event)
                except asyncio.QueueFull:
                    pass

    @staticmethod
    def _can_receive(sub: _Subscriber, event: dict[str, Any]) -> bool:
        if sub["role_name"] in (ROLE_AGENT, ROLE_ADMIN):
            return True
        if sub["role_name"] != ROLE_CUSTOMER:
            return False
        requester = event.get("requesterUserId")
        if requester is not None and str(sub["user_id"]) == str(requester):
            return True
        managed = sub.get("managed_sector_id")
        sector_id = event.get("sectorId")
        if managed is not None and sector_id is not None:
            return str(managed) == str(sector_id)
        return False


ticket_event_bus = TicketEventBus()


def publish_ticket_changed(
    *,
    ticket_id: UUID,
    action: str,
    requester_user_id: UUID,
    sector_id: UUID | None = None,
    actor_user_id: UUID | None = None,
    number: int | None = None,
    subject: str | None = None,
    priority_code: str | None = None,
) -> None:
    payload: dict[str, Any] = {
        "type": TICKET_CHANGED,
        "ticketId": str(ticket_id),
        "action": action,
        "requesterUserId": str(requester_user_id),
    }
    if sector_id is not None:
        payload["sectorId"] = str(sector_id)
    if actor_user_id is not None:
        payload["actorUserId"] = str(actor_user_id)
    if number is not None:
        payload["number"] = number
    if subject is not None:
        payload["subject"] = subject
    if priority_code is not None:
        payload["priorityCode"] = priority_code
    ticket_event_bus.publish(payload)


async def iter_ticket_sse_frames(
    user_id: UUID,
    role_name: str,
    *,
    managed_sector_id: UUID | None = None,
):
    """Yield SSE wire frames, including heartbeat comments every ~25s."""
    queue = ticket_event_bus.subscribe(
        user_id,
        role_name,
        managed_sector_id=managed_sector_id,
    )
    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=_HEARTBEAT_SECONDS)
            except asyncio.TimeoutError:
                yield ": ping\n\n"
                continue
            yield f"data: {json.dumps(event)}\n\n"
    finally:
        ticket_event_bus.unsubscribe(queue)
