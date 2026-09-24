def test_get_policy_includes_timezone(client, customer_headers):
    response = client.get("/v1/sla/", headers=customer_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert "timezone" in body
    assert body["timezone"]
    assert body["priorityTargets"]


def test_put_policy_targets_and_timezone(client, admin_headers):
    current = client.get("/v1/sla/", headers=admin_headers)
    assert current.status_code == 200, current.text
    policy = current.json()
    targets = [
        {
            "priorityId": item["priorityId"],
            "firstResponseMinutes": max(1, item["firstResponseMinutes"] + 5),
            "resolutionMinutes": max(1, item["resolutionMinutes"] + 10),
        }
        for item in policy["priorityTargets"]
    ]
    updated = client.put(
        "/v1/sla/",
        headers=admin_headers,
        json={"timezone": "America/Sao_Paulo", "targets": targets},
    )
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["timezone"] == "America/Sao_Paulo"
    by_priority = {item["priorityId"]: item for item in body["priorityTargets"]}
    for item in targets:
        saved = by_priority[item["priorityId"]]
        assert saved["firstResponseMinutes"] == item["firstResponseMinutes"]
        assert saved["resolutionMinutes"] == item["resolutionMinutes"]
