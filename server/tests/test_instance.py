def test_get_and_update_instance_email_flags(client, admin_headers):
    get_response = client.get("/v1/instance/", headers=admin_headers)
    assert get_response.status_code == 200, get_response.text
    body = get_response.json()
    assert "timezone" in body
    assert body["ticketEmailOnCreated"] is False

    update = client.put(
        "/v1/instance/",
        headers=admin_headers,
        json={
            "timezone": body["timezone"] or "America/Sao_Paulo",
            "ticketEmailOnCreated": True,
            "ticketEmailOnPublicMessage": True,
            "ticketEmailOnStatusChange": False,
            "ticketEmailOnAssignment": True,
        },
    )
    assert update.status_code == 200, update.text
    updated = update.json()
    assert updated["ticketEmailOnCreated"] is True
    assert updated["ticketEmailOnPublicMessage"] is True
    assert updated["ticketEmailOnStatusChange"] is False
    assert updated["ticketEmailOnAssignment"] is True
