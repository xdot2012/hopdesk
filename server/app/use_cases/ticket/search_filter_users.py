from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.roles import AGENT_ROLES, ALL_ROLES, ROLE_CUSTOMER
from app.models.user.role import Role
from app.models.user.user import User

DEFAULT_FILTER_USER_PAGE_SIZE = 20
MAX_FILTER_USER_PAGE_SIZE = 50


def build_ticket_filter_user_option(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
    }


def _search_users_by_roles(
    db: Session,
    *,
    role_names: tuple[str, ...],
    search: str | None,
    page: int,
    size: int,
) -> dict:
    page = max(page, 1)
    size = min(max(size, 1), MAX_FILTER_USER_PAGE_SIZE)

    filters = [Role.name.in_(role_names)]
    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(or_(User.name.ilike(term), User.email.ilike(term)))

    count_stmt = (
        select(func.count())
        .select_from(User)
        .join(Role, User.role_id == Role.id)
        .where(*filters)
    )
    total = db.execute(count_stmt).scalar_one()
    pages = max((total + size - 1) // size, 1) if total else 0
    if pages and page > pages:
        page = pages

    query = (
        select(User)
        .join(Role, User.role_id == Role.id)
        .where(*filters)
        .order_by(User.name.nulls_last(), User.email)
        .offset((page - 1) * size)
        .limit(size)
    )
    users = list(db.execute(query).scalars().all())

    return {
        "items": users,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


async def search_assignee_options(
    db: Session,
    *,
    search: str | None = None,
    page: int = 1,
    size: int = DEFAULT_FILTER_USER_PAGE_SIZE,
) -> dict:
    return _search_users_by_roles(
        db,
        role_names=AGENT_ROLES,
        search=search,
        page=page,
        size=size,
    )


async def search_requester_options(
    db: Session,
    *,
    search: str | None = None,
    page: int = 1,
    size: int = DEFAULT_FILTER_USER_PAGE_SIZE,
) -> dict:
    return _search_users_by_roles(
        db,
        role_names=(ROLE_CUSTOMER,),
        search=search,
        page=page,
        size=size,
    )


async def search_mention_options(
    db: Session,
    *,
    role_name: str,
    search: str | None = None,
    page: int = 1,
    size: int = DEFAULT_FILTER_USER_PAGE_SIZE,
) -> dict:
    """Users that the current role may mention in rich text.

    Agents/admins can mention anyone; customers can mention support staff.
    """
    mention_roles = ALL_ROLES if role_name in AGENT_ROLES else AGENT_ROLES
    return _search_users_by_roles(
        db,
        role_names=mention_roles,
        search=search,
        page=page,
        size=size,
    )
