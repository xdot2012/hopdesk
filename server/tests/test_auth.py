from tests.conftest import CUSTOMER_EMAIL, PASSWORD


def test_sign_in_happy_path(client):
    response = client.post(
        "/v1/auth/sign_in",
        json={"email": CUSTOMER_EMAIL, "password": PASSWORD, "keepConnected": False},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["twoFactorRequired"] is False
    assert body["token"]["accessToken"]
    assert body["token"]["refreshToken"]
    assert body["token"]["tokenType"] == "Bearer"


def test_sign_in_invalid_credentials(client):
    response = client.post(
        "/v1/auth/sign_in",
        json={
            "email": CUSTOMER_EMAIL,
            "password": "WrongPass1!",
            "keepConnected": False,
        },
    )
    assert response.status_code == 401
