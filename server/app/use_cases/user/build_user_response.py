from app.models.user.user import User
from app.services.file_management.service import FileManagementService


def build_user_avatar_url(user: User, file_service: FileManagementService) -> str | None:
    return file_service.get_public_url(user.avatar_key)


def build_user_response(user: User, file_service: FileManagementService) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": build_user_avatar_url(user, file_service),
        "created_at": user.created_at,
        "email_confirmed": user.email_confirmed,
    }


def build_profile_response(profile: dict, file_service: FileManagementService) -> dict:
    avatar_key = profile.get("avatar_key")
    return {
        **{key: value for key, value in profile.items() if key != "avatar_key"},
        "avatar_url": file_service.get_public_url(avatar_key),
        "avatar_key": avatar_key,
    }
