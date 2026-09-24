from pathlib import Path

from app.services.file_management.entities import AVATAR_FOLDER


def test_download_denied_without_auth(client):
    response = client.get(f"/v1/files/{AVATAR_FOLDER}/missing.webp")
    assert response.status_code in (401, 403)


def test_avatar_download_acl_allows_authenticated(
    client,
    customer_headers,
    file_service,
    test_settings,
):
    key = f"{AVATAR_FOLDER}/test-avatar.webp"
    root = Path(test_settings.files_storage_root)
    target = root / key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(b"fake-image-bytes")

    denied = client.get(f"/v1/files/{key}")
    assert denied.status_code in (401, 403)

    allowed = client.get(f"/v1/files/{key}", headers=customer_headers)
    assert allowed.status_code == 200, allowed.text
    assert allowed.content == b"fake-image-bytes"
    assert allowed.headers.get("content-type", "").startswith("image/webp")
    assert allowed.headers.get("content-disposition") == "inline"


def test_unknown_file_key_not_found(client, customer_headers):
    response = client.get("/v1/files/not-a-valid-prefix/x.bin", headers=customer_headers)
    assert response.status_code == 404
