def test_assignee_options_smoke(client, agent_headers):
    response = client.get(
        "/v1/ticket/assignee_options",
        headers=agent_headers,
        params={"page": 1, "size": 20},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "items" in body
    assert body["page"] == 1
    assert isinstance(body["items"], list)
    assert any(item.get("email") == "agent@example.com" for item in body["items"])
